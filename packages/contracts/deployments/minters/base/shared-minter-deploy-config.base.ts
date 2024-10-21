// This file is used to configure the deployment of shared minter contracts.
// It is intended to be imported by the generic shared minter deployer by running
// one of the commands similar to `deploy:shared-minters:<network>.

export const deployConfigDetailsArray = [
  {
    network: "base",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "base-mainnet",
    minterName: "MinterSetPriceV5",
    minterFilterAddress: "0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "base",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "base-mainnet",
    minterName: "MinterSetPriceERC20V5",
    minterFilterAddress: "0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "base",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "base-mainnet",
    minterName: "MinterSetPriceHolderV5",
    minterFilterAddress: "0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "base",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "base-mainnet",
    minterName: "MinterSetPriceMerkleV5",
    minterFilterAddress: "0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "base",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "base-mainnet",
    minterName: "MinterSetPricePolyptychV5",
    minterFilterAddress: "0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "base",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "base-mainnet",
    minterName: "MinterSetPricePolyptychERC20V5",
    minterFilterAddress: "0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "base",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "base-mainnet",
    minterName: "MinterDAExpV5",
    minterFilterAddress: "0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "base",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "base-mainnet",
    minterName: "MinterDALinV5",
    minterFilterAddress: "0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "base",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "base-mainnet",
    minterName: "MinterDAExpSettlementV3",
    minterFilterAddress: "0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "base",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "base-mainnet",
    minterName: "MinterDAExpHolderV5",
    minterFilterAddress: "0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "base",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "base-mainnet",
    minterName: "MinterDALinHolderV5",
    minterFilterAddress: "0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
];
