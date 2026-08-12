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

| Network | Proxy | ProxyAdmin | ProxyAdmin owner |
|---|---|---|---|
| mainnet | `0x953D288708bB771F969FCfD9BA0819eF506Ac718` | `0x5705023921B577e5BAeFF66f1fC7d52f5ccF1232` | `0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA` (Safe) |
| sepolia staging | `0xdC862938cA0a2D8dcabe5733C23e54ac7aAFFF27` | `0xb71b829185159AB5B26D7F0BB7f991D0E17d5a7a` | — |
| sepolia dev | `0x705E55FCD5CB00eB727213aa777C914B814817Be` | `0xb71b829185159AB5B26D7F0BB7f991D0E17d5a7a` | deployer |

## Upgrade procedure

### 1. Sepolia dev (rehearsal)

Deploys the implementation and switches the proxy in one step, since the deployer controls that
ProxyAdmin.

```bash
cd packages/contracts
yarn hardhat run --network sepolia scripts/one-off/upgrade-dev-generator.ts
```

### 2. Sepolia staging

```bash
yarn hardhat run --network sepolia scripts/on-chain-generator/2_reference_upgrade-sepolia-on-chain-generator.ts
```

### 3. Mainnet

`prepareUpgrade` only — it deploys and verifies the new implementation but does **not** switch the
proxy. OpenZeppelin runs storage-layout validation here; it must pass before proceeding.

```bash
yarn hardhat run --network mainnet scripts/on-chain-generator/2_reference_upgrade-mainnet-on-chain-generator.ts
```

Then, from the Safe `0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA`, call on ProxyAdmin
`0x5705023921B577e5BAeFF66f1fC7d52f5ccF1232`:

```
upgrade(
  proxy:          0x953D288708bB771F969FCfD9BA0819eF506Ac718,
  implementation: <address printed by the script>
)
```

### 4. Post-upgrade verification

For each of the five projects above, confirm `getTokenHtml` no longer contains
`<script>` + projectScript + `</script>`, and spot-check a token in the on-chain generator viewer.
Then confirm a control project (e.g. PRELUDES `0xea698596b6009a622c3ed00dd5a8b5d1cae4fc36`, token
`5000000`) is unchanged.

## Notes

- Running the fork test requires `MAINNET_JSON_RPC_PROVIDER_URL` in `packages/contracts/.env`. It
  pins a block, so refresh `FORK_BLOCK_NUMBER` if core contracts or project scripts change.
- The fork test raises the `eth_call` gas limit; send/receive assembles ~700 KB of HTML and exceeds
  hardhat's default cap. This affects only the test harness, not the contract.
- Two Arbitrum projects (`0x47a91457a3a1f700097199fd63c039c4784384ab` projects 27 and 39) also store
  HTML while declaring `three@0.124.0` / `p5@1.0.0`. No generator is deployed on Arbitrum, so they
  are out of scope. If a generator ships there, they will need a dependency override to `custom@na`
  (or an explicit per-project mechanism), since script type alone will not identify them.
