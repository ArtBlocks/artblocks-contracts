// This file is used to configure the deployment of Engine and Engine Flex contracts
// It is intended to be imported by the batch engine factory deployer by running `deploy:v3-engine:mainnet`, `deploy:v3-engine:staging` or `deploy:v3-engine:dev`.

export const deployNetworkConfiguration = {
  network: "arbitrum",
  // environment is only used for metadata purposes, and is not used in the deployment process
  // Please set to "dev", "staging", or "mainnet", arbitrum as appropriate
  environment: "arbitrum",
  useLedgerSigner: true,
  // ONLY Gnosis Safe is supported for Studio deployments at this time
  useGnosisSafe: true,
  safeAddress: "0xD3bE6e30D901fa2e2Fd7f3Ebd23189f5376a4f9D",
  transactionServiceUrl: "https://safe-transaction-arbitrum.safe.global",
  // set the transaction hash after successful execution of the batch creation
  transactionHash: "",
};

export const deployConfigDetailsArray = [
  {
    // 0 for Engine, 1 for Engine Flex
    engineCoreContractType: 1,
    // INCREMENT THESE NUMBERS FOR EACH NEW STUDIO DEPLOYMENT
    tokenName: "Art Blocks Studio | 2",
    tokenTicker: "ABSTUDIO_2",
    // see /scripts/util/constants.ts::MAIN_CONFIG for the correct address if prod deployment
    renderProviderAddress: "0x23636eAa2605B9c4a988E56d2093b488793f1C42",
    // platform provider address should be set to the zero address for Studio deployments
    platformProviderAddress: "0x0000000000000000000000000000000000000000.",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0x...",
    startingProjectId: 0,
    // autoApproveArtistSplitProposals should be true for Studio deployments
    autoApproveArtistSplitProposals: true,
    // nullPlatformProvider must be true for Studio deployments
    nullPlatformProvider: true,
    // allowArtistProjectActivation must be true for Studio deployments
    allowArtistProjectActivation: true,
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address to deploy a new one)
    adminACLContract: "0x0000000000000000000000000000000000000000",
    // prod-only: see efficient_addresses...txt in network directories for a list of efficient salts
    salt: "0x0000000000000000000000000000000000000000c696618890a9629be0060040",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "studio",
  },
  {
    // 0 for Engine, 1 for Engine Flex
    engineCoreContractType: 1,
    // INCREMENT THESE NUMBERS FOR EACH NEW STUDIO DEPLOYMENT
    tokenName: "Art Blocks Studio | 3",
    tokenTicker: "ABSTUDIO_3",
    // see /scripts/util/constants.ts::MAIN_CONFIG for the correct address if prod deployment
    renderProviderAddress: "0x23636eAa2605B9c4a988E56d2093b488793f1C42",
    // platform provider address should be set to the zero address for Studio deployments
    platformProviderAddress: "0x0000000000000000000000000000000000000000.",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0x...",
    startingProjectId: 0,
    // autoApproveArtistSplitProposals should be true for Studio deployments
    autoApproveArtistSplitProposals: true,
    // nullPlatformProvider must be true for Studio deployments
    nullPlatformProvider: true,
    // allowArtistProjectActivation must be true for Studio deployments
    allowArtistProjectActivation: true,
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address to deploy a new one)
    adminACLContract: "0x0000000000000000000000000000000000000000",
    // prod-only: see efficient_addresses...txt in network directories for a list of efficient salts
    salt: "0x0000000000000000000000000000000000000000c696618890a9dacbf7060040",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "studio",
  },
  {
    // 0 for Engine, 1 for Engine Flex
    engineCoreContractType: 1,
    // INCREMENT THESE NUMBERS FOR EACH NEW STUDIO DEPLOYMENT
    tokenName: "Art Blocks Studio | 4",
    tokenTicker: "ABSTUDIO_4",
    // see /scripts/util/constants.ts::MAIN_CONFIG for the correct address if prod deployment
    renderProviderAddress: "0x23636eAa2605B9c4a988E56d2093b488793f1C42",
    // platform provider address should be set to the zero address for Studio deployments
    platformProviderAddress: "0x0000000000000000000000000000000000000000.",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0x...",
    startingProjectId: 0,
    // autoApproveArtistSplitProposals should be true for Studio deployments
    autoApproveArtistSplitProposals: true,
    // nullPlatformProvider must be true for Studio deployments
    nullPlatformProvider: true,
    // allowArtistProjectActivation must be true for Studio deployments
    allowArtistProjectActivation: true,
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address to deploy a new one)
    adminACLContract: "0x0000000000000000000000000000000000000000",
    // prod-only: see efficient_addresses...txt in network directories for a list of efficient salts
    salt: "0x0000000000000000000000000000000000000000c696618890a98aab591000d0",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "studio",
  },
  {
    // 0 for Engine, 1 for Engine Flex
    engineCoreContractType: 0,
    // INCREMENT THESE NUMBERS FOR EACH NEW STUDIO DEPLOYMENT
    tokenName: "Art Blocks Studio | 5",
    tokenTicker: "ABSTUDIO_5",
    // see /scripts/util/constants.ts::MAIN_CONFIG for the correct address if prod deployment
    renderProviderAddress: "0x23636eAa2605B9c4a988E56d2093b488793f1C42",
    // platform provider address should be set to the zero address for Studio deployments
    platformProviderAddress: "0x0000000000000000000000000000000000000000.",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0x...",
    startingProjectId: 0,
    // autoApproveArtistSplitProposals should be true for Studio deployments
    autoApproveArtistSplitProposals: true,
    // nullPlatformProvider must be true for Studio deployments
    nullPlatformProvider: true,
    // allowArtistProjectActivation must be true for Studio deployments
    allowArtistProjectActivation: true,
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address to deploy a new one)
    adminACLContract: "0x0000000000000000000000000000000000000000",
    // prod-only: see efficient_addresses...txt in network directories for a list of efficient salts
    salt: "0x00000000000000000000000000000000000000003c395f2944e59e95810600e0",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "studio",
  },
  {
    // 0 for Engine, 1 for Engine Flex
    engineCoreContractType: 0,
    // INCREMENT THESE NUMBERS FOR EACH NEW STUDIO DEPLOYMENT
    tokenName: "Art Blocks Studio | 6",
    tokenTicker: "ABSTUDIO_6",
    // see /scripts/util/constants.ts::MAIN_CONFIG for the correct address if prod deployment
    renderProviderAddress: "0x23636eAa2605B9c4a988E56d2093b488793f1C42",
    // platform provider address should be set to the zero address for Studio deployments
    platformProviderAddress: "0x0000000000000000000000000000000000000000.",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0x...",
    startingProjectId: 0,
    // autoApproveArtistSplitProposals should be true for Studio deployments
    autoApproveArtistSplitProposals: true,
    // nullPlatformProvider must be true for Studio deployments
    nullPlatformProvider: true,
    // allowArtistProjectActivation must be true for Studio deployments
    allowArtistProjectActivation: true,
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address to deploy a new one)
    adminACLContract: "0x0000000000000000000000000000000000000000",
    // prod-only: see efficient_addresses...txt in network directories for a list of efficient salts
    salt: "0x00000000000000000000000000000000000000003c395f2944e56cc150240090",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "studio",
  },
];
