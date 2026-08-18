# Upgrade: registry-driven rendering directives (ES module support)

## Problem

Projects declaring `three@0.167.0` do not render in the on-chain generator. `three@0.167.0` is not
stored on chain (`scriptCount == 0`), so it is loaded from `preferredCDN` — and that URL points at
`three.module.min.js`, the **ES module** build. The generator emitted:

```html
<script type="text/javascript" src=".../three.module.min.js"></script>
<script src="data:...gunzip shim..."></script>
<script>import * as THREE from 'three'; /* project script */</script>
```

Both script tags are wrong for a module project, and they fail independently:

1. An ESM build loaded as a classic script raises `Uncaught SyntaxError: Unexpected token 'export'`.
2. The project script is itself a module, but is wrapped in a classic `<script>`, raising
   `SyntaxError: Cannot use import statement outside a module`.

Even with both corrected, a third problem remains: project scripts import the **bare specifier**
`'three'`, which browsers cannot resolve without an import map. All three must be fixed together.

## Affected projects

Every mainnet project declaring an ES module dependency. `three@0.167.0` is the only ESM dependency
in the registry, so this list is exhaustive.

| Project | Artist | Contract | Project ID | Invocations |
|---|---|---|---|---|
| Gas Wars | Jack Butcher | `0xab00000000002ade39f58f9d8278a31574ffbe77` | 505 | 500 |
| Materialistic — Digital Edition | Anthony Hiley-Mann (MV) | `0x96a83b48de94e130cf2aa81b28391c28ee33d253` | 9 | 80 |
| Transformations du Champ | HAL09999 x The Generative Art Museum | `0x000000b394cac6057d87df835bea27844b3e2828` | 0 | 27 |
| Materialistic — Curated Edition | Anthony Hiley-Mann (MV) | `0x96a83b48de94e130cf2aa81b28391c28ee33d253` | 8 | 12 |

## Why this is not another one-off branch

The generator had accumulated a hardcoded branch per dependency family: a canvas-tag name list
(`js`, `babylon`, `tone`, `zdog`, `processing-js`), a `processing-js@1.4.6` check selecting
`type='application/processing'`, and — added the previous release — a `custom@na` check for raw HTML
injection. Adding ESM as a fourth branch would have continued a pattern where every new dependency
type costs a contract upgrade.

Instead, the dependency registry now **fully prescribes** how the generator renders a project, and
all dependency-name-based logic is deleted from the generator. Supporting a new dependency type
becomes an admin transaction. This completes the intent of PR #1814, which added registry fields but
deferred the generator cleanup; that PR is superseded by this work.

## Change

### `contracts/interfaces/v0.8.x/IDependencyRegistryV0.sol`

Two enums and a details struct:

```solidity
enum CanvasTagType { NoCanvasTag, CanvasBeforeProjectScript, CanvasAfterProjectScript }
enum ProjectScriptTagType { ClassicScript, Module, SpecialType, RawHtml }
```

`getDependencyDetailsV2` returns a `DependencyDetails` struct carrying the existing fields plus
`loadAsModule`, `canvasTagType`, `projectScriptTagType`, and `projectScriptSpecialType`.

**`getDependencyDetails` and `getDependencyDetailsFromString` keep their original nine-output
signatures, unchanged.** A function selector derives only from argument types, so a same-named
struct-returning function would still be reachable by existing callers and would silently misdecode
rather than revert. Keeping the legacy shape is what makes the rollout incremental (see below).

### `contracts/libs/v0.8.x/DependencyRegistryStorageLib.sol`

Four fields appended to `Dependency`. Appending is safe because `Dependency` is only ever used as a
mapping value (`dependencyRecords`), never in an array and never followed by other variables in a
contiguous slot region. The two enums and the bool are declared adjacently so they pack into one
slot; the string takes its own.

### `contracts/DependencyRegistryV0.sol`

Three admin setters, each guarded by `_onlyAdminACL` / `_onlyExistingDependency` and emitting an
event: `updateDependencyCanvasTagType`, `updateDependencyLoadAsModule`,
`updateDependencyProjectScriptTagType`.

The last one requires `projectScriptSpecialType` to be non-empty when the tag type is `SpecialType`
and empty otherwise, so the two cannot drift out of sync and silently emit a script tag with a
missing or ignored `type` attribute.

### `contracts/generator/GenArt721GeneratorV0.sol`

