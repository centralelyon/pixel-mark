import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "src/index.js",
  // d3 is expected to be provided by the host page/app, not bundled in.
  external: ["d3"],
  output: [
    {
      file: "dist/pixel-mark.esm.js",
      format: "es"
    },
    {
      file: "dist/pixel-mark.umd.cjs",
      format: "umd",
      name: "pixel_mark",
      globals: { d3: "d3" }
    }
  ],
  plugins: [resolve()]
};
