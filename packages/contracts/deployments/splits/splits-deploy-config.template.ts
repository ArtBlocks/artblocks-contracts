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
    requiredSplitAddress: "0xtbd",
    requiredSplitBPS: 2222,
  },
];
