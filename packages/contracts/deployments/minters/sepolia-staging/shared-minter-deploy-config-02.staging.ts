// This file is used to configure the deployment of shared minter contracts.
// It is intended to be imported by the generic shared minter deployer by running
// one of the commands similar to `deploy:shared-minters:<network>.

export const deployConfigDetailsArray = [
  {
    network: "sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterMinPriceV0",
    minterFilterAddress: "0xa07f47c30C262adcC263A4D44595972c50e04db7",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
    minMintFeeETH: "0.0015",
  },
  {
    network: "sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterMinPriceMerkleV0",
    minterFilterAddress: "0xa07f47c30C262adcC263A4D44595972c50e04db7",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
    minMintFeeETH: "0.0015",
  },
];
