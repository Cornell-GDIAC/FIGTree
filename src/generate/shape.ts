/*
 * shape.ts
 *
 * Module generating solid shapes.
 *
 * We currently do not support textured shapes, or shapes with mixed colors,
 * as that behavior in Figma is different than it is in CUGL. We also only
 * support ellipses and rectangles (including those with rounded corners).
 *
 * Authors: Walker White, Enoch Chen, Skyler Krouse, Aidan Campbell
 * Date: 1/24/24
 */
import { 
    roundToFixed, 
    hexColor,
} from "../util";
import {
    CUGLNode,
    CUGLPathNode,
    CUGLPolyNode,
} from "../types"
import {
    AnchorChildType
} from "./children"

/**
 * Returns the number of segments necessary for a smooth arc
 *
 * @param rad   The arc radius
 * @param arc   The arc angle
 *
 * @return the number of segments necessary for a smooth arc
 */
export function curveSegs(rad : number, arc : number) {
    const tol = 0.5;
    const da = Math.acos(rad / (rad + tol)) * 2.0;
    return Math.max(2, Math.ceil(arc / da));
}

/**
 * Returns the points of an ellipse centered at the origin
 *
 * @param w     The ellipse width
 * @param h     The ellipse height
 * @param segs  The number of segments to approximate the ellipse
 *
 * @return the points of an ellipse centered at the origin
 */
export function ellipse(w: number, h: number, segs: number) {
    const coef = 2.0 * Math.PI/segs;
    const points = [];
    for(let ii = 0; ii < 2*segs; ii++) {
        let rads = ii*coef/2;
        points[2*ii]   =  roundToFixed(0.5 * w * Math.cos(rads),2);
        points[2*ii+1] =  roundToFixed(0.5 * h * Math.sin(rads),2);
    }
    return points;
}


/**
 * Returns the points of a rounded rectangle anchored at the origin
 *
 * The origin is the bottom left corner of the rectangle, not accounting
 * for the corner radius. If the radii are all 0, this will produce a 
 * normal rectangle.
 *
 * @param w     The rectangle width
 * @param h     The rectangle height
 * @param tl    The radius of the top left (could be zero)
 * @param tr    The radius of the top right (could be zero)
 * @param br    The radius of the bottom right (could be zero)
 * @param bl    The radius of the bottom left (could be zero)
 *
 * @param the points of a rounded rectangle anchored at the origin
 */
export function roundedRect(w : number, h : number, 
                            tl : number, tr : number, 
                            br : number, bl : number) {
    const c1x = w >= 0 ? w : 0;
    const c1y = h >= 0 ? h : 0;
    const c2x = w >= 0 ? 0 : w;
    const c2y = h >= 0 ? h : 0;
    const c3x = w >= 0 ? 0 : w;
    const c3y = h >= 0 ? 0 : h;
    const c4x = w >= 0 ? w : 0;
    const c4y = h >= 0 ? 0 : h;
    
    const points = [];
    let off = 0;
    
    let segs = undefined;
    let coef = undefined;
    let cx = undefined;
    let cy = undefined;
    
    // TOP RIGHT 
    if (tr == 0) {
        points[off  ] = c1x;
        points[off+1] = c1y;
        off += 2;
    } else {
        segs = curveSegs(tr,Math.PI/2);
        coef = Math.PI/(2.0*segs);
        cx = c1x - tr;
        cy = c1y - tr;
        for(let ii = 0; ii <= segs; ii++) {
            points[2*ii+off  ] = roundToFixed(tr*Math.cos(ii*coef) + cx,2);
            points[2*ii+off+1] = roundToFixed(tr*Math.sin(ii*coef) + cy,2);
        }
        off += 2*segs+2;
    }
    
    // TOP LEFT
    if (tl == 0) {
        points[off  ] = c2x;
        points[off+1] = c2y;
        off += 2;
    } else {
        segs = curveSegs(tl,Math.PI/2);
        coef = Math.PI/(2.0*segs);
        cx = c2x + tl;
        cy = c2y - tl;
        for(let ii = 0; ii <= segs; ii++) {
            points[2*ii+off  ] = roundToFixed(cx-tl*Math.sin(ii*coef),2);
            points[2*ii+off+1] = roundToFixed(tl*Math.cos(ii*coef) + cy,2);
        }
        off += 2*segs+2;
    }
    
    // BOTTOM LEFT
    if (bl == 0) {
        points[off  ] = c3x;
        points[off+1] = c3y;
        off += 2;
    } else {
        segs = curveSegs(bl,Math.PI/2);
        coef = Math.PI/(2.0*segs);
        cx = c3x + bl;
        cy = c3y + bl;
        for(let ii = 0; ii <= segs; ii++) {
            points[2*ii+off  ] = roundToFixed(cx-bl*Math.cos(ii*coef),2);
            points[2*ii+off+1] = roundToFixed(cy-bl*Math.sin(ii*coef),2);
        }
        off += 2*segs+2;
    }
    
    // BOTTOM RIGHT
    if (br == 0) {
        points[off  ] = c4x;
        points[off+1] = c4y;
    } else {
        segs = curveSegs(br,Math.PI/2);
        coef = Math.PI/(2.0*segs);
        cx = c4x - br;
        cy = c4y + br;
        for(let ii = 0; ii <= segs; ii++) {
            points[2*ii+off  ] = roundToFixed(br*Math.sin(ii*coef)+cx,2);
            points[2*ii+off+1] = roundToFixed(cy-br*Math.cos(ii*coef),2);
        }
    }
    
    return points;
}

