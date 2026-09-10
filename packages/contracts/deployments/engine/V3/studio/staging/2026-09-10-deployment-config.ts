// This file is used to configure the deployment of Engine and Engine Flex contracts
// It is intended to be imported by the batch engine factory deployer by running `deploy:v3-engine:staging`.
//
// Replaces the staging default project-creation contract with one on core v3.3.1,
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
  environment: "staging",
  useLedgerSigner: false,
  // ONLY Gnosis Safe is supported for Studio deployments at this time
  useGnosisSafe: true,
  safeAddress: "0x62DC3F6C7Bf5FA8A834E6B97dee3daB082873600",
  transactionServiceUrl: "https://safe-transaction-sepolia.safe.global",
  // set the transaction hash after successful execution of the batch creation
  transactionHash:
    "0xd3d91feb5452553deb053f07efa966640f0fdd29140b908958aab90f78d41e5a",
};

export const deployConfigDetailsArray = [
  {
    productClass: "Studio",
    // 1 for Engine Flex
    engineCoreContractType: 1,
    // testnet: a pseudorandom salt is fine, the address is not advertised
    salt: "0x0",
    tokenName: "Art Blocks Studio | STAGING v3.3",
    tokenTicker: "ABSTUDIO_STAGING_V3_3",
    artistName: "Infra",
    // @dev a fresh AdminACL is deployed and its superAdmin transferred to the
    // same address that controls the contract this replaces, so operational
    // access is unchanged. Reusing the existing AdminACL contract instead would
    // also work, but requires newSuperAdminAddress to be the zero address --
    // the factory rejects setting both.
    newSuperAdminAddress: "0xAbaBab074cbD610f70A0809b6c4BA8852d7B93Da",
    renderProviderAddress: "0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef",
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
