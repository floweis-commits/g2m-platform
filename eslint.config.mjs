import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.config({
    extends: [
      "next/core-web-vitals",
      "next/typescript",
      "prettier",
      "plugin:jsx-a11y/recommended",
    ],
    plugins: ["simple-import-sort"],
    rules: {
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/heading-has-content": "warn",
      "react/no-unescaped-entities": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
    },
  }),
];

export default eslintConfig;
