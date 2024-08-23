// This file is used to configure the deployment of Engine and Engine Flex contracts
// It is intended to be imported by the batch engine factory deployer by running `deploy:v3-engine:mainnet`, `deploy:v3-engine:staging` or `deploy:v3-engine:dev`.

export const deployNetworkConfiguration = {
  network: "sepolia",
  // environment is only used for metadata purposes, and is not used in the deployment process
  // Please set to "dev", "staging", or "mainnet", arbitrum as appropriate
  environment: "dev",
  useLedgerSigner: false,
  // ONLY Gnosis Safe is supported for Studio deployments at this time
  useGnosisSafe: true,
  safeAddress: "",
  transactionServiceUrl: "https://safe-transaction-sepolia.safe.global",
  // set the transaction hash after successful execution of the batch creation
  transactionHash: "",
};

export const deployConfigDetailsArray = [
  {
    // productClass is either "Engine" or "Studio", and used to validate render provider payment address
    productClass: "Studio",
    // 0 for Engine, 1 for Engine Flex
    engineCoreContractType: 0,
    // INCREMENT THESE NUMBERS FOR EACH NEW STUDIO DEPLOYMENT
    tokenName: "Art Blocks Studio | #",
    tokenTicker: "ABSTUDIO_#",
    // optionally define this for improved readability and searchability in the deployment logs
    artistName: "Art Blocks Studio Artist",
    // see /scripts/util/constants.ts::MAIN_CONFIG for the correct address if prod deployment
    renderProviderAddress: "0x...",
    // platform provider address should be set to the zero address for Studio deployments
    platformProviderAddress: "0x...",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0x...",
    startingProjectId: 0,
    // autoApproveArtistSplitProposals should be true for Studio deployments
    autoApproveArtistSplitProposals: false,
    // nullPlatformProvider must be true for Studio deployments
    nullPlatformProvider: false,
    // allowArtistProjectActivation must be true for Studio deployments
    allowArtistProjectActivation: true,
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address to deploy a new one)
    adminACLContract: "0x...",
    // prod-only: see efficient_addresses...txt in network directories for a list of efficient salts
    salt: "0x0",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "studio",
  },
];
