// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer by running `deploy:mainnet:minter`, `deploy:staging:minter` or `deploy:dev:minter`.

export const minterDeployDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterHolderV4",
    genArt721V3CoreAddress: "0xCEd5350f5a2Ba24946F92C08260931CFf65dc954",
    minterFilterAddress: "0x0AB754254d7243315FFFDC363a6A0997aD9c3118",
  },
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterSetPriceERC20V4",
    genArt721V3CoreAddress: "0xCEd5350f5a2Ba24946F92C08260931CFf65dc954",
    minterFilterAddress: "0x0AB754254d7243315FFFDC363a6A0997aD9c3118",
  },
];
