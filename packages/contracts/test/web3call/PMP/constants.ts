// expected revert messages
export const revertMessages = {
  onlyArtist: "PMP: only artist",
  invalidConfigHook:
    "PMP: tokenPMPPostConfigHook does not implement IPMPConfigureHook",
  invalidAugmentHook:
    "PMP: tokenPMPReadAugmentationHook does not implement IPMPAugmentHook",
  tooManyPMPs: "PMP: Only <= 256 configs",
  unconfiguredParamType: "PMP: paramType is unconfigured",
  timestampInPast:
    "PMP: pmpLockedAfterTimestamp is in the past and not unlimited (zero)",
  stringParamWithNonArtistAuth:
    "PMP: String params must have artist+ authentication",
  addressAuthWithZeroAuthAddress: "PMP: authAddress is zero",
  nonAddressAuthWithNonZeroAuthAddress: "PMP: authAddress is not zero",
  selectOptionsNonEmptyForNonSelectParamType: "PMP: selectOptions is not empty",
  minRangeNonZeroForNonRangeParamType: "PMP: minRange is not empty",
  maxRangeNonZeroForNonRangeParamType: "PMP: maxRange is not empty",
  selectOptionsEmptyForSelectParamType: "PMP: selectOptions is empty",
  selectOptionsLengthGreaterThan256: "PMP: selectOptions length > 256",
  minRangeNonZeroForSelectParamType: "PMP: minRange is not empty",
  maxRangeNonZeroForSelectParamType: "PMP: maxRange is not empty",
  minRangeGreaterThanMaxRange: "PMP: minRange >= maxRange",
  maxRangeGreaterThanTimestampMax: "PMP: maxRange > _TIMESTAMP_MAX",
  pmpLockedAfterTimestamp: "PMP: pmp is locked and cannot be updated",
  emptyPMPKey: "PMP: pmpKey cannot be empty",
  paramNotPartOfMostRecentlyConfiguredPMPParams:
    "PMP: param not part of most recently configured PMP params",
  unconfiguredParamInput: "PMP: input paramType is unconfigured",
  paramTypeMismatch: "PMP: paramType mismatch",
  onlyArtistAuth: "PMP: artist auth required",
  onlyTokenOwnerAuth: "PMP: token owner auth required",
  onlyArtistAndTokenOwnerAuth: "PMP: artist and token owner auth required",
  onlyAddressAuth: "PMP: address auth required",
  onlyArtistAndTokenOwnerAndAddressAuth:
    "PMP: artist and token owner and address auth required",
  onlyArtistAndAddressAuth: "PMP: artist and address auth required",
  onlyTokenOwnerAndAddressAuth: "PMP: token owner and address auth required",
  selectOptionsIndexOutOfBounds: "PMP: selectOptions index out of bounds",
  boolParamValueMustBe0Or1: "PMP: bool param value must be 0 or 1",
  paramValueOutOfBounds: "PMP: param value out of bounds",
  invalidHexColor: "PMP: invalid hex color",
  artistAuthRequiredToConfigureArtistString:
    "PMP: artist auth required to configure artist string",
  nonStringParamHasNonEmptyStringInputParam:
    "PMP: non-string param must have empty string value",
  artistStringCannotBeConfiguredForNonStringParams:
    "PMP: artist string cannot be configured for non-string params",
};
