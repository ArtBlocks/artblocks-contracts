// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer in `/scripts/minter-deployments/generic-minter-deployer-v3core.ts`

export const minterDeployDetailsArray = [
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterSetPriceERC20V4",
    genArt721V3CoreAddress: "0xEa698596b6009A622C3eD00dD5a8b5d1CAE4fC36",
    minterFilterAddress: "0xc89c6dfDE92AacD293AF930bD8D290a33D35eEf0",
  },
];
