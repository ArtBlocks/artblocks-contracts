// This file is used to configure the deployment of Engine and Engine Flex contracts
// It is intended to be imported by the batch engine factory deployer by running `deploy:v3-engine:mainnet`, `deploy:v3-engine:staging` or `deploy:v3-engine:dev`.

export const deployNetworkConfiguration = {
  network: "sepolia",
  // environment is only used for metadata purposes, and is not used in the deployment process	    tokenName: "",
  // Please set to "dev", "staging", or "mainnet", as appropriate
  environment: "dev",
  useLedgerSigner: false,
  useGnosisSafe: true,
  safeAddress: "",
  transactionServiceUrl: "",
  // set the transaction hash after successful execution of the batch creation
  transactionHash: "",
};

export const deployConfigDetailsArray = [
  {
    // 0 for Engine, 1 for Engine Flex
    engineCoreContractType: 0,
    tokenName: "",
    tokenTicker: "",
    renderProviderAddress: "0x...",
    platformProviderAddress: "0x...",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0x...",
    startingProjectId: 0,
    autoApproveArtistSplitProposals: false,
    nullPlatformProvider: false,
    allowArtistProjectActivation: true,
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address to deploy a new one)
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
