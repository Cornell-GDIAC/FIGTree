import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [],
  build: {
    lib: {
      entry: path.resolve(__dirname, "./src/code.ts"),
      name: "fugl",
      fileName: () => "code.js",
      formats: ["iife"],
    },
    target: "es2017",
    outDir: path.resolve(__dirname, "./dist"),
    rollupOptions: {
      external: [],
    },
  },
});
