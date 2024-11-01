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
  transactionHash:
    "0x85abe60aff06169a90406df37c31613ea990c242f2da7484e6c43958379dcbd6",
};

export const deployConfigDetailsArray = [
  {
    // productClass is either "Engine" or "Studio", and used to validate render provider payment address
    productClass: "Engine",
    // 0 for Engine, 1 for Engine Flex
    engineCoreContractType: 1,
    // prod-only: see efficient_addresses...txt in network directories for a list of efficient salts
    salt: "0x000000000000000000000000000000000000000045e65406c2191bc4f01000f8",
    // INCREMENT THESE NUMBERS FOR EACH NEW STUDIO DEPLOYMENT
    tokenName: "In Resonance",
    tokenTicker: "INRES",
    // optionally define this for improved readability and searchability in the deployment logs
    artistName: "",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0xFaa539EAE6cDc1Be93e367f39cCd06555f39322e",
    // see /scripts/util/constants.ts::MAIN_CONFIG for the correct address if prod deployment
    renderProviderAddress: "0x4fbFc0F88270FE3405Ee5bf8c98CC03647b4fdA4",
    // platform provider address should be set to the zero address for Studio deployments
    platformProviderAddress: "0xFaa539EAE6cDc1Be93e367f39cCd06555f39322e",
    startingProjectId: 1,
    // autoApproveArtistSplitProposals should be true for Studio deployments
    autoApproveArtistSplitProposals: false,
    // nullPlatformProvider must be true for Studio deployments
    nullPlatformProvider: false,
    // allowArtistProjectActivation must be true for Studio deployments
    allowArtistProjectActivation: true,
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address 0x0000000000000000000000000000000000000000 to deploy a new one)
    adminACLContract: "0x0000000000000000000000000000000000000000",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "flex",
  },
];
