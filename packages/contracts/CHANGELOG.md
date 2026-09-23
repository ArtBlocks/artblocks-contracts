# @artblocks/contracts

## 1.6.0

### Minor Changes

- 46dd050: Add `FormPaletteBindingHooks`, a combined transfer hook, PostParams configure hook and PostParams read-augment hook that binds one token of a palette project to one token of a form project, 1:1, while both are held by the same wallet. Either token changing hands breaks the pairing and re-renders the form token. Palette projects are registered by the form project's artist, on any core contract, with an immutable SSTORE2-backed palette list; the hook resolves which entry each palette token receives and injects it as `paletteData` on both sides, so neither art script derives a palette and neither needs updating when a collection is added. Adds the `IFormPaletteBindingHooks` interface, whose `Bound`, `Unbound` and `PaletteProjectRegistered` events downstream indexers need.

## 1.5.0

### Minor Changes

- 0109423: Add `MintTimeAndTransferCountHooks`, a shared reference combined hook that records mint timestamp and post-mint transfer count, injects them (plus live seconds since mint) into PostParams, and optionally writes `transferCount` as an Address-auth PMP so transfers emit `TokenParamsConfigured`.

## 1.4.0

### Minor Changes

- 4b5167e: Core v3.3: per-project transfer hooks on the V3 Engine (v3.3.0) and Engine Flex (v3.3.1) cores, with the `ITransferHook` interface, the `AbstractTransferHook` base, and the `OwnerHistoryTransferHook` reference implementation. Adds the `ProjectTransferHookUpdated` and `ProjectTransferHookLocked` events and the `FIELD_PROJECT_TRANSFER_HOOK` / `FIELD_PROJECT_TRANSFER_HOOK_LOCKED` `ProjectUpdated` fields, which downstream indexers need.

## 1.3.2

### Patch Changes

- 713e914: Updated PMPV0 with improved provenance event data

## 1.3.1

### Patch Changes

- e03afaf: gas efficiency updates to PMPV0

## 1.3.0

### Minor Changes

- bc4019a: post mint parameters and associated contracts

## 1.2.1

### Patch Changes

- 1558134: update latest on-chain dependency registry and on-chain generator source

## 1.2.0

### Minor Changes

- 210229a: release smart contract updates, including v3.2 core contracts

## 1.1.0

### Minor Changes

- 574a9445: Updated shared minter suite interfaces and events
