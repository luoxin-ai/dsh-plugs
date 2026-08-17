/**
 * Build the browser-half bundle for the DSH module loader.
 *
 * Two steps:
 *   1. esbuild bundles src/plugin.ts to CJS (externals stay as free
 *      `require(...)` calls — the loader's factory parameter binds them).
 *   2. The CJS output is embedded inside the `window.__ModuleLoader__.load`
 *      wrapper, exactly the shape the shipped ui-* packages emit.
 */
import { build } from "esbuild";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = `${ROOT}dist`;

await mkdir(OUT, { recursive: true });

await build({
  entryPoints: [`${ROOT}src/plugin.ts`],
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: ["es2022"],
  jsx: "automatic",
  external: ["@deepseek-ai/*", "react", "react/jsx-runtime"],
  outfile: `${OUT}/_bundle.cjs`,
  logLevel: "info"
});

const bundle = await readFile(`${OUT}/_bundle.cjs`, "utf8");
const indent = (text) => text.split("\n").map((line) => `    ${line}`).join("\n");

const client = `window.__ModuleLoader__.load({
  id: "dsh-model-ui",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
${indent(bundle)}
    return module.exports;
  }
});
`;

await writeFile(`${OUT}/client.js`, client);
await rm(`${OUT}/_bundle.cjs`, { force: true });
console.log("built dist/client.js");
