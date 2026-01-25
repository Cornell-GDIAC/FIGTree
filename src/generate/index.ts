/*
 * index.ts
 *
 * Top level module for generating CUGL scene graphs.
 *
 * This module recursively expands the nodes into each type. We assume that
 * the top level node is a Figma frame.
 *
 * Special UI elements are implemented through instances and components. They
 * are marked by the component property "Tag". The value of the property is
 * the type of special UI to implement. Users are expected to follow the
 * specification for creating each special UI type in figma. Users are also expected
 * to use instances in the figma scene rather than the component itself.
 *
 * Authors: Walker White, Enoch Chen, Skyler Krouse, Aidan Campbell, Joaquin Rivera,
 * Sebastian Rivera
 * Date: 4/27/25
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
import { genRectangle, genEllipse, genPolygon, genPath, genVector, genVectorPolygon } from "./shape";
import { genComponent } from "./component";

// Map for exporting textures
export let imageHashMap = new Map<string, string>();

// Map for exporting fonts
export let fontHashMap = new Map<string, number>();

/**
 * Returns a CUGL node for the given Figma node
 *
 *
 * @param node  The Figma node
 * @param root  True if this is the root node, false otherwise. If not included,
 * the default value is false.
 * 
 * @return a CUGL node for the given Figma node
 */
export async function generateNode(node: SceneNode, root : boolean = false): Promise<CUGLNode> {
    const parent = node.parent as SceneNode;
    
    if (parent != undefined && node.name == undefined) {
        throw new Error("Internal node is missing a name");
    }
    
    // Now do the standards
    switch (node.type) {
    case "TEXT":
        return genLabel(node, parent, root);
    case "GROUP":
    case "FRAME":
        return genFrame(node, parent, root);
    case "RECTANGLE":
        if (node.fills !== figma.mixed && node.fills?.[0]?.type === "IMAGE") {
            return genImage(node, parent, root);
        }
        return genRectangle(node, parent, root);
    case "LINE":
        return genPath(node, parent, root); 
    case "VECTOR":
        if (node.fillGeometry.length > 0) {
            return genVectorPolygon(node, parent, root);
        }
        return genVector(node, parent, root);
    case "ELLIPSE":
        return genEllipse(node, parent, root);
    case "INSTANCE":
        return genInstance(node, parent, root);
    case "COMPONENT":
        return genComponent(node, parent, root);
    case "POLYGON":
        return genPolygon(node, parent, root);
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
 * @param root  True if this is the root node, false otherwise
 *
 * @return the CUGL scene graph from the top level node
 */
export const generate = async (node: SceneNode, root : boolean = false): Promise<CUGLNode | CUGLWidget> => {
    let cuglNode = await generateNode(node, root);
    switch (getOutputFormat()) {
    case "node":
        return cuglNode;
    case "widget":
        cuglNode.data.anchor = [0.5, 0.5]; // Layout manager applied to widget instance (layout manager requires centered anchor)
        return {
            variables: {},
            contents: cuglNode,
        };
    default:
        throw new Error("invalid output format");
  }
};
