/*
 * button.ts
 *
 * Module generating CUGL buttons.
 *
 * Buttons are the primary user interface element that we support through 
 * Figma. A button in CUGL is a scene graph node with a child representing
 * the up position, and an optional child representing the down node. 
 *
 * We handle this through tagging. The button is a instance of a component
 * tagged with the name "Button" as a property value. It is not necessary 
 * to tag the children, however if the user wants to specify an up and down
 * they must label the images "up" and "down" respectively.
 * 
 * It is not necessary to label the textures if there is only one child of
 * the button. It will be treated as "up".
 *
 * Authors: Walker White, Enoch Chen, Skyler Krouse, Aidan Campbell, Joaquin Rivera,
 * Sebastian Rivera
 * Date: 4/27/25
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
 * Returns a button corresponding to an annotated instance
 *
 * This function takes the instance given and turns it into a button.If there is 
 * only one variant, that is the up node. Otherwise it looks for a varaint named 
 * "up". If there is no such node, it picks the first one.
 * 
 * This function will only create a down node if there is a variant named "down".
 * 
 * This function should only be called on instances with the property "Button".
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
        return genButtonFromComponentSet(node, parent);
    } else {
        return genButtonFromComponent(node, parent);
    }
}

/**
 * Returns a button described by a component with no variants.
 * 
 * This function takes an instance and turns it into a button. As there are no 
 * variants to the component, the component described will be treated as the "up" 
 * state of the button, as no "down" state was described. 
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
        children = await genChildrenByAnchor(node);
        format = {
            type: "Figma",
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
 * Returns a button described by a component with variants.
 * 
 * This function takes an instance and turns it into a button. The "up" state 
 * will be assigned to the variant with state "up", and the "down" state will be 
 * assigned to the variant with state "down". In the case that no variant has 
 * state "down", no down state will be assigned. In the case that no variant has 
 * state "up", the default variant will be assigned to "up".
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

    let searchProperties = new Map<String, String | Boolean>();

    // Define search properties both up and down state.
    for (const key in node.componentProperties) {
        if (node.componentProperties[key].type === "VARIANT") {
            if (key.toLowerCase() !== "state"){
                searchProperties.set(key, node.componentProperties[key].value);
            }
        }
    }

    let newChildren : ComponentNode[] = []; 
    let componentSet = node.mainComponent.parent

    if (componentSet.type !== "COMPONENT_SET") {
        throw new Error("Parent of the component is not a valid component set.");
    }

    let buttonNames: Record<string, string> = {};

    for (let ii = 0; ii < componentSet.children.length; ii++) {
        let name = componentSet.children[ii].name;
        if (name != undefined) {
            let properties = name.split(', ');
            let correctSettings = true;
            let upOrDown : string | undefined = undefined;
            // Check if component shares all desired properties and record up/down
            for (let jj = 0; jj < properties.length; jj++){
                let variant = properties[jj].split('=');
                if (variant[0].toLowerCase() === 'state'){
                    if (variant[1].toLowerCase() === 'up' || variant[1].toLowerCase() === 'down'){
                        upOrDown = variant[1].toLowerCase();
                    }
                }
                else if (searchProperties.get(variant[0]) !== variant[1]){
                    correctSettings = false;
                }
            }
            // If button is not up or down, it is not added as a child.
            if (correctSettings && upOrDown){
                newChildren.push(componentSet.children[ii] as ComponentNode);
                buttonNames[upOrDown] = componentSet.children[ii].name;
            }
        }
    }
    if (newChildren.length == 0){
        throw new Error('Could not find any up or down button states');
    }
    if (!('up' in buttonNames)){
        throw new Error('Up state must be defined for a button from a component set');
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
        children = await genChildrenByAnchor(node, newChildren, true);
        format = {
            type: "Figma",
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
            upnode: buttonNames["up"],
        },
        children,
    };
    
    if ("down" in buttonNames) {
        buttonCode.data.downnode = buttonNames["down"];
    }
    
    return buttonCode;
}