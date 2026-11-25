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
- `FileDataReader` `0x7B724AbEA53398e71C06BE8560ac87cE5DC9c7DC`.

ABX FS contracts are immutable or stateless and deployed through the keyless CREATE2 deployer, so
each address is the same on every chain. That is why they are constants, not settings. A different
address means different code, which is an upgrade.

FileDataReader is an ABX FS companion (ArtBlocks/abxfs#49). It returns a file's stored data for
any codec, whole or by range, raw or base64. Chunks held in the canonical SSTORE2 backend are read
directly from their SSTORE2 contracts with `EXTCODECOPY`. Each chunk is checked against the
content hash `ChunkStore` recorded for it, the same check the store applies. The generator
therefore skips the FileStore → ChunkStore → backend call chain, and its copies of every chunk.

## Storage

| Contract               | Change                                                                                                                                         | Why it is safe                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DependencyRegistryV0` | `Dependency.scriptBytecodeAddresses` → `DEPRECATED_scriptBytecodeAddresses`, `scriptCount` → `DEPRECATED_scriptCount`; `abxfsFileCid` appended | renames in place, nothing reordered (the `DEPRECATED_supportedCoreContracts` precedent); `Dependency` is only ever a mapping value. Old values stay in storage, never read |
| `GenArt721GeneratorV0` | none                                                                                                                                           | the ABX FS addresses are constants                                                                                                                                         |

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

| Network                                                                                                       | Step 1 signer                                                                               | Step 2 signer                                                                                   |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Sepolia: dev registry `0x5Fcc415B…4e9b`, dev generator `0x705E55FC…17Be`, staging generator `0xdC862938…FF27` | ProxyAdmin `0xb71b8291…5a7a` owner Safe `0xbaD99DdB…B6a8` (1-of-1, owner `0x3c6412FE…48c4`) | superAdmin `0x3c6412FE…48c4` (EOA with an EIP-7702 delegation): browser wallet via `SERVE=true` |
| Mainnet: registry `0x37861f95…DdAF`, generator `0x953D2887…c718`                                              | ProxyAdmin `0x57050239…1232` owner Safe `0x52119BB7…D2EA` (2-of-4)                          | superAdmin Safe `0xCF00eC2B…A283` (2-of-5)                                                      |

On Sepolia both generators read the dev registry, so one registry upgrade and one set of CIDs
covers both. The separate staging registry `0xEFA7Ef07…387f` is read by no generator and is not
upgraded.

## CIDs

Each file was checked three ways:

- its SHA-256 matches the dependency's `preferredCDN` file (zdog against the pinned 1.1.2 URL);
- the bytes read back from ABX FS gunzip to the same SHA-256 on every chain;
- the gateway serves the same bytes.

`2_set-abxfs-files.ts` re-checks the content on the target network before planning.

| Dependency            | File                          | ABX FS file CID                                                      | gzip bytes | Set               |
| --------------------- | ----------------------------- | -------------------------------------------------------------------- | ---------- | ----------------- |
| `aframe@1.2.0`        | `aframe-1.2.0.min.js`         | `0x4b19abdc4864b0fcc271f96dd32d4a95cd7431d5353cf39eca32c014ec42344a` | 344,012    | yes               |
| `babylon@5.0.0`       | `babylon-5.0.0.min.js`        | `0xf8ca7bcb6f5409c87668a00b6e3781a5c2bfc5d584b6956770872bf46c444dea` | 904,335    | yes               |
| `p5@1.0.0`            | `p5-1.0.0.min.js`             | `0xd51a97d197e052299e2ef11718c4185435ea3d14ec04ec3276c807dc5d1654d0` | 163,587    | yes               |
| `p5@1.9.0`            | `p5-1.9.0.min.js`             | `0x844bec3f01d7c791ff6a3fde5fb5abcde35d9e615abbe0560df62ca0d7fe9578` | 243,275    | yes               |
| `paper@0.12.15`       | `paper-0.12.15.min.js`        | `0x0d5097971b2cd7c7dc59d2213bd442d2526e45f50fe3e8ca1d6ae0cc9d439826` | 83,273     | yes               |
| `processing-js@1.4.6` | `processing-1.4.6.min.js`     | `0xa33cd228c16aba9b2a86b472f597b94337c4dd5518b5c118ea64046be9fbf35a` | 66,156     | yes               |
| `regl@2.1.0`          | `regl-2.1.0.min.js`           | `0xbf30a9ec155317aa59f566a10586e806aedb8fd4c81d8b3e03daed11f2446ec1` | 28,736     | yes               |
| `three@0.124.0`       | `three-0.124.0.min.js`        | `0x9c778204e85837626dd358d1bde277a92b77aa1e0b57907d5c29ab607d2ecdde` | 159,859    | yes               |
| `three@0.160.0`       | `three-0.160.0.min.js`        | `0xb365a3d2493703623eeaa3ed28d0bdacbc12ee85e0b68027e3466f8a4a34ffd8` | 167,719    | yes               |
| `three@0.167.0`       | `three-0.167.0.module.min.js` | `0x46fe31692681614abe4d030fbc978b11e87c651605a1da9180dc1806da1447a5` | 170,163    | **no**, ES module |
| `tone@14.8.15`        | `tone-14.8.15.js`             | `0x327cd7e8d6b062e9405d5c5f695818adfb6d0d3f21b03184d9dbefffc23db2cd` | 79,558     | yes               |
| `twemoji@14.0.2`      | `twemoji-14.0.2.min.js`       | `0x30ab39eed50b480765c45231a9e0ea677847de7a3c07f482c5e6b7c7ff3cda23` | 4,196      | yes               |
| `zdog@1.1.2`          | `zdog-1.1.2.min.js`           | `0x5ce0603da3175336e4c7a1e92d23065245f8e80e4ed6808591f94d4bb4d25890` | 7,258      | yes               |

`zdog@1.1.2`'s `preferredCDN` floats on `zdog@1` and now serves 1.1.3. Step 2 pins it to
`https://unpkg.com/zdog@1.1.2/dist/zdog.dist.min.js`, which serves the exact file on ABX FS. The
planner checks the SHA-256 before adding the call.

## Gas, RPC caps and the 2^24 execution budget

Inlining from ABX FS costs gas in the `eth_call` that renders a token, never in transaction fees.
The numbers below were measured on a mainnet fork at block 26,487,988, one live token per
dependency. Gas is execution gas inside the call: a view creates no state, so all of it would
count against EIP-8037's 2^24 transaction budget. ✓/✗ marks whether the call succeeds with a
16,777,216 gas limit (see "RPC limits" for when that limit applies).

| Dependency            | gzip bytes | `getTokenHtml` today → after | data URI today → after |
| --------------------- | ---------- | ---------------------------- | ---------------------- |
| `babylon@5.0.0`       | 904,335    | 0.9M ✓ → 143.7M ✗            | 2.4M ✓ → 282.8M ✗      |
| `aframe@1.2.0`        | 344,012    | 3.1M ✓ → 40.0M ✗             | 5.3M ✓ → 79.9M ✗       |
| `three@0.160.0`       | 167,719    | 22.8M ✗ → 43.1M ✗            | 41.5M ✗ → 82.4M ✗      |
| `p5@1.9.0`            | 243,275    | 3.2M ✓ → 27.2M ✗             | 6.3M ✓ → 55.5M ✗       |
| `p5@1.0.0`            | 163,587    | 9.5M ✓ → 15.3M ✓             | 25.4M ✗ → 31.3M ✗      |
| `three@0.124.0`       | 159,859    | 9.2M ✓ → 14.8M ✓             | 24.7M ✗ → 30.3M ✗      |
| `tone@14.8.15`        | 79,558     | 6.5M ✓ → 9.3M ✓              | 15.4M ✓ → 18.2M ✗      |
| `paper@0.12.15`       | 83,273     | 0.7M ✓ → 7.2M ✓              | 1.2M ✓ → 14.9M ✓       |
| `processing-js@1.4.6` | 66,156     | 1.8M ✓ → 7.0M ✓              | 3.1M ✓ → 14.0M ✓       |
| `regl@2.1.0`          | 28,736     | 1.1M ✓ → 3.2M ✓              | 1.9M ✓ → 6.4M ✓        |
| `twemoji@14.0.2`      | 4,196      | 2.0M ✓ → 2.3M ✓              | 5.6M ✓ → 6.4M ✓        |
| `zdog@1.1.2`          | 7,258      | 1.4M ✓ → 2.0M ✓              | 2.5M ✓ → 3.7M ✓        |

**Where the gas goes.** Reading the bytes is cheap: FileDataReader reads all of Babylon in 10.9M,
against 28.4M through `FileStore.readChunk`. Base64-encoding them costs about 50–60 gas per gzip
byte. After that, the generator copies the document several times in one frame whose memory cost
is quadratic:

- the dependency's base64 into the HTML request;
- ScriptyBuilder's assembly;
- for the data URI, the whole HTML base64-encoded again.

Registry-stored dependencies cost more than before (p5@1.0.0 went from 9.5M to 15.3M). The
registry held their scripts already base64-encoded, while ABX FS holds the gzip bytes, which each
render encodes.

**The read path.** Three alternatives were measured on the same fork against this PR's path; full
numbers are in the PR. This PR is cheapest on every token:

|                        | Read path                                                     | Babylon `getTokenHtml` | Compared with this PR        |
| ---------------------- | ------------------------------------------------------------- | ---------------------- | ---------------------------- |
| this PR                | one call to FileDataReader, its return value decoded in place | 143.7M                 | —                            |
| first draft of this PR | `FileStore.readChunk` per chunk                               | 242.3M                 | —                            |
| alternative            | the same SSTORE2 read inlined in the generator                | —                      | 2–23% dearer on every render |
| alternative            | a plain high-level call to FileDataReader                     | —                      | up to 28M more (Babylon)     |

The reader base64-encodes in its own call frame, away from the generator's growing memory.

**RPC limits.**

- **Today on mainnet** the binding limit is the RPC's `eth_call` gas cap. Alchemy documents 550M.
  publicnode and drpc allow about 50M.
- **EIP-8037** (Glamsterdam; live on Sepolia, mainnet at Glamsterdam) bounds a _transaction's_
  execution gas at 2^24 = 16,777,216. It says nothing about `eth_call`, which stays bounded by the
  RPC's own cap. The 2^24 budget binds a contract that renders a token inside a transaction.
- **Sepolia RPCs on unfixed clients.** After Amsterdam, some clients' RPC applied 2^24 to `eth_call`
  too. Each fixed that as a bug: geth in v1.17.8 (go-ethereum#35845), erigon (#24519), and reth
  (#28583, merged 2026-11-18, not yet released). On 2026-11-24 Alchemy and publicnode (both reth)
  and Tenderly still refused Sepolia `eth_call`s past 2^24, while a geth v1.17.8 node
  (`rpc.sepolia.ethpandaops.io`) ran the 24.7M-gas p5@1.0.0 data URI below.

Within 2^24, a light project's `getTokenHtml` fits up to about 180 KB of inlined gzip, and its
data URI up to about 90 KB. Both limits shrink by the project script's own cost.

- `babylon@5.0.0`, `aframe@1.2.0`, `p5@1.9.0` and `three@0.160.0` therefore do not render in one
  `eth_call` on a Sepolia RPC that still applies 2^24; they do on a fixed one. On mainnet the
  binding limit stays the RPC's cap. `three@0.160.0` does not fit 2^24 even today, from its
  project script alone.
- The registry's indexed slices (`getDependencyScript`) and FileDataReader's range reads page any
  file in calls that each fit 2^24, for in-transaction callers and low-cap RPCs.
- A paged render API for whole tokens is a separate decision (see "Open items").

## Verification

**Unit tests:**

- `test/dependency-registry/DependencyRegistryV0.test.ts`: 135 passing.
- `test/generator/GenArt721GeneratorV0.test.ts`: 55 passing.

Mock ABX FS contracts are placed at their canonical addresses with `hardhat_setCode`. The FileStore
mock keeps its chunks as SSTORE2 code, and the FileDataReader mock implements whole-file and range
base64 reads.

The registry suite covers:

- the setter's ACL;
- refusal of a CID that is absent, carries no codec, is brotli, or is an empty gzip file;
- set and clear, and their events;
- `availableOnChain` in both getters;
- slice counts, and slices across uneven chunk boundaries that join to the file's base64;
- out-of-range slices;
- removal clearing the file;
- the absence of every removed selector from the deployed bytecode.

The generator suite covers:

- ABX FS inlining that gunzips to the library;
- the CDN fallback;
- ES module exclusion;
- flex `ART_BLOCKS_DEPENDENCY_REGISTRY` assets;
- `getDependencyScript` and `getOnChainStatus`;
- the codec guard and propagation of read failures;
- the pinned `ABXFS_FILE_DATA_READER`.

**Fork rehearsals** (`scripts/abxfs-dependencies/fork-verify.ts`, on Sepolia and on mainnet):

- OpenZeppelin `validateUpgrade` passes for the registry and every generator, against
  `.openzeppelin/<network>.json`.
- All 13 files are present, gzip, and decode to their SHA-256 on both networks' ABX FS.
- FileDataReader deploys through the keyless deployer at its canonical address.
- The full rollout is then rendered and checked token by token, as described in the script's header
  and the PR.

**2^24 method.** The method was checked against live Sepolia. The dev generator's p5@1.0.0 token
renders `getTokenHtml` and reverts on the data URI, both through Alchemy (reth, which still applies
2^24 to `eth_call`) and on the fork with a 16,777,216 limit. A geth v1.17.8 Sepolia node renders
the same data URI.

## Open items

- **Renders over 2^24.** Babylon, aframe, p5@1.9.0 and three@0.160.0 tokens, plus most data URIs,
  do not fit EIP-8037's transaction budget, and fail as `eth_call`s on Sepolia RPCs whose client
  still applies it (reth until its fix ships, Tenderly). Off-chain renders through a fixed RPC are
  bounded by its own cap, as on mainnet today.
  - A paged or multi-call render API, or pre-encoded base64 files, are decisions this PR does not
    make. The registry's indexed slices and FileDataReader's range reads already page any file.
- **FileDataReader must be deployed** on each network before step 1. Deploying it on mainnet is an
  ABX FS maintainer's go-ahead. Its address is compiled into both contracts, through
  `AbxfsCanonical`, so a new FileDataReader means new implementations.
- **ABX's `AbxGenerator`** will start inlining AB500 libraries named through the Art Blocks
  registry, because `getDependencyScript` now serves them. Its own render gas then follows the
  table above. ABX tooling reads `availableOnChain && scriptCount > 0`, which this keeps consistent.
- **`cannon-es@0.20.0`** (and `fixed_cannon-es@0.20.0` on Sepolia) had registry scripts but no ABX
  FS file, so it loads from its CDN. No live project uses it, and it is an ES module the generator
  could not run on chain anyway.
- **Browser check.** Render the babylon, three@0.160.0, regl and twemoji fork output in a desktop
  browser before the mainnet step 2. Headless Chrome could not run these, even from the CDN.
  `DUMP_DIR` writes the HTML.
