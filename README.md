# FIGTree
---

This tool is a figma plugin for exporting GDIAC scene nodes as JSON. We have a unified scene graph language that we use for engines like LibGDX and SDL. This tool allows designers to create UI elements in Figma and import them directly into the game.

This tool is still **extremely experimental**. It works best when the designers create the art in a separate program, and only use Figma for layout.  Figma effects such as drop-shadows are not (currently) supported.


## Compiling Instructions

This plug-in is developed using typescript on top of NodeJS.

Install dependencies:

```sh
pnpm install
```

Build:

```sh
pnpm build
```

Build (Watch):

```sh
pnpm dev
```

Export as archive:

```sh
pnpm zip # creates release.zip
```
