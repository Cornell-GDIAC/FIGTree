/*
 * children.ts
 *
 * Module for recursively generating children in a CUGL scene graphs.
 *
 * Generating children is not a simple recursive call. That is because we have
 * apply layouts to the children as well. We convert standard Figma layout
 * information to an anchor layout, which it maps very closely. We also 
 * provide some limited support for auto layout, as it is extremely close to
 * CUGL's float layout. However, there are two important differences:
 *
 * - CUGL will wrap a layout if it cannot fit in the surrounding frame
 * - CUGL will still include invisible children in the layout process
 *
 * Designers should be aware of these when working in Figma.
 *
 * Authors: Walker White, Enoch Chen, Skyler Krouse, Aidan Campbell
 * Date: 1/24/24
 */
import { generateNode } from ".";
import {
    CUGLNode,
    CUGLFloatLayoutMixin,
    CUGLAnchoredLayoutMixin,
} from "../types";
import {
    convertXAnchor,
    convertYAnchor,
    roundToFixed,
} from "../util";


/**
 * Returns the center coordinate of the node
 *
 * Figma always anchors a node at the top left corner, but then rotates about
 * the center. So to properly handle rotated nodes, we need to compute the
 * center.
 *
 * @param node  The Figma node
 *
 * @return the center coordinate of the node
 */
function getCenter(node: SceneNode) {
    // Compute the rotational right and the rotational top
    const right = node.relativeTransform[0][0]*node.width+node.relativeTransform[0][1]*node.height+node.x;
    const top   = node.relativeTransform[1][0]*node.width+node.relativeTransform[1][1]*node.height+node.y;
    
    return [(node.x+right)/2,(node.y+top)/2];
}


// FLOAT LAYOUT

type FloatChildType = CUGLNode & CUGLFloatLayoutMixin["children"]["key"]

/**
 * Returns a list of children arranged using a float layout
 *
 * This function converts an auto layout to a float layout in CUGL. While
 * these two are very similar, there are some important differences. First
 * of all, float layout always wraps to fit the container, while Figma auto
 * layout can spill outside of the bounds of the frame.  In addition, setting
 * a node as invisible removes it from the layout, while CUGL does not do 
 * this. It is important to keep these two things in mind when designing in
 * Figma for CUGL.
 *
 * The names of the children exclude any preprocessing directives (e.g names
 * before the colon).
 * 
 * @param node  The parent node
 *
 * @return a list of children arranged using a float layout
 */
export async function genChildrenByFloat(node: SceneNode) : Promise<Record<string, FloatChildType>> {
    // TODO: Replace this space node with padding
    const mode = (node.layoutMode === "HORIZONTAL");
    const startPadding = mode ? [node.paddingLeft,node.paddingBottom,node.itemSpacing,node.paddingTop]
                              : [node.paddingLeft,node.itemSpacing,node.paddingRight,node.paddingTop];
    const interPadding = mode ? [0,node.paddingBottom,node.itemSpacing,node.paddingTop]
                              : [node.paddingLeft,node.itemSpacing,node.paddingRight,0];
    const finalPadding = mode ? [0,node.paddingBottom,node.paddingRight,node.paddingTop]
                              : [node.paddingLeft,node.paddingBottom,node.paddingRight,0];
    
    const result : Record<string, FloatChildType> = {};
    const generatedChildren = await Promise.all(
        node.children.map(async (child) => ({
            name: child.name,
            node: await generateNode(child),
        })),
    );
    
    const parent = node;
    generatedChildren.forEach(({ name, node }, index) => {
        const child = parent.children[index];
        const components = name.split(":");
        const suffix = components[components.length-1]        
        const key = suffix in result ? `${suffix}_${index.toString()}` : suffix;
        
        // Recenter the node
        node.data.position = getCenter(child);
        node.data.anchor = [0.5,0.5];
        
        const padding = (index == 0) ? startPadding : (index == generatedChildren.length-1)
                                     ? finalPadding : interPadding;
        result[key] = {
            ...node,
            layout: {
                priority: index,
                padding,
            },
        };
    });
    
    return result;
}


