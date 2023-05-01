// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer by running `deploy:mainnet:minter`, `deploy:staging:minter` or `deploy:dev:minter`.

export const minterDeployDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterSetPriceV4",
    genArt721V3CoreAddress: "0x6200437235E9AB363e83A53666871d745BfE52F3",
    minterFilterAddress: "0x868A6FFA1020E78e73ea7573c443C1BECF934068",
  },
];
