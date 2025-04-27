/*
 * image.ts
 *
 * Module generating CUGL image nodes.
 *
 * Unlike Figma, CUGL does not support mixed paints. Mixed paints requires
 * the presence of multiple objects in the scene graph. This is a future
 * project.
 *
 * Authors: Walker White, Enoch Chen, Skyler Krouse, Aidan Campbell, Joaquin Rivera,
 * Sebastian Rivera
 * Date: 4/27/25
 */
import { CUGLImageNode } from "../types";
import { imageHashMap } from "./index";
import { roundToFixed } from "../util";

/**
 * Returns an image node for the corresponding Figma rectangle
 * 
 * This function assumes that the rectangle is textured with an image. It 
 * does not tint the image, as Figma does not support tinting. If any
 * scaling factor is applied to the image, it will be resized to match in
 * CUGL.
 *
 * Adding an image will require that addition of a texture. The texture will
 * have the same name as this layer. It is the responsibility of the developer
 * to map this texture to the appropriate file.
 *
 * @param node      The image node
 * @param parent    The image parent
 * @param root      True if root node, otherwise false
 *
 * @return an image node for the corresponding Figma rectangle
 */
export function genImage(node: RectangleNode, parent: SceneNode, root: boolean = false) {
    if (node.fills === figma.mixed || node.fills?.[0]?.type !== "IMAGE") {
        throw new Error("Unsupported rectangular object in Figma graph");
    }
    
    const imageFill = node.fills[0];
    const imageHash = imageFill.imageHash!;
    let texture = node.name;
    
    let ypos = parent.height ? parent.height - node.height - node.y : -node.y;
    
    var imageCode: CUGLImageNode;
    imageCode = {
        type: "Image",
        data: {
            texture,
            anchor: [0, 0],
            size: [roundToFixed(node.width,2),roundToFixed(node.height,2)],
            angle: node.rotation,
            position: root? [0,0] : [roundToFixed(node.x,2), roundToFixed(ypos,2)],
            visible: node.visible,
        },
    };
    
    if (imageHashMap.has(imageHash)) {
        texture = imageHashMap.get(imageHash)!;
    } else {
        imageHashMap.set(imageHash, texture);
    }
    
    return imageCode;
}