/**
 * Parses an SVG in the form of a string into an array of numbers representing
 * the vertices of the polygon, approximating curves using additional vertices. 
 * The vertices are flipped to match the position origin in CUGL. The final 
 * repeated vertex is not included in the resulting number array.
 * 
 * @param svgPath         SVG of the polygon in the format of a string
 * @returns               A number array representing the vertices of the polygon
 * and the left most x value used for positioning.
 */
function parseSVGPath(svgPath: string): {vertices: number[], leftMostX: number} {
    const pathRegex = /M(-?[\d.]+) (-?[\d.]+)|L(-?[\d.]+) (-?[\d.]+)|C(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)|Q(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)/g;
    const vertices: number[] = [];
    let match;
    let currentX = 0, currentY = 0;

    while ((match = pathRegex.exec(svgPath)) !== null) {
        // Extract command and points
        if (match[1] && match[2]) {
            // M command (move to)
            currentX = parseFloat(match[1]);
            currentY = parseFloat(match[2]);
            vertices.push(currentX, currentY);
        } else if (match[3] && match[4]) {
            // L command (line to)
            currentX = parseFloat(match[3]);
            currentY = parseFloat(match[4]);
            vertices.push(currentX, currentY);
        } else if (match[5] && match[6] && match[7] && match[8] && match[9] && match[10]) {
            // C command (cubic Bezier curve)
            const cx1 = parseFloat(match[5]);
            const cy1 = parseFloat(match[6]);
            const cx2 = parseFloat(match[7]);
            const cy2 = parseFloat(match[8]);
            const x = parseFloat(match[9]);
            const y = parseFloat(match[10]);

            const dx1 = cx1 - currentX;
            const dy1 = cy1 - currentY;
            const dx2 = cx2 - cx1;
            const dy2 = cy2 - cy1;
            const dx3 = x - cx2;
            const dy3 = y - cy2;

            const avgRadius = (Math.sqrt(dx1*dx1 + dy1*dy1) + 
                            Math.sqrt(dx2*dx2 + dy2*dy2) + 
                            Math.sqrt(dx3*dx3 + dy3*dy3)) / 3;

            const totalAngle = Math.PI; // Default to half circle

            const segments = curveSegs(avgRadius, totalAngle);
            const step = 1.0 / segments;

            // Approximate cubic Bezier curve with small line segments
            for (let t = 0; t <= 1; t += step) {
                const xPos = (1 - t) ** 3 * currentX + 3 * (1 - t) ** 2 * t * cx1 + 3 * (1 - t) * t ** 2 * cx2 + t ** 3 * x;
                const yPos = (1 - t) ** 3 * currentY + 3 * (1 - t) ** 2 * t * cy1 + 3 * (1 - t) * t ** 2 * cy2 + t ** 3 * y;
                vertices.push(xPos, yPos);
            }
            currentX = x;
            currentY = y;
        } else if (match[11] && match[12] && match[13] && match[14]) {
            // Q command (quadratic Bezier curve)
            const cx = parseFloat(match[11]);
            const cy = parseFloat(match[12]);
            const x = parseFloat(match[13]);
            const y = parseFloat(match[14]);
            
            const dx1 = cx - currentX;
            const dy1 = cy - currentY;
            const dx2 = x - cx;
            const dy2 = y - cy;

            const avgRadius = (Math.sqrt(dx1*dx1 + dy1*dy1) + 
                            Math.sqrt(dx2*dx2 + dy2*dy2)) / 2;

            const totalAngle = Math.PI; // Default to half circle

            const segments = curveSegs(avgRadius, totalAngle);
            const step = 1.0 / segments;

            // Approximate quadratic Bezier curve with small line segments
            for (let t = 0; t <= 1; t += step) {
                const xPos = (1 - t) ** 2 * currentX + 2 * (1 - t) * t * cx + t ** 2 * x;
                const yPos = (1 - t) ** 2 * currentY + 2 * (1 - t) * t * cy + t ** 2 * y;
                vertices.push(xPos, yPos);
            }
            currentX = x;
            currentY = y;
        }
    }

    removeConsecutiveDuplicates(vertices);

    // Determine bounding box to flip y-values relative to shape
    // let minY = Infinity, maxY = -Infinity;
    let minX = Infinity;
    // for (let i = 1; i < vertices.length; i += 2) {
    //     const y = vertices[i];
    //     const x = vertices[i - 1];
    //     if (x < minX) minX = x;
    //     if (y < minY) minY = y;
    //     if (y > maxY) maxY = y;
    // }

    // for (let i = 1; i < vertices.length; i += 2) {
    //     vertices[i] = maxY - (vertices[i] - minY);
    // }

    if (!isCounterClockwise(vertices)) {
        reverseVertices(vertices);
    }

    return {vertices, leftMostX: minX};
}