- `_getTokenHtmlRequest` reads `getDependencyDetailsV2` once and drives everything from it.
- The canvas name list, the `processing-js@1.4.6` check, and the `custom@na` check are **deleted**,
  along with the `CUSTOM_AT_NA_BYTES32` constant.
- New `_populateImportMapHtmlTag` emits `<script type="importmap">` in `<head>`, keyed on the
  dependency name before the `@` and valued with `preferredCDN`.
- When `loadAsModule` is true the classic dependency `<script src>` tag is **not** emitted — the
  module is reached through the import map instead.
- `_getProjectScriptTagOpen` selects the project script wrapper from `projectScriptTagType`.

The one remaining name-based check is `js@na` / `svg@na` in `_getIsDependencyOnChain`. That is an
on-chain-status semantic rather than a rendering directive, and is deliberately retained.

Net effect on emitted HTML for an ESM project is 25 bytes: one classic script tag removed, one
import map added, and the project script wrapper gaining `type="module"`.

## ES module behavior — what was measured

Verified in real Chromium, Firefox, and WebKit rather than assumed. These results define the rules
the design relies on.

| Behavior | Chromium | Firefox | WebKit |
|---|---|---|---|
| Import map resolves a bare specifier to a CDN module | PASS | PASS | PASS |
| Subpath specifier (`three/addons/…`) with only the bare key mapped | **FAIL** | **FAIL** | **FAIL** |
| Subpath specifier with a trailing-slash prefix key mapped | PASS | PASS | PASS |
| `data:` URL module, self-contained | PASS | PASS | PASS |
| `data:` URL module using a **relative** sub-import | **FAIL** | **FAIL** | **FAIL** |
| `data:` URL modules importing each other via mapped bare specifiers | PASS | PASS | PASS |
| Import map injected by a classic script before any module | PASS | PASS | PASS |
| Import map injected after a module has already loaded | PASS | **FAIL** | PASS |

Consequences:

- **A single-key import map is sufficient today.** All four affected projects import only the bare
  specifier `three`; none use subpath imports. Verified by extracting every module specifier from
  each project's stored script.
- **Import maps must be static and in `<head>`.** Firefox rejects a late import map, so the
  generator must never rely on injecting one after modules begin loading.
- **A subpath specifier would require a second, trailing-slash key**, and that URL is *not derivable*
  from `preferredCDN` — cdnjs does not host three's addons at all (both plausible paths return 404);
  they live on unpkg/jsdelivr under a different path shape. If a project ever needs subpath imports,
  the import map must become registry-stored data rather than a derived single key. This is a known,
  deliberate limitation, not an oversight.
- **On-chain ES modules are viable but not supported here.** A `data:` URL module cannot use
  relative imports in any engine. A gzipped on-chain module also cannot be placed behind a `data:`
  URL at all. Both are solvable by having the gunzip shim inflate to a blob URL and inject the import
  map before modules evaluate — prototyped and passing in all three engines — but no on-chain ESM
  dependency exists, so that work is deferred.

## Backfill

Ten admin transactions against the dependency registry, sent from the AdminACL `superAdmin`. They
touch eight distinct dependencies; the remaining twelve of the twenty registered dependencies keep
zero-value defaults, which are already correct for them.

| Dependency | Setter | Value |
|---|---|---|
| `js@na` | `updateDependencyCanvasTagType` | `CanvasBeforeProjectScript` (1) |
| `babylon@5.0.0` | `updateDependencyCanvasTagType` | `CanvasBeforeProjectScript` (1) |
| `babylon@6.36.0` | `updateDependencyCanvasTagType` | `CanvasBeforeProjectScript` (1) |
| `tone@14.8.15` | `updateDependencyCanvasTagType` | `CanvasBeforeProjectScript` (1) |
| `zdog@1.1.2` | `updateDependencyCanvasTagType` | `CanvasBeforeProjectScript` (1) |
| `processing-js@1.4.6` | `updateDependencyCanvasTagType` | `CanvasAfterProjectScript` (2) |
| `processing-js@1.4.6` | `updateDependencyProjectScriptTagType` | `SpecialType` (2), `"application/processing"` |
| `custom@na` | `updateDependencyProjectScriptTagType` | `RawHtml` (3), `""` |
| `three@0.167.0` | `updateDependencyProjectScriptTagType` | `Module` (1), `""` |
| `three@0.167.0` | `updateDependencyLoadAsModule` | `true` |

