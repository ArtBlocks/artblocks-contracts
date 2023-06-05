import { ethers } from "hardhat";

export const CONFIG_MERKLE_ROOT =
  ethers.utils.formatBytes32String("merkleRoot");
export const CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE =
  ethers.utils.formatBytes32String("useMaxMintsPerAddrOverride");
export const CONFIG_MAX_INVOCATIONS_OVERRIDE = ethers.utils.formatBytes32String(
  "maxMintsPerAddrOverride"
);

// expected revert messages
export const revertMessages = {
  onlyArtist: "Only Artist",
  maximumInvocationsReached: "Max invocations reached",
  priceNotConfigured: "Price not configured",
  projectIdDoesNotExist: "Project ID does not exist",
  needMoreValue: "Min value to mint req.",
  noRenounceOwnership: "Cannot renounce ownership",
  onlyAdminACL: "Only Admin ACL allowed",
  onlyCoreAdminACL: "Only Core AdminACL allowed",
  onlyCoreAdminACLOrArtist: "Only Artist or Core Admin ACL",
  onlyRegisteredCore: "Only registered core contract",
  onlyNonZeroAddress: "Only non-zero address",
  minterAlreadyApproved: "Minter already approved",
  noMinterAssigned: "No minter assigned",
  onlyPreviouslyApprovedMinter: "Only previously approved minter",
  onlyApprovedMinters: "Only approved minters",
  onlyValidProjectId: "Only valid project ID",
  onlyAssignedMinter: "Only assigned minter",
  nonExistentKey: "EnumerableMap: nonexistent key",
  lengthOfArraysMustMatch: "TokenHolderLib: arrays neq length",
  onlyRegisteredNFTAddresses: "TokenHolderLib: address not registered",
};
