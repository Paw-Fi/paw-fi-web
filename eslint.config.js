import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslintPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import importPlugin from "eslint-plugin-import";
import path from "path";
import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  {
    ignores: ["dist", "node_modules","coverage"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022
      },
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: "./tsconfig.json",
        tsconfigRootDir: path.resolve('.'),
        sourceType: "module",
        ecmaVersion: 2022,
        allowImportExportEverywhere: true,
      },
    },  
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "@typescript-eslint": tseslintPlugin,
      unicorn: eslintPluginUnicorn,
      import: importPlugin,
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
          paths: ["src"],
        },
      },
    },
    rules: {
      // Include TypeScript ESLint recommended rules
      ...tseslintPlugin.configs.recommended.rules,
      // Allow imports and exports in TypeScript files
      "no-undef": "off", // TypeScript already checks this
      "no-console": "warn",
      "no-alert": "error",
      "no-debugger": "error",
      "no-unused-vars": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/memo-use-memoizing-props": "off",
      "import/no-unresolved": "error",
      "import/named": "error",
      "import/default": "error",
      "import/namespace": "error",
      "import/no-named-as-default": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
      // Enforce curly braces for all control statements
      "curly": ["error", "all"],
      "unicorn/filename-case": [
        "error",
        {
          cases: {
            kebabCase: true, // Enforces `my-component.tsx`
            camelCase: false, // Prevents `myComponent.tsx`
            pascalCase: false, // Prevents `MyComponent.tsx`
            snakeCase: false, // Prevents `my_component.tsx`
          }
        }
      ]    
    },
  },
  ...tanstackConfig
];