`js-legacy@na` correctly receives no canvas — its name is `js-legacy`, not `js`, so the previous
prefix check never matched it either.

## Rollout order

**The order is load-bearing.** The new field defaults are behavior-changing, not
behavior-preserving: a generator reading unset fields would drop the canvas from every
`js`/`babylon`/`tone`/`zdog` project, stop emitting `application/processing`, and re-wrap
`custom@na` documents in a script tag.

1. **Upgrade `DependencyRegistryV0`** — the new setters do not exist on the deployed implementation.
   Attempting the backfill first reverts with `function selector was not recognized`.
2. **Apply the ten backfill transactions.**
3. **Upgrade `GenArt721GeneratorV0`.**

No intermediate state is broken. Between steps 1 and 3 the still-deployed generator calls the legacy
tuple `getDependencyDetails`, which is retained unchanged, so it continues to render exactly as it
does today while the new fields sit unread.

Steps 1 and 3 are ProxyAdmin operations from the Safe. Step 2 is an AdminACL operation from a
different account, so it cannot be folded into the same Safe batch.

## Verification performed

Unit tests — the registry suite passes 151/151 and the generator suite 43/43.

The registry suite covers each new setter's access control, its rejection of unknown dependencies and
out-of-range enum values, the requirement that `projectScriptSpecialType` is set if and only if the
tag type is `SpecialType`, and that `removeDependency` clears the rendering directives so a reused
name cannot inherit them. It also asserts that `getDependencyDetails` and
`getDependencyDetailsFromString` still return their original nine-output tuples after the new fields
are set, which is the property the rollout order depends on.

The generator suite gained a `registry-driven rendering` block covering every value of both enums and
both values of `loadAsModule`: the four project script wrappers, canvas presence and placement, the
import map's contents and its position ahead of the module script, and the suppression of a module
dependency's own script tag. One test changes registry values and re-reads `getTokenHtml` from the
same deployed generator, which is the claim the whole design rests on. The generator's existing
fixture now sets `js@na` and `custom@na` to their production values, so the suite exercises the same
configuration mainnet will have.

Storage layout — OpenZeppelin's `validateUpgrade` passes for both proxies against the implementations
currently live on mainnet:

| Proxy | Current implementation | Result |
|---|---|---|
| `DependencyRegistryV0` `0x37861f95882ACDba2cCD84F5bFc4598e2ECDDdAF` | `0x00000000A8251c455F2D1AEA1Fd829d98aBb7009` | layout OK |
| `GenArt721GeneratorV0` `0x953D288708bB771F969FCfD9BA0819eF506Ac718` | — | layout OK |

The registry proxy was not previously registered in `.openzeppelin/mainnet.json`; it has been imported
with the layout of the implementation that is live today, so this and future registry upgrades are
checked by the same tooling the generator already uses.

Mainnet fork, block 25,740,000 — captured `getTokenHtml` for fourteen projects on the deployed
implementation, applied all three rollout steps, and re-captured.

| Project | Dependency | Before | After | Result |
|---|---|---|---|---|
| Gas Wars | `three@0.167.0` | 99,023 | 99,048 | +25 bytes |
| Materialistic Digital | `three@0.167.0` | 284,853 | 284,878 | +25 bytes |
| Materialistic Curated | `three@0.167.0` | 288,485 | 288,510 | +25 bytes |
| Transformations du Champ | `three@0.167.0` | 171,883 | 171,908 | +25 bytes |
| Quine | `custom@na` | 43,480 | 43,480 | byte-identical |
| Overture | `custom@na` | 10,254 | 10,254 | byte-identical |
| Genesis | `processing-js@1.4.6` | 21,687 | 21,687 | byte-identical |
| Passages | `js@na` | 68,463 | 68,463 | byte-identical |
| PRELUDES | `tone@14.8.15` | 39,210 | 39,210 | byte-identical |
| dino pals | `zdog@1.1.2` | 18,171 | 18,171 | byte-identical |
| Petro National | `babylon@5.0.0` | 53,770 | 53,770 | byte-identical |
| 444(4) | `p5@1.0.0` | 247,255 | 247,255 | byte-identical |
| Cosmic Reef | `three@0.124.0` | 341,066 | 341,066 | byte-identical |
| Crypt | wrapped JS | 42,504 | 42,504 | byte-identical |

Ten of ten regression projects are byte-for-byte unchanged, covering every backfilled field. The
four ESM projects changed by exactly the same 25 bytes.

