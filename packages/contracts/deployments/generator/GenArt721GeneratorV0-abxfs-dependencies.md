# Upgrade: ABX FS dependencies (AB500 libraries on chain)

## Problem

Nine of the libraries the first 500 Curated projects depend on are not stored on chain. The
generator loads them from their registry `preferredCDN`, so every token using them renders only
while that CDN keeps serving the file:

| Dependency            | Registry scripts before | Loaded from                                                    |
| --------------------- | ----------------------- | -------------------------------------------------------------- |
| `aframe@1.2.0`        | 0                       | cdnjs                                                          |
| `babylon@5.0.0`       | 0                       | cdnjs                                                          |
| `p5@1.9.0`            | 0                       | cdnjs                                                          |
| `paper@0.12.15`       | 0                       | cdnjs                                                          |
| `processing-js@1.4.6` | 0                       | cdnjs                                                          |
| `regl@2.1.0`          | 0                       | cdnjs                                                          |
| `three@0.160.0`       | 0                       | cdnjs                                                          |
| `twemoji@14.0.2`      | 0                       | unpkg                                                          |
| `zdog@1.1.2`          | 0                       | unpkg — and the URL floats on `zdog@1`, so it now serves 1.1.3 |

All of them — plus `p5@1.0.0`, `three@0.124.0` and `tone@14.8.15`, which the registry already
stores, and the ES module `three@0.167.0` — are now stored on [ABX FS](https://github.com/ArtBlocks/abxfs)
as one gzip directory, root `0x60cdc71765dc6954ebc3dcc4545d92a04d5a09ebd891bb02333d95ba0c39fa2d`, on
Ethereum, Base, Arbitrum One, Robinhood and Base Sepolia. The uploads are recorded in
`deployments/abxfs/` (companion PR). This change lets the generator use them.

## Why ABX FS files rather than registry scripts

- **One upload serves every chain.** ABX FS content is addressed by a CID derived from the bytes,
  and its store contracts are immutable and CREATE2-deployed at the same addresses everywhere, so a
  file's CID is the same on every chain it was uploaded to.
- **The registry cannot point at ABX FS bytes.** `addDependencyScriptPointer` expects bytecode in an
  Art Blocks storage format holding base64 text; ABX FS stores raw gzip bytes in plain SSTORE2
  contracts. Copying the libraries into the registry would mean storing them a second time, 33%
  larger as base64.
- **The ABX FS `ContentReader` companion is not used.** It returns a file's decoded _content_ and so
  refuses files with a codec by design. The generator reads the store layer — `FileStore.getFileInfo`
  and `FileStore.readChunk` — which returns the stored gzip bytes, each chunk checked by `ChunkStore`
  against its content hash.

## Change

### `contracts/libs/v0.8.x/DependencyRegistryStorageLib.sol`

`bytes32 abxfsFileCid` appended to `Dependency`. Appending is safe for the reason given in the
registry-driven rendering upgrade: `Dependency` is only ever a mapping value. `removeDependency`
deletes the record, so a re-added name does not inherit a CID (tested).

### `contracts/DependencyRegistryV0.sol` / `IDependencyRegistryV0.sol`

- `updateDependencyAbxfsFileCid(bytes32 dependency, bytes32 cid)` — `_onlyAdminACL`,
  `_onlyExistingDependency`, emits `DependencyAbxfsFileCidUpdated`. Zero clears it.
- `getDependencyAbxfsFileCid(bytes32)`.
- `abxfsFileCid` appended as the last field of `getDependencyDetailsV2`'s `DependencyDetails`.
- **`availableOnChain` keeps its meaning** — scripts stored in this registry (`scriptCount > 0`). A
  consumer that reads `getDependencyScript(i)` for `i < scriptCount` whenever `availableOnChain` is
  true must not be told scripts exist when none do. Consumers that want "renders on chain" should
  treat a non-zero `abxfsFileCid` as on chain too, as the generator's `getOnChainStatus` now does.

**Why extend `getDependencyDetailsV2` instead of adding only a getter:** the deployed generator
calls `getDependencyDetailsV2` today, so the struct's shape is on the live render path. Appending a
trailing static field is backward compatible — ABI decoding reads the head by position and follows
offsets, and ignores trailing data — so a caller compiled against the previous struct still decodes
every field it knows. This is asserted twice: a unit test decodes the new registry's return value
through `LegacyDependencyDetailsV2ReaderMock`, compiled with the previous struct and the generator's
compiler, and the mainnet fork rehearsal renders every check token byte-identically through the
_deployed_ generator after upgrading only the registry. Changing the legacy tuple getters remains off
limits, for the reason the previous upgrade gives. The separate getter exists for consumers that
want only the CID.

### `contracts/generator/GenArt721GeneratorV0.sol`

- **Render.** `_populateDependencyScriptHtmlTag` reads `abxfsFileCid` with the other details. If the
  registry stores scripts, they are used exactly as before. Otherwise, if a CID is set, the
  generator reads the file through `AbxfsGzipFiles.readGzip`, base64-encodes it, and emits the same
  `<script type="text/javascript+gzip" src="data:text/javascript;base64,…">` tag the registry path
  emits, which the existing gunzip script inflates. Otherwise it falls back to the CDN tag. Registry
  scripts take precedence so that every dependency already stored in the registry renders
  byte-identically. The same path serves flex `ART_BLOCKS_DEPENDENCY_REGISTRY` assets in `<head>`.
- **ES modules are excluded.** A `loadAsModule` dependency is never read from ABX FS: it is reached
  through the import map, which points at `preferredCDN`, and a gzipped module cannot be loaded from
  a `data:` URI (see the previous upgrade's ES module findings). `three@0.167.0` therefore stays on
  its CDN, and its CID is not set. Serving on-chain modules needs the gunzip shim to inflate to a blob
  URL before the import map is parsed — a separate change.
- **`getOnChainStatus`** reports a dependency on chain when the registry stores it _or_ it has a CID
  the generator will read.
- **`getDependencyScript`** returns the ABX FS file, gzipped and base64-encoded like registry
  scripts, when the registry stores none.
- **FileStore address.** One appended storage variable, `_abxfsFileStoreOverride`, behind
  `abxfsFileStore()` and `updateAbxfsFileStore(address)` (DependencyRegistry AdminACL, emits
  `AbxfsFileStoreUpdated` with the effective address). Zero — the value after the upgrade — means the
  canonical ABX FS FileStore `0x8b6077a1d6953D96687005B9408D56A655b4d155`, so no transaction is needed
  on any chain where ABX FS is deployed canonically. It exists so a chain where it is not can still
  be configured.
- **Failure mode.** A CID that is not a gzip file on the chain makes renders of that dependency
  revert with `ABX FS file missing or not gzip`; chunk/size disagreement reverts as well. The
  registry does not read ABX FS, so the rollout tooling verifies every file on the target network —
  present, gzip, decodes to the expected SHA-256 — before it will build the batch that sets CIDs.
- `contracts/generator/AbxfsGzipFiles.sol` joins chunks with a word copy and a masked final word,
  since the generator's EVM target (paris) has no `MCOPY`.

### Storage

| Contract               | Change                                                                            | Why it is safe                                                          |
| ---------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `DependencyRegistryV0` | field appended to `Dependency`                                                    | mapping value only, never an array element or followed by other storage |
| `GenArt721GeneratorV0` | `address _abxfsFileStoreOverride` appended after `universalBytecodeStorageReader` | new trailing slot; zero is the intended initial value                   |

Both are also covered by the mainnet fork rehearsal: after each upgrade every existing field still
reads correctly, because every check token renders byte-identically.

## Rollout

Tooling: `scripts/abxfs-dependencies/` (see its README). It reuses the registry-driven rendering
rollout's topology, CREATE2 and Safe batch helpers.

0. **Validate** storage layouts against the live proxies and get the CREATE2 implementation
   addresses — the existing, generic
   `scripts/registry-driven-rendering/1_validate-and-prepare.ts`.
1. **Deploy both implementations** with `yarn create2-deploy` (all-zero salt).
2. **Upgrade the registry, then the generator** — `1_upgrade.ts` writes one batch per proxy for the
   ProxyAdmin Safe `0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA`. The order matters in one direction
   only: the new generator cannot decode the current registry's `getDependencyDetailsV2`, while the
   deployed generator decodes the new registry's struct correctly. Unlike the previous rollout, no
   data has to land between the two upgrades, and neither changes any output.
3. **Set the CIDs** — `2_set-abxfs-files.ts` verifies all files on mainnet ABX FS and writes one batch
   for the AdminACL `superAdmin` Safe `0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283`: twelve
   `updateDependencyAbxfsFileCid` calls plus the zdog CDN pin below. Each call is independent and
   reversible (set zero to return a dependency to its CDN), so the batch can also be split to switch
   dependencies over gradually.

Sepolia: steps 0–2 apply as before. Step 3 refuses there, because the AB500 files are not on
Ethereum Sepolia's ABX FS — EIP-8037 makes uploading there about 6.8x the gas of mainnet. Base
Sepolia has them, but runs no generator.

## CIDs

Every file was checked three ways before upload and again after: its SHA-256 matches the
dependency's `preferredCDN` file, the bytes read back from ABX FS on all five chains gunzip to the
same SHA-256, and the gateway serves the same bytes.

| Dependency            | File                          | ABX FS file CID                                                      | Set?                                          |
| --------------------- | ----------------------------- | -------------------------------------------------------------------- | --------------------------------------------- |
| `aframe@1.2.0`        | `aframe-1.2.0.min.js`         | `0x4b19abdc4864b0fcc271f96dd32d4a95cd7431d5353cf39eca32c014ec42344a` | yes                                           |
| `babylon@5.0.0`       | `babylon-5.0.0.min.js`        | `0xf8ca7bcb6f5409c87668a00b6e3781a5c2bfc5d584b6956770872bf46c444dea` | yes                                           |
| `p5@1.0.0`            | `p5-1.0.0.min.js`             | `0xd51a97d197e052299e2ef11718c4185435ea3d14ec04ec3276c807dc5d1654d0` | yes — inert, registry scripts take precedence |
| `p5@1.9.0`            | `p5-1.9.0.min.js`             | `0x844bec3f01d7c791ff6a3fde5fb5abcde35d9e615abbe0560df62ca0d7fe9578` | yes                                           |
| `paper@0.12.15`       | `paper-0.12.15.min.js`        | `0x0d5097971b2cd7c7dc59d2213bd442d2526e45f50fe3e8ca1d6ae0cc9d439826` | yes                                           |
| `processing-js@1.4.6` | `processing-1.4.6.min.js`     | `0xa33cd228c16aba9b2a86b472f597b94337c4dd5518b5c118ea64046be9fbf35a` | yes                                           |
| `regl@2.1.0`          | `regl-2.1.0.min.js`           | `0xbf30a9ec155317aa59f566a10586e806aedb8fd4c81d8b3e03daed11f2446ec1` | yes                                           |
| `three@0.124.0`       | `three-0.124.0.min.js`        | `0x9c778204e85837626dd358d1bde277a92b77aa1e0b57907d5c29ab607d2ecdde` | yes — inert, registry scripts take precedence |
| `three@0.160.0`       | `three-0.160.0.min.js`        | `0xb365a3d2493703623eeaa3ed28d0bdacbc12ee85e0b68027e3466f8a4a34ffd8` | yes                                           |
| `three@0.167.0`       | `three-0.167.0.module.min.js` | `0x46fe31692681614abe4d030fbc978b11e87c651605a1da9180dc1806da1447a5` | **no** — ES module, stays on CDN              |
| `tone@14.8.15`        | `tone-14.8.15.js`             | `0x327cd7e8d6b062e9405d5c5f695818adfb6d0d3f21b03184d9dbefffc23db2cd` | yes — inert, registry scripts take precedence |
| `twemoji@14.0.2`      | `twemoji-14.0.2.min.js`       | `0x30ab39eed50b480765c45231a9e0ea677847de7a3c07f482c5e6b7c7ff3cda23` | yes                                           |
| `zdog@1.1.2`          | `zdog-1.1.2.min.js`           | `0x5ce0603da3175336e4c7a1e92d23065245f8e80e4ed6808591f94d4bb4d25890` | yes                                           |

The three registry-backed CIDs record where the canonical file lives and act as a fallback should
those scripts ever be removed; while the registry stores scripts they change nothing. Their files
match the CDN, not quite the registry copies: `tone@14.8.15`'s registry gzip is byte-identical to
ABX FS's, `three@0.124.0`'s registry copy lacks the CDN file's trailing newline, and `p5@1.0.0`'s
registry copy corrects the CDN file's header comment from `v0.10.2` to `v1.0.0`.

### zdog preferred CDN

`zdog@1.1.2`'s `preferredCDN` is `https://unpkg.com/zdog@1/dist/zdog.dist.min.js`, which floats to
the newest 1.x — currently 1.1.3. The step 3 batch pins it to
`https://unpkg.com/zdog@1.1.2/dist/zdog.dist.min.js`, which serves the exact file stored on ABX FS
(the script checks the SHA-256 before adding the call). 1.1.3 differs from 1.1.2 only in whitespace
and comments, and 1.1.2 has no known advisories (npm audit, GitHub Advisory Database, OSV).

## Gas and RPC limits

Inlining from ABX FS costs gas in the `eth_call` that renders a token, never transaction fees.
Measured on the mainnet fork rehearsal at block 26,460,501 — `getTokenHtmlBase64EncodedDataUri`,
exact execution gas, one live token per dependency, before and after the full rollout:

| Dependency                 | Token                   | HTML before (bytes) | HTML after (bytes) | Gas before | Gas after  |
| -------------------------- | ----------------------- | ------------------- | ------------------ | ---------- | ---------- |
| `babylon@5.0.0`            | `0x1353fd9d…` 4000000   | 24,905              | 1,230,649          | 2.4M       | **394.2M** |
| `aframe@1.2.0`             | `0xa7d8d9ef…` 145000000 | 36,541              | 495,193            | 5.3M       | 105.3M     |
| `three@0.160.0`            | `0xAB000000…` 495000000 | 266,552             | 490,145            | 41.5M      | 94.2M      |
| `p5@1.9.0`                 | `0xAB000000…` 497000000 | 51,976              | 376,317            | 6.3M       | 71.2M      |
| `paper@0.12.15`            | `0xa7d8d9ef…` 161000000 | 9,666               | 120,658            | 1.2M       | 18.9M      |
| `processing-js@1.4.6`      | `0x059EDD72…` 1000000   | 21,687              | 109,852            | 3.1M       | 17.1M      |
| `regl@2.1.0`               | `0xa7d8d9ef…` 32000000  | 14,325              | 52,613             | 1.9M       | 7.7M       |
| `twemoji@14.0.2`           | `0x99a9B7c1…` 457000000 | 59,780              | 65,357             | 5.6M       | 6.5M       |
| `zdog@1.1.2`               | `0xa7d8d9ef…` 76000000  | 18,171              | 27,838             | 2.5M       | 4.0M       |
| `p5@1.0.0` (registry)      | `0xa7d8d9ef…` 3000000   | 231,902             | 231,902            | 25.4M      | 25.4M      |
| `three@0.124.0` (registry) | `0xa7d8d9ef…` 22000000  | 227,006             | 227,006            | 24.7M      | 24.7M      |

Gas grows faster than linearly with library size because the whole document lives in one
memory frame, and memory cost is quadratic: the gzip, its base64, the ABI-encoded request to
ScriptyBuilder, and the returned, base64-encoded document all accumulate. Babylon (904 KB gzip) is the
outlier at 394M — under Alchemy's cap, with about 28% headroom. The generator reads through
`FileStore.readChunk`; a direct SSTORE2 read (same integrity check, possible because the upload used
raw chunks) was prototyped and left out to keep this change small. It would cut Babylon by roughly
50M — about 26M of read gas plus the memory of the per-chunk return buffers. Worth adopting if
headroom becomes a concern.

`eth_call` gas caps decide who can render on chain. Alchemy documents 550M (measured about 548M;
about 1.1B on Arbitrum). Common public endpoints (publicnode, drpc) cap at 50M, so tokens using
`babylon@5.0.0`, `aframe@1.2.0`, `three@0.160.0` and `p5@1.9.0` render on chain only through
large-cap RPCs — `three@0.160.0` projects were already near that cap from their project scripts
alone. That is the same constraint any large on-chain library has; the CDN stays in `preferredCDN`
for off-chain renderers.

## Verification

**Mainnet fork rehearsal** — `scripts/abxfs-dependencies/fork-verify.ts`, forked at block
26,460,501, sending every rollout transaction from the real ProxyAdmin owner and AdminACL
`superAdmin` (impersonated):

| Step                                                                                                          | Result                                                     |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 0. OpenZeppelin `validateUpgrade` of both implementations against the layouts in `.openzeppelin/mainnet.json` | pass                                                       |
| 1. All 13 files on mainnet ABX FS: present, gzip, decode to the expected SHA-256                              | 13/13                                                      |
| 3. Registry upgraded alone, renders through the **deployed** generator                                        | 16/16 byte-identical                                       |
| 4. Generator upgraded, no CIDs set                                                                            | 16/16 byte-identical                                       |
| 5. Step 2 calls built by the planner `2_set-abxfs-files.ts` uses, simulated, then sent                        | 13 calls (12 CIDs + zdog CDN pin); re-plan finds none left |
| 6. Renders after the rollout                                                                                  | 9 inlined from ABX FS, 7 byte-identical                    |

In step 6 each of the nine switched tokens passes a strict check: its after-HTML equals its
before-HTML with exactly one substitution — the CDN `<script src>` tag replaced by a gzip data-URI
tag whose payload gunzips to the library's expected SHA-256. The seven others — the registry-backed
`p5@1.0.0`, `three@0.124.0` and `tone@14.8.15`, the ES module `three@0.167.0`, and the
`custom@na`, `js@na` and `svg@na` controls — are byte-identical. (The `#web3call#` token-data payload
encodes block height and is masked, as in the previous rollout's verification.)

**Browser rendering** of the fork output (`DUMP_DIR`), headless Chrome, before (CDN) and after
(inlined from ABX FS):

| Dependency            | Canvases before → after | Gzip tags left after load | Uncaught errors after |
| --------------------- | ----------------------- | ------------------------- | --------------------- |
| `aframe@1.2.0`        | 1 → 1                   | 0                         | 0                     |
| `p5@1.9.0`            | 3 → 3                   | 0                         | 0                     |
| `paper@0.12.15`       | 1 → 1                   | 0                         | 0                     |
| `processing-js@1.4.6` | 1 → 1                   | 0                         | 0                     |
| `zdog@1.1.2`          | 1 → 1                   | 0                         | 0                     |

In each, the gunzip script replaced the ABX FS gzip tag with the inflated library (the loaded DOM
grows by the library's decoded size), and the piece drew the same canvases as from the CDN.
`babylon@5.0.0`, `three@0.160.0` and `regl@2.1.0` could not be rendered in the sandbox used for
this check — headless Chrome's GPU process crashed for the CDN baseline as well — and `twemoji@14.0.2`
was inconclusive. **Render those four in a desktop browser before the mainnet CID batch.** Their
HTML passes the same strict structural check as the others, and the tag form is the one registry
scripts already use in production.

Unit tests — registry 157/157 (151 existing + 6 new), generator 60/60 (43 existing + 17 new).

The registry suite covers the setter's access control, rejection of unknown dependencies, set and
clear with events, the getter and `getDependencyDetailsV2` field, `removeDependency` clearing the
CID, unchanged `availableOnChain`/`scriptCount`, and the legacy-struct decode described above.

The generator suite runs against `MockAbxfsFileStore`, with the gzip split into chunks of 33, 1 and
32 bytes plus the rest to exercise the chunk join's partial words. It covers: the CDN tag while no
CID is set; the inlined gzip tag once one is, and that it gunzips to the library; **byte-identical
HTML for the same gzip served from registry scripts and from ABX FS**; registry precedence; clearing
the CID; ES module exclusion; reverts for a non-gzip file, a missing file and chunk/size
disagreement; a flex `ART_BLOCKS_DEPENDENCY_REGISTRY` asset inlined in `<head>`;
`getDependencyScript`; `getOnChainStatus`; and `updateAbxfsFileStore` (canonical default, ACL,
reset to canonical).

## Open items

- Render `babylon@5.0.0`, `three@0.160.0`, `regl@2.1.0` and `twemoji@14.0.2` fork output in a
  desktop browser before sending the mainnet CID batch (see Verification). `fork-verify.ts` with
  `DUMP_DIR` writes the files.
- `babylon@5.0.0` renders cost 394M gas, about 28% under Alchemy's cap. Adopting the direct SSTORE2
  read (roughly −50M) would widen that, if wanted before or after rollout.
- `availableOnChain` in the registry's getters still means "stored in this registry". Off-chain
  consumers (website, indexer) that badge dependencies as on chain should also read `abxfsFileCid`.
- A CID is valid only on chains the file was uploaded to. The generator does not check existence
  in `getOnChainStatus`; the rollout tooling checks it before any CID is set.
- ES module dependencies on chain (blob-URL import maps) remain future work, shared with
  `cannon-es@0.20.0` (see the previous upgrade's open items).
- The direct SSTORE2 read path could be adopted later, here or as an ABX FS companion contract, if
  read gas becomes the constraint.