// ANCHOR LAYOUT

type AnchorChildType = CUGLNode & CUGLAnchoredLayoutMixin["children"]["key"];

/**
 * Applies layout settings to a child in an anchor layout.
 *
 * Anchor layout is the default (non-auto) layout in Figma. For the most
 * part we only need to change coordinate systems. By default, offsets are
 * measured in percentages. However, if absolute is true, they will be 
 * measured in pixels instead.
 *
 * @param child     The scene node to layout
 * @param absolute  Whether the layout is absolute
 */
export async function layoutByAnchor(child: SceneNode, absolute: boolean) : Promise<AnchorChildType> {
    const parent = child.parent as SceneNode;
    const constraints = "constraints" in child ? child.constraints : undefined;
    
    const [anchor_x, x_anchor] = convertXAnchor(constraints?.horizontal);
    const [anchor_y, y_anchor] = convertYAnchor(constraints?.vertical);
    const cuglChild = await generateNode(child);
    cuglChild.data.anchor = [anchor_x, anchor_y];
    
    let [x_offset, y_offset] = cuglChild.data.position || [0, 0];
    
    if (child.rotation != 0) {
        // This is not quite accurate, but neither is rotational layout
        cuglChild.data.anchor = [0.5, 0.5];
        [x_offset, y_offset] = getCenter(child);
        
        y_offset = parent.height ? parent.height - y_offset : -y_offset;
        switch (x_anchor) {
        case "right":
            x_offset -= parent.width;
            break;
        case "center":
        case "fill":
            x_offset -= parent.width/2;
            break;
        case "left":
            break;
        }

        switch (y_anchor) {
        case "top":
            y_offset -= parent.height;
            break;
        case "middle":
        case "fill":
            y_offset -= parent.height/2;
            break;
        case "bottom":
            break;
        }
    } else {
        switch (x_anchor) {
        case "center":
            x_offset += child.width/2;
            x_offset -= parent.width/2;
            break;
        case "right":
            x_offset += child.width;
            x_offset -= parent.width;
            break;
        case "left":
        case "fill":
            break;
        }

        switch (y_anchor) {
        case "middle":
            y_offset += child.height/2;
            y_offset -= parent.height/2;
            break;
        case "top":
            y_offset += child.height;
            y_offset -= parent.height;
            break;
        case "bottom":
        case "fill":
            break;
        }
    }
    
    if (!absolute) {
        x_offset /= parent.width;
        y_offset /= parent.height;
    }
    
    x_offset = roundToFixed(x_offset,2);
    y_offset = roundToFixed(y_offset,2);
    return {
        ...cuglChild,
        layout: {
            x_anchor,
            y_anchor,
            absolute,
            x_offset,
            y_offset,
        },
    };
}


/**
 * Returns a list of children arranged using an anchor layout
 *
 * Anchor layout is the default layout for Figma, and so it is an easy one
 * to convert. For the most part, we just need to make sure that the positioning
 * is accurate.
 *
 *
 * The names of the children exclude any preprocessing directives (e.g names
 * before the colon).
 * 
 * @param node  The parent node
 *
 * @return a list of children arranged using a float layout
 */
export async function genChildrenByAnchor(node: SceneNode) : Promise<Record<string, AnchorChildType>> {
    // TODO: Support toggling absolute via config
    const absolute = false;
    
    const result : Record<string, AnchorChildType> = {};
    const generatedChildren = await Promise.all(
        node.children.map(async (child) => ({
            name: child.name,
            node: await layoutByAnchor(child,absolute),
        })),
    );
    
    generatedChildren.forEach(({ name, node }, index) => {
        const components = name.split(":");
        const suffix = components[components.length-1]
        const key = suffix in result ? `${suffix}_${index.toString()}` : suffix;
        result[key] = node;
    });
    
    return result;
}
