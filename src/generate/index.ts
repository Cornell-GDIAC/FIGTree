/*
 * index.ts
 *
 * Top level module for generating CUGL scene graphs.
 *
 * This module recursively expands the nodes into each type. We assume that
 * the top level node is a Figma frame.
 *
 * Names are assigned according the layer name in Figma. Names must be valid
 * identifiers (numbers, letters, underscore, and not beginning with a number).
 * Only the root node may not have a name.
 *
 * If a name contains a colon, then the word before the colon is a "tag", 
 * either expressing the UI element associated with this node, or (in the
 * case of complex UI elements like buttons) a parameter in the parent node.
 *
 * Authors: Walker White, Enoch Chen, Skyler Krouse, Aidan Campbell
 * Date: 1/24/24
 */

// Import the relevant types
import {
    CUGLNode,
    CUGLBaseNode,
    CUGLChildrenMixin,
    CUGLWidget,
    OutputFormat,
} from "../types";

// The relevant support functions for this package
import { genFrame } from "./frame";
import { genImage } from "./image";
import { genButton } from "./button";
import { genInstance } from "./instance";
import { genLabel, genTextField } from "./text";
import { genRectangle, genEllipse, genPolygon } from "./shape";

// Map for exporting textures
export let imageHashMap = new Map<string, string>();

// Map for exporting fonts
export let fontHashMap = new Map<string, number>();


/**
 * Returns true if the string is a valid identifier name
 *
 * @param str	The string to test
 *
 * @return true if the string is a valid identifier name
 */
function isIdentifier(str) {
    return /^[a-zA-Z_][a-zA-Z_0-9]*$/.test(str);
}

/**
 * Returns true if the string is a valid identifier name
 *
 * @param str	The string to test
 *
 * @return true if the string is a valid identifier name
 */
function makeIdentifier(str) {
	const regex = /^[a-zA-Z_0-9]*$/;
	var result = str.replace(regex,'_');
	var firstChar = result.charAt(0);
	if (firstChar < '0' || firstChar > '9') {
		result = "_"+result;
	}
	return result;
}


/**
 * Returns a CUGL node for the given Figma node
 *
 * If the node name has a colon, this looks at the keyword before the colon
 * for instructions on how to parse it.
 *
 * @param node  The Figma node
 *
 * @return a CUGL node for the given Figma node
 */
export async function generateNode(node: SceneNode): Promise<CUGLNode> {
    const parent = node.parent as SceneNode;
    
    // Parse the name
    let name = undefined;
    let special = undefined;
    if ('name' in node) {
        const components = node.name.split(":");
        if (components.length == 1) {
            name = components[0];
            if (!isIdentifier(name)) {
            	name = makeIdentifier(name);
            }
        } else if (components.length == 2) {
            special = components[0].toLowerCase();
            name = components[1];
        } else {
            throw new Error(`${node.name} has too many colons`,);
        }
    }
    
    if (parent != undefined && name == undefined) {
        throw new Error("Internal node is missing a name");
    }
    
    // Handle the special ones first
    if (special != undefined) {
        switch (special) {
        case "edit":
            return genTextField(node, parent);
        case "button":
            return genButton(node, parent);
        case "up":
        case "down":
            // These are internal parameters
            break;
        default:
            // TODO: Support 9-slice plugin
            throw new Error(`Keyword "${special}" is not recognized`,);
        }
    }
    
    // Now do the standards
    switch (node.type) {
    case "TEXT":
        return genLabel(node, parent);
    case "GROUP":
    case "FRAME":
        return genFrame(node, parent);
    case "RECTANGLE":
        if (node.fills !== figma.mixed && node.fills?.[0]?.type === "IMAGE") {
            return genImage(node, parent);
        } else {
            return genRectangle(node, parent);
        }
    case "ELLIPSE":
        return genEllipse(node, parent);
    case "INSTANCE":
        return genInstance(node, parent);
    case "COMPONENT":
        return genFrame(node, parent);
    case "POLYGON":
        return genPolygon(node, parent);
    // TODO: All of the listed ones below should be investigated
    case "COMPONENT_SET":
    case "STAR":
    default:
    	console.log("Parent:"+parent.type+","+parent.id);
    	console.log(node);
        throw new Error(`${node.name} with type ${node.type} is not explicitly supported`,);
    }
}


/**
 * Returns a default (empty) CUGL node
 *
 * The node will have no children
 * 
 * @param node      The Figma node
 * @param parent    The parent node
 *
 * @return a default (empty) CUGL node
 */
export function genDefault(node: SceneNode, parent: SceneNode) {
    let defaultCode: CUGLBaseNode & CUGLChildrenMixin = {
        type: "Node",
        data: {
            anchor: [0, 0],
            size: [node.width, node.height],
            scale: 1,
            angle: 0,
            position: [node.x, parent.height - node.y],
            visible: true,
        },
        children: {},
    };
    return defaultCode;
}


/**
 * Returns the texture information for this Figma design
 *
 * The scene graph, if it uses images, must refer to textures that
 * are loaded into CUGL. This returns the commands necessary for that
 * to happen.
 *
 * @return the texture information for this Figma design
 */
export function generateTextures(): string {
    const textures: Record<string, { file: string }> = {};
    for (const texture of imageHashMap.values()) {
        textures[texture] = { file: "textures/[filename].png" };
    }
    imageHashMap.clear();
    return JSON.stringify(textures, null, 2);
}


/**
 * Returns the font information for this Figma design
 *
 * The scene graph, if it uses text, must refer to fonts that are loaded 
 * into CUGL. This returns the commands necessary for that to happen.
 *
 * @return the texture information for this Figma design
 */
export function generateFonts(): string {
    const fonts: Record<string, { file: string, size: number }> = {};
    for (const font of fontHashMap.keys()) {
        fonts[font] = { 
            file: "fonts/[filename].png",
            size: fontHashMap.get(font)
        };
    }
    fontHashMap.clear();
    return JSON.stringify(fonts, null, 2);
}


/**
 * Returns the currently selected output format
 *
 * @return the currently selected output format
 */
const getOutputFormat = () => {
    return figma.codegen.preferences.customSettings.outputFormat as OutputFormat;
};


/**
 * Returns the CUGL scene graph from the top level node
 *
 * This function is generateNode, but with the added feature that it annotates
 * the output if the user wants a Widget instead.
 *
 * @param node  The top level node
 *
 * @return the CUGL scene graph from the top level node
 */
export const generate = async (node: SceneNode,): Promise<CUGLNode | CUGLWidget> => {
    let cuglNode = await generateNode(node);
    switch (getOutputFormat()) {
    case "node":
        return cuglNode;
    case "widget":
        return {
            variables: {},
            contents: cuglNode,
        };
    default:
        throw new Error("invalid output format");
  }
};
