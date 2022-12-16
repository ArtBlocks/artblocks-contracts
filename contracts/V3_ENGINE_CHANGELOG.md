# Core V3 (Engine + Engine Flex) Changelog

_This document is intended to document and explain the differences between the Art Blocks Core V3 used for Art Blocks flagship purposes, relative to the Art Blocks Core V3 contract used for the Art Blocks Engine and Engine Flex products._

V3 performance metrics are available in [V3_Performance.md](V3_Performance.md)

## The following changes were made in the Core V3 Engine contract:

- Removes reference to "curation registry" concept
- Removes on-chain reference to previous flagship core contracts
- Changes "artblocks" payee to be split into a "renderProvider" and "platformProvider" set of payees
- Removes "backwards compatible" oriented financial view-only methods
- Updates royalty-limit logic to account for two providers – "render" and "platform" providers.
- Added support for a global "auto approve" proposals setting `autoApproveArtistSplitProposals`, that is determined at time of contract deployment (this likely will default to `true` based on most Engine partners' onboarding processes currently)
- Update the EIP-173-conforming `owner()` method to proxy the `superAdmin` value for the currently assigned ACL contract, rather than returning the contract itself.
- Integrates with a basic Engine registration-beacon event emitter, EngineRegistryV0, implementation.
- Coalesced to a single contract standard for both Engine and Partner (Collaborations) contracts.
- Consolidate renderer/platform provider payment address + percentage update methods to save on deployed contract size (to fit within current contract size limits).
- Expose a `tokenIdToHashSeed` method in addition to `tokenIdToHash` on the CoreContract, and expose both via the Engine interface.