---
"@artblocks/contracts": minor
---

Add `MinterSetPricePMPV0`, a shared set price minter that can configure a token's post-mint params (PMPs) in the same transaction as the mint, and lets a project's artist require specific PMP keys to be configured during every mint via the new `RequiredPMPLib`. Adds the `ISharedMinterRequiredPMPV0` interface, whose `ProjectRequiredPMPKeysUpdated` event downstream indexers need.
