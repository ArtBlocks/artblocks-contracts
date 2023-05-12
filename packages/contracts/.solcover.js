module.exports = {
  skipFiles: [
    "interfaces/",
    "legacy/",
    "libs/0.5.x/",
    "libs/0.8.x/ERC721_PackedHashSeed.sol",
    "libs/abi/",
    "libs/integration-refs/",
    "archive/",
    "mock/",
    "engine-registry/future/",
    "BasicRandomizer.sol",
    "BasicRandomizerV2.sol",
    "engine/V3/forks/",
  ],
  mocha: {
    // coverage distorts gas tests, so disable it
    // ref: https://github.com/sc-forks/solidity-coverage/blob/master/docs/advanced.md#skipping-tests
    grep: "@skip-on-coverage", // Find everything with this tag
    invert: true, // Run the grep's inverse set.
  },
};
