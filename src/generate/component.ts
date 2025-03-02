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
import { genButton } from "./button";
import { genTextField } from "./text";

/**
 * Returns a component node corresponding to the given frame
 *
 * This function checks whether the component is a special
 * UI element and generates each accordingly.
 *
 * @param node      The component to convert
 * @param parent    The parent of the component
 *
 * @return an component node corresponding to the given component
 */
export async function genComponent(node: ComponentNode, parent: SceneNode) {
    let tag = undefined;
    if (node.componentPropertyDefinitions) {
        for (const key in node.componentPropertyDefinitions) {
            if (key.startsWith("Tag")) { // Find key that starts with "Tag"
                tag = node.componentPropertyDefinitions[key].defaultValue;
            }
        }
    }
    if (typeof(tag) === 'string'){
        switch(tag.toLowerCase()){
            case "Button":
                return genButton(node, parent);
            case "TextField":
                return genTextField(node.children[0] as TextNode, parent);
            default:
                break;
        }
    }
    // Layout the children
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
            type: "Anchored",
        }as CUGLFormatType;
    }
    
    let ypos = parent.height ? parent.height - node.height - node.y : -node.y;
    const frameCode: CUGLBaseNode & CUGLChildrenMixin & CUGLLayoutMixin = {
        type: "Node",
        format,
        data: {
            anchor: [0, 0],
            size: [roundToFixed(node.width,2), roundToFixed(node.height,2)],
            angle: node.rotation,
            position: [roundToFixed(node.x,2), roundToFixed(ypos,2)],
            visible: node.visible,
        },
        children,
    };
    
    return frameCode;
}
