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
  invalidMaxInvocations: "Invalid max invocations",
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
  purchaseRequiresNFT: "Purchase requires NFT ownership",
  needMoreAllowance: "Insufficient ERC20 allowance",
  needMoreBalance: "Insufficient ERC20 balance",
  ERC20TransferToZeroError: "ERC20: transfer to the zero address",
  ERC20MockBannedTransfer: "ERC20Mock: transfer to banned address",
  ERC20NotConfigured: "ERC20: payment not configured",
  ERC20NoEther: "ERC20: No ETH when using ERC20",
  ERC20NullAddress: "null address, only ERC20",
  ERC20NonNullSymbol: "only non-null symbol",
  panelAlreadyMinted: "Panel already minted",
  unexpectedHashSeed: "Unexpected token hash seed",
  inactiveFunction: "Inactive function",
};