/**
 * Removes consecutive duplicates from an array of vertices in place. 
 * Consecutive includes wrapping around from the end of the array to the 
 * beginning.
 * 
 * @param vertices      The array of vertices to remove duplicates from
 */
function removeConsecutiveDuplicates(vertices: number[]) {
    const newVertices: number[] = [];
    
    for (let i = 0; i < vertices.length - 2; i += 2) {
        const x1 = vertices[i], y1 = vertices[i + 1];
        const x2 = vertices[i + 2], y2 = vertices[i + 3];

        if (Math.abs(x1-x2) > 0.001 || Math.abs(y1-y2) > 0.001) {
            newVertices.push(x1, y1);
        }
    }

    const len = vertices.length;
    if (
        len >= 2 &&
        (newVertices.length === 0 ||
            vertices[len - 2] !== newVertices[newVertices.length - 2] ||
            vertices[len - 1] !== newVertices[newVertices.length - 1])
    ) {
        if (
            newVertices.length >= 2 &&
            vertices[len - 2] === newVertices[0] &&
            vertices[len - 1] === newVertices[1]
        ) {
        } else {
            newVertices.push(vertices[len - 2], vertices[len - 1]);
        }
    }

    vertices.length = 0;
    vertices.push(...newVertices);
}

/**
 * Checks if the given vertices, of the format (x1,y1,x2,y2,x3,y3,...), are
 * in counter clockwise order.
 * 
 * @param vertices      The array representing the vertices of a polygon
 * @returns             True if counter clockwise, false otherwise
 */
function isCounterClockwise(vertices: number[]): boolean {
    let sum = 0;
    for (let i = 0; i < vertices.length; i += 2) {
        const x1 = vertices[i];
        const y1 = vertices[i + 1];
        const x2 = vertices[(i + 2) % vertices.length];
        const y2 = vertices[(i + 3) % vertices.length];
        sum += (x2 - x1) * (y2 + y1);
    }
    return sum < 0;
}

/**
 * Reverses vertices, in the format (x1,y1,x2,y2,x3,y3,...), in place.
 * 
 * @param vertices      The array representing the vertices of a polygon
 */
