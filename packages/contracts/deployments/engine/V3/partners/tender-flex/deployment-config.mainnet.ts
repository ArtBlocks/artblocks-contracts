// This file is used to configure the deployment of the Engine Partner contracts
// It is intended to be imported by the generic deployer in `/scripts/engine/V3/generic-v3-engine-deployer.ts`
// @dev ticket: https://github.com/ArtBlocks/artblocks/issues/553
export const deployDetailsArray = [
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    // if you want to use an existing admin ACL, set the address here (otherwise set as undefined to deploy a new one)
    existingAdminACL: undefined,
    // the following can be undefined if you are using an existing admin ACL, otherwise define the Admin ACL contract name
    // if deploying a new AdminACL
    adminACLContractName: "AdminACLV1",
    // See the `KNOWN_ENGINE_REGISTRIES` object in `/scripts/engine/V3/constants.ts` for the correct registry address for
    // the intended network and the corresponding deployer wallet addresses
    // @dev if you neeed a new engine registry, use the `/scripts/engine/V3/engine-registry-deployer.ts` script
    engineRegistryAddress: "0x652490c8BB6e7ec3Fd798537D2F348D7904BBbc2",
    randomizerContractName: "BasicRandomizerV2",
    genArt721CoreContractName: "GenArt721CoreV3_Engine_Flex",
    tokenName: "Tender Flex",
    tokenTicker: "TENDER",
    startingProjectId: 0,
    autoApproveArtistSplitProposals: false,
    renderProviderAddress: "0xE7bEB4Af9Da9b567778278F863Ed475212589526", // use either "0x..." or special "deployer" which sets the render provider to the deployer
    platformProviderAddress: "0xFdc45dae01d1F9EF394b33c227BA9489795d148B", // use either "0x..." or special "deployer" which sets the render provider to the deployer
    // minter suite
    minterFilterContractName: "MinterFilterV1",
    minters: [
      // include any of the most recent minter contracts the engine partner wishes to use
      // @dev ensure the minter contracts here are the latest versions
      "MinterDAExpSettlementV1",
      "MinterMerkleV5",
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
    newSuperAdminAddress: "0xFdc45dae01d1F9EF394b33c227BA9489795d148B", // use either "0x..." or undefined if not transferring
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new veritcal, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "flex",
  },
];
