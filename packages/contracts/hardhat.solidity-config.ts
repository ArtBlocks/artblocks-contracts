// this file is used to configure the solidity compiler in hardhat config files
export const solidityConfig = {
  compilers: [
    {
      version: "0.8.22",
      settings: {
        optimizer: {
          enabled: true,
          runs: 10,
        },
      },
    },
    {
      version: "0.8.19",
      settings: {
        optimizer: {
          enabled: true,
          runs: 25,
        },
      },
    },
    {
      version: "0.8.9",
      settings: {
        optimizer: {
          enabled: true,
          runs: 25,
        },
      },
    },
    {
      version: "0.5.17",
      settings: {
        optimizer: {
          enabled: true,
          runs: 100,
        },
      },
    },
  ],
  // Engine Flex is 48 bytes over the 24KB cap with default metadata CBOR.
  // Omitting CBOR from this implementation only (clones share this bytecode).
  overrides: {
    "contracts/engine/V3/GenArt721CoreV3_Engine_Flex.sol": {
      version: "0.8.22",
      settings: {
        optimizer: {
          enabled: true,
          runs: 10,
        },
        metadata: {
          appendCBOR: false,
        },
      },
    },
  },
};
