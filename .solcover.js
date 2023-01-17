module.exports = {
  skipFiles: [
    "interfaces/",
    "legacy/",
    "libs/0.5.x/",
    "libs/0.8.x/ERC721_PackedHashSeed.sol",
    "libs/abi/",
    "libs/integration-refs/",
    "minter-suite/Minters/MinterDAExp/MinterDAExpV0.sol",
    "minter-suite/Minters/MinterDAExp/MinterDAExpV1.sol",
    "minter-suite/Minters/MinterDALin/MinterDALinV0.sol",
    "minter-suite/Minters/MinterDALin/MinterDALinV1.sol",
    "minter-suite/Minters/MinterHolder/MinterHolderV0.sol",
    "minter-suite/Minters/MinterHolder/MinterHolderV1.sol",
    "minter-suite/Minters/MinterMerkle/MinterMerkleV0.sol",
    "minter-suite/Minters/MinterMerkle/MinterMerkleV1.sol",
    "minter-suite/Minters/MinterSetPrice/MinterSetPriceV0.sol",
    "minter-suite/Minters/MinterSetPrice/MinterSetPriceV1.sol",
    "minter-suite/Minters/MinterSetPriceERC20/MinterSetPriceERC20V0.sol",
    "minter-suite/Minters/MinterSetPriceERC20/MinterSetPriceERC20V1.sol",
    "mock/",
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
