---
"@artblocks/contracts": minor
---

Core v3.3: per-project transfer hooks on the V3 Engine (v3.3.0) and Engine Flex (v3.3.1) cores, with the `ITransferHook` interface, the `AbstractTransferHook` base, and the `OwnerHistoryTransferHook` reference implementation. Adds the `ProjectTransferHookUpdated` and `ProjectTransferHookLocked` events and the `FIELD_PROJECT_TRANSFER_HOOK` / `FIELD_PROJECT_TRANSFER_HOOK_LOCKED` `ProjectUpdated` fields, which downstream indexers need.
