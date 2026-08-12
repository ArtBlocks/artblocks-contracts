# Upgrade: GenArt721GeneratorV0 — raw HTML injection for `custom@na`

## Problem

`GenArt721GeneratorV0` wrapped every project script in `<script>` … `</script>`. Projects that
declare the `custom@na` dependency do not store a JavaScript program — they store a **complete HTML
document**. Wrapping such a document fails in two independent ways:

1. The document's own `</script>` terminates the wrapper early, so everything before it is swallowed
   as inert script text and everything after it is reparsed as top-level HTML.
2. Even with the closing tag escaped, markup inside a `<script>` block is never rendered, so the
   artwork would still be blank.

Because the malformed bytes are assembled on-chain, every consumer of `getTokenHtml` /
`getTokenHtmlBase64EncodedDataUri` was affected identically. Art Blocks' hosted generator was never
affected — it already injects `custom@na` scripts raw.

Symptom in a browser: `SyntaxError: Unexpected token '<'`, variables defined in the document's first
inline `<script>` left undefined, blank render.

## Affected projects

All five `custom@na` projects on mainnet were broken. There are no others — `custom@na` is a perfect
predictor, and every `custom@na` project stores markup.

| Project | Artist | Contract | Project ID | Invocations |
|---|---|---|---|---|
| send/receive | Snowfro | `0xababababab20053426ad1c782de9ea8444358070` | 5 | 8,983 |
| SpiroFlakes | Alexander Reben | `0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270` | 136 | 1,024 |
| Quine | Larva Labs | `0xab00000000002ade39f58f9d8278a31574ffbe77` | 506 | 497 |
| Overture | Mitchell F. Chan | `0x000000dab303a194b3f55d4702b24740ad5a2f00` | 0 | 178 |
| Paramecircle | Alexander Reben (artBoffin) | `0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270` | 195 | 76 |

## Why not simply escape `</script>`

Two live mainnet projects — **PRELUDES** (Trevor Paglen, `0xea698596b6009a622c3ed00dd5a8b5d1cae4fc36-5`)
and **Crypt** (The Cyclops Group, `0x99a9b7c1116f9ceeb1652de04d5969cce509b069-453`) — are genuine
JavaScript that *deliberately* emits `</script>` near the end in order to close the generator's
wrapper and append their own `<style>` and `<body>` markup. They render correctly today **because**
the wrapped path is unescaped.

Escaping `</script>` would therefore break two working artworks while fixing zero. The wrapped path
is left byte-for-byte unchanged.

## Change

`contracts/generator/GenArt721GeneratorV0.sol`, confined to `_getTokenHtmlRequest`:

- New constant `CUSTOM_AT_NA_BYTES32` (`"custom@na"`).
- `isRawHtmlDep` is true when the project's resolved dependency is `custom@na`. When true:
  - the project script is injected with empty `tagOpen` / `tagClose` (verbatim, no wrapper);
  - the generator's default `<style>` reset is omitted, matching the hosted generator, since a full
    HTML document supplies its own document-level styling.
- Everything else is untouched: `tokenData` is still injected in `<head>` ahead of the document, the
  gunzip script is still included, and no canvas tag is added (`custom` was never in the canvas list).

**No storage variables were added**, so this upgrade carries no storage-layout risk. There is no
per-project configuration and therefore **no follow-up admin transaction** — the fix takes effect for
all five projects the moment the proxy is upgraded.

## Verification performed

Unit tests (`test/generator/GenArt721GeneratorV0.test.ts`) — 31 passing, including the 26 pre-existing
tests, which assert exact HTML output and would fail on any change to the wrapped path.

Mainnet-fork regression (`test/network-fork/generator/GenArt721GeneratorV0.fork.test.ts`) — 39
passing. Forks mainnet, upgrades the real proxy via the impersonated ProxyAdmin owner, and asserts
that each `custom@na` project is injected verbatim while PRELUDES, Crypt, and Gas Wars produce
**byte-identical** output before and after.

Browser rendering — post-upgrade HTML pulled from the forked chain and loaded in headless Chromium.
All seven projects render with zero JavaScript errors; Quine's output matches its canonical
`media-proxy` image.

| Project | Before | After |
|---|---|---|
| Quine | `SyntaxError`, blank | 12,447 SVG shapes |
| send/receive | `SyntaxError`, blank | 3 canvases painting |
| SpiroFlakes | `SyntaxError`, blank | canvas painting |
| Paramecircle | `SyntaxError`, blank | canvas painting |
| Overture | `SyntaxError`, no canvas | Unity WebGL 1400×1400 |
| PRELUDES | renders | unchanged (byte-identical) |
| Crypt | renders | unchanged (byte-identical) |

## Deployed addresses

The generator exists on mainnet and sepolia only. Arbitrum, Base, Shape, and Hoodi have no
generator proxy.

| Network | Proxy | ProxyAdmin | ProxyAdmin owner |
|---|---|---|---|
| mainnet | `0x953D288708bB771F969FCfD9BA0819eF506Ac718` | `0x5705023921B577e5BAeFF66f1fC7d52f5ccF1232` | Safe `0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA` (2-of-4) |
| sepolia staging | `0xdC862938cA0a2D8dcabe5733C23e54ac7aAFFF27` | `0xb71b829185159AB5B26D7F0BB7f991D0E17d5a7a` | Safe `0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8` (1-of-1) |
| sepolia dev | `0x705E55FCD5CB00eB727213aa777C914B814817Be` | `0xb71b829185159AB5B26D7F0BB7f991D0E17d5a7a` | same Safe |