function reverseVertices(vertices: number[]): void {
    for (let i = 0, j = vertices.length - 2; i < j; i += 2, j -= 2) {
        [vertices[i], vertices[j]] = [vertices[j], vertices[i]];
        [vertices[i + 1], vertices[j + 1]] = [vertices[j + 1], vertices[i + 1]];
    }
}

/**
 * Cleans an SVG of the form 'M 0 50 L 100 100 L 200 300 Z' to the form 
 * 'M0 50 L100 100 L200 300 Z'
 * 
 * @param svgString         The SVG string to clean up
 * @returns 
 */
function cleanSVG(svgString: string): string {
    const svgCleaned = svgString.replace(/([a-zA-Z])\s+([0-9-])/g, '$1$2');
    return svgCleaned;
}

/**
 * Returns a CUGL path for the corresponding Figma line
 * 
 * This line may or may not have rounded corners. The node returned is a path
 * node with width equal to the width of the line
 * 
 * @param node      The line node
 * @param parent    The parent of the line node
 * @param root      True if root node, false otherwise
 * 
 * @return a CUGL line for the corresponding Figma line
 */
export function genPath(node: LineNode, parent: SceneNode, root: boolean = false) : CUGLNode {
    const line = (node.strokes as Paint[])[0] as SolidPaint;
    const color = hexColor(line);

    let ypos = parent.height ? parent.height - node.height - node.y : -node.y;
        const pathCode: CUGLPathNode = {
            type: "Path",
            data: {
                anchor: [.5, .5],
                path: [0,0,roundToFixed(node.width,2), roundToFixed(node.height,2)],
                angle: node.rotation,
                position: root? [0,0] : [roundToFixed(node.x,2), roundToFixed(ypos,2)],
                visible: node.visible,
                stroke: node.strokeWeight as number,
                joint: node.strokeJoin as string,
                color: color
            },
        };
        
    return pathCode;
}

/**
 * Returns a CUGL path node for the corresponding Figma vector
 * 
 * This vector may or may not have roudned corners. The node returned is a path
 * node with width equal to the width of the vector.
 * 
 * @param node          The figma vector node
 * @param parent        The parent of the vector node
 * @param root          True if the root node, false otherwise.
 * @returns 
 */
export function genVector(node: VectorNode, parent: SceneNode, root: boolean = false): CUGLNode{
    const line = (node.strokes as Paint[])[0] as SolidPaint;
    const color = hexColor(line);

    const pathData = cleanSVG(node.vectorPaths[0].data);
    const parsedPath = parseSVGPath(pathData);
    let ypos = parent.height ? parent.height - node.height - node.y : -node.y;
        const pathCode: CUGLPathNode = {
            type: "Path",
            data: {
                anchor: [.5, .5],
                path: parsedPath.vertices,
                angle: node.rotation,
                position: root? [0,0] : [roundToFixed(node.x,2), roundToFixed(ypos,2)],
                visible: node.visible,
                stroke: node.strokeWeight as number,
                joint: node.strokeJoin as string,
                color: color
            },
        };
        
    return pathCode;
}

/**
 * Returns a CUGL rectangle for the corresponding Figma rectangle
 *
 * This rectangle may or may not have rounded corners. The node returned
 * is a polygon node if there is no stroke. Otherwise this function returns
 * a scene node containing the fill as a polygon node, and the border as a
 * path node.
 *
 * @param node      The image node
 * @param parent    The image parent
 * @param root      True if root node, false otherwise
 *
 * @return a CUGL rectangle for the corresponding Figma rectangle
 */
