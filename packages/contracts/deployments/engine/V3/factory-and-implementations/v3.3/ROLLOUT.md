# Rolling out Core v3.3 (transfer hooks)

Plan for putting `GenArt721CoreV3_Engine` v3.3.0 and `GenArt721CoreV3_Engine_Flex` v3.3.1
behind the Engine Factory on every supported network. The contract change itself is described
in [`contracts/V3_ENGINE_CHANGELOG.md`](../../../../../contracts/V3_ENGINE_CHANGELOG.md);
this document is about deploying it.

Tooling lives in [`scripts/engine/V3/factory-upgrade/`](../../../../../scripts/engine/V3/factory-upgrade/README.md).
Deployment records for each contract land in this directory as they are deployed.

## What is being replaced, and what is not

|                                                    | v3.2 (current)                                       | v3.3                           |
| -------------------------------------------------- | ---------------------------------------------------- | ------------------------------ |
| `GenArt721CoreV3_Engine`                           | v3.2.9 `0x00000000f10424506961445f935ec76579e0769F`  | v3.3.0 — new                   |
| `GenArt721CoreV3_Engine_Flex`                      | v3.2.10 `0x000000000132CFBeC18C143aB0AaD021B1fDEA13` | v3.3.1 — new                   |
| `V3EngineLib`                                      | —                                                    | new                            |
| `V3TransferHookLib`                                | —                                                    | new                            |
| `V3FlexLib`                                        | `0x00000000Db6f2EBe627260e411E6c973B7c48A62`         | **reused**                     |
| `BytecodeStorageV2:BytecodeStorageReader`          | `0x000000000016A5A5ff2FA7799C4BEe89bA59B74e`         | **reused**                     |
| `OwnerHistoryTransferHook`                         | —                                                    | new, optional                  |
| `EngineFactoryV0`                                  | v004, per network                                    | v005, per network — new        |
| `CoreRegistryV1`                                   | per network                                          | **unchanged**, ownership moves |
| `UniversalBytecodeStorageReader`                   | per network                                          | **unchanged**                  |
| Shared minter filter / randomizer / split provider |                                                      | **unchanged**                  |

`EngineFactoryV0`'s source is unchanged in this release. It is redeployed only because
`engineImplementation` and `engineFlexImplementation` are `immutable` on it.

`V3FlexLib` is reused deliberately. `contracts/libs/v0.8.x/V3FlexLib.sol` has not been touched
since the commit that deployed the current lib, and compiling it at that commit and at this one
produces runtime bytecode that is identical for all 6,136 executable bytes — the two differ only
inside the trailing CBOR metadata blob, whose IPFS hash moved because interfaces the library
transitively imports were touched. (The `ProjectUpdatedFields` and `ErrorCodes` enums it uses
were only appended to, so no value it encodes changed.) Redeploying would spend gas on six
networks to land identical logic at a new address and would split the fleet across two Flex
libs for no benefit.

### Contracts already deployed stay on v3.2

Engine contracts are ERC-1167 clones, and a clone hardcodes its implementation address in its
own runtime bytecode. Every Engine and Engine Flex contract deployed to date therefore stays on
v3.2.9/v3.2.10 permanently, and **cannot** get transfer hooks. Only contracts created by the new
factory support them. Plan for a mixed-version fleet indefinitely: anything reading
`coreVersion()` or feature-detecting `configureProjectTransferHook` must handle both.

## Deployment phases

Each phase's addresses are constructor or link inputs to the next, so the phases cannot be
collapsed. They can, however, all be **prepared** before anything is deployed: a CREATE2 address
is fixed the moment its salt is mined, so phase 2 can be mined against phase 1's predicted
addresses and phase 3 against phase 2's, with no transaction in between. That is how the salts
below were produced, and it means the whole rollout deploys in a single `yarn create2-deploy`
session rather than three.

### Salts

Every salt is zero-prefixed (`0x0000…`), so `ImmutableCreate2Factory.safeCreate2` accepts it from
any sender and each contract is reproducible on a new chain by anyone — the same convention as
`V3FlexLib` and `PMPV1`, rather than the deployer-prefixed salts used for the v3.2
implementations. Each lands its contract at an address with four leading zero bytes. They are
recorded in `MINED_SALTS` in `scripts/engine/V3/factory-upgrade/config.ts`.

