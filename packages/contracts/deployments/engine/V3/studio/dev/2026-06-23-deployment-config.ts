// Dev Studio deployment for Privy automated testing.
// Run: yarn deploy:v3-engine:dev
// Post: set transactionHash after Safe execution, then run yarn post-deploy:v3-engine:dev

const privyDevTestUserAddress = "0xb91633E1acdbDC9539131b433C7c027113CA1512";

export const deployNetworkConfiguration = {
  network: "sepolia",
  environment: "dev",
  useLedgerSigner: false,
  useGnosisSafe: true,
  safeAddress: "0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8",
  transactionServiceUrl: "https://safe-transaction-sepolia.safe.global",
  transactionHash: "",
};

export const deployConfigDetailsArray = [
  {
    productClass: "Studio",
    engineCoreContractType: 1,
    tokenName: "Art Blocks Studio Flex | DEV Privy Test",
    tokenTicker: "ABSTUDIO_DEV_PRIVY_TEST_FLEX",
    artistName: "Infra",
    renderProviderAddress: "0x3c6412FEE019f5c50d6F03Aa6F5045d99d9748c4",
    platformProviderAddress: "0x0000000000000000000000000000000000000000",
    newSuperAdminAddress: privyDevTestUserAddress,
    startingProjectId: 0,
    autoApproveArtistSplitProposals: true,
    nullPlatformProvider: true,
    allowArtistProjectActivation: true,
    adminACLContract: "0x0000000000000000000000000000000000000000",
    salt: "0x0",
    defaultVerticalName: "studio",
  },
];
