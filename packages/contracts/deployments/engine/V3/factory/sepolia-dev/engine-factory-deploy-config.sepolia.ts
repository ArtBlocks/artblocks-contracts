// This file is used to configure the deployment of shared Engine Factory contracts
// It is intended to be imported by the generic shared Engine Factory deployer by running
// one of the commands similar to `deploy:engine-factory:<network>.

export const deployConfigDetailsArray = [
  {
    network: "sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "dev",
    engineImplementationName: "GenArt721CoreV3_Engine",
    engineFlexImplementationName: "GenArt721CoreV3_Engine_Flex",
    factoryName: "EngineFactoryV0",
    coreRegistryContractName: "CoreRegistryV1",
  },
];
