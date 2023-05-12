// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer by running `deploy:mainnet:minter`, `deploy:staging:minter` or `deploy:dev:minter`.

export const minterDeployDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "dev",
    minterName: "MinterPolyptychV0",
    genArt721V3CoreAddress: "0x08dADD71F8e0F4e4c1DbDE182728179890663436",
    minterFilterAddress: "0xc3374250ECD41e6632B373e6e050cc500f4B35cD",
  },
];
