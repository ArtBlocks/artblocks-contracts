// This file is used to configure the deployment of shared minter contracts.
// It is intended to be imported by the generic shared minter deployer by running
// one of the commands similar to `deploy:shared-minters:<network>.

export const deployConfigDetailsArray = [
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterMinPriceV0",
    minterFilterAddress: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: false,
    minMintFeeETH: "0.0015",
  },
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterMinPriceMerkleV0",
    minterFilterAddress: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: false,
    minMintFeeETH: "0.0015",
  },
];
