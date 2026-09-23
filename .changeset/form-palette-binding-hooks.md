---
"@artblocks/contracts": minor
---

Add `FormPaletteBindingHooks`, a combined transfer hook, PostParams configure hook and PostParams read-augment hook that binds one token of a palette project to one token of a form project, 1:1, while both are held by the same wallet. Either token changing hands breaks the pairing and re-renders the form token. Palette projects are registered by the form project's artist, on any core contract, with an immutable SSTORE2-backed palette list; the hook resolves which entry each palette token receives and injects it as `paletteData` on both sides, so neither art script derives a palette and neither needs updating when a collection is added. Adds the `IFormPaletteBindingHooks` interface, whose `Bound`, `Unbound` and `PaletteProjectRegistered` events downstream indexers need.
