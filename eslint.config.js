// eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.browser },
    rules: {
      "space-in-parens": ["error", "always"],
      "object-curly-spacing": ["error", "always"],
      "array-bracket-spacing": ["error", "always"],
      "function-paren-newline": ["error", "multiline"],
      "function-call-argument-newline": ["error", "always"],
      "newline-per-chained-call": ["error", { "ignoreChainWithDepth": 1 }],
      "dot-location": ["error", "property"]
    }
  }
]);
