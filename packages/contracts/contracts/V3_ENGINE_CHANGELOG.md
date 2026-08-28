# Core V3 (Engine + Engine Flex) Changelog

_This document is intended to document and explain the differences between the Art Blocks Core V3 used for Art Blocks flagship purposes, relative to the Art Blocks Core V3 contract used for the Art Blocks Engine and Engine Flex products._

V3 performance metrics are available in [V3_Performance.md](V3_Performance.md)

## The following changes were made in the Core V3 (3.3.x) Engine, Engine Flex, and flagship contracts:

Version numbers are assigned per-implementation, as in prior releases:

| Contract                            | Core version | Deployed?                                                        |
| ----------------------------------- | ------------ | ---------------------------------------------------------------- |
| `GenArt721CoreV3_Engine`            | `v3.3.0`     | yes — new implementation for the Engine Factory                  |
| `GenArt721CoreV3_Engine_Flex`       | `v3.3.1`     | yes — new implementation for the Engine Factory                  |
| `GenArt721CoreV3_Curated`           | `v3.3.2`     | **no** — live flagship contract remains `v3.2.6`                 |
| `GenArt721CoreV3_Curated_Flex`      | `v3.3.3`     | **no** — live flagship contract remains `v3.2.7`                 |
| `GenArt721CoreV3_Explorations_Flex` | `v3.3.4`     | **no** — live flagship contract remains `v3.2.8`                 |

> Note: the three flagship contracts were updated in place (they inherit the Engine and Engine Flex
> implementations) and are assigned new version numbers, but no flagship contract is being redeployed as
> part of this release. The currently deployed flagship contracts are immutable and continue to report
> their prior versions; this repository no longer contains source that reproduces their bytecode.

### Transfer hooks

- Add per-project transfer hooks, invoked after ERC-721 ownership updates (after token hash assignment on mint). Artist or Admin ACL may set or clear a hook via `configureProjectTransferHook` until it is locked. A reverting hook aborts the mint or transfer. Hooks cannot reenter core transfers, mints, or hook configuration — on any project of the core, not only the hooked project.
- `lockProjectTransferHook(projectId, expectedHook)` is artist-only and one-way. `expectedHook` must match the currently configured hook; because the hook may also be updated by the Admin ACL, this prevents a concurrent `configureProjectTransferHook` call from causing an unintended hook to be permanently locked in.
- If the hook is `address(0)` when the four-week project metadata lock elapses, no hook can ever be assigned later — restoring the pre-v3.3 no-hook transfer security profile with no extra action. Note this auto-lock only applies to **completed** projects (projects that reached max invocations); a project that never completes never auto-locks, and its hook remains configurable indefinitely.
- If a hook is already set when the four-week lock elapses, it intentionally remains configurable until the artist calls `lockProjectTransferHook`, so that auto-lock can never permanently freeze a hook that later breaks. The consequence is that a project which ever had a hook set has mutable transfer behavior until the artist explicitly locks it.
- Transfer hooks are inherited by the flagship contracts listed above, so a future flagship deployment from this source would also support them.
- Gas: on a contract with no hooks configured, transfers and mints cost approximately 4,200 gas more than in v3.2.x (two additional cold SLOADs). A transfer that dispatches a hook additionally pays a ~20,000 gas SSTORE for the reentrancy flag, plus the hook's own execution.

### Bytecode offload

- New implementations must link `V3EngineLib` and `V3TransferHookLib` in addition to existing libraries. Engine Flex also links `V3FlexLib`, whose source and runtime bytecode are **unchanged** from the previously deployed version, so the existing deployment may be reused. (A fresh compilation of `V3FlexLib` differs only in its appended metadata hash, because interfaces it transitively imports were changed by this release.)
- `V3EngineLib` holds logic shared by Engine and Engine Flex: ERC-2981 royalty info, primary revenue splits, royalty splitter assignment, artist payment proposal/acceptance, aspect ratio and script type validation, and default base URI construction. Both cores use the same implementation, so the two contracts cannot drift.
- Event emission order is unchanged from v3.2.x for every function moved into a library.

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
