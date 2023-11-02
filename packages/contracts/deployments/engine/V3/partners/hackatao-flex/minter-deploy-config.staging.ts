// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer by running `deploy:mainnet:minter`, `deploy:staging:minter` or `deploy:dev:minter`.

export const minterDeployDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterSetPriceV4",
    genArt721V3CoreAddress: "0xB7168235De560F3c1730e26F2A4d45179f059906",
    minterFilterAddress: "0x07580B8f821C6FEAF8f122b32A51682F485198C3",
  },
];
