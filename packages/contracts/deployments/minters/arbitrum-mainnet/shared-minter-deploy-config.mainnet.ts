// This file is used to configure the deployment of shared minter contracts.
// It is intended to be imported by the generic shared minter deployer by running
// one of the commands similar to `deploy:shared-minters:<network>.

export const deployConfigDetailsArray = [
  {
    network: "arbitrum",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-mainnet",
    minterName: "MinterSetPriceV5",
    minterFilterAddress: "0x3b1Fe77D72e2DE15EF3A1ff83176e9F9af9E292A",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-mainnet",
    minterName: "MinterSetPriceERC20V5",
    minterFilterAddress: "0x3b1Fe77D72e2DE15EF3A1ff83176e9F9af9E292A",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-mainnet",
    minterName: "MinterSetPriceHolderV5",
    minterFilterAddress: "0x3b1Fe77D72e2DE15EF3A1ff83176e9F9af9E292A",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-mainnet",
    minterName: "MinterSetPriceMerkleV5",
    minterFilterAddress: "0x3b1Fe77D72e2DE15EF3A1ff83176e9F9af9E292A",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-mainnet",
    minterName: "MinterSetPricePolyptychV5",
    minterFilterAddress: "0x3b1Fe77D72e2DE15EF3A1ff83176e9F9af9E292A",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-mainnet",
    minterName: "MinterSetPricePolyptychERC20V5",
    minterFilterAddress: "0x3b1Fe77D72e2DE15EF3A1ff83176e9F9af9E292A",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-mainnet",
    minterName: "MinterDAExpV5",
    minterFilterAddress: "0x3b1Fe77D72e2DE15EF3A1ff83176e9F9af9E292A",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-mainnet",
    minterName: "MinterDALinV5",
    minterFilterAddress: "0x3b1Fe77D72e2DE15EF3A1ff83176e9F9af9E292A",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-mainnet",
    minterName: "MinterDAExpSettlementV3",
    minterFilterAddress: "0x3b1Fe77D72e2DE15EF3A1ff83176e9F9af9E292A",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-mainnet",
    minterName: "MinterDAExpHolderV5",
    minterFilterAddress: "0x3b1Fe77D72e2DE15EF3A1ff83176e9F9af9E292A",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-mainnet",
    minterName: "MinterDALinHolderV5",
    minterFilterAddress: "0x3b1Fe77D72e2DE15EF3A1ff83176e9F9af9E292A",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
];
