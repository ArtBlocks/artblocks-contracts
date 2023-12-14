// This file is used to configure the deployment of shared minter contracts.
// It is intended to be imported by the generic shared minter deployer by running
// one of the commands similar to `deploy:shared-minters:<network>.

export const deployConfigDetailsArray = [
  {
    network: "arbitrum-sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-staging",
    minterName: "MinterSetPriceV5",
    minterFilterAddress: "0xa07f47c30C262adcC263A4D44595972c50e04db7",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum-sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-staging",
    minterName: "MinterSetPriceERC20V5",
    minterFilterAddress: "0xa07f47c30C262adcC263A4D44595972c50e04db7",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum-sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-staging",
    minterName: "MinterSetPriceHolderV5",
    minterFilterAddress: "0xa07f47c30C262adcC263A4D44595972c50e04db7",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum-sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-staging",
    minterName: "MinterSetPriceMerkleV5",
    minterFilterAddress: "0xa07f47c30C262adcC263A4D44595972c50e04db7",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum-sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-staging",
    minterName: "MinterSetPricePolyptychV5",
    minterFilterAddress: "0xa07f47c30C262adcC263A4D44595972c50e04db7",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum-sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-staging",
    minterName: "MinterSetPricePolyptychERC20V5",
    minterFilterAddress: "0xa07f47c30C262adcC263A4D44595972c50e04db7",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum-sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-staging",
    minterName: "MinterDAExpV5",
    minterFilterAddress: "0xa07f47c30C262adcC263A4D44595972c50e04db7",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum-sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-staging",
    minterName: "MinterDALinV5",
    minterFilterAddress: "0xa07f47c30C262adcC263A4D44595972c50e04db7",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum-sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-staging",
    minterName: "MinterDAExpSettlementV3",
    minterFilterAddress: "0xa07f47c30C262adcC263A4D44595972c50e04db7",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum-sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-staging",
    minterName: "MinterDAExpHolderV5",
    minterFilterAddress: "0xa07f47c30C262adcC263A4D44595972c50e04db7",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
  {
    network: "arbitrum-sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum-staging",
    minterName: "MinterDALinHolderV5",
    minterFilterAddress: "0xa07f47c30C262adcC263A4D44595972c50e04db7",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
];
