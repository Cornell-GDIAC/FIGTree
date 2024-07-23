/*
 * text.ts
 *
 * Module generating CUGL text nodes.
 *
 * We support both label and text field nodes. A text field in Figma is simply
 * a text object with the tag "edit" before its name.
 *
 * Authors: Walker White, Enoch Chen, Skyler Krouse, Aidan Campbell
 * Date: 1/24/24
 */
import { CUGLLabelNode, CUGLTextFieldNode, CUGLChildrenMixin } from "../types";
import { convertTextAlignVertical, convertTextAlignHorizontal, hexColor } from "../util";
import { fontHashMap } from "./index";

/**
 * Returns an (uneditable) label for the given text node
 *
 * Adding a lable will require that addition of a font. The font will have a
 * name generated from its family, style, and size. It is the responsibility
 * of the developer to map this fint to the appropriate file.
 *
 * @param node      The image node
 * @param parent    The image parent
 *
 * @return an (uneditable) label for the given text node
 */
export function genLabel(node: TextNode, parent: SceneNode) {
    // Construct color array for the foreground
    const color = (node.fills as Paint[])[0] as SolidPaint;
    const colorCode = hexColor(color);
    
    // Get the font name and size
    let fname  = (node.fontName as FontName).family.toLowerCase();
    let fstyle = (node.fontName as FontName).style.toLowerCase();
    fstyle = fstyle[0].toUpperCase() + fstyle.slice(1);
    let fsize  = node.fontSize;
    const fkey = fname+fstyle+fsize;
    
    // TODO: Not sure how to get padding
    let ypos = parent.height ? parent.height - node.height - node.y : -node.y;
    let textCode: CUGLLabelNode & CUGLChildrenMixin = {
        type: "Label",
        data: {
            anchor: [0, 0],
            size: [node.width, node.height],
            position: [node.x, ypos],
            angle: node.rotation,
            visible: node.visible,
            font: fkey,
            text: node.characters,
            foreground: colorCode,
            // There is no way to set the background in Figma!
            background: "#00000000",
            // Padding is calculated by offset from the edge Figma
            padding: [0, 0, 0, 0],
            valign: convertTextAlignVertical(node.textAlignVertical),
            halign: convertTextAlignHorizontal(node.textAlignHorizontal),
        },
        children: {},
    };
    
    if (!fontHashMap.has(fkey)) {
        fontHashMap.set(fkey, fsize);
    }
    
    return textCode;
}


/**
 * Returns an editable text field for the given text node
 *
 * Adding a lable will require that addition of a font. The font will have a
 * name generated from its family, style, and size. It is the responsibility
 * of the developer to map this fint to the appropriate file.
 *
 * @param node      The image node
 * @param parent    The image parent
 *
 * @return an editable text field for the given text node
 */
export function genTextField(node: TextNode, parent: SceneNode) {
    if (node.type != "TEXT") {
        throw new Error('Keyword "edit" attached to non-text node',);
    }
    
    // Construct color array for the foreground
    const color = (node.fills as Paint[])[0] as SolidPaint;
    const colorCode = hexColor(color);
    
    // Get the font name and size
    let fname  = (node.fontName as FontName).family.toLowerCase();
    let fstyle = (node.fontName as FontName).style.toLowerCase();
    fstyle = fstyle[0].toUpperCase() + fstyle.slice(1);
    let fsize  = node.fontSize;
    const fkey = fname+fstyle+fsize;
    
    // TODO: Not sure how to get padding
    let ypos = parent.height ? parent.height - node.height - node.y : -node.y;
    let textCode: CUGLTextFieldNode & CUGLChildrenMixin = {
        type: "TextField",
        data: {
            anchor: [0, 0],
            size: [node.width, node.height],
            position: [node.x, ypos],
            visible: node.visible,
            font: fkey,
            text: node.characters,
            cursor: true,
            cursorwidth: Math.round(fsize/10),
            cursorcolor: colorCode,
            foreground: colorCode,
            // There is no way to set the background in Figma!
            background: "#00000000",
            // Padding is calculated by offset from the edge Figma
            padding: [0, 0, 0, 0],
            valign: convertTextAlignVertical(node.textAlignVertical),
            halign: convertTextAlignHorizontal(node.textAlignHorizontal),
        },
        children: {},
    };
    
    if (!fontHashMap.has(fkey)) {
        fontHashMap.set(fkey, fsize);
    }
    
    return textCode;
}