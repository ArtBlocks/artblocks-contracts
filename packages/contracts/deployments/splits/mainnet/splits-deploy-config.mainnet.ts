// This file is used to configure the deployment of shared randomizer contracts
// It is intended to be imported by the generic shared randomizer deployer by running
// one of the commands similar to `deploy:shared-randomizer:<network>.

export const deployConfigDetailsArray = [
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    implementationName: "SplitAtomicV0",
    factoryName: "SplitAtomicFactoryV0",
    requiredSplitAddress: "0x21A89ef8c577ebaCfe8198644222B49DFD9284F9",
    requiredSplitBPS: 2222,
  },
];
