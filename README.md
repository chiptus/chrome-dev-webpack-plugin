# Chrome development plugin for webpack

Adds chrome related development features to webpack. Helps with generating and synchronizing the manifest.json.

## Why?
For every chrome extension (standalone or paired with a web application) the same tasks are required and the same issues with version synchronization arise.
To standardize the development process with webpack generated chrome extensions this plugin was created.

## Functions 
The plugin has the following functions to help with chrome extensions development:

- [x] emits a manifest file.
- [x] synchronizes the missing fields in the manifest file from the given package.json file.

## How to
Add the plugin to your webpack configuration file.

    //webpack.config.js
    var ChromeDevPlugin = require("chrome-dev-webpack-plugin");
    var path = require("path");

    var manifestFile = "manifest.json";
    var sourcePath = path.join(__dirname, "src");
    var distPath = path.join(__dirname, "dist");
    var sourceManifest = path.join(sourcePath, manifestFile); // ./src/manifest.json
    module.exports = {
      context: path.resolve(sourcePath),
      entry:  {
        background: [path.join(sourcePath, "background.js")],
      },
      output: {
        path: distPath,
        filename: "[name].bundle.js"
      },
      plugins: [
        new ChromeDevPlugin({
          entry:sourceManifest,
          output:manifestFile,
          package:"./package.json",
        }),
      ]
    }

## options

 - `entry`: the path to the source manifest file
 - `output`: the path to the resulting manifest file (defaults to `"manifest.json"`)
 - `package`: the path to the source package.json file (defaults to `"./package.json"`)
 - `log`: the logging function you would like use
 - `warn`: the logging function you would like use for warnings
 - `error`: the logging function you would like use for errors
