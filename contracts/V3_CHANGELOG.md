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
    - `projectDetails` - Information relevant to understanding the project as a work of art (same function as pre-V3 core)
    - `projectArtistPaymentInfo` - Information relevant to artists as they manage their primary and additional payment accounts
- Never allow an increase in Project edition size
  - IMPORTANT for artists to understand the impact of the change. Internal artist communication plan required for this type of change.
- Automatically lock projects four weeks after they are fully minted
  - IMPORTANT for artists to understand the impact of the change. Internal artist communication plan required for this type of change.
- Only allow artist to update project description when project is unlocked; only allow admin to update project description when project is locked.
- Add artist additionalPrimary and additionalSecondary payment accounts
  - This is to allow artists to have different additional payee accounts for primary sales vs. secondary royalty sales. This supports the use case where an artist has a charity as a payee in primary sales, but not in secondary sales.
- Limit artists to 30% secondary royalty fees
  - Previously the limit was 100% secondary royalty fees. This is to prevent the artist from taking too much of the secondary royalty fees.
- Delegate all admin access checks to new AdminACL contract
  - This is to allow for more flexible admin access control, and to allow for future admin access control changes without having to redeploy the core contract.
  - The core contract now does not distinguish between admin and whitelisted addresses. All admin access checks are delegated to the AdminACL contract.
