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
 * Special UI elements are implemented through instances and components. They
 * are marked by the component property "Tag". The value of the property is
 * the type of special UI to implement. Users are expected to follow the
 * specification for creating each special UI type in figma.
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
import { genInstance } from "./instance";
import { genLabel } from "./text";
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
function isIdentifier(str:string) {
    return /^[a-zA-Z_][a-zA-Z_0-9]*$/.test(str);
}

/**
 * Returns true if the string is a valid identifier name
 *
 * @param str	The string to test
 *
 * @return true if the string is a valid identifier name
 */
function makeIdentifier(str:string) {
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
 *
 * @param node  The Figma node
 *
 * @return a CUGL node for the given Figma node
 */
export async function generateNode(node: SceneNode): Promise<CUGLNode> {
    const parent = node.parent as SceneNode;
    
    if (parent != undefined && node.name == undefined) {
        throw new Error("Internal node is missing a name");
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
            size: fontHashMap.get(font) as number
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
