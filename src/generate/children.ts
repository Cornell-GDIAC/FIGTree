/*
 * children.ts
 *
 * Module for recursively generating children in a CUGL scene graphs.
 *
 * Generating children is not a simple recursive call. That is because we have to
 * apply layouts to the children as well. We convert standard Figma layout
 * information to an anchor layout, which it maps very closely. We also 
 * provide support for auto layout which gets translated to no layout.
 *
 * Authors: Walker White, Enoch Chen, Skyler Krouse, Aidan Campbell, Joaquin Rivera,
 * Sebastian Rivera
 * Date: 4/27/25
 */
import { generateNode } from ".";
import {
    CUGLNode,
    CUGLNoLayoutMixin,
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

// Auto Layout

type AutoChildType = CUGLNode & CUGLNoLayoutMixin["children"]["key"]

/**
 * Returns a list of children arranged using No layout
 *
 * This function converts an auto layout to no layout in CUGL.
 * 
 * @param node  The parent node
 * @param children  Array of SceneNodes specifying a custom set of children.
 *
 * @return a list of children arranged using No Layout
 */
export async function genChildrenByNoLayout(node: SceneNode, children? : SceneNode[]) : Promise<Record<string, AutoChildType>> {
    const childNodes = children ?? node.children;

    const mode = ("layoutMode" in node && node.layoutMode === "HORIZONTAL");
    const startPadding = mode ? [node.paddingLeft,node.paddingBottom,node.itemSpacing,node.paddingTop]
                              : [node.paddingLeft,node.itemSpacing,node.paddingRight,node.paddingTop];
    const interPadding = mode ? [0,node.paddingBottom,node.itemSpacing,node.paddingTop]
                              : [node.paddingLeft,node.itemSpacing,node.paddingRight,0];
    const finalPadding = mode ? [0,node.paddingBottom,node.paddingRight,node.paddingTop]
                              : [node.paddingLeft,node.paddingBottom,node.paddingRight,0];
    
    const result : Record<string, AutoChildType> = {};
    const generatedChildren = await Promise.all(
        childNodes.map(async (child:SceneNode) => ({
            name: child.name,
            node: await generateNode(child),
        })),
    );
    
    generatedChildren.forEach(({ name, node }, index) => {
        const child = childNodes[index];     
        const parent = child.parent as SceneNode;
        const key = name in result ? `${name}_${index.toString()}` : name;
        
        // Recenter the node
        node.data.position = getCenter(child);
        node.data.anchor = [0.5,0.5];
        node.data.position[1] = parent.height ? parent.height - node.data.position[1] : -node.data.position[1];
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

export type AnchorChildType = CUGLNode & CUGLAnchoredLayoutMixin["children"]["key"];

/**
 * Applies layout settings to a child in an anchor layout.
 *
 * Anchor layout is the default (non-auto) layout in Figma. For the most
 * part we only need to change coordinate systems. By default, offsets are
 * measured in percentages. However, if absolute is true, they will be 
 * measured in pixels instead for either axis.
 * 
 * This matches the CUGL layout manager Figma Layout to address the constraints
 * not possible with CUGL's Anchor Layout.
 * 
 * For custom children, setPosition should be set to true so that the final
 * offsets are just (0,0).
 *
 * @param child     The scene node to layout
 * @param setPosition  True if the position of the child should be set to (0,0)
 * @param x_absolute  Whether the layout is absolute in x
 * @param y_absolute  Whether the layout is absolute in y
 */
export async function layoutByAnchor(child: SceneNode, x_absolute: boolean, y_absolute:boolean, setPosition? : boolean) : Promise<AnchorChildType> {
    const parent = child.parent as SceneNode;
    const constraints = "constraints" in child ? child.constraints : undefined;
    
    const x_anchor = convertXAnchor(constraints?.horizontal);
    const y_anchor = convertYAnchor(constraints?.vertical);
    const cuglChild = await generateNode(child);
    
    let height = child.height;
    let width = child.width;
    
    cuglChild.data.anchor = [0.5, 0.5];
    let [l_offset, t_offset] = getCenter(child);
    
    if (setPosition){
        l_offset -= child.x;
        t_offset -= child.y;
    }

    if (child.type === 'LINE') {
        const theta = child.rotation * Math.PI / 180;
        const offsetX = -Math.sin(theta) * (child.strokeWeight as number) / 2;
        const offsetY = -Math.cos(theta) * (child.strokeWeight as number) / 2;
        l_offset += offsetX;
        t_offset += offsetY;
    }
    
    t_offset = parent.height ? parent.height - t_offset : -t_offset;

    let r_offset = 0;
    let b_offset = 0;
    switch (x_anchor) {
    case "right":
        x_absolute = true;
        l_offset -= parent.width;
        break;
    case "center":
        x_absolute = true;
        l_offset -= parent.width/2;
        break;
    case "left+right":
        l_offset -= width/2;
        r_offset = parent.width - (l_offset + width);
        x_absolute = true;
        break;
    case "scale":
        l_offset -= width/2;
        r_offset = parent.width - (l_offset + width);
        break;
    case "left":
        x_absolute = true;
        break;
    }

    switch (y_anchor) {
    case "top":
        y_absolute = true;
        t_offset -= parent.height;
        break;
    case "middle":
        t_offset -= parent.height/2;
        y_absolute = true;
        break;
    case "top+bottom":
        t_offset -= height/2;
        b_offset = parent.height - (t_offset + height)
        y_absolute = true;
        break;
    case "scale":
        t_offset -= height/2;
        b_offset = parent.height - (t_offset + height)
        break;
    case "bottom":
        y_absolute = true;
        break;
    }
    
    if (!x_absolute) {
        l_offset /= parent.width;
        r_offset /= parent.width;
    }
    
    if (!y_absolute){
        t_offset /= parent.height;
        b_offset /= parent.height;
    }
    
    let left_offset = roundToFixed(l_offset,2);
    let right_offset = roundToFixed(r_offset,2);
    let top_offset = roundToFixed(t_offset,2);
    let bottom_offset = roundToFixed(b_offset,2);
    return {
        ...cuglChild,
        layout: {
            x_anchor,
            y_anchor,
            x_absolute,
            y_absolute,
            left_offset,
            right_offset,
            top_offset,
            bottom_offset,
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
 * @param node          The parent node
 * @param children      The custom children of this node
 * @param reposition    Should these children be positioned at (0,0)
 *
 * @return a list of children arranged using a anchor layout
 */
export async function genChildrenByAnchor(node: SceneNode, children? : SceneNode[], reposition?: boolean) : Promise<Record<string, AnchorChildType>> {
    // TODO: Support toggling absolute via config
    const childNodes = children ?? node.children;
    
    const x_absolute = false;
    const y_absolute = false;
    
    const result : Record<string, AnchorChildType> = {};
    const generatedChildren = await Promise.all(
        childNodes.map(async (child:SceneNode) => ({
            name: child.name,
            node: await layoutByAnchor(child,x_absolute,y_absolute,reposition),
        })),
    );
    
    generatedChildren.forEach(({ name, node }, index) => {
        const key = name in result ? `${name}_${index.toString()}` : name;
        result[key] = node;
    });
    
    return result;
}
