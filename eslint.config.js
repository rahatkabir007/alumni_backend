import globals from "globals";
import pluginJs from "@eslint/js";
import importPlugin from "eslint-plugin-import";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021
      },
      ecmaVersion: 2021,
      sourceType: "module"
    }
  },
  pluginJs.configs.recommended,
  importPlugin.configs.recommended,
  {
    rules: {
      "no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "no-undef": "error",

      // Import plugin rules
      "import/no-unused-modules": ["warn", { "unusedExports": true }],
      "import/no-unresolved": "error",
      "import/named": "error",
      "import/default": "error",
      "import/no-duplicates": "error"
    }
  }
];