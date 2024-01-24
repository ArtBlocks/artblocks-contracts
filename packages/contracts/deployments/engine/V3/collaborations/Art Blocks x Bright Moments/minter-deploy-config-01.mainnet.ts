// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer in `/scripts/minter-deployments/generic-minter-deployer-v3core.ts`

export const minterDeployDetailsArray = [
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterSetPriceERC20V4",
    genArt721V3CoreAddress: "0x145789247973C5D612bF121e9E4Eef84b63Eb707",
    minterFilterAddress: "0x6E522449C1642E7cB0B12a2889CcBf79b51C69f8",
  },
];
