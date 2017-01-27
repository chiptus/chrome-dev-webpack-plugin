/**
 * @module chrome-dev-webpack-plugin
 */

"use strict";
var fs = require("fs");
var path = require("path");

/**
 * The list of fields that are mandatory in a manifest.json.
 */
const manifestMandatory = ["name", "version", "manifest_version"];

/**
 * Creates a new instance of the chrome development plugin
 * @class
 *
 * @param {Object} [options]
 * @param {string} [options.entry] The path to the original manifest.json file
 * @param {string} [options.output] The path to the resulting manifest.json file
 * @param {string} [options.package="./package.json"] The path to the package.json file
 * @param {Array} [options.fields=["version"]] The list of fields to copy from package.json to the resulting manifest.json.
 *
 * @param {function} [options.log] A log function.
 * @param {function} [options.warn=console.warn] A warning log function.
 * @param {function} [options.error=console.error] An error log function.
 */
var ChromeDevWebpackPlugin = module.exports = function ChromeDevWebpackPlugin(options) {
  options = options || {};
  /*eslint-disable no-console */
  this.log = options.log || function() {};
  this.warn = options.warn || console.warn;
  this.error = options.error || console.error;
  /*eslint-enable no-console */

  //This is used to retrieve the current version. =>
  this.pathToPackageJson = options.package || "./package.json";
  //Where to look for the manifest file =>
  this.manifestInput = options.entry;
  //Where to output the manifest file <=
  this.manifestOutput = options.output;

  //The list of fields to copy from package.json to manifest.json
  this.syncFields = ["version"];

  if ("undefined" !== options.fields && Array.isArray(options.fields)) {
    this.syncFields = options.fields;
  }
  this.tabulations = "  ";
};

/**
 * Entry point. When the plugin is mounted this function is executed.
 *
 * @param {webpack.Compiler} compiler
 */
ChromeDevWebpackPlugin.prototype.apply = function(compiler) {
  //Used to retrieve the latest source of the manifest file.
  this.actions = [];
  this.manifestSourceFunction = null;
  this.manifestJson = null;
  this.initialized = false;

  this.context = compiler.options.context || path.resolve("./");

  console.log("this.context:", this.context);

  //Adds handlers
  compiler.plugin("emit", this.handleEmit.bind(this));
};

/**
 * Handles the webpack compiler emit event
 *
 * @param {webpack.Compilation} compilation
 * @param {function} callback
 */
ChromeDevWebpackPlugin.prototype.handleEmit = function(compilation, callback) {
  this.log("handleEmit");
  var self = this;

  var runPluginRound = function () {
    self.log("handleEmit#runPluginRound");
    self.runPluginRound(compilation).then(function (result) {
      self.log("chrome-dev-webpack-plugin - done:\n", result);
      callback();
    }).catch(function (err) {
      self.error("chrome-dev-webpack-plugin - error:", err);
      callback(err);
    });
  };

  if (!self.initialized) {
    self.initialize(compilation).then(function () {
      self.initialized = true;
      runPluginRound();
    });
  } else {
    runPluginRound();
  }
};

/**
 * Runs the default plugin operations.
 *
 * @param {webpack.Compilation} compilation
 * @returns Promise<object>
 */
ChromeDevWebpackPlugin.prototype.runPluginRound = function(compilation) {
  var self = this;
  return self.updateManifestJson().then(function (manifestJson) {
    self.manifestJson = manifestJson || self.manifestJson;
    var missingFields = manifestMandatory.filter(function (key) {
      return (!self.manifestJson.hasOwnProperty(key));
    });
    if (0 < missingFields.length) {
      self.warn("The resulting manifestJson is missing " +(1<missingFields.lenght?"fields":" a field")+ ": \"" + missingFields.join("\", \"") + "\".");
    }
    self.emitManifestJson(compilation);
    return self.manifestJson;
  });
};

/**
 * Initializes the plugin (finds missing data).
 *
 * @param {webpack.Compilation} compilation
 * @returns
 */
