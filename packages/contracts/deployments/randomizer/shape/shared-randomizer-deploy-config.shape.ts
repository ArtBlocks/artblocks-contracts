// This file is used to configure the deployment of shared randomizer contracts.
// It is intended to be imported by the generic shared randomizer deployer by running
// `deploy:shared-randomizer:shape`.

export const deployConfigDetailsArray = [
  {
    network: "shape",
    environment: "shape-mainnet",
    randomizerName: "SharedRandomizerV0",
    pseudorandomAtomicContractAddress: undefined,
    pseudorandomAtomicContractName: "PseudorandomAtomic",
  },
];
