// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer by running `deploy:mainnet:minter`, `deploy:staging:minter` or `deploy:dev:minter`.

export const minterDeployDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterSetPriceV4",
    genArt721V3CoreAddress: "0x42F05a460587Ddd1AFFEf43BfF933e78d6b34424",
    minterFilterAddress: "0xA212fF59FeE69C5bB233ceC3873a2cb42546D30b",
  },
];
