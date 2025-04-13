/*
 * slider.ts
 *
 * Module generating CUGL sliders.
 *
 * Sliders are an experimental user interface element that we support through 
 * Figma. A slider in CUGL is a scene graph node with a rectangle specifying
 * the bounds of the slider as [x,y,w,h]. The line will start at position (x,y) 
 * in the slider coordinate space and go to the opposite corner in the rectangle.
 * Hence [10,50,80,0] would create a horizontal line 80 units long starting at 
 * position (10,50) in the slider node.
 * 
 * Optionally, the user can add a knob and path in the children and properties
 * to give the slider specific textures rather than the default CUGL ones. The
 * path is just a texture that we require the user to line up appropriately with
 * the path. The knob will be treated as a button node in the Scenegraph JSON,
 * however if the user chooses to just include a texture, CUGL will wrap it in
 * a button automatically. Otherwise, the user can make the slider knob more
 * complex by creating their own button in figma.
 *
 * We naming through tagging. The slider is a instance tagged with the name 
 * "slider" as a property value. It is necessary to tag the children, if the 
 * user wants to specify a knob and path, they must create properties "Knob" 
 * and "Path" in the component and assign them the name of the nodes that 
 * correspond to each respectively.
 * 
 * They can also add additional optional properties to the sliders as mentioned
 * in the Scenegraph tutorial. These include range (a number array), value (a 
 * number representing the init value), tick (the number of ticks in the slider),
 * and snap (a boolean if the knob snaps to ticks)
 *
 * Authors: Walker White, Joaquin Rivera
 * Date: 3/13/24
 */
import { roundToFixed } from "../util";
import {
  CUGLSliderNode,
  CUGLLayoutMixin,
  CUGLChildrenMixin,
  CUGLFormatType,
} from "../types";
import {
    convertXAlign,
    convertYAlign,
    convertLayoutMode,
} from "../util";

import { genChildrenByFloat, genChildrenByAnchor } from "./children";

/**
 * Returns a slider corresponding to an annotated instance
 *
 * This function takes any instance with the property tag set as 
 * "Slider" and turns it into a slider. The only required property of a slider
 * is the bounds which is determined by a line in Figma. The line is seen as a
 * child in Figma, but that child will not be added to the resulting Scenegraph
 * JSON. If the user adds multiple LineNodes as children, only the first will be
 * treated as the path, the rest will just be included in the UI.
 * 
 * @param node      The instance to convert
 * @param parent    The parent of the instance
 *
 * @return a slider node corresponding to the given instance
 */
export async function genSlider(node: InstanceNode, parent: SceneNode) {
    if (node.children.length < 1) {
        throw new Error('Keyword "slider" attached to a node with no children',);
    }
    let newChildren: SceneNode[] = [];
    let bounds: number[] = [];
    let found = false;
    for (let ii = 0; ii < node.children.length; ii++){
        if (!found){
            if (node.children[ii].type == "LINE"){
                let line = node.children[ii];
                let angle = Math.atan2(line.relativeTransform[1][0], line.relativeTransform[0][0]);
                bounds = [line.x, line.y, Math.round(line.width * Math.cos(angle)), Math.round(line.width * Math.sin(angle))];
                found = true;
                continue;
            }
        }
        newChildren.push(node.children[ii]);
    }

    let additionalProperties = new Map<string, any>();
    for (const key in node.componentProperties) {
        additionalProperties.set(key.split('#')[0].toLowerCase(), node.componentProperties[key].value)
    }

    // Layout the children
    let children = undefined;
    let format = undefined;
    if (node.layoutMode != "NONE") {
        children = await genChildrenByFloat(node, newChildren);
        format = {
            type: "FigmaAuto",
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
        children = await genChildrenByAnchor(node, newChildren);
        format = {
            type: "Figma",
        } as CUGLFormatType;
    }
    
    let ypos = parent.height ? parent.height - node.height - node.y : -node.y;
    const sliderCode: CUGLSliderNode & CUGLChildrenMixin & CUGLLayoutMixin = {
        type: "Slider",
        format,
        data: {
            anchor: [0, 0],
            size: [roundToFixed(node.width,2), roundToFixed(node.height,2)],
            angle: node.rotation,
            position:[roundToFixed(node.x,2), roundToFixed(ypos,2)],
            visible: node.visible,
            bounds: bounds,
        },
        children,
    };
    try {
        if (additionalProperties.has("range")){
            sliderCode.data.range = parseRange(additionalProperties.get("range") as string);
        }
        if (additionalProperties.has("value")){
            sliderCode.data.value = parseFloat(additionalProperties.get("value"));
        }
        if (additionalProperties.has("tick")){
            sliderCode.data.tick = parseFloat(additionalProperties.get("tick"));
        }
        if (additionalProperties.has("snap")){
            sliderCode.data.snap = additionalProperties.get("snap");
        }
        if (additionalProperties.has("knob")){
            sliderCode.data.knob = additionalProperties.get("knob");
        }
        if (additionalProperties.has("path")){
            sliderCode.data.path = additionalProperties.get("path");
        }
    } catch (error) {
        throw new Error("At least 1 additional property is of wrong format");
    }
    
    return sliderCode;
}

/**
 * parseRange converts a string of valid range form into an array of numbers of
 * size 2. If the range is not of a valid format, it will throw an error.
 * 
 * @param input     The valid range parameter
 * @returns         An array of numbers that represents the range of the slider
 */
function parseRange(input: string): [number, number] {
    input = input.trim();

    let regex = /^[\[\(](-?\d+\.?\d*),(-?\d+\.?\d*)[\)\]]$/;

    let match = input.match(regex);

    if (match) {
        let x = parseFloat(match[1]);
        let y = parseFloat(match[2]);
        return [x, y];
    } else {
        throw new Error("Input format is invalid. Expected '(number, number)', '[number, number]', or 'number, number'.");
    }
}