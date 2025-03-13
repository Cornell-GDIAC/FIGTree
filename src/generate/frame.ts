/*
 * frame.ts
 *
 * Module generating CUGL generic scene nodes.
 *
 * In CUGL, scene nodes are used to group together individual elements into a
 * single coordinate space. They serve the same purpose as frames in Figma.
 *
 * Authors: Walker White, Enoch Chen, Skyler Krouse, Aidan Campbell
 * Date: 1/24/24
 */
import { roundToFixed } from "../util";
import {
  CUGLBaseNode,
  CUGLLayoutMixin,
  CUGLChildrenMixin,
  CUGLFormatType,
} from "../types";
import {
    convertXAlign,
    convertYAlign,
    convertLayoutMode,
} from "../util";
import { 
    genChildrenByFloat, 
    genChildrenByAnchor 
} from "./children";

/**
 * Returns a scene node corresponding to the given frame or group.
 * A group node is treated as a frame with no set layout mode. The
 * default layout node is Anchored.
 *
 * @param node      The frame or group to convert
 * @param parent    The parent of the frame or group
 * @param root      True if the root node, false otherwise
 *
 * @return a scene node corresponding to the given frame or group
 */
export async function genFrame(node: FrameNode | GroupNode, parent: SceneNode, root: boolean = false) {
    // Layout the children
    let children = undefined;
    let format = undefined;
    if ("layoutMode" in node && node.layoutMode != "NONE") {
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
    const frameCode: CUGLBaseNode & CUGLChildrenMixin & CUGLLayoutMixin = {
        type: "Node",
        format,
        data: {
            anchor: [0, 0],
            size: [roundToFixed(node.width,2), roundToFixed(node.height,2)],
            angle: node.rotation,
            position: root? [0,0] : [roundToFixed(node.x,2), roundToFixed(ypos,2)],
            visible: node.visible,
        },
        children,
    };
    
    return frameCode;
}
