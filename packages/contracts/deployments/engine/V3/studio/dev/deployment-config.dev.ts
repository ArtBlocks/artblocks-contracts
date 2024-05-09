// This file is used to configure the deployment of Engine and Engine Flex contracts
// It is intended to be imported by the batch engine factory deployer by running `deploy:mainnet:v3-engine`, `deploy:staging:v3-engine` or `deploy:dev:v3-engine`.
export const deployNetworkConfiguration = {
  network: "sepolia",
  environment: "dev",
  engineFactoryAddress: "0x0000000f84351b503eB3Df72C7E1f169b2D32728",
  useLedgerSigner: false,
  useGnosisSafe: true,
  safeAddress: "0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8",
  transactionServiceUrl: "https://safe-transaction-sepolia.safe.global",
};

export const deployConfigDetailsArray = [
  {
    engineCoreContractType: 0, // 0 for Engine, 1 for Engine Flex
    engineConfiguration: {
      tokenName: "dev-test2",
      tokenSymbol: "DEV_TEST2",
      renderProviderAddress: "0x3c6412FEE019f5c50d6F03Aa6F5045d99d9748c4",
      platformProviderAddress: "0x0000000000000000000000000000000000000000",
      newSuperAdminAddress: "0x3c6412FEE019f5c50d6F03Aa6F5045d99d9748c4",
      startingProjectId: 0,
      autoApproveArtistSplitProposals: true,
      nullPlatformProvider: true,
      allowArtistProjectActivation: true,
    },
    adminACLContract: "0x0000000000000000000000000000000000000000",
    salt: "0x0",
    transactionHash:
      "0x05ed898cf5eb9ae12443c031e097633f6fc263d794972c448d70ae3842c2dde2",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "studio",
  },
  {
    engineCoreContractType: 1, // 0 for Engine, 1 for Engine Flex
    engineConfiguration: {
      tokenName: "dev-test-flex",
      tokenSymbol: "DEV_TEST_FLEX",
      renderProviderAddress: "0x3c6412FEE019f5c50d6F03Aa6F5045d99d9748c4",
      platformProviderAddress: "0x0000000000000000000000000000000000000000",
      newSuperAdminAddress: "0x3c6412FEE019f5c50d6F03Aa6F5045d99d9748c4",
      startingProjectId: 0,
      autoApproveArtistSplitProposals: true,
      nullPlatformProvider: true,
      allowArtistProjectActivation: true,
    },
    adminACLContract: "0x0000000000000000000000000000000000000000",
    salt: "0x0",
    transactionHash:
      "0x05ed898cf5eb9ae12443c031e097633f6fc263d794972c448d70ae3842c2dde2",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "studio",
  },
];
