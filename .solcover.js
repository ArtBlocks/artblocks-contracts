module.exports = {
  skipFiles: [
    "interfaces/",
    "legacy/",
    "libs/",
    "mock/",
    "PBAB+Collabs/*/",
    "BasicRandomizer.sol",
    "BasicRandomizerV2.sol",
  ],
  mocha: {
    // coverage distorts gas tests, so disable it
    // ref: https://github.com/sc-forks/solidity-coverage/blob/master/docs/advanced.md#skipping-tests
    grep: "@skip-on-coverage", // Find everything with this tag
    invert: true, // Run the grep's inverse set.
  },
};
