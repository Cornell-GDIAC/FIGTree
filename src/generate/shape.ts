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
 * Returns a CUGL rectangle for the corresponding Figma rectangle
 *
 * This rectangle may or may not have rounded corners. The node returned
 * is a polygon node if there is no stroke. Otherwise this function returns
 * a scene node containing the fill as a polygon node, and the border as a
 * path node.
 *
 * @param node      The image node
 * @param parent    The image parent
 *
 * @return a CUGL rectangle for the corresponding Figma rectangle
 */
export function genRectangle(node: RectangleNode, parent: SceneNode) {
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
            position: [roundToFixed(node.x,2), roundToFixed(ypos,2)],
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
            sw -= node.strokeWeight-epsilon;
            sh -= node.strokeWeight-epsilon;
            tl -= node.strokeWeight-epsilon;
            tr -= node.strokeWeight-epsilon;
            br -= node.strokeWeight-epsilon;
            bl -= node.strokeWeight-epsilon;
            break;
        case "OUTSIDE":
            sw += node.strokeWeight-epsilon;
            sh += node.strokeWeight-epsilon;
            tl += node.strokeWeight-epsilon;
            tr += node.strokeWeight-epsilon;
            br += node.strokeWeight-epsilon;
            bl += node.strokeWeight-epsilon;
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
                position: [roundToFixed(node.x,2), roundToFixed(ypos,2)],
                visible: node.visible,
            },
            children,
        };
    
        return groupCode;
    }
    
    polyCode.data.angle = node.rotation;
    return polyCode;
}


/**
 * Returns a CUGL ellipse for the corresponding Figma rectangle
 *
 * The node returned is a polygon node if there is no stroke. Otherwise this 
 * function returns a scene node containing the fill as a polygon node, and 
 * the border as a path node.
 *
 * @param node      The image node
 * @param parent    The image parent
 *
 * @return a CUGL ellipse for the corresponding Figma rectangle
 */

export function genEllipse(node: EllipseNode, parent: SceneNode) {
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
            position: [roundToFixed(node.x,2), roundToFixed(ypos,2)],
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
            sw -= node.strokeWeight-epsilon;
            sh -= node.strokeWeight-epsilon;
            break;
        case "OUTSIDE":
            sw += node.strokeWeight-epsilon;
            sh += node.strokeWeight-epsilon;
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
                position: [roundToFixed(node.x,2), roundToFixed(ypos,2)],
                visible: node.visible,
            },
            children,
        };
    
        return groupCode;
    }
    
    polyCode.data.angle = node.rotation;
    return polyCode;
}

/**
 * Returns a CUGL polygon for the corresponding Figma rectangle
 *
 * The node returned is a polygon node if there is no stroke. Otherwise this 
 * function returns a scene node containing the fill as a polygon node, and 
 * the border as a path node.
 *
 * @param node      The image node
 * @param parent    The image parent
 *
 * @return a CUGL ellipse for the corresponding Figma rectangle
 */

export async function genPolygon(node: PolygonNode, parent: SceneNode) {
	const svg = await node.exportAsync({ format: 'SVG_STRING' })
    const ypos = parent.height ? parent.height - node.height - node.y : -node.y;

    var svgCode: CUGLSVGNode;
    svgCode = {
        type: "SVG",
        data: {
            commands: svg,
            anchor: [0, 0],
            position: [roundToFixed(node.x,2), roundToFixed(ypos,2)],
            visible: node.visible,
            rotation: node.rotation
        },
    };
    
    return svgCode;
}