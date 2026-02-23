// eslint.config.js
import js from "@eslint/js";
import globals from "globals";

const browserGlobals = Object.fromEntries(
  Object.entries( globals.browser ).map( ([ key, value ]) => [ key.trim(), value ] )
);

export default [
  {
    ignores: ["dist/**", "build/**", "node_modules/**", ".eslintrc.cjs"]
  },
  {
    files: ["src/**/*.{js,jsx}"],
    ...js.configs.recommended,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      globals: browserGlobals,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      "space-in-parens": ["error", "always"],
      "object-curly-spacing": ["error", "always"],
      "array-bracket-spacing": ["error", "always"],
      "function-paren-newline": ["error", "multiline"],
      "function-call-argument-newline": ["error", "always"],
      "newline-per-chained-call": ["error", { "ignoreChainWithDepth": 1 }],
      "dot-location": ["error", "property"]
    }
  }
];
