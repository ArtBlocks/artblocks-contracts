// This file is used to configure the deployment of Engine and Engine Flex contracts
// It is intended to be imported by the batch engine factory deployer by running `deploy:v3-engine:mainnet`, `deploy:v3-engine:staging` or `deploy:v3-engine:dev`.

export const deployNetworkConfiguration = {
  network: "arbitrum",
  // environment is only used for metadata purposes, and is not used in the deployment process
  // Please set to "dev", "staging", or "prod" as appropriate
  environment: "prod",
  useLedgerSigner: true,
  // ONLY Gnosis Safe is supported for Studio deployments at this time
  useGnosisSafe: true,
  safeAddress: "0xD3bE6e30D901fa2e2Fd7f3Ebd23189f5376a4f9D",
  transactionServiceUrl: "https://safe-transaction-arbitrum.safe.global",
  // set the transaction hash after successful execution of the batch creation
  transactionHash:
    "0x9609f36be527852167f8bc5ef9f3b5f782ceea353002edaf61f3ff5afa44d85e",
};

export const deployConfigDetailsArray = [
  {
    // productClass is either "Engine" or "Studio", and used to validate render provider payment address
    productClass: "Engine",
    // 0 for Engine, 1 for Engine Flex
    engineCoreContractType: 1,
    // prod-only: see efficient_addresses...txt in network directories for a list of efficient salts
    salt: "0x0",
    // INCREMENT THESE NUMBERS FOR EACH NEW STUDIO DEPLOYMENT
    tokenName: "DEV TEST | ENGINE FLEX | v3.2.10",
    tokenTicker: "DEV_TEST_ENGINE_FLEX_v3_2_10",
    // optionally define this for improved readability and searchability in the deployment logs
    artistName: "AB Dev Test II",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef",
    // see /scripts/util/constants.ts::MAIN_CONFIG for the correct address if prod deployment
    renderProviderAddress: "0x4fbFc0F88270FE3405Ee5bf8c98CC03647b4fdA4",
    // platform provider address should be set to the zero address for Studio deployments
    platformProviderAddress: "0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef",
    startingProjectId: 101,
    // autoApproveArtistSplitProposals should be true for Studio deployments
    autoApproveArtistSplitProposals: true,
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
