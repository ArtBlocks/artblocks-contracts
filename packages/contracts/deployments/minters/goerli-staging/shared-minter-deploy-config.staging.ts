// This file is used to configure the deployment of shared minter contracts.
// It is intended to be imported by the generic shared minter deployer by running
// one of the commands similar to `deploy:shared-minters:<network>.

export const deployConfigDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterSetPriceV5",
    minterFilterAddress: "0xD1d9aD8B1B520F19DFE43Cc975b9470840e8b824",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterSetPriceERC20V5",
    minterFilterAddress: "0xD1d9aD8B1B520F19DFE43Cc975b9470840e8b824",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterSetPriceHolderV5",
    minterFilterAddress: "0xD1d9aD8B1B520F19DFE43Cc975b9470840e8b824",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterSetPriceMerkleV5",
    minterFilterAddress: "0xD1d9aD8B1B520F19DFE43Cc975b9470840e8b824",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterSetPricePolyptychV5",
    minterFilterAddress: "0xD1d9aD8B1B520F19DFE43Cc975b9470840e8b824",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterSetPricePolyptychERC20V5",
    minterFilterAddress: "0xD1d9aD8B1B520F19DFE43Cc975b9470840e8b824",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterDAExpV5",
    minterFilterAddress: "0xD1d9aD8B1B520F19DFE43Cc975b9470840e8b824",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterDALinV5",
    minterFilterAddress: "0xD1d9aD8B1B520F19DFE43Cc975b9470840e8b824",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
];
