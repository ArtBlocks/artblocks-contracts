// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer by running `deploy:mainnet:minter`, `deploy:staging:minter` or `deploy:dev:minter`.

export const minterDeployDetailsArray = [
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterSetPriceV4",
    genArt721V3CoreAddress: "0xD00495689D5161C511882364E0C342e12Dcc5f08",
    minterFilterAddress: "0xB64116A7D5D84fE9795DD022ea191217A2e32076",
  },
];
