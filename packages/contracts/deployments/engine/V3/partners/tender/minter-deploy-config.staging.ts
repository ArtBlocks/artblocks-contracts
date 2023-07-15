// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer by running `deploy:mainnet:minter`, `deploy:staging:minter` or `deploy:dev:minter`.

export const minterDeployDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterDAExpV4",
    genArt721V3CoreAddress: "0xF2D099644567190D1263786Ed04aA2BFf1102D3d",
    minterFilterAddress: "0xe2cc0aC97700c653982071c6E4a4c9EA37e80beF",
  },
];
