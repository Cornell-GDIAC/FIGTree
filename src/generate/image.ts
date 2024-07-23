/*
 * image.ts
 *
 * Module generating CUGL image nodes.
 *
 * Unlike Figma, CUGL does not support mixed paints. Mixed paints requires
 * the presence of multiple objects in the scene graph. This is a future
 * project.
 *
 * Authors: Walker White, Enoch Chen, Skyler Krouse, Aidan Campbell
 * Date: 1/24/24
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
 *
 * @return an image node for the corresponding Figma rectangle
 */
export function genImage(node: RectangleNode, parent: SceneNode) {
    if (node.fills === figma.mixed || node.fills?.[0]?.type !== "IMAGE") {
        throw new Error("Unsupported rectangular object in Figma graph");
    }
    
    console.log(node.fills);
    
    const imageFill = node.fills[0];
    const imageHash = imageFill.imageHash!;
    let texture = node.name;
    if (texture.includes(":")) {
        const components = texture.split(":");
        texture = components[components.length-1];
    }
    
    let ypos = parent.height ? parent.height - node.height - node.y : -node.y;
    
    var imageCode: CUGLImageNode;
    imageCode = {
        type: "Image",
        data: {
            texture,
            anchor: [0, 0],
            size: [roundToFixed(node.width,2),roundToFixed(node.height,2)],
            angle: node.rotation,
            position: [roundToFixed(node.x,2), roundToFixed(ypos,2)],
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


// TODO: Support https://www.figma.com/community/plugin/1219930483320755221
/**
 * Returns an nine patch for the corresponding rectangle
 * 
 * This is a placeholder for an unimplemented feature. Right now, we just
 * represent ninepatches as colored rectangles.
 *
 * @param node      The nine patch node
 * @param parent    The nine patch parent
 *
 * @return an nine patch for the corresponding rectangle
 *
export async function genNinePatch(name: string, node: RectangleNode, parent: SceneNode) {
    if (node.fills === figma.mixed || node.fills?.[0]?.type === "IMAGE") {
        throw new Error("Nine patches must be prototyped as colored rectangles");
    }
    
    const imageFill = node.fills[0];
    const imageHash = imageFill.imageHash!;
    let texture = node.name;
    if (texture.includes(":")) {
        const components = texture.split(":");
        texture = components[components.length-1];
    }
    
    let scale = 1;
    if (imageFill.scaleMode === "TILE" && imageFill.scalingFactor) {
        scale = imageFill.scalingFactor;
    } else {
        try {
            const image = figma.getImageByHash(imageHash);
            // this needs to be called first for getSizeAsync to work (bug?)
            await image?.getBytesAsync();
            const originalSize = await image?.getSizeAsync();
            if (originalSize) {
                const widthScale = node.width / originalSize.width;
                const heightScale = node.height / originalSize.height;
                scale = Math.min(widthScale, heightScale);
            }
        } catch (_) {}
    }

    var imageCode: CUGLNinePatchNode | CUGLImageNode;
    texture = ninepatchMatch[1].trim();
    imageCode = {
        type: "Nine",
        data: {
            texture,
            interior: [-1, -1, -1, -1],
            anchor: [0, 0],
            // size: [node.width, node.height],
            scale,
            angle: 0,
            position: parent.height
                ? [node.x, parent.height - node.height - node.y]
                : [0, 0],
            visible: true,
        },
    };

    if (imageHashMap.has(imageHash)) {
        texture = imageHashMap.get(imageHash)!;
    } else {
        imageHashMap.set(imageHash, texture);
    }
    
    return imageCode;
}
*/