const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { rspack } = require("@rspack/core");
const createConfig = require("./rspack.config");

const root = __dirname;
const dist = path.join(root, "dist");
const second = path.join(root, "src", "second.js");
const originalSecond = fs.readFileSync(second, "utf8");
const manual = process.argv.includes("--manual");
const compiler = rspack(createConfig());

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

function closeCompiler() {
  return new Promise((resolve, reject) => compiler.close(error => error ? reject(error) : resolve()));
}

function waitForEdit() {
  console.log("Change SECOND-0 to SECOND-1 in src/second.js, then press Enter.");
  return new Promise(resolve => process.stdin.once("data", () => {
    process.stdin.pause();
    resolve();
  }));
}

(async () => {
  try {
    fs.writeFileSync(second, "console.log('SECOND-0');\n");
    const initial = await run();
    if (manual) {
      await waitForEdit();
    } else {
      fs.writeFileSync(second, "console.log('SECOND-1');\n");
    }
    compiler.inputFileSystem?.purge?.(second);
    compiler.modifiedFiles = new Set([second]);
    compiler.removedFiles = new Set();
    const hot = await run();

    const expected = `first.${hot.hash}.js`;
    const files = fs.readdirSync(dist);
    console.log({ initialHash: initial.hash, hotHash: hot.hash, expected, files });
    assert.notEqual(initial.hash, hot.hash);
    assert.ok(files.includes(expected), `missing ${expected}; the directory still contains the old full-hash filename`);
  } finally {
    fs.writeFileSync(second, originalSecond);
    await closeCompiler();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
