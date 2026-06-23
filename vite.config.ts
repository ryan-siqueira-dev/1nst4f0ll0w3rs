import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  define:
    command === "build"
      ? {
          "process.env.NODE_ENV": JSON.stringify("production"),
        }
      : {},
  build: {
    copyPublicDir: true,
    emptyOutDir: true,
    lib: {
      entry: "src/content.tsx",
      name: "InstagramFollowersAnalyzer",
      formats: ["iife"],
      fileName: () => "content.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
}));
