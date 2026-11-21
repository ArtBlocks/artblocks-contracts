---
"@artblocks/contracts": minor
---

ABX FS dependencies: `DependencyRegistryV0` gains a per-dependency `abxfsFileCid` (`updateDependencyAbxfsFileCid`, `getDependencyAbxfsFileCid`, and a trailing `abxfsFileCid` field on `getDependencyDetailsV2`'s `DependencyDetails`), and `GenArt721GeneratorV0` inlines a dependency's gzip ABX FS file as an on-chain script when the registry stores no scripts for it (`abxfsFileStore`, `updateAbxfsFileStore`). Adds the `DependencyAbxfsFileCidUpdated` and `AbxfsFileStoreUpdated` events, which downstream indexers need, and the `IAbxfsFileStore` interface.
