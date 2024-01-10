// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer in `/scripts/minter-deployments/generic-minter-deployer-v3core.ts`

export const minterDeployDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "dev",
    minterName: "MinterSEAV0",
    genArt721V3CoreAddress: "0x5702797Ff45FCb0a70eB6AE1E4563299dCFa9Dd6",
    minterFilterAddress: "0x72AE7160A580893Fb1049D17Fbd736Ad39Ea7FbD",
  },
];
