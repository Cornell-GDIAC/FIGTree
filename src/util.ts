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
 * Authors: Walker White, Enoch Chen, Skyler Krouse, Aidan Campbell, Joaquin Rivera,
 * Sebastian Rivera
 * Date: 4/27/25
 */

import {
    CUGLAnchoredLayoutMixin,
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
export function roundToFixed(value: number, places: number){
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
 * The x-axis anchor value for an entity
 */
export const convertXAnchor = (
    value?: RectangleNode["constraints"]["horizontal"],
    ): CUGLAnchoredLayoutMixin["children"]["key"]["layout"]["x_anchor"] => {
    switch (value) {
    case "MIN":
        return "left";
    case "CENTER":
        return "center";
    case "MAX":
        return "right";
    case "STRETCH":
        return "left+right";
    case "SCALE":
        return "scale";
    default:
        return "left";
  }
};


/**
 * The y-axis anchor value for an entity
 */
export const convertYAnchor = (
    value?: RectangleNode["constraints"]["vertical"],
    ): CUGLAnchoredLayoutMixin["children"]["key"]["layout"]["y_anchor"] => {
    switch (value) {
    case "MIN":
        return "top";
    case "CENTER":
        return "middle";
    case "MAX":
        return "bottom";
    case "STRETCH":
        return "top+bottom";
    case "SCALE":
        return "scale";
    default:
        return "bottom";
  }
};