Browser rendering of the fork output, headless Chromium:

| Project | Before | After |
|---|---|---|
| Gas Wars | 0 canvases, `Unexpected token 'export'` | 1 canvas, no errors |
| Materialistic Digital | 0 canvases, `Unexpected token 'export'` | 2 canvases, no errors |
| Materialistic Curated | 0 canvases, `Unexpected token 'export'` | 2 canvases, no errors |
| Transformations du Champ | 0 canvases, `Unexpected token 'export'` | 1 canvas, renders (see note) |
| Quine, Genesis, dino pals, 444(4) | render | render, no errors |

**Transformations du Champ** still logs `ReferenceError: Tone is not defined` after the fix. This is
a race in the artwork's own code, not a regression: the project appends one module that imports Tone
from an absolute CDN URL and a second module whose main code expects a `Tone` global, and the main
module wins. Checked at 20 seconds, `window.Tone` does resolve to an object and the tone module
element is present — Tone loads, just too late for the code that uses it. The same race exists in the
hosted generator. Before this change the project rendered nothing at all; it now renders its visuals.

## Sepolia rollout — executed

All three steps are complete on sepolia and verification passes. The three transactions were the
registry upgrade from the Safe, ten backfill transactions from the EOA `superAdmin`, and one Safe
batch upgrading both generator proxies.

Because sepolia was already upgraded by the time the results were analyzed, "before" was reproduced
by forking sepolia at block 11,489,800 — one block range ahead of the registry upgrade — and diffing
the actual HTML rather than comparing stored hashes. That is stronger evidence than the baseline
comparison it replaced: it shows *what* changed, not merely *that* something did.

| Dependency | Delta | What the diff shows |
|---|---|---|
| `three@0.167.0` | +25 bytes | import map added to `<head>`, project script rewrapped `<script type="module">`, dependency's own classic script tag dropped |
| `custom@na`, `js@na`, `babylon@6.36.0`, `tone@14.8.15`, `p5@*`, `three@0.124.0`, `three@0.160.0`, `regl@2.1.0`, `svg@na` | 0 | byte-identical |
| `js@`, `js@1.0.0` | −32 bytes | `<canvas id='js-canvas'></canvas>` no longer emitted — see below |

`p5@1.9.0` and `three@0.124.0` differ in one field of their token data, a `#web3call#` payload that
encodes the current block height. It is assembled outside anything this rollout touches and differs
between any two blocks; verification masks it before hashing.

### Dependency strings with no registry record

The −32 byte delta is the one real behavior change beyond ESM, and it is worth understanding before
mainnet. A project's declared script type is not guaranteed to be a registered dependency. Mainnet
has three such strings — `js@undefined` (8 projects), `js@n/a` (6), and `js@` (1) — plus
`p5@1.11.11` (1). The old generator matched on the name before the `@`, so all fifteen `js@*`
projects received a canvas. The new generator has no record to read and renders them with the
defaults: classic script, no canvas.

