// metro.config.js
const {
  wrapWithAudioAPIMetroConfig,
} = require("react-native-audio-api/metro-config");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

module.exports = wrapWithAudioAPIMetroConfig(config);
