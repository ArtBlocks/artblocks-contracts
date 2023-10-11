// This file is used to configure the deployment of shared minter contracts.
// It is intended to be imported by the generic shared minter deployer by running
// one of the commands similar to `deploy:shared-minters:<network>.

export const deployConfigDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "dev",
    minterName: "MinterDAExpSettlementV3",
    minterFilterAddress: "0x6f333Fd0323B1dcfe67100690d0c0c16D66e0208",
    // may only set to true if deploying from the MinterFilter's admin wallet
    approveMinterGlobally: true,
  },
];