`1_prepare-deployments.ts` re-derives every address from `salt + initcode hash` on each run and
**throws** if the result no longer matches the address recorded in `config.ts`. That is the
guard that matters: a salt is only valid for the exact initcode it was mined against, and
because implementations link the libraries and factories take the implementations as constructor
arguments, one changed byte in a library invalidates every salt downstream of it.

### Phase 1 — libraries, and the reference transfer hook

`V3EngineLib` and `V3TransferHookLib` link nothing and take no constructor arguments, so their
initcode is fixed by the source alone and one salt lands them at the same address on every
network. `OwnerHistoryTransferHook` is in the same position and is deployed alongside them,
though it is an input to nothing later — see [Reference transfer hook](#reference-transfer-hook).

As of this commit, with solc `0.8.22`, optimizer enabled, `runs: 10`:

| Contract                   | Deploys to                                   | Runtime size |
| -------------------------- | -------------------------------------------- | ------------ |
| `V3EngineLib`              | `0x000000001d81F6Ed8c3646293bD485Cef06416db` | 4,437 bytes  |
| `V3TransferHookLib`        | `0x0000000020458d4C18397517bA13E43B54Baa56C` | 1,669 bytes  |
| `OwnerHistoryTransferHook` | `0x00000000cb60788043f4F779bfC192F1c5bd09FA` | 2,928 bytes  |

| Contract                   | Initcode hash                                                        |
| -------------------------- | -------------------------------------------------------------------- |
| `V3EngineLib`              | `0x24d356e51dd09200ffc40b19d36bc5bb8f477595eeb2977fde5eb451d7b867c3` |
| `V3TransferHookLib`        | `0x137dd17c601d5a2247f72a646426ae75e3c628b8a4a3cca19a5f0fa320a6a397` |
| `OwnerHistoryTransferHook` | `0xa0ea1132111522d04c8b1752d5f284e337430314074e96af201133516406b1ab` |

### Phase 2 — implementations

Both implementations link `BytecodeStorageReader`, `V3EngineLib` and `V3TransferHookLib`; the
Flex core additionally links `V3FlexLib`. Because the linked addresses are baked into the
initcode, the implementations only land at a single address across networks if the libraries are
at the same addresses everywhere. `1_prepare-deployments.ts` refuses to compute implementation
initcode against a library address with no code on the network it is run against; run it once
per network before mining.

| Implementation                | Version | Deploys to                                   | Deployed size |
| ----------------------------- | ------- | -------------------------------------------- | ------------- |
| `GenArt721CoreV3_Engine`      | v3.3.0  | `0x00000000E8227826CB865a4ee37B1300C6b6120E` | 20.622 KiB    |
| `GenArt721CoreV3_Engine_Flex` | v3.3.1  | `0x00000000824067A9E7fcB6CB084eCcd8f3Cb8399` | 23.400 KiB    |

Both comfortably under the 24,576-byte limit. Initcode hashes:

| Implementation                | Initcode hash                                                        |
| ----------------------------- | -------------------------------------------------------------------- |
| `GenArt721CoreV3_Engine`      | `0xdc63a0791201fa256c863cdee68ba131a84f0239e53271b623198565b36712d3` |
| `GenArt721CoreV3_Engine_Flex` | `0x9b25a8f3b5e30d1e917dfe67e0ca825537130c41de0b47d5640579ee5a7c65f2` |

### Phase 3 — factories, one per network

The factory takes six constructor arguments. Two are the phase 2 implementations; the other four
are network-specific and are read off the outgoing factory rather than transcribed:

```
engineImplementation_            <v3.3.0>
engineFlexImplementation_        <v3.3.1>
coreRegistry_                    outgoingFactory.coreRegistry()
owner_                           outgoingFactory.owner()                    // the Deployer Safe
defaultBaseURIHost_              outgoingFactory.defaultBaseURIHost()
universalBytecodeStorageReader_  outgoingFactory.universalBytecodeStorageReader()
```

`0_inspect.ts` prints these per network and writes a snapshot of the outgoing factory's live
state to the gitignored `factory-state/` directory beside this file. `PHASE=3 PREDICT_ONLY=true`
then computes initcode for every network from those snapshots at once, so all six salts can be
mined without an RPC connection to each chain in turn.

The snapshot exists because `owner` and `defaultBaseURIHost` are **mutable** on `EngineFactoryV0`
— unlike `coreRegistry` and `universalBytecodeStorageReader`, which are `immutable` — so
transcribing them from the v004 deployment records would not be safe. Snapshots are a cache, not
a record: re-run phase 3 without `PREDICT_ONLY` against each network before deploying, and
confirm it prints the same initcode hash the salt was mined against.

Because the arguments differ, the factory is intentionally at a different address on every
network — one salt per network:

| Environment | Deploys to                                   | Initcode hash                                                        |
| ----------- | -------------------------------------------- | -------------------------------------------------------------------- |
| mainnet     | `0x00000000a337ce098Bf11265176a2bDDA1f41060` | `0x707bc0201bb792ba244785b816d81e4d04653504d69e6ca0c2fcbf5b1eadead1` |
| arbitrum    | `0x00000000d5dE2813d00C972eB95941196a1FafeC` | `0xe03af43190436f3113e8ba57c5f88b4d9eff7b98d8fe39fbb3fe16a4b1c6aa02` |
| base        | `0x000000003baa376C3d7B7E757e89B195815D8006` | `0x57160d9ee5a74e1329fc2c12688b371a5387519f0d8d842b05d721b9090c2a94` |
| shape       | `0x00000000498832081b5827d11AFbBD0ee8C9f2D8` | `0x4a4e66ea29dca22c21a94935f2345da23933ac32b01577584d66934f9caaf39c` |
| staging     | `0x000000007c4b0a672854cEC09812aE3564aA57a6` | `0xcbdc749359b9dec94ce426180261a489a35a25dc048425700d0be247f95733b9` |
| dev         | `0x00000000c031Da9C81530457C5CACdd781Efb689` | `0x54ca3ad83d64c427437c39a642e7a1da086a1cf95ff39374a83afc137cb432bf` |

### Deploy the phases in order, per network

`EngineFactoryV0`'s constructor calls `coreType()` and `coreVersion()` on both implementations
and caches the results. Deploying a factory before its implementations exist on that chain does
not merely produce a broken factory — the constructor **reverts**. So within the single
`create2-deploy` session, deploy phase 1 on every network, then phase 2, then phase 3.
`1_prepare-deployments.ts` refuses to compute phase 3 against implementations with no code,
which enforces this rather than leaving it to the runbook.

## Reference transfer hook

`OwnerHistoryTransferHook` ships with v3.3 as a first-party `ITransferHook` implementation,
deploying to `0x00000000cb60788043f4F779bfC192F1c5bd09FA`. It records, on chain, every owner a
token has had, so an artwork's own script can read its provenance through the on-chain
generator.

One deployment serves every project on every v3.3+ core on the network. It has no owner, no
allowlist and nothing to configure: an artist points a project at it with
`configureProjectTransferHook`, and may make that permanent with `lockProjectTransferHook`. The
hook rejects any caller that does not have it configured, and keys its storage by
`coreContract` so that even a contract impersonating a core can only write beneath its own
address.

It links nothing and takes no constructor arguments, so it has no ordering constraint — it can
deploy with phase 1 and sit unused until the first artist opts in. Nothing about the rollout
depends on it.

**It is expensive, and the artist is choosing that cost for every future holder of their
tokens.** Measured against an otherwise identical project with no hook, on a v3.3 Engine core:

|          | no hook | with hook | delta              |
| -------- | ------- | --------- | ------------------ |
| transfer | 62,748  | 111,181   | **+48,433** (+77%) |
| mint     | 111,831 | 200,629   | **+88,798**        |

An owner is 20 bytes and a storage slot is 32, so ~22,000 gas per recorded owner is the floor;
the rest is the core's own reentrancy flag (~17,000, which any hook pays) and the calls, length
update and events. The mint is higher because the first ownership change a token sees writes
both the chain's anchor entry and the new owner. A project that only wants provenance for
off-chain consumers should index the core's `Transfer` events and configure no hook at all.

The figures above are asserted by `test/core/V3/transfer-hooks/OwnerHistoryTransferHook.test.ts`,
so they cannot drift without a test failure.

## The permissioned step

Everything above is a permissionless `CREATE2` call through the keyless factory at
`0x0000000000ffe8b47b3e2130213b802212439497`, and none of it changes live behavior. A newly
deployed factory is inert: `createEngineContract` ends by calling `registerContract` on
`CoreRegistryV1`, which is `Ownable` with a single owner, so only the factory that owns the
registry can create Engine contracts.

The cutover is therefore one Safe batch per network, sent by the Deployer Safe that owns the
outgoing factory:

1. `outgoingFactory.transferCoreRegistryOwnership(newFactory)`
2. `outgoingFactory.abandon()` — one-way

Build it with `2_build-handoff-txs.ts`, which simulates both calls from the Safe and refuses to
emit a batch unless the new factory carries over the outgoing factory's `owner`, `coreRegistry`,
`defaultBaseURIHost` and `universalBytecodeStorageReader` unchanged.

Notes on this step:

- **Ordering is not load-bearing and the switch is reversible.** The new factory's owner is the
  same Safe, and it exposes the same `transferCoreRegistryOwnership`, so ownership can be handed
  back to any address if something is wrong. `abandon()` on the outgoing factory is the only
  irreversible part, and it is a belt-and-braces measure: after step 1 the outgoing factory's
  `createEngineContract` reverts at `registerContract` anyway. Pass `SKIP_ABANDON=true` to omit
  it.
- **There is a window with no working factory** between step 1 executing and `constants.ts` being
  updated. Nothing breaks — existing contracts, minters and the registry are untouched — but no
  new Engine contract can be deployed with the repo as checked in. Keep the window short by
  landing the `constants.ts` change right after the batch executes.
- **`CoreRegistryV1` is OpenZeppelin 4.7 `Ownable`**, not `Ownable2Step`. Ownership moves in one
  transaction with no acceptance step, so a wrong address in step 1 would strand the registry.
  The script only ever passes an address it has read a matching `EngineFactoryV0` configuration
  from.
- **The registry itself is not redeployed**, so every already-registered contract stays
  registered and the shared minter filter needs no change.

## Per-network checklist

Deployer Safes, from [`INFRASTRUCTURE.md`](../../../../../INFRASTRUCTURE.md); confirm each with
`0_inspect.ts` rather than trusting this table.

| Environment | Network  | `NODE_ENV` | Outgoing factory (v004)                      | Deployer Safe                                |
| ----------- | -------- | ---------- | -------------------------------------------- | -------------------------------------------- |
| mainnet     | mainnet  | `prod`     | `0x00000067f7CE2C47f295b2DE3485a796d2FC058f` | `0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA` |
| arbitrum    | arbitrum | `prod`     | `0x000000672BF0ff9F0506ed6206772612dd7A798B` | `0xD3bE6e30D901fa2e2Fd7f3Ebd23189f5376a4f9D` |
| base        | base     | `prod`     | `0x0000006712ebceb6d73e1f33d70c603b1d090d30` | `0x62F8fa18C079C20743F45E74925F80658c68f7b3` |
| shape       | shape    | `prod`     | `0x69Ee773e7DC7386581aFAAacd345113e34238806` | `0x279c2BEE983b73ba4035Ef5c8aD059CF2d0DB848` |
| staging     | sepolia  | `staging`  | `0x00000006741521Ccd80EEd7BfA8bDbe542B425Cf` | `0x62DC3F6C7Bf5FA8A834E6B97dee3daB082873600` |
| dev         | sepolia  | `dev`      | `0x004493006600aDB55FA95244ED29000B2D00F200` | `0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8` |

Roll out to `dev`, then `staging`, then the production networks. Between staging and production,
deploy one Engine and one Engine Flex contract from the new staging factory and exercise
`configureProjectTransferHook` / `lockProjectTransferHook` end to end, including through the
subgraph — that is the only way the off-chain stack gets tested against a real v3.3 core before
mainnet.

Preparation, once, before any network — **complete**:

- [x] Phase 1 salts mined, verified, recorded in `MINED_SALTS`
- [x] Phase 2 salts mined against the phase 1 addresses, verified, recorded
- [x] `0_inspect.ts` run against all six networks to capture factory state
- [x] Phase 3 salts mined per network against those snapshots, verified, recorded in
      `FACTORY_SALTS` and `NEW_FACTORIES`

Deployment — **complete on all six environments**:

- [x] `1_prepare-deployments.ts` re-run without `PREDICT_ONLY` on every network — every phase
      reported its recorded address, and all six phase 3 initcode hashes matched what their salts
      were mined against, confirming no drift in `owner` or `defaultBaseURIHost`
- [x] Phases 1–3 deployed on all five chains and verified on every explorer
- [x] Deployment records written to this directory, and to `deployments/libs/` and
      `deployments/engine/V3/transfer-hooks/`
- [x] Handoff batches built by `2_build-handoff-txs.ts` for all six environments — each validated
      the new factory field-by-field against the one it replaces and simulated both calls from the
      Safe

Cutover — **not started**, and deliberately after the off-chain work:

- [ ] Handoff batch executed by the Deployer Safe
- [ ] `3_verify.ts` passes
- [ ] `MAIN_CONFIG` in `scripts/util/constants.ts` points at the new factory
- [ ] `INFRASTRUCTURE.md` diagram updated, outgoing factory moved to the deprecated table, v3.2.9 /
      v3.2.10 implementations moved to the deprecated table

Until the handoff, every network still creates Engine contracts from its v004 factory on
v3.2.9/v3.2.10. The v3.3 contracts are deployed and inert; nothing an artist or collector can see
has changed.

## Repo-wide follow-ups, once every network is done

- [x] `INFRASTRUCTURE.md`: `V3EngineLib`, `V3TransferHookLib`, `OwnerHistoryTransferHook` and the
      two v3.3 implementations added to the unpermissioned table. The v3.2.9/v3.2.10
      implementations stay listed until the handoff, because they are still the ones being cloned.
- [x] `README.md`: keyless-create2 section names the new libraries and the reference hook.
- [x] `deployments/libs/`: `V3EngineLib_0.md` and `V3TransferHookLib_0.md`.
- [x] `deployments/engine/V3/transfer-hooks/OwnerHistoryTransferHook.md`.
- [ ] Publish `@artblocks/contracts` — the changeset for v3.3 is in `.changeset/`. The subgraph
      generates its ABIs from that npm package (`abis/_generate-abis.sh` reads
      `node_modules/@artblocks/contracts`), pinned at `1.3.2`, which predates transfer hooks. No
      downstream indexing work can start until a version carrying the new events is published.
- [x] Re-mine the emptied studio salt files against the v005 factory and the v3.3
      implementations, and repopulate them (see below).

## Gotchas

### The pre-mined studio salt files have been emptied

`deployments/engine/V3/studio/<network>/_ENGINE_efficient_addresses_*.txt` and `_FLEX_*.txt`
map a salt to the address it is claimed to produce. A clone's address is
`CREATE2(factory, salt, keccak(ERC-1167 initcode containing the implementation))`, so those
files are only valid for one specific factory _and_ implementation pair.

They were already invalid before this rollout: none of the sampled entries reproduces its
claimed address under any factory/implementation pair this repo has deployed, and cross-checking
every salt in the mainnet files against every salt used in a studio deployment config finds zero
overlap — they had never been used. This rollout would have invalidated them a second time over,
since both the factory and the implementations change.

The eight files have been re-mined against the v005 factory and the v3.3 implementations and
repopulated: 50 salts each, every one landing at an address with at least three leading zero
bytes. Each was verified locally against `CREATE2(factory, salt, keccak(clone initcode))`, and
one salt per network was additionally checked against that factory's own
`predictDeterministicAddress` on chain.

### Etherscan verification needs the library links

Both implementations are verified with the same `libraries` map used to build their initcode.
The Flex core's map includes the _reused_ `V3FlexLib` at `0x00000000Db6f2EBe…`, not a fresh
deployment. `scripts/create2-deploy/` queues verification automatically with the map from its
config; a manual `scripts/verify.ts` run needs it supplied.

### Shape verifies through Blockscout

`shapescan.xyz` is a Blockscout instance rather than Etherscan, already configured in
`hardhat.config.ts`. Shape's v004 factory was deployed with a deployer-prefixed salt and has no
vanity prefix; there is no requirement for v005 to match any particular shape.

## Downstream, after the contracts are live

Out of scope for this repo, tracked here so the on-chain surface is not changed after the
off-chain work starts:

- **Events.** The rollout adds `ProjectTransferHookUpdated(uint256 indexed, address indexed)`
  and `ProjectTransferHookLocked(uint256 indexed, address indexed)` on the Engine interface,
  plus `ProjectUpdated` with the new `FIELD_PROJECT_TRANSFER_HOOK` (17) and
  `FIELD_PROJECT_TRANSFER_HOOK_LOCKED` (18) enum values, which the subgraph already decodes
  numerically for v3.2+ cores.
- **The four-week auto-lock has no event**, and cannot have one: it is the passage of time, not
  a transaction. A consumer derives it the same way it derives the existing project script lock
  — `locked = explicitlyLocked || (hook == address(0) && !projectUnlocked)`, where
  `projectUnlocked` is false once a completed project is more than four weeks past
  `completedAt`. `projectTransferHookConfig(projectId)` returns the already-derived pair on
  chain, so an indexer that would rather not reimplement the rule can read it.
