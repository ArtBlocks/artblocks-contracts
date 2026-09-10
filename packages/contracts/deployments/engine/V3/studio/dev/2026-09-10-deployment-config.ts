// This file is used to configure the deployment of Engine and Engine Flex contracts
// It is intended to be imported by the batch engine factory deployer by running `deploy:v3-engine:dev`.
//
// Replaces the dev default project-creation contract with one on core v3.3.1,
// so projects created there support per-project transfer hooks. The contract it
// replaces is an ERC-1167 clone of the v3.2.5 implementation and can never gain
// hook support, because a clone's implementation is fixed in its bytecode.
//
// Engine Flex, matching the contract it replaces — dropping to non-Flex would
// silently remove external asset dependency support from new projects.
//
// After deployment, point DEFAULT_AUTO_PROJECT_CREATION_CONTRACT_ADDRESSES in
// apps/creator-dashboard-v2/environments/shared.ts (artblocks repo) at the new
// address, or override it per deployment with
// VITE_AUTO_PROJECT_CREATION_CONTRACT_ADDRESS.

export const deployNetworkConfiguration = {
  network: "sepolia",
  environment: "dev",
  useLedgerSigner: false,
  // ONLY Gnosis Safe is supported for Studio deployments at this time
  useGnosisSafe: true,
  safeAddress: "0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8",
  transactionServiceUrl: "https://safe-transaction-sepolia.safe.global",
  // set the transaction hash after successful execution of the batch creation
  transactionHash: "",
};

export const deployConfigDetailsArray = [
  {
    productClass: "Studio",
    // 1 for Engine Flex
    engineCoreContractType: 1,
    // testnet: a pseudorandom salt is fine, the address is not advertised
    salt: "0x0",
    tokenName: "Art Blocks Studio | DEV v3.3",
    tokenTicker: "ABSTUDIO_DEV_V3_3",
    artistName: "Infra",
    // @dev a fresh AdminACL is deployed and its superAdmin transferred to the
    // same address that controls the contract this replaces, so operational
    // access is unchanged. Reusing the existing AdminACL contract instead would
    // also work, but requires newSuperAdminAddress to be the zero address --
    // the factory rejects setting both.
    newSuperAdminAddress: "0x3c6412FEE019f5c50d6F03Aa6F5045d99d9748c4",
    renderProviderAddress: "0x3c6412FEE019f5c50d6F03Aa6F5045d99d9748c4",
    // platform provider address should be set to the zero address for Studio deployments
    platformProviderAddress: "0x0000000000000000000000000000000000000000",
    startingProjectId: 0,
    autoApproveArtistSplitProposals: true,
    nullPlatformProvider: true,
    allowArtistProjectActivation: true,
    // zero address deploys a new AdminACL, per the note above
    adminACLContract: "0x0000000000000000000000000000000000000000",
    defaultVerticalName: "studio",
  },
];
