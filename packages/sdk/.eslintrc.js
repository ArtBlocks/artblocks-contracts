module.exports = {
  extends: ["custom"],
  env: { browser: true, es6: true },
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
};
