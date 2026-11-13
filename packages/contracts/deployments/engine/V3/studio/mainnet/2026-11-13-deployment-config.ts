// This file is used to configure the deployment of Engine and Engine Flex contracts
// It is intended to be imported by the batch engine factory deployer by running `deploy:v3-engine:mainnet`, `deploy:v3-engine:staging` or `deploy:v3-engine:dev`.

export const deployNetworkConfiguration = {
  network: "mainnet",
  // environment is only used for metadata purposes, and is not used in the deployment process
  // Please set to "dev", "staging", or "prod" as appropriate
  environment: "prod",
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
    engineCoreContractType: 0,
    // salt from _ENGINE_efficient_addresses_mainnet-delete-when-used.txt
    // deploys to 0x000000B2e92CaD8769cEba216a338C46Ddd198B8
    salt: "0x00000000000000000000000000000000000000008adc452df5a18cce88000010",
    // INCREMENT THESE NUMBERS FOR EACH NEW STUDIO DEPLOYMENT
    tokenName: "Art Blocks Studio | 116",
    tokenTicker: "ABSTUDIO_116",
    // optionally define this for improved readability and searchability in the deployment logs
    artistName: "Emily Xie",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0x9f4633b29e89e10c869c8ce2197c63df06eb5355",
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
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address 0x0000000000000000000000000000000000000000 to deploy a new one)
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
    // salt from _FLEX_efficient_addresses_mainnet-delete-when-used.txt
    // deploys to 0x000000426D1a64712E3Da5d6D796b99665D47c28
    salt: "0x000000000000000000000000000000000000000042bd5d61b050a6e455008004",
    // INCREMENT THESE NUMBERS FOR EACH NEW STUDIO DEPLOYMENT
    tokenName: "Art Blocks Studio | 117",
    tokenTicker: "ABSTUDIO_117",
    // optionally define this for improved readability and searchability in the deployment logs
    artistName: "Takens Theorem",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0xAeC49C5186708D0B36C47a08fD6615D5a8743e8A",
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
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address 0x0000000000000000000000000000000000000000 to deploy a new one)
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
    // salt from _FLEX_efficient_addresses_mainnet-delete-when-used.txt
    // deploys to 0x000000410DB924b69d726435e0f627bFA74c884a
    salt: "0x000000000000000000000000000000000000000042bd5d61b050cf4caa000020",
    // INCREMENT THESE NUMBERS FOR EACH NEW STUDIO DEPLOYMENT
    tokenName: "Art Blocks Studio | 118",
    tokenTicker: "ABSTUDIO_118",
    // optionally define this for improved readability and searchability in the deployment logs
    artistName: "rudxane",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0xd2Af9f3e3435FFdEf945830fCe4eaB40877E0475",
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
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address 0x0000000000000000000000000000000000000000 to deploy a new one)
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
    // salt from _FLEX_efficient_addresses_mainnet-delete-when-used.txt
    // deploys to 0x000000E5a12bb65496eaC82af550898AE043aDA5
    salt: "0x000000000000000000000000000000000000000042bd5d61b050a2b7ab000060",
    // INCREMENT THESE NUMBERS FOR EACH NEW STUDIO DEPLOYMENT
    tokenName: "Art Blocks Studio | 119",
    tokenTicker: "ABSTUDIO_119",
    // optionally define this for improved readability and searchability in the deployment logs
    artistName: "Satoshi Aizawa",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0xC347232395C03170A701341CbAD371D8CE95DD94",
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
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address 0x0000000000000000000000000000000000000000 to deploy a new one)
    adminACLContract: "0x0000000000000000000000000000000000000000",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "studio",
  },
];