export function genRectangle(node: RectangleNode, parent: SceneNode, root: boolean = false) : CUGLNode {
    const fill = (node.fills as Paint[])[0] as SolidPaint;
    const fillCode = hexColor(fill);
    
    // Figma's coordinates are upside-down
    let tl = node.bottomLeftRadius;
    let tr = node.bottomRightRadius;
    let br = node.topRightRadius;
    let bl = node.topLeftRadius;
    
    const ypos = parent.height ? parent.height - node.height - node.y : -node.y;
    const polygon = roundedRect(node.width,node.height,tl,tr,br,bl);
    
    var polyCode: CUGLPolyNode;
    polyCode = {
        type: "Solid",
        data: {
            polygon,
            color: fillCode,
            anchor: [0, 0],
            position: root? [0,0] : [roundToFixed(node.x,2), roundToFixed(ypos,2)],
            visible: node.visible,
        },
    };
    
    if (node.strokes.length > 0) {
        const line = (node.strokes as Paint[])[0] as SolidPaint;
        const lineCode = hexColor(line);
        
        const epsilon = 0.5;  // To prevent round off gapping
        let sw = node.width;
        let sh = node.height;
        switch (node.strokeAlign) {
        case "INSIDE":
            sw -= (node.strokeWeight as number)-epsilon;
            sh -= (node.strokeWeight as number)-epsilon;
            tl -= (node.strokeWeight as number)-epsilon;
            tr -= (node.strokeWeight as number)-epsilon;
            br -= (node.strokeWeight as number)-epsilon;
            bl -= (node.strokeWeight as number)-epsilon;
            break;
        case "OUTSIDE":
            sw += (node.strokeWeight as number)-epsilon;
            sh += (node.strokeWeight as number)-epsilon;
            tl += (node.strokeWeight as number)-epsilon;
            tr += (node.strokeWeight as number)-epsilon;
            br += (node.strokeWeight as number)-epsilon;
            bl += (node.strokeWeight as number)-epsilon;
            break;
        }
        
        const edge = roundedRect(sw,sh,tl,tr,br,bl);
        let edgeCode = {
            type: "Path",
            data: {
                color: lineCode,
                path: {
                    vertices: edge,
                    closed: true
                },
                stroke: node.strokeWeight,
                joint: "square",
                anchor: [0.5, 0.5],
                position: [0,0],
                visible: node.visible,
            },
            layout : {
                x_anchor: "center",
                y_anchor: "middle",
            },
        };
        
        polyCode.layout = {
            x_anchor: "center",
            y_anchor: "middle",
        };
        polyCode.data.position = [0,0];
        polyCode.data.anchor = [0.5,0.5];
        
        const children : Record<string, AnchorChildType> = {};
        children["fill"] = polyCode;
        children["stroke"] = edgeCode;
        
        let esize = [roundToFixed(sw,2),roundToFixed(sh,2)];
        let fsize = [roundToFixed(node.width,2),roundToFixed(node.height,2)];
        let groupCode = {
            type: "Node",
            format: {
                type: "Anchored",
            },
            data: {
                anchor: [0, 0],
                angle: roundToFixed(node.rotation,2),
                size: node.strokeAlign == "OUTSIDE" ? esize : fsize,
                position: root? [0,0] : [roundToFixed(node.x,2), roundToFixed(ypos,2)],
                visible: node.visible,
            },
            children,
        } as CUGLNode;
    
        return groupCode;
    }
    
    polyCode.data.angle = node.rotation;
    return polyCode;
}


/**
 * Returns a CUGL ellipse for the corresponding Figma ellipse
 *
 * The node returned is a polygon node if there is no stroke. Otherwise this 
 * function returns a scene node containing the fill as a polygon node, and 
 * the border as a path node.
 *
 * @param node      The image node
 * @param parent    The image parent
 * @param root      True if root node, false otherwise
 *
 * @return a CUGL rectangle for the corresponding Figma ellipse
 */

