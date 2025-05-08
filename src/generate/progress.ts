/*
NOTE: At the time of this development, progress bars in the Scenetool were identified
as broken -- leaving us to scrap this function with figtree. Once progress bars 
are fixed in CUGL, this functionality can be revisited and can most likely be
Implemented by treating a loading bar as a 3 patch.
/

/*
 * progress.ts
 *
 * Module generating CUGL progress bars.
 *
 * A progress in CUGL is a scene graph node with children that represent
 * the background, foreground, and right and left caps. 
 *
 * We handle this through tagging. The progress is a instance or component
 * tagged with the name "Progress" as a property value. It is necessary
 * for the children to be labeled with the correct names (background,
 * foreground, right_cap, and left_cap respectively).
 *
 *
 * Authors: Joaquin Rivera, Sebastian Rivera
 * Date: 3/9/25
 */
// import { roundToFixed } from "../util";
// import {
//   CUGLProgressNode,
//   CUGLLayoutMixin,
//   CUGLChildrenMixin,
//   CUGLFormatType,
// } from "../types";
// import {
//     convertXAlign,
//     convertYAlign,
//     convertLayoutMode,
// } from "../util";

// import { genChildrenByNoLayout, genChildrenByAnchor } from "./children";

// /**
//  * Returns a progress corresponding to an annotated instance or component
//  *
//  * This function takes any instance with the property tag set as 
//  * "Progress" and turns it into a progress. It will look at the children
//  * for the various images that make up a progress progress.
//  *
//  * @param node      The instance to convert
//  * @param parent    The parent of the instance
//  *
//  * @return a scene node corresponding to the given instance
//  */
// export async function genProgress(node: InstanceNode | ComponentNode, parent: SceneNode) {
//     if (node.children.length != 0) {
//         throw new Error('Keyword "progress" attached to a node with children',);
//     }

//     // Layout the children
//     let children = undefined;
//     let format = undefined;
//     format = {
//         type: "Figma",
//     } as CUGLFormatType;
    
//     let ypos = parent.height ? parent.height - node.height - node.y : -node.y;
//     const progressCode: CUGLProgressNode & CUGLChildrenMixin & CUGLLayoutMixin = {
//         type: "Progress",
//         format,
//         data: {
//             anchor: [0, 0],
//             size: [roundToFixed(node.width,2), roundToFixed(node.height,2)],
//             angle: node.rotation,
//             position:[roundToFixed(node.x,2), roundToFixed(ypos,2)],
//             visible: node.visible,
//             background: node.name + "_background",
//             foreground: node.name + "_foreground",
//             left_cap: node.name + "_leftcap",
//             right_cap: node.name + "_rightcap",
//         },
//         children,
//     };
    
//     return progressCode;
// }