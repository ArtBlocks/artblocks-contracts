// This file is used to configure the deployment of shared minter contracts.
// It is intended to be imported by the generic shared minter deployer by running
// one of the commands similar to `deploy:shared-minters:<network>.

export const deployConfigDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "dev",
    minterName: "MinterSetPriceV5",
    minterFilterAddress: "0xf4AC1A3904A1ED2c9E969666A24541bB6e4Cd39f",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
];
