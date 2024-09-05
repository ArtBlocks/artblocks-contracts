// This file is used to configure the deployment of Engine and Engine Flex contracts
// It is intended to be imported by the batch engine factory deployer by running `deploy:v3-engine:mainnet`, `deploy:v3-engine:staging` or `deploy:v3-engine:dev`.

export const deployNetworkConfiguration = {
  network: "mainnet",
  // environment is only used for metadata purposes, and is not used in the deployment process
  // Please set to "dev", "staging", or "mainnet", arbitrum as appropriate
  environment: "mainnet",
  useLedgerSigner: true,
  // ONLY Gnosis Safe is supported for Studio deployments at this time
  useGnosisSafe: true,
  safeAddress: "0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA",
  transactionServiceUrl: "https://safe-transaction-mainnet.safe.global",
  // set the transaction hash after successful execution of the batch creation
  transactionHash: "",
};

export const deployConfigDetailsArray = [
  {
    // productClass is either "Engine" or "Studio", and used to validate render provider payment address
    productClass: "Studio",
    // 0 for Engine, 1 for Engine Flex
    engineCoreContractType: 1,
    // prod-only: see efficient_addresses...txt in network directories for a list of efficient salts
    salt: "0x0000000000000000000000000000000000000000a73bf3db9deb94cc9b080080",
    // INCREMENT THESE NUMBERS FOR EACH NEW STUDIO DEPLOYMENT
    tokenName: "Art Blocks Studio | 27",
    tokenTicker: "ABSTUDIO_27",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0x71fE505119c43b5c5812E1c1197876976e3a05aE",
    // see /scripts/util/constants.ts::MAIN_CONFIG for the correct address if prod deployment
    renderProviderAddress: "0x036F3D03C1ccdde1878F01607922EA12110Ee9Bd",
    // platform provider address should be set to the zero address for Studio deployments
    platformProviderAddress: "0x0000000000000000000000000000000000000000",
    startingProjectId: 0,
    // autoApproveArtistSplitProposals should be true for Studio deployments
    autoApproveArtistSplitProposals: true,
    // nullPlatformProvider must be true for Studio deployments
    nullPlatformProvider: true,
    // allowArtistProjectActivation must be true for Studio deployments
    allowArtistProjectActivation: true,
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address to deploy a new one)
    adminACLContract: "0x0000000000000000000000000000000000000000",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "studio",
  },
  {
    // productClass is either "Engine" or "Studio", and used to validate render provider payment address
    productClass: "Studio",
    // 0 for Engine, 1 for Engine Flex
    engineCoreContractType: 1,
    // prod-only: see efficient_addresses...txt in network directories for a list of efficient salts
    salt: "0x0000000000000000000000000000000000000000a73bf3db9debc3ca63080060",
    // INCREMENT THESE NUMBERS FOR EACH NEW STUDIO DEPLOYMENT
    tokenName: "Art Blocks Studio | 28",
    tokenTicker: "ABSTUDIO_28",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0x2672125fbBBFC8b5A9e22d4146Ac918732F0948C",
    // see /scripts/util/constants.ts::MAIN_CONFIG for the correct address if prod deployment
    renderProviderAddress: "0x036F3D03C1ccdde1878F01607922EA12110Ee9Bd",
    // platform provider address should be set to the zero address for Studio deployments
    platformProviderAddress: "0x0000000000000000000000000000000000000000",
    startingProjectId: 0,
    // autoApproveArtistSplitProposals should be true for Studio deployments
    autoApproveArtistSplitProposals: true,
    // nullPlatformProvider must be true for Studio deployments
    nullPlatformProvider: true,
    // allowArtistProjectActivation must be true for Studio deployments
    allowArtistProjectActivation: true,
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address to deploy a new one)
    adminACLContract: "0x0000000000000000000000000000000000000000",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "studio",
  },
  {
    // productClass is either "Engine" or "Studio", and used to validate render provider payment address
    productClass: "Studio",
    // 0 for Engine, 1 for Engine Flex
    engineCoreContractType: 1,
    // prod-only: see efficient_addresses...txt in network directories for a list of efficient salts
    salt: "0x0000000000000000000000000000000000000000a73bf3db9deb3358e3080020",
    // INCREMENT THESE NUMBERS FOR EACH NEW STUDIO DEPLOYMENT
    tokenName: "Art Blocks Studio | 29",
    tokenTicker: "ABSTUDIO_29",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0x584Dc29ddd6cA2a3200dD630dBF65B6A84Cb0d86",
    // see /scripts/util/constants.ts::MAIN_CONFIG for the correct address if prod deployment
    renderProviderAddress: "0x036F3D03C1ccdde1878F01607922EA12110Ee9Bd",
    // platform provider address should be set to the zero address for Studio deployments
    platformProviderAddress: "0x0000000000000000000000000000000000000000",
    startingProjectId: 0,
    // autoApproveArtistSplitProposals should be true for Studio deployments
    autoApproveArtistSplitProposals: true,
    // nullPlatformProvider must be true for Studio deployments
    nullPlatformProvider: true,
    // allowArtistProjectActivation must be true for Studio deployments
    allowArtistProjectActivation: true,
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address to deploy a new one)
    adminACLContract: "0x0000000000000000000000000000000000000000",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "studio",
  },
  {
    // productClass is either "Engine" or "Studio", and used to validate render provider payment address
    productClass: "Studio",
    // 0 for Engine, 1 for Engine Flex
    engineCoreContractType: 1,
    // prod-only: see efficient_addresses...txt in network directories for a list of efficient salts
    salt: "0x0000000000000000000000000000000000000000a73bf3db9deb5f1cfa0a0080",
    // INCREMENT THESE NUMBERS FOR EACH NEW STUDIO DEPLOYMENT
    tokenName: "Art Blocks Studio | 30",
    tokenTicker: "ABSTUDIO_30",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0x5Bb2d838562A380e7bCE01382D1E1FD76CE51b74",
    // see /scripts/util/constants.ts::MAIN_CONFIG for the correct address if prod deployment
    renderProviderAddress: "0x036F3D03C1ccdde1878F01607922EA12110Ee9Bd",
    // platform provider address should be set to the zero address for Studio deployments
    platformProviderAddress: "0x0000000000000000000000000000000000000000",
    startingProjectId: 0,
    // autoApproveArtistSplitProposals should be true for Studio deployments
    autoApproveArtistSplitProposals: true,
    // nullPlatformProvider must be true for Studio deployments
    nullPlatformProvider: true,
    // allowArtistProjectActivation must be true for Studio deployments
    allowArtistProjectActivation: true,
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address to deploy a new one)
    adminACLContract: "0x0000000000000000000000000000000000000000",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "studio",
  },
  {
    // productClass is either "Engine" or "Studio", and used to validate render provider payment address
    productClass: "Studio",
    // 0 for Engine, 1 for Engine Flex
    engineCoreContractType: 0,
    // prod-only: see efficient_addresses...txt in network directories for a list of efficient salts
    salt: "0x0000000000000000000000000000000000000000f7634f1ab331872e19010000",
    // INCREMENT THESE NUMBERS FOR EACH NEW STUDIO DEPLOYMENT
    tokenName: "Art Blocks Studio | 31",
    tokenTicker: "ABSTUDIO_31",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0x98f3ECdF3ac268b7829E94bbBFd24C4616F27f50",
    // see /scripts/util/constants.ts::MAIN_CONFIG for the correct address if prod deployment
    renderProviderAddress: "0x036F3D03C1ccdde1878F01607922EA12110Ee9Bd",
    // platform provider address should be set to the zero address for Studio deployments
    platformProviderAddress: "0x0000000000000000000000000000000000000000",
    startingProjectId: 0,
    // autoApproveArtistSplitProposals should be true for Studio deployments
    autoApproveArtistSplitProposals: true,
    // nullPlatformProvider must be true for Studio deployments
    nullPlatformProvider: true,
    // allowArtistProjectActivation must be true for Studio deployments
    allowArtistProjectActivation: true,
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address to deploy a new one)
    adminACLContract: "0x0000000000000000000000000000000000000000",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "studio",
  },
];
