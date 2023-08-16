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
    minterFilterAddress: "0xb02d7B810AA2a0697A430C9389062b9F486D2CC5",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
];
