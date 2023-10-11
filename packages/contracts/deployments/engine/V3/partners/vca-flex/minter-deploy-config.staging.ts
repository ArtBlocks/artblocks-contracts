// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer by running `deploy:mainnet:minter`, `deploy:staging:minter` or `deploy:dev:minter`.

export const minterDeployDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterHolderV4",
    genArt721V3CoreAddress: "0xAf40b66072Fe00CAcF5A25Cd1b7F1688Cde20f2F",
    minterFilterAddress: "0x13a8Fca80084Bb968EDE9AA69E38b0cF59Ba603f",
  },
];
