# Upgrade: ABX FS-only dependency registry

## Summary

A dependency is on chain if and only if it has an **ABX FS file**: a gzip file on
[ABX FS](https://github.com/ArtBlocks/abxfs) whose decoded content is the dependency's script.
`DependencyRegistryV0` stores no scripts any more; it records which ABX FS file holds each one.
`GenArt721GeneratorV0` inlines that file into the token's HTML, reading it through the ABX FS
FileDataReader companion.

The AB500 libraries (the dependencies of the first 500 Curated projects) are on ABX FS as one
gzip directory, root `0x60cdc71765dc6954ebc3dcc4545d92a04d5a09ebd891bb02333d95ba0c39fa2d`.
It is on Ethereum, Ethereum Sepolia, Base, Base Sepolia, Arbitrum One and Robinhood, recorded in
`deployments/abxfs/`. ABX FS content is addressed by a CID derived from its bytes, so each file
has one CID on every chain.

This upgrade:

- puts nine CDN-only dependencies on chain;
- moves the four dependencies the registry stored itself (`p5@1.0.0`, `three@0.124.0` on mainnet,
  `tone@14.8.15`, `cannon-es@0.20.0`) to their ABX FS files. `cannon-es` has none, so it now loads
  from its CDN; see "Open items".

## Change

### `DependencyRegistryV0`

On-chain availability:

- `updateDependencyAbxfsFileCid(bytes32 dependency, bytes32 cid)`, AdminACL only. It refuses a
  non-zero CID unless the canonical ABX FS FileStore on this chain has that file and its codec is
  `gzip` (`"ABX FS file not found"`, `"ABX FS file must be gzip"`). Zero takes the dependency off
  chain. It emits `DependencyAbxfsFileCidUpdated(bytes32 indexed, bytes32)`, the only event for
  on-chain availability.
- `getDependencyAbxfsFileCid(bytes32)`.
- `getDependencyDetailsV2` returns `DependencyDetails` with `availableOnChain = abxfsFileCid != 0`
  and `abxfsFileCid`, in place of `scriptCount`.

Removed: `addDependencyScript`, `updateDependencyScript`, `addDependencyScriptPointer`,
`updateDependencyScriptPointer`, `removeDependencyLastScript`,
`getDependencyScriptBytecodeAddress`, `getDependencyScriptBytecodeStorageVersion` and the
`DependencyScriptUpdated` event. `removeDependency` no longer checks a script count; deleting the
record clears its ABX FS file. `scripts/propose-add-dependency-script-transactions.ts`, the upload
tool, is deleted.

**Kept for deployed consumers.** ABX's `AbxGenerator` renderer, deployed on Ethereum and Sepolia
and immutable, reads exactly two registry selectors:

- the `getDependencyDetails(bytes32)` nine-field tuple, through a guarded call;
- `getDependencyScript(bytes32, uint256)` when `availableOnChain && scriptCount > 0`. It joins
  the strings into one `base64(gzip)` stream.

If either reverts, ABX renders `<!-- abx:unresolved -->` for the dependency, even one that has a
CDN. So both keep their ABI and now read the ABX FS file:

- `getDependencyDetails` and `getDependencyDetailsFromString` report `availableOnChain` from the
  ABX FS file, and `scriptCount` as the file's slice count.
- `getDependencyScriptCount(bytes32)` is `ceil(size / 24,576)`.
- `getDependencyScript(bytes32, i)` is
  `FileDataReader.readFileDataRangeBase64(cid, i * 24,576, …)`. 24,576 is a multiple of three, so
  the slices joined in order are exactly the base64 of the gzip file.

ABX consumers keep working unchanged, and AB500 libraries named through the Art Blocks registry
become available to them on chain.

### `GenArt721GeneratorV0`

- **Render.** For a dependency with an ABX FS file, the generator calls
  `FileDataReader.readFileDataBase64(cid, max, max)` and requires codec `gzip`. It emits the
  `<script type="text/javascript+gzip" src="data:text/javascript;base64,…">` tag, which the
  existing gunzip script inflates in the browser. Any other dependency loads from its preferred
  CDN, as before. The same path serves flex `ART_BLOCKS_DEPENDENCY_REGISTRY` assets in `<head>`.
- **ES modules are not inlined.** A `loadAsModule` dependency is reached through the import map,
  which points at `preferredCDN`, and a gzipped module cannot be loaded from a `data:` URI.
  `three@0.167.0` therefore keeps its CDN, and its CID is not set.
- `getOnChainStatus` reports a dependency on chain when the generator inlines it.
- `getDependencyScript(string)` returns the base64 gzip the generator inlines, or empty.
- `ABXFS_FILE_DATA_READER` (public constant) is the FileDataReader read.

### `AbxfsCanonical`

`contracts/libs/v0.8.x/AbxfsCanonical.sol` holds the two ABX FS addresses both contracts read,
plus the `gzip` codec token:

- `FileStore` `0x8b6077a1d6953D96687005B9408D56A655b4d155`;
- `FileDataReader` `0xb13D24967aB9B41787E2280D22d1d43a286c197a`.

ABX FS contracts are immutable or stateless and deployed through the keyless CREATE2 deployer, so
each address is the same on every chain. That is why they are constants, not settings. A different
address means different code, which is an upgrade.

FileDataReader is an ABX FS companion (ArtBlocks/abxfs#49). It returns a file's stored data for
any codec, whole or by range, raw or base64. Chunks held in the canonical SSTORE2 backend are read
directly from their SSTORE2 contracts with `EXTCODECOPY`. Each chunk is checked against the
content hash `ChunkStore` recorded for it, the same check the store applies. The generator
therefore skips the FileStore → ChunkStore → backend call chain, and its copies of every chunk.

## Storage

| Contract | Change | Why it is safe |
| --- | --- | --- |
| `DependencyRegistryV0` | `Dependency.scriptBytecodeAddresses` → `DEPRECATED_scriptBytecodeAddresses`, `scriptCount` → `DEPRECATED_scriptCount`; `abxfsFileCid` appended | renames in place, nothing reordered (the `DEPRECATED_supportedCoreContracts` precedent); `Dependency` is only ever a mapping value. Old values stay in storage, never read |
| `GenArt721GeneratorV0` | none | the ABX FS addresses are constants |

OpenZeppelin's `validateUpgrade` passes for the registry and both generators on each network,
against `.openzeppelin/<network>.json`.

## Rollout

Tooling: `scripts/abxfs-dependencies/` (see its README).

0. **FileDataReader** must be deployed at its canonical address on the network. Step 1 refuses
   otherwise. It is deployed from the ABX FS repo by any account, through the keyless deployer.
1. **One ProxyAdmin Safe batch** upgrades every registry and generator proxy together
   (`1_upgrade.ts`). Neither upgrade works alone:
   - the new generator reads the new registry's details and FileDataReader;
   - the deployed generator reads script chunks the new registry no longer serves.

   Until step 2, no dependency has an ABX FS file, so the dependencies inlined until now render
   from their preferred CDN. Every one of them has a CDN; the script checks this. The rehearsal
   shows that this one tag is the only change.
2. **superAdmin calls** (`2_set-abxfs-files.ts`):
   - one `updateDependencyAbxfsFileCid` per AB500 dependency (12; not the ES module);
   - zdog's preferred CDN pinned to `zdog@1.1.2`;
   - on Sepolia, the staging generator's `updateScriptyBuilder` fix.

| Network | Step 1 signer | Step 2 signer |
| --- | --- | --- |
| Sepolia: dev registry `0x5Fcc415B…4e9b`, dev generator `0x705E55FC…17Be`, staging generator `0xdC862938…FF27` | ProxyAdmin `0xb71b8291…5a7a` owner Safe `0xbaD99DdB…B6a8` (1-of-1, owner `0x3c6412FE…48c4`) | superAdmin `0x3c6412FE…48c4` (EOA with an EIP-7702 delegation): browser wallet via `SERVE=true` |
| Mainnet: registry `0x37861f95…DdAF`, generator `0x953D2887…c718` | ProxyAdmin `0x57050239…1232` owner Safe `0x52119BB7…D2EA` (2-of-4) | superAdmin Safe `0xCF00eC2B…A283` (2-of-5) |

On Sepolia both generators read the dev registry, so one registry upgrade and one set of CIDs
covers both. The separate staging registry `0xEFA7Ef07…387f` is read by no generator, but the
staging subgraph indexes it; see "Open items".

## CIDs

Each file was checked three ways:

- its SHA-256 matches the dependency's `preferredCDN` file (zdog against the pinned 1.1.2 URL);
- the bytes read back from ABX FS gunzip to the same SHA-256 on every chain;
- the gateway serves the same bytes.

`2_set-abxfs-files.ts` re-checks the content on the target network before planning.

| Dependency | File | ABX FS file CID | gzip bytes | Set |
| --- | --- | --- | --- | --- |
| `aframe@1.2.0` | `aframe-1.2.0.min.js` | `0x4b19abdc4864b0fcc271f96dd32d4a95cd7431d5353cf39eca32c014ec42344a` | 344,012 | yes |
| `babylon@5.0.0` | `babylon-5.0.0.min.js` | `0xf8ca7bcb6f5409c87668a00b6e3781a5c2bfc5d584b6956770872bf46c444dea` | 904,335 | yes |
| `p5@1.0.0` | `p5-1.0.0.min.js` | `0xd51a97d197e052299e2ef11718c4185435ea3d14ec04ec3276c807dc5d1654d0` | 163,587 | yes |
| `p5@1.9.0` | `p5-1.9.0.min.js` | `0x844bec3f01d7c791ff6a3fde5fb5abcde35d9e615abbe0560df62ca0d7fe9578` | 243,275 | yes |
| `paper@0.12.15` | `paper-0.12.15.min.js` | `0x0d5097971b2cd7c7dc59d2213bd442d2526e45f50fe3e8ca1d6ae0cc9d439826` | 83,273 | yes |
| `processing-js@1.4.6` | `processing-1.4.6.min.js` | `0xa33cd228c16aba9b2a86b472f597b94337c4dd5518b5c118ea64046be9fbf35a` | 66,156 | yes |
| `regl@2.1.0` | `regl-2.1.0.min.js` | `0xbf30a9ec155317aa59f566a10586e806aedb8fd4c81d8b3e03daed11f2446ec1` | 28,736 | yes |
| `three@0.124.0` | `three-0.124.0.min.js` | `0x9c778204e85837626dd358d1bde277a92b77aa1e0b57907d5c29ab607d2ecdde` | 159,859 | yes |
| `three@0.160.0` | `three-0.160.0.min.js` | `0xb365a3d2493703623eeaa3ed28d0bdacbc12ee85e0b68027e3466f8a4a34ffd8` | 167,719 | yes |
| `three@0.167.0` | `three-0.167.0.module.min.js` | `0x46fe31692681614abe4d030fbc978b11e87c651605a1da9180dc1806da1447a5` | 170,163 | **no**, ES module |
| `tone@14.8.15` | `tone-14.8.15.js` | `0x327cd7e8d6b062e9405d5c5f695818adfb6d0d3f21b03184d9dbefffc23db2cd` | 79,558 | yes |
| `twemoji@14.0.2` | `twemoji-14.0.2.min.js` | `0x30ab39eed50b480765c45231a9e0ea677847de7a3c07f482c5e6b7c7ff3cda23` | 4,196 | yes |
| `zdog@1.1.2` | `zdog-1.1.2.min.js` | `0x5ce0603da3175336e4c7a1e92d23065245f8e80e4ed6808591f94d4bb4d25890` | 7,258 | yes |

`zdog@1.1.2`'s `preferredCDN` floats on `zdog@1` and now serves 1.1.3. Step 2 pins it to
`https://unpkg.com/zdog@1.1.2/dist/zdog.dist.min.js`, which serves the exact file on ABX FS. The
planner checks the SHA-256 before adding the call.

<!-- GAS -->

<!-- VERIFICATION -->

<!-- OPEN -->
