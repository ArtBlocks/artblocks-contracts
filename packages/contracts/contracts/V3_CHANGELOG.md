# Core V3 Changelog

_This document is intended to document and explain the Art Blocks Core V3 changes, relative to the Art Blocks Core V1 contract_

V3 performance metrics are available in [V3_Performance.md](V3_PERFORMANCE.md)

## The following changes were made in the Core V3 contract:

- Improve gas efficiency of minting on the V3 core contract
  - Derive from ERC721 instead of ERC721Enumerable
  - Fork OpenZeppelin ERC721 implementation to pack token hash seed with owner address
  - Minimize SLOAD operations & re-organize logic to minimize gas usage
  - Pack project data by optimizing struct layout and variable types
  - Pack project financial data by utilizing new struct and variable types
  - Optimize mint function signature to reduce gas usage
  - Utilize `unchecked{}` blocks where possible
- Improve gas efficiency of V3-compatible minters
  - Minimize costly SLOAD operations & re-organize logic to minimize gas usage
  - Pack structs
  - Optimize mint function signature to reduce gas usage
  - Utilize `unchecked{}` blocks where possible
- Improve gas efficiency of artist script uploading
  - Update approach for script storage to use contracts-as-storage (as made widely known by sstore2 library) approach, using our newly introduced BytecodeStorage.sol library.
- Force 1:1 relationship between core contract and minter filter
  - This is to ensure that the minter filter is always in sync with the core contract. Minter filters were developed after the V1 core contract was deployed.
- Remove price and currency info from the core contract
  - Price and currency info was moved to the minter contracts when we switched to the new minter suite system (after the V1 core contract was deployed).
- Add a public version/type field on the contract (similr to minter type in minter suite minters)
  - This improves ability for client-side code to choose correct ABI when making contract calls based on the contract associated with the calls.
- Implement "Ownable"
  - Main benefit is OpenSea/aggregator support by default
  - Added a getter function admin() that returns contract owner to maintain backwards-compatibility of interface with before-V3 contracts.
- Change `scriptJSON` to distinct fields `scriptTypeAndVersion` and `aspectRatio`
  - This is to standardize which items should be on-chain and used by renderer (e.g. library, library version, aspectRatio).
  - On-chain data validation that `scriptTypeAndVersion` contains `@` delimeter (to better ensure library version is recorded).
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
- Follow propose/execute pattern for updates to artist payment accounts
  - Artists may propose updates to their artist, additional primary, and additional secondary payment accounts. These updates must be executed by the contract admin.
  - This is to ensure that artists remain in control of their payment accounts, but that the contract admin can step in to prevent non-compliant payment accounts from being used.
  - Automatic admin approval of proposed artist updates is implemented when an artist is not changing, or is only removing, their additional payee account(s).
  - If admin renounces ownership, artists may directly update their payment accounts.
  - If admin has not renounced ownership, admin can directly update artist payment accounts in the event of a compromised or sanctioned artist account.
- Only allow artist to update project description when project is unlocked; only allow admin to update project description when project is locked.
- Add artist additionalPrimary and additionalSecondary payment accounts
  - This is to allow artists to have different additional payee accounts for primary sales vs. secondary royalty sales. This supports the use case where an artist has a charity as a payee in primary sales, but not in secondary sales.
- Limit artists to 30% secondary royalty fees
  - Previously the limit was 100% secondary royalty fees. This is to prevent the artist from taking too much of the secondary royalty fees.
- Support [Manifold's Royalty Registry](https://github.com/manifoldxyz/royalty-registry-solidity) directly on V3 core contract
  - Add Art Blocks royalty information to V3 core contract
  - conform to the IManifold interface, as defined on the Manifold Royalty Registry
- Delegate all admin access checks to new AdminACL contract
  - This is to allow for more flexible admin access control, and to allow for future admin access control changes without having to redeploy the core contract.
  - The core contract now does not distinguish between admin and whitelisted addresses. All admin access checks are delegated to the AdminACL contract.
- Add public reference variables for prior Art Blocks flagship token addresses
  - This helps define the relationship between the V3 core contract and the V1 and V2 core contracts.
- Add public reference variable for the V3 contract's `startingProjectId`.
- Add public reference variables for the Art Blocks-managed Dependency and Curation registries
  - This helps more completely define, on-chain, the metadata and rendering dependencies of Art Blocks projects
- Add events for all indexed platform and project state changes
  - This is to improve the ability for clients to track changes to the platform and projects
  - Specifically, this enables our subgraph indexing layer to avoid using less performant call handlers when tracking the state of the V3 core contract. Event handlers may now be used to fully define all state changes.
- Add split revenues view function on core for primary sales
  - This offloads often-repeated primary sale payment splitting logic from V3's minter contracts onto the V3 core contract.
  - Placing splitter logic on core is preferred over creating something like a "common mint functions" external contract, because it avoids extra gas costs associated with EIP-2929 and calling cold addresses.
- Update minters in minter suite to integrate with V3 core contract
  - A couple breaking changes were made on the V3 core contract that required changes to the minter suite contracts.
- Update randomizer interface for V3 core contract
- Only allow artists to reduce the number of maximum invocations
  - Remove any unnecessary minter logic accordingly
- Enable admin to forever prevent new projects from being added to the core contract
  - This is to prevent the core contract from being used to mint new projects if Art Blocks ever changes to a new contract in the future.
- Add new automatically-populated and admin-configurable `defaultBaseURI` field to V3 core contract
  - This is to have a default base URI for all **new** projects on the V3 core contract, and to allow the artist to update the base URI if needed.
- Improve data validation of function inputs
  - This is to help ensure that the data stored on-chain is valid and is not accidentally invalid (e.g. an artist additional payee being set to the zero address, while also sending funds to the additional payee).
- Improve natspec documentation, especially around privileged roles and functions
- Achieve 100% test coverage of V3 core contract

## The following changes were made in the Core V3 (3.0.2) contract:

- Change modifiers to internal functions, preventing duplication of the logic throughout the bytecode

## The following changes were made in the Core V3 (3.1.0) contract:

- Expose a `tokenIdToHashSeed` method in addition to `tokenIdToHash` on the CoreContract.

## The following changes were made in the Core V3 (3.2.0) contract:

- Allow artists to optionally add and update pre-compressed scripts via the ByteCodeStorageV2 Lib.
