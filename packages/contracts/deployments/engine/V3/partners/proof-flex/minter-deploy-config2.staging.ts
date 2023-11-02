// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer by running `deploy:mainnet:minter`, `deploy:staging:minter` or `deploy:dev:minter`.

export const minterDeployDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterMerkleV5",
    genArt721V3CoreAddress: "0x5f53E89f060F6B45333b0CA809E126795Bd978E9",
    minterFilterAddress: "0xD8B6dcA208B6F8D08eb429C1b027F6e5FAbFAC53",
  },
];
