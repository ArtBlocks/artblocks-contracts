// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer in `/scripts/minter-deployments/generic-minter-deployer-v3core.ts`

export const minterDeployDetailsArray = [
  {
    network: "sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterSetPriceERC20V4",
    genArt721V3CoreAddress: "0xC443588d22Fb0f8dAB928e52014CC23d2Df70743",
    minterFilterAddress: "0xC2f71150f845f830BC61E5B61427A79e9D4FBf6B",
  },
];
