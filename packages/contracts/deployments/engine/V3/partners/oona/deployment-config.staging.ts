// This file is used to configure the deployment of Engine and Engine Flex contracts
// It is intended to be imported by the batch engine factory deployer by running `deploy:v3-engine:mainnet`, `deploy:v3-engine:staging` or `deploy:v3-engine:dev`.

export const deployNetworkConfiguration = {
  network: "sepolia",
  // environment is only used for metadata purposes, and is not used in the deployment process
  // Please set to "dev", "staging", or "mainnet", arbitrum as appropriate
  environment: "staging",
  useLedgerSigner: false,
  // ONLY Gnosis Safe is supported for Studio deployments at this time
  useGnosisSafe: true,
  safeAddress: "0x62DC3F6C7Bf5FA8A834E6B97dee3daB082873600",
  transactionServiceUrl: "https://safe-transaction-sepolia.safe.global",
  // set the transaction hash after successful execution of the batch creation
  transactionHash:
    "0xb43b0ed666f132638f3e202425cab531a51f32ddfcc19c166cb1a5b86fb31a86",
};

export const deployConfigDetailsArray = [
  {
    // productClass is either "Engine" or "Studio", and used to validate render provider payment address
    productClass: "Engine",
    // 0 for Engine, 1 for Engine Flex
    engineCoreContractType: 1,
    tokenName: "OONA",
    tokenTicker: "OONA",
    // see /scripts/util/constants.ts::MAIN_CONFIG for the correct address if prod deployment
    renderProviderAddress: "0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef",
    // platform provider address should be set to the zero address for Studio deployments
    platformProviderAddress: "0x4D1C149e6728314d0d6C4f7d48DbF83bD196444E",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0x4D1C149e6728314d0d6C4f7d48DbF83bD196444E",
    startingProjectId: 2024,
    // autoApproveArtistSplitProposals should be true for Studio deployments
    autoApproveArtistSplitProposals: true,
    // nullPlatformProvider must be true for Studio deployments
    nullPlatformProvider: false,
    // allowArtistProjectActivation must be true for Studio deployments
    allowArtistProjectActivation: true,
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address to deploy a new one)
    adminACLContract: "0x0000000000000000000000000000000000000000",
    // prod-only: see efficient_addresses...txt in network directories for a list of efficient salts
    salt: "0x0",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "flex",
  },
];
