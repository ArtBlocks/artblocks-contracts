// This file is used to configure the deployment of the Engine Partner contracts
// It is intended to be imported by the generic deployer in `/scripts/engine/V3/generic-v3-engine-deployer.ts`
export const deployDetailsArray = [
  {
    network: "arbitrum",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "arbitrum",
    // if you want to use an existing admin ACL, set the address here (otherwise set as undefined to deploy a new one)
    existingAdminACL: undefined,
    // the following can be undefined if you are using an existing admin ACL, otherwise define the Admin ACL contract name
    // if deploying a new AdminACL
    adminACLContractName: "AdminACLV1",
    // See the `KNOWN_ENGINE_REGISTRIES` object in `/scripts/engine/V3/constants.ts` for the correct registry address for
    // the intended network and the corresponding deployer wallet addresses
    // @dev if you need a new engine registry, use the `/scripts/engine/V3/engine-registry-deployer.ts` script
    engineRegistryAddress: "0xdAe755c2944Ec125a0D8D5CB082c22837593441a",
    randomizerContractName: "BasicRandomizerV2",
    genArt721CoreContractName: "GenArt721CoreV3_Engine",
    tokenName: "Concentric Art",
    tokenTicker: "CONCENTRIC",
    startingProjectId: 0,
    autoApproveArtistSplitProposals: false,
    renderProviderAddress: "0x9a0a334ECeaC3436fd6B3286bB2D4ceEF06809ce", // use either "0x..." or special "deployer" which sets the render provider to the deployer
    platformProviderAddress: "0x5E4b15b15563396940Cd5FC523707451743Deeac", // use either "0x..." or special "deployer" which sets the render provider to the deployer
    // minter suite
    minterFilterContractName: "MinterFilterV1",
    minters: [
      // include any of the most recent minter contracts the engine partner wishes to use
      // @dev ensure the minter contracts here are the latest versions
      "MinterSetPriceV4",
      // "MinterSetPriceERC20V4",
      // "MinterDAExpV4",
      "MinterDAExpSettlementV1",
      // "MinterDALinV4",
      // "MinterHolderV4",
      // "MinterMerkleV5",
    ],
    // set to true if you want to add an initial project to the core contract
    addInitialProject: false,
    // set to true if you want to add an initial token to the initial project
    // (this will only work if you have set addInitialProject to true, and requires a MinterSetPriceV[4-9])
    addInitialToken: false,
    // set to true if you want to transfer the superAdmin role to a different address
    doTransferSuperAdmin: true,
    // set to the address you want to transfer the superAdmin role to
    // (this will only work if you have set doTransferSuperAdmin to true, can be undefined if you are not transferring)
    newSuperAdminAddress: "0x5E4b15b15563396940Cd5FC523707451743Deeac", // use either "0x..." or undefined if not transferring
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new veritcal, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "fullyonchain",
  },
];
