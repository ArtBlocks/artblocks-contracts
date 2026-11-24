---
"@artblocks/contracts": major
---

ABX FS-only dependency registry. A dependency is on chain if and only if it has an ABX FS file: `DependencyRegistryV0` stores no scripts, and `GenArt721GeneratorV0` inlines each dependency's gzip ABX FS file, read through the ABX FS FileDataReader.

Breaking ABI changes:

- Removed from `IDependencyRegistryV0` / `DependencyRegistryV0`: `addDependencyScript`, `updateDependencyScript`, `addDependencyScriptPointer`, `updateDependencyScriptPointer`, `removeDependencyLastScript`, `getDependencyScriptBytecodeAddress`, `getDependencyScriptBytecodeStorageVersion`, and the `DependencyScriptUpdated` event.
- `getDependencyDetailsV2`'s `DependencyDetails` replaces `scriptCount` with `abxfsFileCid`; `availableOnChain` means the dependency has an ABX FS file.
- Removed from `GenArt721GeneratorV0`: `abxfsFileStore`, `updateAbxfsFileStore` and the `AbxfsFileStoreUpdated` event (never deployed).

Added: `updateDependencyAbxfsFileCid` (refuses a CID that is not a gzip file on the chain's ABX FS), `getDependencyAbxfsFileCid`, the `DependencyAbxfsFileCidUpdated` event, `GenArt721GeneratorV0.ABXFS_FILE_DATA_READER`, and the `IAbxfsFileStore` and `IAbxfsFileDataReader` interfaces.

Kept with the same ABI for deployed consumers (ABX's renderer): `getDependencyDetails` (`availableOnChain` from the ABX FS file, `scriptCount` = slice count), `getDependencyScriptCount`, and `getDependencyScript`, which now serves the ABX FS file as base64 slices of 24,576 bytes that concatenate to the file's base64.
