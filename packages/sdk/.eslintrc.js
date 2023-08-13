module.exports = {
  extends: ["custom", "plugin:@typescript-eslint/recommended"],
  env: { browser: true, es6: true },
  plugins: ["@typescript-eslint"],
  overrides: [
    {
      files: [
        "**/*.test.js",
        "**/*.test.ts",
        "**/*.test.jsx",
        "**/*.test.tsx",
        "**/*.spec.js",
        "**/*.spec.ts",
        "**/*.spec.jsx",
        "**/*.spec.tsx",
      ],
      env: { jest: true },
    },
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { ignoreRestSiblings: true },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
  },
  ignorePatterns: [".eslintrc.js", "src/generated/**/*"],
};
