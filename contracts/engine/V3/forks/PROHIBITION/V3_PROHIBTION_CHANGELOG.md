# Prohibition Core V3 (Engine + Engine Flex) Changelog

_This document is intended to document and explain the differences between the Prohibition fork of the Art Blocks Engine and supporting contracts, relative to the Art Blocks Core V3 contract used for the Art Blocks Engine and Engine Flex products._

## The following changes were made in the Prohibition fork of the AdminACLV0 contract:

- Added support for delegating the ability to call specific contracts' function selectors to accounts other than `superAdmin`.
- Added support for allowing registered/verified artists to call functions related to their projects

## The following changes were made in the Prohibition fork of the Core V3 Engine Flex contract:

- Removes requirement for callers of `addProject` to be approved by AdminACL
- Allows registered/verified artists in the AdminACL contract to toggle product activation for projects they own
- Changes `_onlyArtist` (or equivalent) checks to `_onlyArtistOrAdminACL` in the following functions:
    * `proposeArtistPaymentAddressesAndSplits`
    * `updateProjectSecondaryMarketRoyaltyPercentage`
    * `updateProjectDescription`
    * `updateProjectWebsite`
    * `updateProjectMaxInvocations`
    * `updateProjectBaseURI`
