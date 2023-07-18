// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer by running `deploy:mainnet:minter`, `deploy:staging:minter` or `deploy:dev:minter`.

export const minterDeployDetailsArray = [
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterDAExpV4",
    genArt721V3CoreAddress: "0x959d2F3cAF19d20BDBb4e0A4f21cA8A815EDDF65",
    minterFilterAddress: "0x3b90746ac1ccBFC5D6aC3a09d9930Dc3B224a0F9",
  },
];
