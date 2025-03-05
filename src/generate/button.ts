/*
 * button.ts
 *
 * Module generating CUGL buttons.
 *
 * Buttons are the primary user interface element that we support through 
 * Figma. A button in CUGL is a scene graph node with a child representing
 * the up position, and an optional child representing the down node. 
 *
 * We handle this through tagging. The button is a instance or component
 * tagged with the name "Button" as a property value. It is not necessary 
 * to tag the children, however if the user wants to specify an up and down
 * they must label the images "up" and "down" respecively.
 * 
 * It is not necessary to label the textures if there is only one child of
 * the button. It will be treated as "up".
 *
 * Authors: Walker White, Enoch Chen, Skyler Krouse, Aidan Campbell
 * Date: 1/24/24
 */
import { roundToFixed } from "../util";
import {
  CUGLButtonNode,
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
 * Returns a button corresponding to an annotated instance or component
 *
 * This function takes any instance with the property tag set as 
 * "Button" and turns it into a button. If there is only one variant, that is 
 * the up node. Otherwise it looks for a varaint named "up". If there is no such 
 * node, it picks the first one.
 * 
 * This function will only create a down node if there is a variant named "down".
 *
 * @param node      The instance to convert
 * @param parent    The parent of the instance
 *
 * @return a scene node corresponding to the given instance
 */
export async function genButton(node: InstanceNode, parent: SceneNode) {
    let isComponentSet = false;
    if (node.componentProperties) {
        for (const key in node.componentProperties) {
            if (key.toLowerCase() === "state" && node.componentProperties[key].type === "VARIANT") {
                isComponentSet = true;
            }
        }
    }
    if (isComponentSet){
        genButtonFromComponentSet(node, parent);
    } else {
        genButtonFromComponent(node, parent);
    }
}

/**
 * Returns a button described by a component with no variants.
 * 
 * This function takes an instance with the property tag set as 
 * "Button" and turns it into a button. As there are no variants to the
 * component, the component described will be treated as the "up" state
 * of the button while no "down" state is described.
 *
 * @param node      The instance to convert
 * @param parent    The parent of the instance
 *
 * @return a scene node corresponding to the given instance or component set
 */
async function genButtonFromComponent(node: InstanceNode, parent: SceneNode){
    if (node.children.length != 1) {
        throw new Error('Keyword "button" attached to a node with no children or more than 1 child',);
    }
    // 1) Check if the instance state is valid
    // 2) Acquire the component set
    // 3) Loop through each of the children, parse name, compare to settings of instance but with opposite state
    //      3.1) Use Map to parse name and assign each variant to a value
    // 4) Throw error if up state is not found, don't assign down if not found
    
    let firstButton = "";
    let name = node.children[0].name;
    if (name != undefined) {
        firstButton = name;
    }
    
    // Layout the children
    let children = undefined;
    let format = undefined;
    if (node.layoutMode != "NONE") {
        children = await genChildrenByFloat(node);
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
        children = await genChildrenByAnchor(node);
        format = {
            type: "Anchored",
        } as CUGLFormatType;
    }
    
    let ypos = parent.height ? parent.height - node.height - node.y : -node.y;
    const buttonCode: CUGLButtonNode & CUGLChildrenMixin & CUGLLayoutMixin = {
        type: "Button",
        format,
        data: {
            anchor: [0, 0],
            size: [roundToFixed(node.width,2), roundToFixed(node.height,2)],
            angle: node.rotation,
            position:[roundToFixed(node.x,2), roundToFixed(ypos,2)],
            visible: node.visible,
            upnode: firstButton,
        },
        children,
    };
    
    return buttonCode;
}

/**
 * Returns a button described by a component with varaints.
 * 
 * This function takes an instance with the property tag set as 
 * "Button" and turns it into a button. The "up" state will be assigned to
 * the variant with name "up" and the "down" state will be assigned to the
 * variant with name "down". In the case that no variant has name "down",
 * no down state will be assigned. In the case that no variant is named "up",
 * the default state will be assigned to "up".
 *
 * @param node      The instance to convert
 * @param parent    The parent of the instance
 *
 * @return a scene node corresponding to the given instance or component
 */
async function genButtonFromComponentSet(node: InstanceNode, parent: SceneNode){
    if (node.children.length == 0) {
        throw new Error('Keyword "button" attached to a node with no children',);
    }
    
    if (!node.mainComponent?.parent){
        throw new Error('Error with how component set and instance were defined')
    }

    let componentSet = node.mainComponent.parent

    let buttonNames: Record<string, string> = {};
    let realNames: Record<string, string> = {};
    let firstButton = "";
    if (componentSet.children.length == 1) {
        let name = node.children[0].name;
        if (name != undefined) {
            buttonNames["up"] = name.split("=")[1];
            realNames["up"] = name;
            firstButton = name;
        }
    } else {
        for (let ii = 0; ii < node.children.length; ii++) {
            let name = node.children[ii].name;
            if (name != undefined) {
                buttonNames[name] = name;
                if (ii == 0) {
                    firstButton = name;
                }
            }
        }
    }
    
    // Layout the children
    let children = undefined;
    let format = undefined;
    if (node.layoutMode != "NONE") {
        children = await genChildrenByFloat(node);
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
        children = await genChildrenByAnchor(node);
        format = {
            type: "Anchored",
        } as CUGLFormatType;
    }
    
    let ypos = parent.height ? parent.height - node.height - node.y : -node.y;
    const buttonCode: CUGLButtonNode & CUGLChildrenMixin & CUGLLayoutMixin = {
        type: "Button",
        format,
        data: {
            anchor: [0, 0],
            size: [roundToFixed(node.width,2), roundToFixed(node.height,2)],
            angle: node.rotation,
            position:[roundToFixed(node.x,2), roundToFixed(ypos,2)],
            visible: node.visible,
            upnode: "up" in buttonNames ? realNames["up"] : firstButton,
        },
        children,
    };
    
    if ("down" in buttonNames) {
        buttonCode.data.downnode = buttonNames["down"];
    }
    
    return buttonCode;
}