# AB500 libraries on ABX FS

The JavaScript libraries used by the first 500 Art Blocks Curated projects, stored on
[ABX FS](https://github.com/ArtBlocks/abxfs) as one directory of gzip files. The same content ID
exists on six chains.

- **Root directory CID:** `0x60cdc71765dc6954ebc3dcc4545d92a04d5a09ebd891bb02333d95ba0c39fa2d`
- **Contents:** 13 files, 117 unique chunks, 2,422,127 stored bytes
- **Uploaded:** 2026-11-21 (Ethereum Sepolia 2026-11-24), by `0x8b7C193bdF2295912B3409A43b0384E14981DF65`. The uploader holds no
  role over the content: ABX FS storage is ownerless and immutable.
- **Published as:** project #0, "AB500 libraries", in the ABX FS org "Art Blocks",
  `0x2380EcC56B74eccb52F6AeAC7590024C9E7Fe8FE`. The org has the same address on all six chains. Its
  admin, and the project's owner, is `0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef`. See
  [Org and project](#org-and-project).
- **Not yet:** neither the dependency registry nor the generator reads this content.
- **Machine-readable record:** [`ab500-libraries.json`](./ab500-libraries.json). It lists every file
  hash, file CID and transaction hash, plus per-chain gas and fees.

## Files

Each file is the exact build the mainnet dependency registry
(`0x37861f95882ACDba2cCD84F5bFc4598e2ECDDdAF`) names, downloaded from its `preferredCDN` and checked
against a SHA-256 fixed before the upload. It was gzipped whole (Node `zlib.gzipSync` defaults) and
stored raw, with no FastLZ (`--codec gzip --no-fastlz`).

| Dependency            | File                          | Bytes     | Gzip bytes | Chunks | File CID                                                             | Registry chunks today |
| --------------------- | ----------------------------- | --------- | ---------- | ------ | -------------------------------------------------------------------- | --------------------- |
| `aframe@1.2.0`        | `aframe-1.2.0.min.js`         | 1,324,388 | 344,012    | 15     | `0x4b19abdc4864b0fcc271f96dd32d4a95cd7431d5353cf39eca32c014ec42344a` | 0                     |
| `babylon@5.0.0`       | `babylon-5.0.0.min.js`        | 4,086,853 | 904,335    | 42     | `0xf8ca7bcb6f5409c87668a00b6e3781a5c2bfc5d584b6956770872bf46c444dea` | 0                     |
| `p5@1.0.0`            | `p5-1.0.0.min.js`             | 623,013   | 163,587    | 8      | `0xd51a97d197e052299e2ef11718c4185435ea3d14ec04ec3276c807dc5d1654d0` | 10                    |
| `p5@1.9.0`            | `p5-1.9.0.min.js`             | 1,029,097 | 243,275    | 11     | `0x844bec3f01d7c791ff6a3fde5fb5abcde35d9e615abbe0560df62ca0d7fe9578` | 0                     |
| `paper@0.12.15`       | `paper-0.12.15.min.js`        | 235,545   | 83,273     | 5      | `0x0d5097971b2cd7c7dc59d2213bd442d2526e45f50fe3e8ca1d6ae0cc9d439826` | 0                     |
| `processing-js@1.4.6` | `processing-1.4.6.min.js`     | 224,507   | 66,156     | 4      | `0xa33cd228c16aba9b2a86b472f597b94337c4dd5518b5c118ea64046be9fbf35a` | 0                     |
| `regl@2.1.0`          | `regl-2.1.0.min.js`           | 86,891    | 28,736     | 2      | `0xbf30a9ec155317aa59f566a10586e806aedb8fd4c81d8b3e03daed11f2446ec1` | 0                     |
| `three@0.124.0`       | `three-0.124.0.min.js`        | 653,449   | 159,859    | 8      | `0x9c778204e85837626dd358d1bde277a92b77aa1e0b57907d5c29ab607d2ecdde` | 10                    |
| `three@0.160.0`       | `three-0.160.0.min.js`        | 669,884   | 167,719    | 8      | `0xb365a3d2493703623eeaa3ed28d0bdacbc12ee85e0b68027e3466f8a4a34ffd8` | 0                     |
| `three@0.167.0`       | `three-0.167.0.module.min.js` | 684,042   | 170,163    | 8      | `0x46fe31692681614abe4d030fbc978b11e87c651605a1da9180dc1806da1447a5` | 0                     |
| `tone@14.8.15`        | `tone-14.8.15.js`             | 349,761   | 79,558     | 4      | `0x327cd7e8d6b062e9405d5c5f695818adfb6d0d3f21b03184d9dbefffc23db2cd` | 5                     |
| `twemoji@14.0.2`      | `twemoji-14.0.2.min.js`       | 17,437    | 4,196      | 1      | `0x30ab39eed50b480765c45231a9e0ea677847de7a3c07f482c5e6b7c7ff3cda23` | 0                     |
| `zdog@1.1.2`          | `zdog-1.1.2.min.js`           | 29,737    | 7,258      | 1      | `0x5ce0603da3175336e4c7a1e92d23065245f8e80e4ed6808591f94d4bb4d25890` | 0                     |

`zdog@1.1.2`: the registry's `preferredCDN` is the floating `https://unpkg.com/zdog@1/dist/zdog.dist.min.js`,
which serves 1.1.3 today. The stored file is the pinned 1.1.2 build
(`https://unpkg.com/zdog@1.1.2/dist/zdog.dist.min.js`), matching the dependency's name. 1.1.3 differs
from it only in whitespace and comments. Neither version has a known advisory (npm audit, GitHub
Advisory Database and OSV, checked 2026-11-20).

## Chains

| Chain                       | Transactions | Gas used      | Fee (ETH)                   | Blocks              | Time (UTC)        | Gateway                                                                                                      |
| --------------------------- | ------------ | ------------- | --------------------------- | ------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| Base Sepolia (84532)        | 60           | 558,532,001   | 0.007546 (0.004195 L1 data) | 61508119–61508420   | 01:11–01:12       | [link](https://fs.abx.io/g/cid/84532/0x60cdc71765dc6954ebc3dcc4545d92a04d5a09ebd891bb02333d95ba0c39fa2d/)    |
| Base (8453)                 | 56           | 519,895,488   | 0.003148 (0.000024 L1 data) | 60166977–60167318   | 01:16–01:17       | [link](https://fs.abx.io/g/cid/8453/0x60cdc71765dc6954ebc3dcc4545d92a04d5a09ebd891bb02333d95ba0c39fa2d/)     |
| Arbitrum One (42161)        | 60           | 561,666,028   | 0.011257                    | 526095711–526095981 | 01:16–01:17       | [link](https://fs.abx.io/g/cid/42161/0x60cdc71765dc6954ebc3dcc4545d92a04d5a09ebd891bb02333d95ba0c39fa2d/)    |
| Robinhood (4663)            | 60           | 558,532,001   | 0.011283                    | 119498720–119499157 | 01:16             | [link](https://fs.abx.io/g/cid/4663/0x60cdc71765dc6954ebc3dcc4545d92a04d5a09ebd891bb02333d95ba0c39fa2d/)     |
| Ethereum (1)                | 60           | 558,532,001   | 0.075191                    | 26460152–26460303   | 01:21–01:51       | [link](https://fs.abx.io/g/cid/1/0x60cdc71765dc6954ebc3dcc4545d92a04d5a09ebd891bb02333d95ba0c39fa2d/)        |
| Ethereum Sepolia (11155111) | 117          | 3,847,298,183 | 0.0000000667                | 12205338–12205472   | 11-24 21:57–22:25 | [link](https://fs.abx.io/g/cid/11155111/0x60cdc71765dc6954ebc3dcc4545d92a04d5a09ebd891bb02333d95ba0c39fa2d/) |

All 413 transactions succeeded (296 on 2026-11-21, 117 on Ethereum Sepolia on 2026-11-24). Mainnet fees came to 0.100879 ETH.

- **Base needed 56 transactions, not 60.** 8 of the 117 chunks were already on Base from an earlier,
  byte-identical upload by someone else, and ABX FS reused them. That is content addressing working
  as designed.
- **Ethereum went out in five runs.** The upload was capped with `ABXFS_MAX_FEE_GWEI` (0.35 gwei,
  then 0.42). The CLI stops rather than overpay, and a re-run skips what is already stored. The
  average price paid was about 0.135 gwei per gas.
- **Ethereum Sepolia took 117 transactions and 6.9 times the gas.** Sepolia runs the EIP-8037
  (Glamsterdam) gas schedule, which reprices state creation (code costs 1,530 gas a byte instead of
  200), so each full chunk is a transaction of its own. Sepolia gas was about 17 wei, so the fee was
  negligible. The root and every file CID are the same as on the other chains.

## Verification

Done on every chain after its upload:

1. **Receipts:** every transaction succeeded.
2. **CLI read:** `abxfs read <root>` lists all 13 files.
3. **Gateway:** each file fetched from `fs.abx.io` matches the original SHA-256.
4. **On-chain read:** a reader contract, injected with an `eth_call` state override (nothing
   deployed), resolved each file in the directory, read its gzip bytes from the canonical FileStore,
   base64-encoded them, and returned the result. The base64 matched base64 of the local gzip, and
   gunzip of it matched the original SHA-256, for all 13 files on the five chains uploaded on
   2026-11-21. On Ethereum Sepolia, see the note below.

Read gas was identical on those five chains:

| File                        | Via `FileStore.readChunk` | Direct SSTORE2 read | Direct + base64 | Direct + base64 + HTML encode |
| --------------------------- | ------------------------- | ------------------- | --------------- | ----------------------------- |
| aframe-1.2.0.min.js         | 7.49M                     | 0.61M               | 27.97M          | 56.16M                        |
| babylon-5.0.0.min.js        | 28.46M                    | 2.55M               | 78.78M          | 163.99M                       |
| p5-1.0.0.min.js             | 3.09M                     | 0.27M               | 13.03M          | 25.79M                        |
| p5-1.9.0.min.js             | 4.89M                     | 0.40M               | 19.54M          | 38.93M                        |
| paper-0.12.15.min.js        | 1.49M                     | 0.16M               | 6.60M           | 12.95M                        |
| processing-1.4.6.min.js     | 1.17M                     | 0.13M               | 5.24M           | 10.26M                        |
| regl-2.1.0.min.js           | 0.52M                     | 0.08M               | 2.29M           | 4.45M                         |
| three-0.124.0.min.js        | 3.02M                     | 0.27M               | 12.73M          | 25.18M                        |
| three-0.160.0.min.js        | 3.17M                     | 0.27M               | 13.36M          | 26.45M                        |
| three-0.167.0.module.min.js | 3.23M                     | 0.28M               | 13.56M          | 26.85M                        |
| tone-14.8.15.js             | 1.41M                     | 0.14M               | 6.29M           | 12.35M                        |
| twemoji-14.0.2.min.js       | 0.13M                     | 0.06M               | 0.39M           | 0.70M                         |
| zdog-1.1.2.min.js           | 0.17M                     | 0.06M               | 0.62M           | 1.16M                         |

- **Direct SSTORE2 read:** reads each chunk's bytecode with `EXTCODECOPY` and checks it against the
  `dataHash` that ChunkStore recorded. That is the same integrity check `ChunkStore.read` makes, at
  about a tenth of the gas. It works here because every chunk is stored raw in Sstore2Backend
  (`--no-fastlz`).
- **HTML encode column:** a stand-in for the generator's existing base64 encode of the whole HTML
  (OpenZeppelin `Base64` plus scripty's `DynamicBuffer.appendSafeBase64`, compiled as the generator
  is: solc 0.8.22, 10 optimizer runs, shanghai).

**Ethereum Sepolia and the RPC endpoints' 2^24 cap.** Checks 1–3 pass on Ethereum Sepolia. Check 4,
run on 2026-11-24 through Alchemy, passes for the six smallest files and fails for the seven largest
(aframe, babylon, both p5 builds, all three three.js builds). Those Sepolia endpoints refuse any
`eth_call` above 2^24 (16,777,216) of execution gas. That is not a protocol rule: EIP-8037 bounds a
_transaction's_ execution gas at 2^24 and says nothing about `eth_call`. Some clients applied it to
`eth_call` too after Amsterdam, and each fixed that as a bug: geth in v1.17.8, erigon, and reth in a
fix merged 2026-11-18 and not yet released. Alchemy and publicnode run reth on Sepolia, and Tenderly
caps the same way. A geth v1.17.8 Sepolia node (`rpc.sepolia.ethpandaops.io`) runs a 24.7M-gas
`eth_call` to completion. The 2^24 budget does still bind any contract that reads these files inside
a transaction on an EIP-8037 chain.

## Generator read budget

Measured before the upload:

- **Today's baseline:** `getTokenHtmlBase64EncodedDataUri` on the mainnet `GenArt721GeneratorV0`
  (`0x953D288708bB771F969FCfD9BA0819eF506Ac718`) costs 26.78M gas for Fidenza #0 and 25.57M for
  V3 #400000000. Both use `p5@1.0.0` from registry chunks.
- **Cost of the new step:** base64-encoding p5's ABX FS gzip in the same call adds about 12.8M,
  a ratio of about 1.48–1.50, under the 2x target.
- **Babylon:** the heaviest case. Its read, encode and HTML encode come to about 164M gas, and a
  real generator call is estimated at 175–250M.
- **RPC limits:** Babylon fits within Alchemy's documented 550M `eth_call` cap (measured at about
  548M on Base Sepolia, Base, Robinhood and Ethereum, and about 1.1B on Arbitrum). It does not fit
  within the roughly 50M cap of public endpoints such as publicnode and drpc. Babylon was included
  anyway, so Petro National and World Flag will render on chain only through large-cap RPCs, and
  CDN fallbacks remain.

## Org and project

|              |                                                                              |
| ------------ | ---------------------------------------------------------------------------- |
| Org          | "Art Blocks", `0x2380EcC56B74eccb52F6AeAC7590024C9E7Fe8FE` on all six chains |
| Org admin    | `0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef` (minting: admin only)           |
| Project      | #0, "AB500 libraries", owned by `0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef` |
| Version 1    | root `0x60cdc71765dc6954ebc3dcc4545d92a04d5a09ebd891bb02333d95ba0c39fa2d`    |
| Presentation | ChainGateway, selection Latest                                               |
| OrgFactory   | `0xb057b5b6641717EB85E9D8b3Ba23988E0A6d147A`                                 |
| Salt         | `0x8b7c193bdf2295912b3409a43b0384e14981df65000000000000000000000000`         |

The org was set up on 2026-11-21 (Ethereum Sepolia 2026-11-24), in the same order on every chain:

1. The uploader created the org. `createOrg` also mints project #0.
2. The uploader published the root into project #0 and set its name and presentation. The content
   was already stored, so nothing was re-uploaded.
3. The uploader offered the admin role to `0x00df…84Ef` (`transferAdmin`) and transferred project
   #0 to it.
4. `0x00df…84Ef` accepted the admin role (`acceptAdmin`) from a browser wallet.

The org address comes from the salt alone, which is why it is the same on every chain. A salt can
only be used by the address written into its first 20 bytes. Every transaction hash for these steps
is in `org.txs` in the JSON record.

Project pages, using the org address in lowercase:

- **Token page:** `https://fs.abx.io/projects/<chainId>/0x2380ecc56b74eccb52f6aeac7590024c9e7fe8fe/0`
- **Live files:** `https://fs.abx.io/g/p/<chainId>/0x2380ecc56b74eccb52f6aeac7590024c9e7fe8fe/0/latest/`

## Not done yet

- **Dependency registry and generator:** registry entries pointing at these file CIDs, and a
  generator path that reads them. That includes moving `zdog@1.1.2`'s `preferredCDN` to the pinned
  URL.
