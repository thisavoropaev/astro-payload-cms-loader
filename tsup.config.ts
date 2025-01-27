import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  treeshake: true,
  outExtension: () => ({
    js: ".js",
  }),
  esbuildOptions: (options) => {
    options.conditions = ["import"]
  },
})
