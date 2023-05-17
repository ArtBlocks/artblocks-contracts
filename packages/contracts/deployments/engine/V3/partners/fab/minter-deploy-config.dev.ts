// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer in `/scripts/minter-deployments/generic-minter-deployer-v3core.ts`

export const minterDeployDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterDAExpV4",
    genArt721V3CoreAddress: "0x043Eeb8bFd416666b57dd2C5Be439e6fB23e9ce1",
    minterFilterAddress: "0x1A6b570499195139E38Cfa56044Dd748839beE1A",
  },
];
