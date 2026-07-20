const path = require("node:path");

module.exports = () => ({
  context: __dirname,
  mode: "development",
  target: "web",
  entry: {
    first: {
      import: "./src/first.js",
      filename: "[name].[fullhash].js"
    },
    second: "./src/second.js"
  },
  output: {
    path: path.join(__dirname, "dist"),
    filename: "[name].js",
    clean: true
  },
  cache: { type: "memory" },
  optimization: {
    runtimeChunk: "single",
    splitChunks: false,
    concatenateModules: false,
    inlineExports: false
  },
  incremental: true
});
