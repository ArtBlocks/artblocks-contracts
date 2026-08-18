# Rolling out registry-driven rendering

Tooling for the two-contract upgrade that moves every rendering decision out of
`GenArt721GeneratorV0` and into `DependencyRegistryV0`. The change itself is described in
`deployments/generator/GenArt721GeneratorV0-registry-driven-rendering.md`.

## Why this is more than an upgrade script

The rollout has three on-chain steps that **must** happen in order, and they are sent from
two different accounts:

1. Upgrade `DependencyRegistryV0` — from the ProxyAdmin's owner.
2. Backfill the rendering directives — from the registry's AdminACL `superAdmin`.
3. Upgrade `GenArt721GeneratorV0` — from the ProxyAdmin's owner.

The order is load-bearing. The new generator has no dependency rules left in it, so on a
registry that has not been backfilled it would drop the canvas from every `js`/`babylon`/
`tone`/`zdog` project, stop emitting `application/processing`, and re-wrap raw HTML
documents in a `<script>` tag. `4_upgrade-generator.ts` refuses to build a batch until the
backfill is complete, so the order is enforced rather than merely documented.

Nothing between the steps is broken: the upgraded registry keeps the legacy
`getDependencyDetails` tuple unchanged, so the still-deployed generator renders exactly as
it does today while the new fields sit unread.

## Nothing about topology is configured

`config.ts` lists only the generator proxy addresses. Every other fact — which registry each
generator reads, the ProxyAdmins, their owners, the AdminACL `superAdmin`, and whether each
signer is a Safe or an EOA — is read from chain state on every run. That is not
defensiveness for its own sake: the deployment records imply sepolia's dev and staging
generators read separate registries, and **they do not**. Both read the dev registry.

The backfill is derived the same way. Rather than a hand-written list, every dependency in
the registry is run through the rules the pre-upgrade generator had hardcoded, so the
backfill reproduces behavior that is already live. The one value that is genuinely new —
`loadAsModule` for `three@0.167.0` — is stated explicitly in `config.ts`.

## Projects that declare a script type nobody registered

Rendering follows the registry, which leaves a gap the old generator did not have: a core
stores whatever script type a project was configured with, and it is not guaranteed to name
a registered dependency. Mainnet has `js@undefined`, `js@n/a` and `js@` — all meaning the
`js@na` that *is* registered. The old generator matched on the name before the `@` and gave
them a canvas; the new one has no record to read and would not.

`unregistered.ts` finds those projects by walking every project on every supported core, and
`deriveDependencyOverride` decides what to do with each. The rule is deliberately narrow: it
normalizes spellings of *no version* onto `<name>@na`, and only when that dependency is
actually registered. It never maps one version onto another, because guessing `p5@1.9.0` for
a project declaring `p5@1.11.11` would silently change which library the artwork loads.

The resulting `addProjectDependencyOverride` calls are part of the backfill rather than a
step of their own, so the ordering guard and the verification cover them without knowing
they exist. Anything the rule declines to remap is reported by `0_inspect.ts` and flagged
`REVIEW` by `5_verify.ts` rather than silently accepted.

The scan is slow and cached per network in the gitignored `rollout-baselines/`. Pass
`REFRESH_SCAN=true` to discard it — worth doing immediately before a mainnet backfill, since
a project added after the scan would not be in the batch.

## Topology, as of the last run

| | sepolia | mainnet |
| --- | --- | --- |
| Registries to upgrade | 1 — `0x5Fcc…e9b`, read by *both* generators | 1 — `0x3786…dAF` |
| Generators to upgrade | 2 — dev, staging | 1 |
| Steps 1 and 3, sender | Safe `0xbaD9…6a8` (1-of-1) | Safe `0x5211…2EA` (2-of-4) |
| Step 2, sender | EOA `0x3c64…8c4` — can send directly | Safe `0xCF00…283` (2-of-5) |
| Backfill calls | 10 | 10 |

Sepolia's **staging generator reverts on `getTokenHtml` today**, before any of this: it
points at ScriptyBuilder `0xb205DFfE…`, an older contract than the `0xD7587F11…` the dev
generator uses. That is pre-existing and out of scope here, but it means staging cannot be
verified by rendering. `5_verify.ts` records the failure in the baseline so it is not later
mistaken for a regression.

