// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer by running `deploy:mainnet:minter`, `deploy:staging:minter` or `deploy:dev:minter`.

export const minterDeployDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterHolderV4",
    genArt721V3CoreAddress: "0x72f0e5Af1B3D68BaE33FBAd441F55489954d9a04",
    minterFilterAddress: "0xA5bD9dB063E783152186224A9B26B3073747bdE1",
  },
];
