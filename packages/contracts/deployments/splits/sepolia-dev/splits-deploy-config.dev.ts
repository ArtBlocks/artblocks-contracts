// This file is used to configure the deployment of shared randomizer contracts
// It is intended to be imported by the generic shared randomizer deployer by running
// one of the commands similar to `deploy:shared-randomizer:<network>.

export const deployConfigDetailsArray = [
  {
    network: "sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "dev",
    implementationName: "SplitAtomicV0",
    factoryName: "SplitAtomicFactoryV0",
    requiredSplitAddress: "0x3c6412FEE019f5c50d6F03Aa6F5045d99d9748c4",
    requiredSplitBPS: 2222,
  },
];