## Flow

### 0. Inspect

Read-only, and safe to re-run at any point to see how far the rollout has progressed.

```bash
yarn hardhat run --network sepolia scripts/registry-driven-rendering/0_inspect.ts
```

### 1. Validate

Fails loudly if either implementation is not storage-layout compatible with what the live
proxies are running, and prints the CREATE2 address each will occupy.

```bash
yarn hardhat run --network sepolia scripts/registry-driven-rendering/1_validate-and-prepare.ts
```

If it reports a proxy's implementation is "not registered", the OpenZeppelin manifest is
missing that layout — these proxies were upgraded outside `hardhat-upgrades`. Run
`import-manifest.ts`, which copies the layout from another network's manifest after
confirming the deployed bytecode is byte-identical on both chains, and commit the result.

### 2. Capture the pre-upgrade baseline

Do this before anything is upgraded. It discovers one live token per dependency on the
network and records the HTML each renders today.

```bash
CAPTURE=true yarn hardhat run --network sepolia scripts/registry-driven-rendering/5_verify.ts
```

### 3. Deploy the implementations

`scripts/create2-deploy/config.ts` is a scratch file that is committed empty; the batch for
this rollout is written out in this README's companion commit. Add it, run the deployer, and
revert the file afterwards.

```bash
yarn create2-deploy
```

Open <http://localhost:3000>, connect the deploying wallet, and deploy on each chain.
**Leave the salt at its all-zero default** — it is what makes the implementation land at the
same address on every chain even though mainnet and sepolia are deployed by different EOAs.

### 4. Upgrade the registry, backfill, upgrade the generator

```bash
yarn hardhat run --network sepolia scripts/registry-driven-rendering/2_upgrade-registry.ts
yarn hardhat run --network sepolia scripts/registry-driven-rendering/3_backfill.ts
yarn hardhat run --network sepolia scripts/registry-driven-rendering/4_upgrade-generator.ts
```

Each script simulates every call from the account that will send it, so a batch is never
handed to signers unless it is known to execute. Safe batches are written to the gitignored
`deployments/generator/safe-txs/` — upload to the Transaction Builder app and discard; they
are reproducible by re-running.

`PREVIEW=true` on steps 3 and 4 builds their batches ahead of their turn, to be read rather
than executed. Step 4's calls are still simulated — only the ordering check is relaxed —
but step 3's cannot be, because the setters do not exist until the registry upgrade lands.
Previews are written with a `-PREVIEW` suffix and print why they are not executable;
regenerate without the flag when it is actually time to sign.

Where the `superAdmin` is an EOA, `3_backfill.ts` serves the calls at
<http://localhost:3001> for a browser wallet to sign, the same way the CREATE2 deployer
works — no private key is handed to this repo on either path. The page refuses to enable
sending unless the connected account is the `superAdmin` and the wallet is on the right
chain, and it can only offer calls the script already simulated. The process re-reads the
registry after each transaction, so the terminal remains the source of truth for whether the
backfill is complete.

### 5. Verify

```bash
yarn hardhat run --network sepolia scripts/registry-driven-rendering/5_verify.ts
```

Confirms both implementations are live, the backfill is complete, and — for each discovered
token — that the emitted HTML matches what the registry prescribes: canvas presence and
placement, project script wrapper, and import map contents and position. Anything whose
rendering was not meant to change is required to be byte-identical to the baseline.

Discovery walks every supported core, largest first, and proves a token exists with `ownerOf` —
which is the only check that works on pre-V3 cores, and those are exactly where the oldest
dependencies (`processing-js@1.4.6`, `svg@na`, `zdog@1.1.2`) live. Mainnet ends up with 20 tokens
and sepolia with 16; the dependencies left out have no live project at all.

### 6. Sync the OpenZeppelin manifest

The proxies were upgraded outside `hardhat-upgrades`, so the manifests still record the
previous implementations. Re-import and commit, so the next upgrade validates against the
right layout.

```bash
yarn hardhat run --network mainnet scripts/registry-driven-rendering/6_sync-manifest.ts
```