**Every** ProxyAdmin is Safe-owned, including on sepolia — a direct EOA call to
`ProxyAdmin.upgrade` reverts with `Ownable: caller is not the owner`. The sepolia Safe is 1-of-1
and its sole owner is the dev deployer `0x3c6412fee019f5c50d6f03aa6f5045d99d9748c4`, so one
signature is enough there, but the call still has to originate from the Safe. Both sepolia proxies
share a ProxyAdmin and Safe, so they upgrade in a single batch.

## Upgrade procedure

Deployment and the proxy switch are decoupled on every network, because no environment can be
upgraded by an EOA. The implementation is deployed via CREATE2 with the permissionless all-zero
salt, so it occupies the same address on both chains despite mainnet and sepolia using different
deployer EOAs.

Full instructions live in `scripts/generator-upgrade/README.md`. In short, per network:

```bash
cd packages/contracts

# 1. storage-layout validation against every live proxy; prints the CREATE2 address
yarn hardhat run --network <network> scripts/generator-upgrade/1_validate-and-prepare.ts

# 2. deploy the implementation (localhost UI at :3000, keep the all-zero salt)
yarn create2-deploy

# 3. emit the Safe Transaction Builder batch, then upload it to the Safe
yarn hardhat run --network <network> scripts/generator-upgrade/2_build-upgrade-txs.ts

# 4. confirm the implementation slots and re-check every affected project
yarn hardhat run --network <network> scripts/generator-upgrade/3_verify-upgrade.ts

# 5. resync .openzeppelin/<network>.json and commit it
yarn hardhat run --network <network> scripts/generator-upgrade/4_sync-manifest.ts
```

Roll sepolia first (dev and staging land together), confirm, then mainnet.

## Rollout record

Implementation `0x9a786F9A6A738A905597e27c462a1E04ab617435`, at the same address on both
chains (CREATE2, all-zero salt, initcode hash
`0x613a39173da47e511aed9c029042d437c5948217b1f2212c467d0e9acc8a7032`).

| Step | Network | Transaction |
|---|---|---|
| implementation deployed | sepolia | [`0x5a8e9e2a…363d`](https://sepolia.etherscan.io/tx/0x5a8e9e2a081602ae46ed15ddd535d4c9fb3d94531c021cc72e3378ea52be363d) |
| implementation deployed | mainnet | [`0xd8e40a93…5428`](https://etherscan.io/tx/0xd8e40a93e100624938f502eb2ef381f6189af9dc10aa758ae90318711e3f5428) |
| proxies upgraded (dev + staging) | sepolia | [`0x8ff297e9…bd69`](https://sepolia.etherscan.io/tx/0x8ff297e9847ddaf84a311349d314a6f6dcf175c8f4d2d6f3dec419184ccbbd69) |
| proxy upgraded | mainnet | [`0x9f5be16d…e015`](https://etherscan.io/tx/0x9f5be16d0eeb38267bc990d80dcebd1e1e7dcefab58be37e7a9d167a503ee015) |

Post-upgrade verification on mainnet reproduced the fork-preview byte counts exactly —
Quine 43,480, send/receive 707,787, SpiroFlakes 7,784, Paramecircle 11,315, Overture
10,254, all injected verbatim, with PRELUDES 39,210 and Crypt 42,504 still wrapped.

Two observations from the sepolia rollout, neither caused by this change:

- **Sepolia staging cannot render**, before or after the upgrade. It points at ScriptyBuilder
  `0xb205DFfE32259E2F1c3C0cba855250134147C083` rather than the canonical
  `0xD7587F110E08F4D120A231bA97d3B577A81Df022` used by dev and mainnet, and
  `getTokenHtml` reverts. Tracked separately.
- **Sepolia dev's output grew 233 bytes** on ordinary projects, because it had been running an
  implementation predating the `#web3call#` `tokenData` reviver. Mainnet already emitted that
  reviver, so mainnet's only change was the `custom@na` fix.

Step 3 refuses to build a batch unless the implementation is already deployed and its runtime
bytecode matches the local build, so a batch can never point at a stale address. Step 4 asserts
that each of the five `custom@na` projects is injected verbatim and that PRELUDES and Crypt are
still wrapped.

## Notes

- Running the fork test requires `MAINNET_JSON_RPC_PROVIDER_URL` in `packages/contracts/.env`. It
  pins a block, so refresh `FORK_BLOCK_NUMBER` if core contracts or project scripts change.
- The fork test raises the `eth_call` gas limit; send/receive assembles ~700 KB of HTML and exceeds
  hardhat's default cap. This affects only the test harness, not the contract.
- `scripts/one-off/upgrade-dev-generator.ts` was removed. It called `upgrades.upgradeProxy`
  directly from the deployer EOA, which cannot work now that the sepolia ProxyAdmin is Safe-owned;
  running it would have burned gas and reverted. `scripts/generator-upgrade/` replaces it.
- Two Arbitrum projects (`0x47a91457a3a1f700097199fd63c039c4784384ab` projects 27 and 39) also store
  HTML while declaring `three@0.124.0` / `p5@1.0.0`. No generator is deployed on Arbitrum, so they
  are out of scope. If a generator ships there, they will need a dependency override to `custom@na`
  (or an explicit per-project mechanism), since script type alone will not identify them.
