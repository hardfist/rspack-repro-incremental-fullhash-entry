const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { rspack } = require("@rspack/core");

const root = __dirname;
const src = path.join(root, "src");
const dist = path.join(root, "dist");
const second = path.join(src, "second.js");

fs.mkdirSync(src, { recursive: true });
fs.writeFileSync(path.join(src, "first.js"), "globalThis.load = () => import('./lazy.js'); console.log('FIRST');\n");
fs.writeFileSync(path.join(src, "lazy.js"), "console.log('LAZY');\n");
fs.writeFileSync(second, "console.log('SECOND-0');\n");

const compiler = rspack({
  context: root,
  mode: "development",
  target: "web",
  entry: {
    first: { import: "./src/first.js", filename: "[name].[fullhash].js" },
    second: "./src/second.js"
  },
  output: { path: dist, filename: "[name].js", clean: true },
  cache: { type: "memory" },
  optimization: {
    runtimeChunk: "single",
    splitChunks: false,
    concatenateModules: false,
    inlineExports: false
  },
  incremental: true
});

function run() {
  return new Promise((resolve, reject) => {
    compiler.run((error, stats) => {
      if (error) return reject(error);
      const json = stats.toJson({ all: false, hash: true, assets: true, errors: true });
      if (json.errors.length) return reject(new Error(JSON.stringify(json.errors, null, 2)));
      resolve(json);
    });
  });
}

function close() {
  return new Promise((resolve, reject) => compiler.close(error => error ? reject(error) : resolve()));
}

(async () => {
  const initial = await run();
  fs.writeFileSync(second, "console.log('SECOND-1');\n");
  compiler.inputFileSystem?.purge?.(second);
  compiler.modifiedFiles = new Set([second]);
  compiler.removedFiles = new Set();
  const hot = await run();
  await close();

  const expected = `first.${hot.hash}.js`;
  const files = fs.readdirSync(dist);
  console.log({ initialHash: initial.hash, hotHash: hot.hash, expected, files });
  assert.notEqual(initial.hash, hot.hash);
  assert.ok(files.includes(expected), `missing ${expected}; the directory still contains the old full-hash filename`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

