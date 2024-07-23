/*
 * button.ts
 *
 * Module generating CUGL buttons.
 *
 * Buttons are the primary user interface element that we support through 
 * Figma. A button in CUGL is a scene graph node with a child representing
 * the up position, and an optional child representing the down node. 
 *
 * We handle this through tagging. The button is a frame/group/component
 * tagged with the name "button".  It is not necessary to tag the children,
 * but it is if you want a distinct up and down node.
 *
 * Authors: Walker White, Enoch Chen, Skyler Krouse, Aidan Campbell
 * Date: 1/24/24
 */
import { roundToFixed } from "../util";
import {
  CUGLButtonNode,
  CUGLLayoutMixin,
  CUGLChildrenMixin,
} from "../types";

import { genChildrenByFloat, genChildrenByAnchor } from "./children";

/**
 * Returns a button corresponding to an annotated frame
 *
 * This function takes any frame tagged with "button" and turns it into 
 * a button. If there is only one child, that is the up node.  Otherwise
 * it looks for a node tagged with "up".  If there is no such node, it 
 * picks the first one.
 * 
 * This function will only create a down node if there is a child tagged
 * with "down".
 *
 * @param node      The frame to convert
 * @param parent    The parent of the frame
 *
 * @return a scene node corresponding to the given frame
 */
export async function genButton(node: FrameNode, parent: SceneNode) {
    if (node.children.length == 0) {
        throw new Error('Keyword "button" attached to a node with no children',);
    }
    
    let buttonNames: Record<string, string> = {};
    let firstButton = "";
    if (node.children.length == 1) {
        let name = node.children[0].name;
        if (name != undefined) {
            const components = name.split(":");
            const suffix = components[components.length-1]
            if (components.length == 2) {
                buttonNames[components[0]] = suffix;
            } else {
                buttonNames["up"] = suffix;
            }
            firstButton = suffix;
        }
    } else {
        for (let ii = 0; ii < node.children.length; ii++) {
            let name = node.children[ii].name;
            if (name != undefined) {
                const components = name.split(":");
                const suffix = components[components.length-1]
                if (components.length == 2) {
                    buttonNames[components[0]] = suffix;
                }
                if (ii == 0) {
                    firstButton = suffix;
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
        };
    } else {
        children = await genChildrenByAnchor(node);
        format = {
            type: "Anchored",
        };
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
            upnode: "up" in buttonNames ? buttonNames["up"] : firstButton,
        },
        children,
    };
    
    if ("down" in buttonNames) {
        buttonCode.data.downnode = buttonNames["down"];
    }
    
    return buttonCode;
}
