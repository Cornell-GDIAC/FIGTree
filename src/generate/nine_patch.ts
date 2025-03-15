/*
 * nine_patch.ts
 *
 * Module generating CUGL nine patches.
 *
 * A nine patch in CUGL is a scene graph node with children that represent
 * all 9 patches of the image. 
 *
 * We handle this through tagging. The nine patch is a instance or component
 * tagged with the name "nine_patch" as a property value. It is necessary
 * to use this plugin to create them: 
 * https://www.figma.com/community/plugin/1219930483320755221.
 *
 * Authors: Joaquin Rivera, Sebastian Rivera
 * Date: 3/9/25
 */
import { roundToFixed } from "../util";
import {
  CUGLNinePatchNode,
  CUGLLayoutMixin,
  CUGLChildrenMixin,
  CUGLFormatType,
} from "../types";
import {
    convertXAlign,
    convertYAlign,
    convertLayoutMode,
} from "../util";
import { imageHashMap } from "./index";

/**
 * Returns a scene node corresponding to the given nine patch.
 *
 * @param node      The nine patch to convert
 * @param parent    The parent of the nine patch
 * @param root      True if the root node, false otherwise
 *
 * @return a scene node corresponding to the given frame or group
 */
export async function genNinePatch(node: ComponentNode, parent: SceneNode, root: boolean = false) {
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

    let texture = undefined;
    if (node.componentPropertyDefinitions) {
        for (const key in node.componentPropertyDefinitions) {
            if (key.startsWith("Texture")) { // Find key that starts with "Texture"
                texture = node.componentPropertyDefinitions[key].defaultValue as string;
            }
        }
    }
    if (!texture){
        throw new Error("A nine patch must have a texture property"); 
    }

    let patches = node.children
    let center = undefined
    if (patches.length === 9){
        center = patches[4] as RectangleNode;
    } else if (patches.length === 3){
        center = patches[1] as RectangleNode; 
    } else{
        throw new Error("A nine patch needs 3 or 9 children"); 
    }
    let ypos = parent.height ? parent.height - node.height - node.y : -node.y;
    const ninePatchCode: CUGLNinePatchNode & CUGLChildrenMixin & CUGLLayoutMixin = {
        type: "NinePatch",
        format,
        data: {
            anchor: [0, 0],
            size: [roundToFixed(node.width,2), roundToFixed(node.height,2)],
            angle: node.rotation,
            position: root? [0,0] : [roundToFixed(node.x,2), roundToFixed(ypos,2)],
            visible: node.visible,
            interior: [center.x, center.y, center.width, center.height],
            texture: texture,
        },
        children,
    };
    
    if (!imageHashMap.has(texture)) {
        imageHashMap.set(texture, texture);
    }

    return ninePatchCode;
}
