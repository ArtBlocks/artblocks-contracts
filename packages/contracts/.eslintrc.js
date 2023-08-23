module.exports = {
  env: { node: true, es2020: true },
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint", "mocha", "prettier"],
  extends: ["custom"],
  rules: {
    "@typescript-eslint/no-floating-promises": ["error"],
    "mocha/no-exclusive-tests": ["error"],
    "no-unused-vars": "warn",
    "no-redeclare": "warn",
    "no-useless-escape": "warn",
    "prefer-template": "warn",
  },
  ignorePatterns: ["scripts/contracts", ".eslintrc.js", "global.d.ts"],
  overrides: [
    {
      files: ["test/**/*.ts"],
      env: { mocha: true },
    },
  ],
  globals: {
    config: "writable",
    expect: "readonly",
  },
};
