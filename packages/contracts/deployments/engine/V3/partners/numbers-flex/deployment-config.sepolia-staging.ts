// This file is used to configure the deployment of the Engine Partner contracts
// It is intended to be imported by the generic deployer by running `deploy:mainnet:v3-engine`, `deploy:staging:v3-engine` or `deploy:dev:v3-engine`.
export const deployConfigDetailsArray = [
  {
    network: "sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    // if you want to use an existing admin ACL, set the address here (otherwise set as undefined to deploy a new one)
    existingAdminACL: undefined,
    // the following must always be defined and accurate, even if using an existing admin ACL
    adminACLContractName: "AdminACLV1",
    genArt721CoreContractName: "GenArt721CoreV3_Engine_Flex",
    tokenName: "Nnumber",
    tokenTicker: "Nnumber",
    startingProjectId: 0,
    autoApproveArtistSplitProposals: false,
    renderProviderAddress: "deployer", // use either "0x..." or special "deployer" which sets the render provider to the deployer
    platformProviderAddress: "0x64F0D457BE37e429B1CF717AD6EFD14066A7d145", // use either "0x..." or special "deployer" which sets the render provider to the deployer
    // set to true if you want to add an initial project to the core contract
    addInitialProject: false,
    // set to true if you want to transfer the superAdmin role to a different address
    doTransferSuperAdmin: true,
    // set to the address you want to transfer the superAdmin role to
    // (this will only work if you have set doTransferSuperAdmin to true, can be undefined if you are not transferring)
    newSuperAdminAddress: "0x64F0D457BE37e429B1CF717AD6EFD14066A7d145", // use either "0x..." or undefined if not transferring
    // optional overrides for the default split percentages (default is 10% primary, 2.5% secondary)
    renderProviderSplitPercentagePrimary: 10, // percent
    renderProviderSplitBPSSecondary: 250, // basis points (e.g. 250 = 2.5%)
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new veritcal, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "flex",
  },
];
