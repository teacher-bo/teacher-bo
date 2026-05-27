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
        __dirname: "readonly",
      },
    },
  },
]);
