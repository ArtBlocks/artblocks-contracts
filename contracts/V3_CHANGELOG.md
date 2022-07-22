# Core V3 Changelog

_This document is intended to document and explain the Art Blocks Core V3 changes, relative to the Art Blocks Core V1 contract_

## The following changes were made in the Core V3 contract:

- Force 1:1 relationship between core contract and minter filter
  - This is to ensure that the minter filter is always in sync with the core contract. Minter filters were developed after the V1 core contract was deployed.
- Remove price and currency info from the core contract
  - Price and currency info was moved to the minter contracts when we switched to the new minter suite system (after the V1 core contract was deployed).
- Add a public version/type field on the contract (similr to minter type in minter suite minters)
  - This improves ability for client-side code to choose correct ABI when making contract calls based on the contract associated with the calls.
- Implement "Ownable"
  - Main benefit is OpenSea/aggregator support by default
  - Added a getter function admin() that returns contract owner to maintain backwards-compatibility of interface with before-V3 contracts.
- Change scriptJSON to distinct fields
  - This is to standardize which items should be on-chain and used by renderer (e.g. library, library version, aspectRatio).
- Re-organize the contract's project-view functions to be more intuitive
  - V1's `projectTokenInfo`, `projectScriptInfo`, and `projectDetails` are now broken out into:
    - `projectStateData` - Information relevant to minters/purchasers
    - `projectScriptDetails` - Information relevant to rendering tokens
    - `projectMetadata` - Information relevant to understanding the project as a work of art
    - `projectArtistPaymentInfo` - Information relevant to artists as they manage their primary and additional payment accounts
