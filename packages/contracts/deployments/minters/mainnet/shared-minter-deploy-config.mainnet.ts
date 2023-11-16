// This file is used to configure the deployment of shared minter contracts.
// It is intended to be imported by the generic shared minter deployer by running
// one of the commands similar to `deploy:shared-minters:<network>.

export const deployConfigDetailsArray = [
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterSetPriceV5",
    minterFilterAddress: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterSetPriceERC20V5",
    minterFilterAddress: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterSetPriceHolderV5",
    minterFilterAddress: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterSetPriceMerkleV5",
    minterFilterAddress: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterSetPricePolyptychV5",
    minterFilterAddress: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterSetPricePolyptychERC20V5",
    minterFilterAddress: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterDAExpV5",
    minterFilterAddress: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterDALinV5",
    minterFilterAddress: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterDAExpSettlementV3",
    minterFilterAddress: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterDAExpHolderV5",
    minterFilterAddress: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterDALinHolderV5",
    minterFilterAddress: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
];
