// Shape mainnet dev test Engine deployment.
// Run: yarn deploy:v3-engine:shape:txbuilder
// Post: yarn post-deploy:v3-engine:shape (after setting transactionHash)

export const deployNetworkConfiguration = {
  network: "shape",
  environment: "prod",
  useLedgerSigner: true,
  useGnosisSafe: true,
  safeAddress: "0x279c2BEE983b73ba4035Ef5c8aD059CF2d0DB848",
  transactionServiceUrl: "https://transaction.safe.shape.network",
  transactionHash:
    "0xeb4ba1fa02ec8643b4f1319726b6c0be2679f2befea2c7e21a3ddfcacc9cfb09",
};

export const deployConfigDetailsArray = [
  {
    productClass: "Engine",
    engineCoreContractType: 1,
    tokenName: "DEV TEST SHAPE | ENGINE FLEX",
    tokenTicker: "DEV_TEST_ENGINE_FLEX",
    artistName: "AB Shape Dev Test",
    renderProviderAddress: "0x6b0A560e8b98b1eFbd687Fb4116c4a188c9F8C30",
    platformProviderAddress: "0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef",
    newSuperAdminAddress: "0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef",
    startingProjectId: 0,
    autoApproveArtistSplitProposals: true,
    nullPlatformProvider: false,
    allowArtistProjectActivation: true,
    adminACLContract: "0x0000000000000000000000000000000000000000",
    salt: "0x0",
    defaultVerticalName: "unassigned",
  },
];
