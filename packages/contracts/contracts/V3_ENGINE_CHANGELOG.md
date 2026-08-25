# Core V3 (Engine + Engine Flex) Changelog

_This document is intended to document and explain the differences between the Art Blocks Core V3 used for Art Blocks flagship purposes, relative to the Art Blocks Core V3 contract used for the Art Blocks Engine and Engine Flex products._

V3 performance metrics are available in [V3_Performance.md](V3_Performance.md)

## The following changes were made in the Core V3 Engine (3.3.0) contract:

- Add per-project transfer hooks, invoked after ERC-721 ownership updates (after token hash assignment on mint). Artist or Admin ACL may set or clear a hook until it is locked. If the hook is `address(0)` when the four-week project metadata lock elapses, no hook can ever be assigned later — restoring today's no-hook transfer security profile with no extra action. If a hook is already set at auto-lock, it remains configurable until the artist one-way `lockProjectTransferHook`. A reverting hook aborts the mint or transfer. Hooks cannot reenter core transfers or hook configuration.
- New implementations must link `V3EngineLib` and `V3TransferHookLib` (Engine and Engine Flex) in addition to existing libraries. Engine Flex also links `V3FlexLib`.

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

## The following changes were made in the Core V3 Engine (3.1.2) contract:

- Change modifiers to internal functions, preventing duplication of the logic throughout the bytecode
- Change overly long revert strings (>31 characters) to be <= 31 characters where necessary
- Removing the "purge bytecode" logic and calls, since selfdestruct is deprecated
