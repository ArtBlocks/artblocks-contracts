// this file is used to configure the solidity compiler in hardhat config files
export const solidityConfig = {
  compilers: [
    {
      version: "0.8.22",
      settings: {
        optimizer: {
          enabled: true,
          runs: 25,
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
};
