const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["scripts/*.js"],
    languageOptions: {
      globals: {
        URL: "readonly",
        __dirname: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        fetch: "readonly",
        process: "readonly",
        require: "readonly",
        setTimeout: "readonly",
      },
    },
  },
]);