export function genEllipse(node: EllipseNode, parent: SceneNode, root: boolean = false) : CUGLNode{
    const fill = (node.fills as Paint[])[0] as SolidPaint;
    const fillCode = hexColor(fill);
    
    const segs = curveSegs(Math.max(node.width/2.0,node.height/2.0), 2.0*Math.PI);
    const ypos = parent.height ? parent.height - node.height - node.y : -node.y;
    const polygon = ellipse(node.width,node.height,segs);
    
    var polyCode: CUGLPolyNode;
    polyCode = {
        type: "Solid",
        data: {
            polygon,
            color: fillCode,
            anchor: [0, 0],
            position: root? [0,0]:[roundToFixed(node.x,2), roundToFixed(ypos,2)],
            visible: node.visible,
        },
    };
    
    if (node.strokes.length > 0) {
        const line = (node.strokes as Paint[])[0] as SolidPaint;
        const lineCode = hexColor(line);
        
        const epsilon = 0.5;  // To prevent round off gapping
        let sw = node.width;
        let sh = node.height;
        switch (node.strokeAlign) {
        case "INSIDE":
            sw -= (node.strokeWeight as number)-epsilon;
            sh -= (node.strokeWeight as number)-epsilon;
            break;
        case "OUTSIDE":
            sw += (node.strokeWeight as number)-epsilon;
            sh += (node.strokeWeight as number)-epsilon;
            break;
        }
        
        const edge = ellipse(sw,sh,2*segs);
        let edgeCode = {
            type: "Path",
            data: {
                color: lineCode,
                path: {
                    vertices: edge,
                    closed: true
                },
                stroke: node.strokeWeight,
                joint: "square",
                anchor: [0.5, 0.5],
                position: [0,0],
                visible: node.visible,
            },
            layout : {
                x_anchor: "center",
                y_anchor: "middle",
            },
        };
        
        polyCode.layout = {
            x_anchor: "center",
            y_anchor: "middle",
        };
        polyCode.data.position = [0,0];
        polyCode.data.anchor = [0.5,0.5];
        
        const children : Record<string, AnchorChildType> = {};
        children["fill"] = polyCode;
        children["stroke"] = edgeCode;
        
        let esize = [roundToFixed(sw,2),roundToFixed(sh,2)];
        let fsize = [roundToFixed(node.width,2),roundToFixed(node.height,2)];
        let groupCode = {
            type: "Node",
            format: {
                type: "Anchored",
            },
            data: {
                anchor: [0, 0],
                angle: node.rotation,
                size: node.strokeAlign == "OUTSIDE" ? esize : fsize,
                position: root? [0,0] : [roundToFixed(node.x,2), roundToFixed(ypos,2)],
                visible: node.visible,
            },
            children,
        } as CUGLNode;
    
        return groupCode;
    }
    
    polyCode.data.angle = node.rotation;
    return polyCode;
}

/**
 * Returns a CUGL polygon for the corresponding Figma polygon
 *
 * The node returned is a polygon node using the parsed SVG path data with the
 * correct color and rotation applied.
 *
 * @param node      The polygon node
 * @param parent    The polygon parent
 * @param root      True if root node, false otherwise
 *
 * @return a CUGL polygon for the corresponding Figma polygon
 */

export async function genPolygon(node: PolygonNode, parent: SceneNode, root: boolean = false) {
	const pathData = node.fillGeometry[0].data;
    const ypos = parent.height ? parent.height - node.height - node.y : -node.y;

    const line = (node.fills as Paint[])[0] as SolidPaint;
    const color = hexColor(line);

    const { vertices, leftMostX } = parseSVGPath(pathData);

    var svgCode: CUGLPolyNode;
    svgCode = {
        type: "Solid",
        data: {
            polygon: vertices,
            anchor: [.5, .5],
            position: root? [0,0] : [roundToFixed(node.x + leftMostX,2), roundToFixed(ypos,2)],
            visible: node.visible,
            color: color,
            angle: node.rotation
        },
    };
    
    return svgCode;
}

/**
 * Returns a CUGL polygon for the corresponding Figma vector polygon
 *
 * The node returned is a complex polygon node with the path defined as the 
 * parsed SVG commands. The color and rotation of the polygon are also applied.
 *
 * @param node      The vector node
 * @param parent    The vector parent
 * @param root      True if root node, false otherwise
 *
 * @return a CUGL polygon for the corresponding Figma vector polygon
 */

export async function genVectorPolygon(node: VectorNode, parent: SceneNode, root: boolean = false) {
	const pathData = node.fillGeometry[0].data;
    const ypos = parent.height ? parent.height - node.height - node.y : -node.y;

    const line = (node.fills as Paint[])[0] as SolidPaint;
    const color = hexColor(line);

    const { vertices, leftMostX } = parseSVGPath(pathData);

    var svgCode: CUGLPolyNode;
    svgCode = {
        type: "Solid",
        data: {
            polygon: vertices,
            anchor: [.5, .5],
            position: root? [0,0] : [roundToFixed(node.x + leftMostX,2), roundToFixed(ypos,2)],
            visible: node.visible,
            color: color,
            angle: node.rotation
        },
    };
    
    return svgCode;
}