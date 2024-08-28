export const revertMessages = {
  updateAllowedSeaDropNotSupported:
    "SeaDropXArtBlocksShim: updateAllowedSeaDrop not supported",
  onlyArtistOrSelf:
    "SeaDropXArtBlocksShim: Only the artist or self may call this function",
  onlyArtist: "SeaDropXArtBlocksShim: Only the artist may call this function",
  onlySeaDrop: "SeaDropXArtBlocksShim: Only the SeaDrop may call this function",
  setBaseURINotSupported:
    "SeaDropXArtBlocksShim: baseURI must be configured on the Art Blocks core contract",
  setContractURINotSupported:
    "SeaDropXArtBlocksShim: contractURI not supported on the Art Blocks core contract",
  setMaxSupplyNotSupported:
    "SeaDropXArtBlocksShim: maxSupply must be configured on the Art Blocks core contract",
  setProvenanceHashNotSupported:
    "SeaDropXArtBlocksShim: provenance hash not supported on Art Blocks contracts",
  setRoyaltyInfoNotSupported:
    "SeaDropXArtBlocksShim: royalties must be configured on the Art Blocks core contract",
  maxSupplyExceedsMaxInvocations:
    "SeaDropXArtBlocksShim: Only newMaxSupply lte max invocations on the Art Blocks core contract",
};
