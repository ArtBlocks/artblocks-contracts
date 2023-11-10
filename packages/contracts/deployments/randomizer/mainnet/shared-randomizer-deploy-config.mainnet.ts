// This file is used to configure the deployment of shared randomizer contracts
// It is intended to be imported by the generic shared randomizer deployer by running
// one of the commands similar to `deploy:shared-randomizer:<network>.

export const deployConfigDetailsArray = [
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    randomizerName: "SharedRandomizerV0",
    // if the following is undefined, a new pseudorandomAtomicContract will be deployed.
    // if the following is defined, the existing pseudorandomAtomicContract will be used.
    pseudorandomAtomicContractAddress: undefined,
    // the following can be undefined if pseudorandomAtomicContractAddress is defined,
    // but must be defined if pseudorandomAtomicContractAddress is undefined (since new
    // pseudorandomAtomicContract will be deployed)
    pseudorandomAtomicContractName: "PseudorandomAtomic",
  },
];
