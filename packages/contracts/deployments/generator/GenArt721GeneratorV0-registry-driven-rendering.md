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

## Deployed addresses

The registry and the generator share a ProxyAdmin and Safe on mainnet.

| Contract | Proxy | ProxyAdmin | Owner |
|---|---|---|---|
| `GenArt721GeneratorV0` | `0x953D288708bB771F969FCfD9BA0819eF506Ac718` | `0x5705023921B577e5BAeFF66f1fC7d52f5ccF1232` | Safe `0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA` (2-of-4) |
| `DependencyRegistryV0` | `0x37861f95882ACDba2cCD84F5bFc4598e2ECDDdAF` | `0x5705023921B577e5BAeFF66f1fC7d52f5ccF1232` | same Safe |

Registry AdminACL `0x569cDfECFD848a02Ad3e74175a1A4a74484Ef944`, `superAdmin`
`0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283` — the sender for all ten backfill transactions.

## Open items

- Backfill tooling (script plus Safe batch generation for step 2) is not yet built.
- `loadAsModule` does not require a non-empty `preferredCDN`, so an incomplete configuration would
  emit an import map pointing at an empty URL. A setter-level guard was considered and deliberately
  skipped: it would force an ordering constraint on admins and could still be sidestepped by later
  clearing the CDN. The backfill sets both fields together, and the fork test verifies the result.
- The fork comparison above was run as a one-off script. Formalizing it into
  `test/network-fork/` would let CI enforce the byte-identical regression check, and would fail
  loudly if the generator is ever upgraded ahead of the backfill.
- Sepolia carries the same rollout; its registry and generator proxies must be checked for whether
  they share a ProxyAdmin as mainnet does.
- `getDependencyDetailsV2` is additive, so no off-chain consumer changes are required. Consumers
  wanting the new fields should migrate to it.
