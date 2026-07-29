import nextPlugin from "@next/eslint-plugin-next";
import { defineConfig, globalIgnores } from "eslint/config";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("eslint-config-next"));
const importPlugin = nextRequire("eslint-plugin-import");
const jsxA11y = nextRequire("eslint-plugin-jsx-a11y");
const reactPlugin = nextRequire("eslint-plugin-react");

// The full Next preset bundles React plugins that have not adopted ESLint 10 yet.
export default defineConfig([
  ...nextTs,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
      "jsx-a11y": jsxA11y,
      react: reactPlugin,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      "import/no-anonymous-default-export": "warn",
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
    },
    settings: {
      react: {
        version: "19.2.8",
      },
    },
  },
  nextPlugin.configs.recommended,
  nextPlugin.configs["core-web-vitals"],
  reactHooks.configs.flat["recommended-latest"],
  {
    files: ["postcss.config.mjs"],
    rules: {
      "import/no-anonymous-default-export": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
