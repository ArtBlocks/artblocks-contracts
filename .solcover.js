module.exports = {
  skipFiles: [
    "interfaces/",
    "legacy/",
    "libs/",
    "mock/",
    "PBAB+Collabs/art-blocks-x-pace/",
    "PBAB+Collabs/artcode/",
    "PBAB+Collabs/bright-moments/",
    "PBAB+Collabs/colors-and-shapes/",
    "PBAB+Collabs/crypto-citizens/",
    "PBAB+Collabs/doodle-labs/",
    "PBAB+Collabs/fireworks/",
    "PBAB+Collabs/flutter/",
    "PBAB+Collabs/legends-of-metaterra/",
    "PBAB+Collabs/mechsuit/",
    "PBAB+Collabs/plottables/",
    "PBAB+Collabs/tboa/",
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
