"use strict";

var path = require("path");
var WebpackChromeDevPlugin = require("../..");
var webpackMajorVersion = require("webpack/package.json").version.split(".")[0];

var sourcePath = path.join(__dirname);
var distPath = path.join(__dirname, "dist/webpack-" + webpackMajorVersion);

//The plugin we are testing!
var plugins = [
  new WebpackChromeDevPlugin(),
];

module.exports = {
  entry:  {
    background: [path.join(sourcePath, "background.js")],
    content: [path.join(sourcePath, "content.js")],
  },
  output: {
    path: distPath,
    filename: "[name].bundle.js"
  },
  plugins:plugins,
};