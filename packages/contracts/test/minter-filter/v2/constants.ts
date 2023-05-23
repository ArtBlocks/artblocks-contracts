// expected revert messages for MinterFilterV2.sol
export const revertMessages = {
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
};
