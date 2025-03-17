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
export async function genNinePatch(node: InstanceNode, parent: SceneNode, root: boolean = false) {
    // Layout the children
    let children = undefined;
    let format = undefined;
    if ("layoutMode" in node && node.layoutMode != "NONE") {
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
        format = {
            type: "Anchored",
        } as CUGLFormatType;
    }

    let image = undefined;
    let patch = undefined;

    if (node.children.length != 2){
        throw new Error("A nine patch must have a valid Image and Patch child")
    }

    try{
        for (let i = 0; i<node.children.length; i++){
            if (node.children[i].type === "RECTANGLE"){
                image = node.children[i] as RectangleNode;
            } else{
                patch = node.children[i];
            }
        }
    } catch{
        throw new Error("A nine patch must have a valid Image and Patch child")
    }

    let texture = image.name;
    let patches = patch.children;

    let center = undefined;
    let corner = patches[0];
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
            size: [roundToFixed(patch.width,2), roundToFixed(patch.height,2)],
            angle: node.rotation,
            position: root? [0,0] : [roundToFixed(node.x,2), roundToFixed(ypos,2)],
            visible: node.visible,
            interior: [roundToFixed(corner.width,2), roundToFixed(corner.height,2), 
                roundToFixed(center.width*(image.width/patch.width),2), roundToFixed(center.height*(image.height/patch.height),2)],
            texture: texture,
        },
        children,
    };
    
    if (!imageHashMap.has(texture)) {
        imageHashMap.set(texture, texture);
    }

    return ninePatchCode;
}