This was checked project by project rather than reasoned about. In all fifteen, `js-canvas` appears
exactly once in the emitted HTML — the injected element itself — so no project script references it.
None look the canvas up by tag either, except one (`0x99a9B7c1…` #421), which queries only its own
`#main-canvas` and `#canvas-gl` elements that it creates and appends itself. The injected canvas is
empty and transparent, so dropping it is not observable. `p5@1.11.11` is unaffected: `p5` never
received a canvas.

Fixed in data rather than code. `addProjectDependencyOverride` points those projects at `js@na`,
which is what they already mean, so they render through the same per-dependency path as everything
else and keep their canvas. The alternative — teaching the contracts to key canvas rules on the bare
name, or to fall back from `js@undefined` to `js@na` — reintroduces the name matching this change
removes, needs another audit and deploy of both contracts, and makes registering any `foo@na`
retroactively change every misspelled `foo@…` project.

The overrides are part of the backfill, not a step of their own: they are required before the
generator upgrade for the same reason every other backfill call is, so the ordering guard and the
verification cover them automatically. They are safe to apply while the old generator is still live
— `js@na` has no preferred CDN and no on-chain scripts, so the override pulls in nothing new, and
the old generator still sees the name `js` and still emits the canvas. `plan.ts` asserts that
property rather than trusting it, and refuses to build the call if the target dependency has a CDN
or on-chain scripts.

The rule that produces them is narrow by design: it normalizes spellings of *no version* —
`""`, `n/a`, `none`, `null`, `undefined` — onto `<name>@na`, and only when that dependency is
registered. It never maps one version onto another. `p5@1.11.11` is therefore left alone, correctly:
`p5` never received a canvas, so nothing changes for it. Anything not remapped is reported by
`0_inspect.ts` and flagged `REVIEW` by `5_verify.ts` rather than silently accepted.

Sepolia exercised this first, and shows the rule declining as often as it fires: of five
unregistered strings there, only `js@` was remapped (11 projects). `p5@` and `three@` are
no-version spellings whose `@na` dependencies are not registered on that network, and `js@1.0.0`
carries a real version — all left as-is.

## Mainnet rollout — executed

Complete, in the required order, and verification passes.

| Step | Sender | Transaction | Block |
|---|---|---|---|
| Registry upgrade | ProxyAdmin Safe | `0x00b4624d59ca3a7dbe4ff08e06184d61a588c10a62de08c8d6e678b077c756f9` | 25,784,094 |
| Backfill — 10 dependency calls + 15 project overrides, one batch | `superAdmin` Safe | `0xb3246c70fe74345d1231d5395ec95a424cb25e48c7a3bf6c018cb84d5649b02e` | 25,784,202 |
| Generator upgrade | ProxyAdmin Safe | `0x063a4b2338745cec362d5c86d09cbd0bb4b32401adefb4fb13e05b6e7de001fe` | 25,784,539 |

The overrides were regenerated with `REFRESH_SCAN=true` immediately before the backfill, so the
batch reflected project configuration as of that block rather than the earlier scan.

`5_verify.ts` against live mainnet: both implementation slots match the predicted CREATE2
addresses, no backfill call is outstanding, and all 20 discovered tokens satisfy the structural
assertions. `three@0.167.0` is +25 bytes — the import map, the `type="module"` wrapper, and the
dropped classic tag for the dependency's own script. Every other token is byte-identical to its
pre-upgrade baseline, including the fifteen remapped `js@*` projects, which is the point of the
overrides: the remap is visible in the registry and invisible in the output. Those rows report
`REVIEW` rather than `OK` only because the resolved dependency string changed.

`.openzeppelin/mainnet.json` has been synced with `forceImport` so future upgrades validate against
the deployed layouts.

## Deployed addresses

The registry and the generator share a ProxyAdmin and Safe on mainnet.

| Contract | Proxy | ProxyAdmin | Owner |
|---|---|---|---|
| `GenArt721GeneratorV0` | `0x953D288708bB771F969FCfD9BA0819eF506Ac718` | `0x5705023921B577e5BAeFF66f1fC7d52f5ccF1232` | Safe `0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA` (2-of-4) |
| `DependencyRegistryV0` | `0x37861f95882ACDba2cCD84F5bFc4598e2ECDDdAF` | `0x5705023921B577e5BAeFF66f1fC7d52f5ccF1232` | same Safe |

Registry AdminACL `0x569cDfECFD848a02Ad3e74175a1A4a74484Ef944`, `superAdmin`
`0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283` — a 2-of-5 Safe, and the sender for all ten
backfill transactions. It is a *different* Safe from the ProxyAdmin owner, which is why the
backfill cannot be folded into either upgrade batch.

Sepolia carries the same rollout, with two differences found by the tooling rather than assumed:

- Both sepolia generators — dev `0x705E55FCD5CB00eB727213aa777C914B814817Be` and staging
  `0xdC862938cA0a2D8dcabe5733C23e54ac7aAFFF27` — read the **dev** registry
  `0x5Fcc415BCFb164C5F826B5305274749BeB684e9b`, not the separate staging registry the deployment
  records imply. One registry upgrade and one backfill cover both. The staging registry
  `0xEFA7Ef074A6E90a99fba8bAd4dCf337ef298387f` is read by no generator and is left alone.
- The sepolia `superAdmin` is an EOA rather than a Safe, so the backfill can be sent directly.

Both sepolia proxies and the mainnet pair share a ProxyAdmin with their generator, so each
network's registry and generator upgrades go to the same Safe — just not in the same batch,
since the backfill has to land between them.

## Rollout tooling

`scripts/registry-driven-rendering/` — see its README. Two properties are worth noting for review:

- **The backfill is derived, not listed.** Every dependency in the registry is run through the
  rules the pre-upgrade generator hardcoded, so the backfill reproduces behavior already live on
  that network. Run against mainnet it produces exactly the ten transactions tabulated above,
  which is an independent check on the hand-written table.
- **The ordering is enforced.** `4_upgrade-generator.ts` refuses to build a batch while any
  backfill call is outstanding, so the one sequence that visibly breaks live artwork cannot be
  executed by mistake.

Verification discovers one live token per dependency on the network and asserts the emitted HTML
against what the registry prescribes — canvas presence and placement, project script wrapper, and
import map contents and position — comparing to a pre-upgrade baseline captured before step 1.

Baselines are captured. Mainnet covers 20 tokens spanning every dependency that has a live
project; `aframe@1.5.0`, `babylon@6.36.0`, and `cannon-es@0.20.0` have none, so `babylon@6.36.0` is
the one backfilled value with no live project behind it. Sepolia covers 16, but has no project on
`processing-js@1.4.6` or `zdog@1.1.2`, so those two backfilled behaviors can only be confirmed on
mainnet.

Three of the captured baselines match the fork test exactly — Quine 43,480 bytes, Genesis 21,687,
dino pals 18,171 — which is an independent confirmation that the fork was measuring live state.

Sepolia's staging generator reverts on `getTokenHtml` today — it points at ScriptyBuilder
`0xb205DFfE…` rather than the `0xD7587F11…` the dev generator uses. That is pre-existing and
unrelated; the baseline records the failure so it is not later read as a regression.

## Open items

- `loadAsModule` does not require a non-empty `preferredCDN`, so an incomplete configuration would
  emit an import map pointing at an empty URL. A setter-level guard was considered and deliberately
  skipped: it would force an ordering constraint on admins and could still be sidestepped by later
  clearing the CDN. The backfill sets both fields together, and the fork test verifies the result.
- Sepolia has no live token for `processing-js@1.4.6` or `zdog@1.1.2`, so those two backfilled
  behaviors cannot be verified there by rendering. They are covered by the mainnet fork test, the
  unit suite, and mainnet verification.
- Sepolia's staging generator is broken today for an unrelated reason (an older ScriptyBuilder).
  It is upgraded along with dev because they share a ProxyAdmin, but repointing it is out of scope.
- `getDependencyDetailsV2` is additive, so no off-chain consumer changes are required. Consumers
  wanting the new fields should migrate to it.
- Fifteen mainnet projects declared a `js@*` script type that is not a registered dependency; the
  backfill pointed them at `js@na`, so their rendering is unchanged. This is now an ongoing concern
  rather than a one-time fix: a project configured with an unregistered script type after the
  rollout renders with the defaults — classic script, no canvas. `0_inspect.ts` with
  `REFRESH_SCAN=true` reports any that appear, and the remedy is one
  `addProjectDependencyOverride` call. Registering the dependency the project actually declares is
  the better fix where the string is a real version.
- One mainnet project declares `p5@1.11.11`, which is not registered and is not a no-version
  spelling, so it is left as-is. `p5` never received a canvas, so nothing changes for it.
- `cannon-es@0.20.0` is an ES module — its on-chain script ends in `export{CANNON}` — but is
  registered with `loadAsModule` false, so the generator would emit it as a classic script and the
  export would raise a syntax error. Nothing renders wrong today: no live project uses it, which is
  also why the rollout's verification never exercised it. It cannot simply be flipped, because
  `loadAsModule` routes a dependency through the import map, which points at `preferredCDN` — and
  `cannon-es` is the only module dependency stored on chain (`three@0.167.0` is CDN-only). Flipping
  it would take an on-chain dependency off chain. Serving an on-chain module to the import map
  needs a blob or data URL built from the gunzipped script, which the generator does not do today.
  Worth resolving before a project ships on `cannon-es`, not after. EVENT by Bernar Venet
  (`0xE034bb2b…` project 1) uses the cannon library but is not affected and is not evidence the
  registry entry works: it declares `three@0.124.0` and carries its own copy of cannon as six
  on-chain external asset dependencies, which its project script gunzips and loads as a module
  through a blob URL it builds itself. Its output is byte-identical across this rollout, confirmed
  by forking one block before the registry upgrade. It is also a working precedent for the blob-URL
  approach the generator would need in order to serve an on-chain module through the import map.
- `aframe@1.5.0`, `babylon@6.36.0`, and `cannon-es@0.20.0` have no live project on either network,
  so their backfilled values are asserted by the unit suite but never rendered end to end.
