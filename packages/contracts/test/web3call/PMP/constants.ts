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
};
