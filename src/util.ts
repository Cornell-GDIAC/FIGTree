/**
 * utils.ts
 *
 * Layout manager utilities for scene graphs.
 *
 * This module converts from Figma layout constraints to a CUGL layout manager.
 * Currently, not all options are supported.
 *
 * This module also contains several other utility functions.
 *
 * Authors: Walker White, Enoch Chen, Skyler Krouse, Aidan Campbell
 * Date: 1/24/24
 */

import {
    CUGLAnchoredLayoutMixin,
    CUGLFloatLayoutMixin,
    CUGLLabelNode,
} from "./types";


/**
 * Returns a number rounded to the specified number of decimal places
 *
 * @param value		The number of rounds
 * @param places	The number of decimals to round to
 *
 * @return a number rounded to the specified number of decimal places
 */
export function roundToFixed(value, places){
	let epsilon = 0.00001;
	if (value < epsilon && value > -epsilon) {
		return 0;
	}

	let rounder = Math.pow(10, places);
	return (Math.round(value * rounder) / rounder);
}


/**
 * Returns the hex equivalent of a color array
 *
 * @param color	The color code
 *
 * @return the hex equivalent of a color array
 */
export function hexColor(color: SolidPaint) {
	if (color.color == undefined) {
		return "#ffffffff";
	}

    const colorArray: [number, number, number, number] = [
        Math.round(color.color.r * 255),
        Math.round(color.color.g * 255),
        Math.round(color.color.b * 255),
        Math.round((color.opacity || 1) * 255),
    ];

	let result = "#";
	for(var item of colorArray) {
		let comp = item.toString(16);
		if (comp.length == 1) {
			comp = "0"+comp;
		}
		result += comp;
	}
	return result;
}


/**
 * The supported vertical alignments for text
 *
 * See CUTextLayout.h in CUGL for an explanation of the conversion.
 */
export const convertTextAlignVertical = (value: TextNode["textAlignVertical"],
    ): CUGLLabelNode["data"]["valign"] => {
    switch (value) {
    case "BOTTOM":
        return "bottom";
    case "TOP":
        return "top";
    case "CENTER":
        return "middle";
    }
};


/**
 * The supported horizontal alignments for text
 *
 * See CUTextLayout.h in CUGL for an explanation of the conversion.
 */
export const convertTextAlignHorizontal = (value: TextNode["textAlignHorizontal"],
    ): CUGLLabelNode["data"]["halign"] => {
    switch (value) {
    case "LEFT":
        return "left";
    case "CENTER":
        return "center";
    case "RIGHT":
        return "right";
    case "JUSTIFIED":
        return "justify";
    }
};


/**
 * The supported layout modes for a FloatLayout
 */
export const convertLayoutMode = (value: Exclude<AutoLayoutMixin["layoutMode"], "NONE">,
    ): CUGLFloatLayoutMixin["format"]["orientation"] => {
    switch (value) {
    case "HORIZONTAL":
        return "horizontal";
    case "VERTICAL":
        return "vertical";
    }
};


/**
 * The x-axis alignment for FloatLayout and AnchorLayout
 */
export const convertXAlign = (
    value:
        | FrameNode["primaryAxisAlignItems"]
        | FrameNode["counterAxisAlignItems"],
    ): CUGLFloatLayoutMixin["format"]["x_alignment"] => {
    switch (value) {
    case "MIN":
        return "left";
    case "MAX":
        return "right";
    case "CENTER":
        return "center";
    case "SPACE_BETWEEN":
        return "space between";
    case "BASELINE":
        return "baseline";
        //throw new Error(`${value} is not supported`);
  }
};


/**
 * The y-axis alignment for FloatLayout and AnchorLayout
 */
export const convertYAlign = (
    value:
        | FrameNode["primaryAxisAlignItems"]
        | FrameNode["counterAxisAlignItems"],
    ): CUGLFloatLayoutMixin["format"]["y_alignment"] => {
    switch (value) {
    case "MIN":
        return "top";
    case "MAX":
        return "bottom";
    case "CENTER":
        return "middle";
    case "SPACE_BETWEEN":
        return "space between";
    case "BASELINE":
        return "baseline";
        //throw new Error(`${value} is not supported`);
  }
};


/**
 * The x-axis anchor value for an entity
 */
export const convertXAnchor = (
    value?: RectangleNode["constraints"]["horizontal"],
    ): [
        number,
        CUGLAnchoredLayoutMixin["children"]["key"]["layout"]["x_anchor"],
    ] => {
    switch (value) {
    case "MIN":
        return [0, "left"];
    case "CENTER":
        return [0.5, "center"];
    case "MAX":
        return [1, "right"];
    case "STRETCH":
        return [0.5, "fill"];
    case "SCALE":
    default:
        return [0, "left"];
  }
};


/**
 * The y-axis anchor value for an entity
 */
export const convertYAnchor = (
    value?: RectangleNode["constraints"]["vertical"],
    ): [
        number,
        CUGLAnchoredLayoutMixin["children"]["key"]["layout"]["y_anchor"],
    ] => {
    switch (value) {
    case "MIN":
        return [1, "top"];
    case "CENTER":
        return [0.5, "middle"];
    case "MAX":
        return [0, "bottom"];
    case "STRETCH":
        return [0.5, "fill"]
    case "SCALE":
    default:
        return [0, "bottom"];
  }
};

