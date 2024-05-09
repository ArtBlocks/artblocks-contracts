// This file is used to configure the deployment of Engine and Engine Flex contracts
// It is intended to be imported by the batch engine factory deployer by running `deploy:mainnet:v3-engine`, `deploy:staging:v3-engine` or `deploy:dev:v3-engine`.

export const deployNetworkConfiguration = {
  network: "sepolia",
  environment: "dev",
  useLedgerSigner: false,
  useGnosisSafe: true,
  safeAddress: "",
  transactionServiceUrl: "",
  transactionHash: "",
};

export const deployConfigDetailsArray = [
  {
    engineCoreContractType: 0, // 0 for Engine, 1 for Engine Flex
    tokenName: "",
    tokenTicker: "",
    renderProviderAddress: "0x...",
    platformProviderAddress: "0x...",
    newSuperAdminAddress: "0x...",
    startingProjectId: 0,
    autoApproveArtistSplitProposals: false,
    nullPlatformProvider: false,
    allowArtistProjectActivation: true,
    adminACLContract: "0x...",
    salt: "0x0",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "studio",
  },
];
