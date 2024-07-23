/**
 * code.ts
 *
 * Main entry point for FUGL plugin
 *
 * This file holds the main code for the plugin. Code in this file has access 
 * to the *figma document* via the figma global object. You can access browser 
 * APIs in the <script> tag inside "ui.html" which has a full browser 
 * environment (See https://www.figma.com/plugin-docs/how-plugins-run).
 *
 * Authors: Walker White, Enoch Chen, Skyler Krouse, Aidan Campbell
 * Date: 1/24/24
 */

// Generating functions
import { generate, generateTextures, generateFonts } from "./generate";

/**
 * A callback function to generate the code.
 *
 * @param event The code generation event (with Figma object)
 *
 * @return the JSON representation of the Figma document
 */
figma.codegen.on("generate", async (event) => {
    return [
        {
            title: "Figma Scene",
            code: JSON.stringify(await generate(event.node), null, 2),
            language: "JSON",
        },
        {
            title: "Textures",
            code: generateTextures(),
            language: "JSON",
        },
        {
            title: "Fonts",
            code: generateFonts(),
            language: "JSON",
        },
    ];
});
