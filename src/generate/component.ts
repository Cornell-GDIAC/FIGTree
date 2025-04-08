/*
 * component.ts
 *
 * Module generating CUGL generic scene nodes.
 *
 * In CUGL, scene nodes are used to group together individual elements into a
 * single coordinate space. They serve the same purpose as frames in Figma.
 *
 * Authors: Walker White, Enoch Chen, Skyler Krouse, Aidan Campbell
 * Date: 1/24/24
 */
import { roundToFixed } from "../util";
import {
  CUGLBaseNode,
  CUGLLayoutMixin,
  CUGLChildrenMixin,
  CUGLFormatType,
} from "../types";
import {
    convertXAlign,
    convertYAlign,
    convertLayoutMode,
} from "../util";
import { 
    genChildrenByFloat, 
    genChildrenByAnchor 
} from "./children";
import { genTextField } from "./text";
import { genProgress } from "./progress";
import { genNinePatch } from "./nine_patch";

/**
 * Returns a component node corresponding to the given frame
 *
 * This function checks whether the component is a special
 * UI element and generates each accordingly.
 *
 * @param node      The component to convert
 * @param parent    The parent of the component
 * @param root      True if root node, false otherwise
 *
 * @return an component node corresponding to the given component
 */
export async function genComponent(node: ComponentNode, parent: SceneNode, root: boolean = false) {
    let children = undefined;
    let format = undefined;
    if (node.layoutMode != "NONE") {
        children = await genChildrenByFloat(node);
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
        }as CUGLFormatType; 
    } else {
        children = await genChildrenByAnchor(node);
        format = {
            type: "FigmaAnchored",
        }as CUGLFormatType;
    }
    
    const frameCode: CUGLBaseNode & CUGLChildrenMixin & CUGLLayoutMixin = {
        type: "Node",
        format,
        data: {
            anchor: [0, 0],
            size: [roundToFixed(node.width,2), roundToFixed(node.height,2)],
            angle: node.rotation,
            position: root? [0,0] : [roundToFixed(node.x,2), roundToFixed(node.y,2)],
            visible: node.visible,
        },
        children,
    };
    
    return frameCode;
}
