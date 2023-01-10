# Core V3 (Engine + Engine Flex) Changelog

_This document is intended to document and explain the differences between the Art Blocks Core V3 used for Art Blocks flagship purposes, relative to the Art Blocks Core V3 contract used for the Art Blocks Engine and Engine Flex products._

V3 performance metrics are available in [V3_Performance.md](V3_Performance.md)

## The following changes were made in the Core V3 Engine (3.1.0) contract:

- Removes reference to "curation registry" concept
- Removes on-chain reference to previous flagship core contracts
- Changes "artblocks" payee to be split into a "renderProvider" and "platformProvider" set of payees
- Removes "backwards compatible" oriented financial view-only methods
- Updates royalty-limit logic to account for two providers – "render" and "platform" providers.
- Added support for a global "auto approve" proposals setting `autoApproveArtistSplitProposals`, that is determined at time of contract deployment (this likely will default to `true` based on most Engine partners' onboarding processes currently)
- Integrates with a basic Engine registration-beacon event emitter, EngineRegistryV0, implementation.
- Coalesced to a single contract standard for both Engine and Partner (Collaborations) contracts.
- Consolidate renderer/platform provider payment address + percentage update methods to save on deployed contract size (to fit within current contract size limits).
- Expose a `tokenIdToHashSeed` method in addition to `tokenIdToHash` on the CoreContract, and expose both via the Engine interface.

## The following changes were made in the Core V3 Engine (3.1.1) contract:

- Bug fix a bug to update new artist address in storage when the contract-level state variable `autoApproveArtistSplitProposals` is set to `true`. This bug was introduced in the 3.1.0 release, but all 3.1.0 contracts were deployed with `autoApproveArtistSplitProposals` set to `false`, so this bug was not exposed on mainnet.
- Minor refactoring and code cleanup.
