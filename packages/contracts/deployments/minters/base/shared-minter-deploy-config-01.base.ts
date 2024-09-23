// This file is used to configure the deployment of shared minter contracts.
// It is intended to be imported by the generic shared minter deployer by running
// one of the commands similar to `deploy:shared-minters:<network>.

export const deployConfigDetailsArray = [
  {
    network: "base",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "base-mainnet",
    minterName: "MinterMinPriceV0",
    minterFilterAddress: "0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: false,
    minMintFeeETH: "0.0015",
  },
  {
    network: "base",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "base-mainnet",
    minterName: "MinterMinPriceMerkleV0",
    minterFilterAddress: "0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: false,
    minMintFeeETH: "0.0015",
  },
];
