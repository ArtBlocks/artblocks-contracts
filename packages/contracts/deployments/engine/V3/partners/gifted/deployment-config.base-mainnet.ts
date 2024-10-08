// This file is used to configure the deployment of Engine and Engine Flex contracts
// It is intended to be imported by the batch engine factory deployer by running `deploy:v3-engine:mainnet`, `deploy:v3-engine:staging` or `deploy:v3-engine:dev`.

export const deployNetworkConfiguration = {
  network: "base",
  // environment is only used for metadata purposes, and is not used in the deployment process
  // Please set to "dev", "staging", or "mainnet", arbitrum as appropriate
  environment: "base",
  useLedgerSigner: true,
  // ONLY Gnosis Safe is supported for Studio deployments at this time
  useGnosisSafe: true,
  safeAddress: "0x62F8fa18C079C20743F45E74925F80658c68f7b3",
  transactionServiceUrl: "https://safe-transaction-base.safe.global/",
  // set the transaction hash after successful execution of the batch creation
  transactionHash:
    "0x831cdcc237b4ec1eaf5407f6f2ca70677f3799580f9e199b860d5ae5217022a5",
};

export const deployConfigDetailsArray = [
  {
    // productClass is either "Engine" or "Studio", and used to validate render provider payment address
    productClass: "Engine",
    // 0 for Engine, 1 for Engine Flex
    engineCoreContractType: 1,
    tokenName: "Gifted",
    tokenTicker: "GIFT",
    // see /scripts/util/constants.ts::MAIN_CONFIG for the correct address if prod deployment
    renderProviderAddress: "0xc5bd90634d9355B93FE8d07e6F79eAB5EF20AbCc",
    // platform provider address should be set to the zero address for Studio deployments
    platformProviderAddress: "0x86FF92E3cA902a2C1bDD6a001c36eb4ddDfE497B",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0x86FF92E3cA902a2C1bDD6a001c36eb4ddDfE497B",
    startingProjectId: 1,
    // autoApproveArtistSplitProposals should be true for Studio deployments
    autoApproveArtistSplitProposals: false,
    // nullPlatformProvider must be true for Studio deployments
    nullPlatformProvider: false,
    // allowArtistProjectActivation must be true for Studio deployments
    allowArtistProjectActivation: true,
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address to deploy a new one)
    adminACLContract: "0x0000000000000000000000000000000000000000",
    // prod-only: see efficient_addresses...txt in network directories for a list of efficient salts
    salt: "0x00000000000000000000000000000000000000008ffcfb849fbcc4d1020000c0",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "flex",
  },
];
