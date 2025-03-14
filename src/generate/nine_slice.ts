/*
 * nine_slice.ts
 *
 * Module generating CUGL nine slices.
 *
 * A nine slice in CUGL is a scene graph node with children that represent
 * all 9 slices of the image. 
 *
 * We handle this through tagging. The nine slice is a instance or component
 * tagged with the name "nine_slice" as a property value. It is necessary
 * to use this plugin to create them: 
 * https://www.figma.com/community/plugin/1219930483320755221.
 *
 * Authors: Joaquin Rivera, Sebastian Rivera
 * Date: 3/9/25
 */
import { roundToFixed } from "../util";
import {
  CUGLNineSliceNode,
  CUGLLayoutMixin,
  CUGLChildrenMixin,
  CUGLFormatType,
} from "../types";
import {
    convertXAlign,
    convertYAlign,
    convertLayoutMode,
} from "../util";

import { genChildrenByFloat, genChildrenByAnchor } from "./children";

/**
 * Returns a scene node corresponding to the given nine slice.
 *
 * @param node      The nine slice to convert
 * @param parent    The parent of the nine slice
 * @param root      True if the root node, false otherwise
 *
 * @return a scene node corresponding to the given frame or group
 */
export async function genFrame(node: ComponentNode, parent: SceneNode, root: boolean = false) {
    // Layout the children
    let children = undefined;
    let format = undefined;
    if ("layoutMode" in node && node.layoutMode != "NONE") {
        // children = await genChildrenByFloat(node);
        format = {
            type: "Float",
            x_alignment: convertXAlign(
                            node.layoutMode === "HORIZONTAL"
                                ? node.primaryAxisAlignItems
                                : node.counterAxisAlignItems,
                            ),
            y_alignment: convertYAlign(
                            node.layoutMode === "HORIZONTAL"
                                ? node.counterAxisAlignItems
                                : node.primaryAxisAlignItems,
                            ),
            orientation: convertLayoutMode(node.layoutMode),
        } as CUGLFormatType;
    } else {
        // children = await genChildrenByAnchor(node);
        format = {
            type: "Anchored",
        } as CUGLFormatType;
    }
    let slices = node.children
    let center = undefined
    if (slices.length === 9){
        center = slices[4] as RectangleNode;
    } else{
        center = slices[1] as RectangleNode; 
    }
    let ypos = parent.height ? parent.height - node.height - node.y : -node.y;
    const nineSliceCode: CUGLNineSliceNode & CUGLChildrenMixin & CUGLLayoutMixin = {
        type: "Nine_Slice",
        format,
        data: {
            anchor: [0, 0],
            size: [roundToFixed(node.width,2), roundToFixed(node.height,2)],
            angle: node.rotation,
            position: root? [0,0] : [roundToFixed(node.x,2), roundToFixed(ypos,2)],
            visible: node.visible,
            interior: [center.x, center.y],
            texture: node.name,
        },
        children,
    };
    
    return nineSliceCode;
}
