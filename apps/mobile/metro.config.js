const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Lets the app import the shared date rules and brand tokens from ../../packages (plain TypeScript, no dependencies).
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "../../packages")];
module.exports = config;