ChromeDevWebpackPlugin.prototype.initialize = function(compilation) {
  var self = this;
  self.log("initialize");
  return new Promise(function (resolve, reject) {

    //If the manifest output is not set try to find the manifest in the emitted resources.
    if(!self.manifestOutput) {
      self.log("Looking for a valid manifest.json in the compilation assets.");
      self.manifestOutput = findManifestInAssets(compilation.assets);
      self.log(" - look for manifestOutput:", self.manifestOutput);
    }

    //If the function to retrieve the manifest data doesn't exist.
    if ("function" !== typeof self.manifestSourceFunction)
    {
      if(self.manifestInput) {
        self.log("Will read manifest.json from the given input path: " + self.manifestInput);
        //if the path to a source manifest file has been passed
        //read this file.
        self.manifestSourceFunction = function () {
          //TODO: replace this with an async mechanism.
          return fs.readFileSync(self.manifestInput);
        };
      } else if (self.manifestOutput
        && "undefined" !== typeof compilation.assets[self.manifestOutput]
        && "function" === compilation.assets[self.manifestOutput].source) {
        self.log("Will use the manifest.json from the compilation assets as the source.");
        //We have an output file which already provides the function.
        self.manifestSourceFunction = compilation.assets[self.manifestOutput].source;
      } else if(self.context) {
        var pathToManifest = path.join(self.context, "manifest.json");
        if (fs.existsSync(pathToManifest)) {
          self.log("Will use the manifest.json found in the context path.");
          //If a manifest file
          self.manifestSourceFunction = function () {
            //TODO: replace this with an async mechanism.
            return fs.readFileSync(pathToManifest);
          };
        }
      }
    }

    if ("function" !== typeof self.manifestSourceFunction) {
      self.warn("Failed to resolve access to 'manifest.json'. Please set the 'source' in the plugin options");
    }
    else if (!self.manifestOutput) {
      self.manifestOutput = "manifest.json";
    }

    resolve();
  });
};

var semver = require("semver");

ChromeDevWebpackPlugin.prototype.updateManifestJson = function() {
  var self = this;
  self.log("updateManifestJson");

  if (self.manifestOutput) {

  }

  var getPackageVersion = function (version) {
    //We drop the prerelease tag.
    var parts = [
      semver.major(version),
      semver.minor(version),
      semver.patch(version),
    ];
    return {
      version: semver.clean( parts[0] + "." + (parts[1] || 0) + "." + (parts[2] || 0) ),
    };
  };

  var getManifestVersion = function (version) {
    version = version || "0.0.0";
    var parts = version.split(".");
    return {
      version: semver.clean( parts[0] + "." + (parts[1] || 0) + "." + (parts[2] || 0) ),
    };
  };

  console.log("Package: ", getPackageVersion("v1.2.3-dev2"));
  console.log("Manifest: ", getManifestVersion("1.2.3"));

  var readManifest = function () {
    self.log("readManifest");
    return new Promise(function (resolve, reject) {
      if ("function" === typeof self.manifestSourceFunction) {
        resolve (self.manifestSourceFunction ().toString());
      } else if ("string" === typeof self.manifestInput) {
        fs.readFile(self.manifestInput, function (err, data) {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      } else {
        reject(new Error("No method to access to the original manifest.json"));
      }
    });
  };

  var readPackage = function () {
    self.log("readPackage");
    return new Promise(function (resolve, reject) {
      if ("string" === typeof self.pathToPackageJson) {
        fs.readFile(self.pathToPackageJson, function (err, data) {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      }
    });
  };

  var syncManifest = function (manifestData) {
    self.log("syncManifest");
    return new Promise(function (resolve, reject) {
      var manifestJson = JSON.parse(manifestData);

      var neededFields = [].concat(self.syncFields);
      manifestMandatory.forEach(function (key) {
        if("undefined" === typeof manifestJson[key]) {
          neededFields.push (key);
        }
      });

      if (0 < neededFields.length) {
        resolve (readPackage().then(function (packageData) {
          if (packageData) {
            var packageJson = JSON.parse(packageData) || {};
            neededFields.forEach(function (key) {
              manifestJson[key] = packageJson[key];
            });
            return manifestJson;
          }
        }));
      } else {
        resolve(manifestJson);
      }
    });
  };

  return readManifest()
  .then(syncManifest);
};

ChromeDevWebpackPlugin.prototype.emitManifestJson = function(compilation) {
  var self = this;
  var manifestJsonData = JSON.stringify(self.manifestJson, null, "  ");
  compilation.assets[self.manifestOutput] = {
    source: function() {
      return manifestJsonData;
    },
    size: function() {
      return manifestJsonData.length;
    }
  };
};


/**
 * (Helper function) looks for an existing manifest.json that would have been emitted by
 * another plugin.
 *
 * @param {any} assets
 * @returns
 */
var findManifestInAssets = function (assets) {
  if ("undefined" === typeof assets) {
    throw new Error("assets are needed");
  }
  for (var filename in assets) {
    if(filename.endsWith("manifest.json")) {
      return filename;
    }
  }
  return;
};
