// This file is used to configure the deployment of shared minter contracts.
// It is intended to be imported by the generic shared minter deployer by running
// one of the commands similar to `deploy:shared-minters:<network>.

export const deployConfigDetailsArray = [
  {
    network: "arbitrum",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-mainnet",
    minterName: "MinterMinPriceV0",
    minterFilterAddress: "0x94560abECb897f359ee1A6Ed0E922315Da11752d",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: false,
    minMintFeeETH: "0.0015",
  },
  {
    network: "arbitrum",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-mainnet",
    minterName: "MinterMinPriceMerkleV0",
    minterFilterAddress: "0x94560abECb897f359ee1A6Ed0E922315Da11752d",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: false,
    minMintFeeETH: "0.0015",
  },
];
