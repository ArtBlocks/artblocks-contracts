// This file is used to configure the deployment of the Engine Partner contracts
// It is intended to be imported by the generic deployer by running `deploy:mainnet:v3-engine`, `deploy:staging:v3-engine` or `deploy:dev:v3-engine`.
export const deployDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "dev",
    // if you want to use an existing admin ACL, set the address here (otherwise set as undefined to deploy a new one)
    existingAdminACL: undefined,
    // the following must always be defined and accurate, even if using an existing admin ACL
    adminACLContractName: "AdminACLV1",
    // See the `KNOWN_ENGINE_REGISTRIES` object in `/scripts/engine/V3/constants.ts` for the correct registry address for
    // the intended network and the corresponding deployer wallet addresses
    // @dev if you neeed a new engine registry, use the `/scripts/engine/V3/engine-registry-deployer.ts` script
    engineRegistryAddress: "0x263113c07CB69eE047E6572E135E8C3C6302feFE",
    randomizerContractName: "BasicRandomizerV2",
    genArt721CoreContractName: "GenArt721CoreV3_Engine",
    tokenName: "Engine Partner",
    tokenTicker: "PRTNR",
    startingProjectId: 0,
    autoApproveArtistSplitProposals: true,
    renderProviderAddress: "deployer", // use either "0x..." or special "deployer" which sets the render provider to the deployer
    platformProviderAddress: "deployer", // use either "0x..." or special "deployer" which sets the render provider to the deployer
    // minter suite
    minterFilterContractName: "MinterFilterV1",
    minters: [
      // include any of the most recent minter contracts the engine partner wishes to use
      // @dev ensure the minter contracts here are the latest versions
      "MinterSetPriceV4",
      "MinterSetPriceERC20V4",
      "MinterDAExpV4",
      "MinterDAExpSettlementV1",
      "MinterDALinV4",
      "MinterHolderV4",
      "MinterMerkleV5",
    ],
    // set to true if you want to add an initial project to the core contract
    addInitialProject: true,
    // set to true if you want to add an initial token to the initial project
    // (this will only work if you have set addInitialProject to true, and requires a MinterSetPriceV[4-9])
    addInitialToken: true,
    // set to true if you want to transfer the superAdmin role to a different address
    doTransferSuperAdmin: false,
    // set to the address you want to transfer the superAdmin role to
    // (this will only work if you have set doTransferSuperAdmin to true, can be undefined if you are not transferring)
    newSuperAdminAddress: undefined, // use either "0x..." or undefined if not transferring
    // optional overrides for the default split percentages (default is 10% primary, 2.5% secondary)
    renderProviderSplitPercentagePrimary: 10, // percent
    renderProviderSplitBPSSecondary: 250, // basis points (e.g. 250 = 2.5%)
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new veritcal, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "fullyonchain",
  },
];
