# Rolling out a new Engine Factory

Tooling for replacing the deployed `EngineFactoryV0` when the Engine or Engine Flex
implementation changes. It was written for the v3.2 → v3.3 rollout that adds transfer
hooks, described in
[`deployments/engine/V3/factory-and-implementations/v3.3/ROLLOUT.md`](../../../../deployments/engine/V3/factory-and-implementations/v3.3/ROLLOUT.md),
and is reusable for the next implementation bump.

## Why a new implementation forces a new factory

`engineImplementation` and `engineFlexImplementation` are `immutable` on `EngineFactoryV0`.
There is no setter, by design — the factory's whole job is to clone one known-good pair of
implementations — so shipping a new core version means deploying a new factory.

A new factory is inert until it owns the `CoreRegistryV1`. `createEngineContract` finishes by
calling `registerContract` on the registry, which is `Ownable` with a single owner, so at any
moment exactly one factory can create Engine contracts. That makes the cutover one
transaction rather than a migration, and it makes ordering matter less than it first appears:
the new factory can sit deployed and unused for as long as you like.

## The three deployment phases

Each phase's addresses are inputs to the next, so they cannot be batched:

| Phase | Contracts                                               | Depends on                      | Address per                 |
| ----- | ------------------------------------------------------- | ------------------------------- | --------------------------- |
| 1     | `V3EngineLib`, `V3TransferHookLib`                      | nothing                         | one address, all networks   |
| 2     | `GenArt721CoreV3_Engine`, `GenArt721CoreV3_Engine_Flex` | phase 1 (linked libraries)      | one address, all networks   |
| 3     | `EngineFactoryV0`                                       | phase 2 (constructor arguments) | one address **per network** |

Phase 3 is per-network because the other four constructor arguments — core registry, owner,
default base URI host, and universal bytecode storage reader — differ per network. Phases 1
and 2 land at a single address everywhere only if every network deploys with the same salt
_and_ the linked library addresses match, which is why `1_prepare-deployments.ts` refuses to
compute implementation initcode against a library address with no code on the current network.

All three phases are permissionless `CREATE2` calls through the keyless factory at
`0x0000000000ffe8b47b3e2130213b802212439497`, and none of them changes any live behavior.

## Nothing about the new factory is configured

`0_inspect.ts` reads the outgoing factory and prints the new factory's constructor arguments.
Five of the six come off chain verbatim; only the two implementations change. `2_build-handoff-txs.ts`
then re-reads both factories and refuses to build a batch unless `owner`, `coreRegistry`,
`defaultBaseURIHost` and `universalBytecodeStorageReader` are byte-identical across them —
so a mistyped constructor argument is caught before signers ever see the batch, rather than
after the first Engine contract is initialized with the wrong base URI host.

What _is_ configured, in `config.ts`, is the set of addresses that do not exist yet: the
libraries, the implementations, and the per-network factories, filled in as each phase lands.

## Scripts

```bash
# 0 — read the live state the rollout has to reproduce
yarn hardhat run --network mainnet scripts/engine/V3/factory-upgrade/0_inspect.ts

# 1 — initcode + a ready-to-paste create2-deploy config, for whichever phase is ready
yarn hardhat run --network mainnet scripts/engine/V3/factory-upgrade/1_prepare-deployments.ts
PHASE=2 yarn hardhat run --network mainnet scripts/engine/V3/factory-upgrade/1_prepare-deployments.ts

# 2 — the Safe batch (transferCoreRegistryOwnership + abandon)
yarn hardhat run --network mainnet scripts/engine/V3/factory-upgrade/2_build-handoff-txs.ts

# 3 — verify, after the batch executes
yarn hardhat run --network mainnet scripts/engine/V3/factory-upgrade/3_verify.ts
```

Sepolia hosts both `dev` and `staging`, so on sepolia every script needs `NODE_ENV` to pick
one — the same selector the `deploy:v3-engine:*` package scripts use:

```bash
NODE_ENV=staging yarn hardhat run --network sepolia scripts/engine/V3/factory-upgrade/0_inspect.ts
```

`SKIP_ABANDON=true` omits the second call from the handoff batch. Abandoning is one-way and is
belt-and-braces: after ownership moves, `createEngineContract` on the outgoing factory reverts
at its `registerContract` call regardless.

Batches are written to the gitignored `deployments/engine/V3/factory-and-implementations/safe-txs/`.
They are throwaway artifacts — re-running the script reproduces them.

## RPC configuration

`0_inspect.ts`, the non-`PREDICT_ONLY` runs of `1_prepare-deployments.ts`, `2_build-handoff-txs.ts`
and `3_verify.ts` all read chain state, so every network needs a working
`*_JSON_RPC_PROVIDER_URL` in `.env`. Two are easy to trip over:

- **shape** — `SHAPE_MAINNET_JSON_RPC_PROVIDER_URL` is in `.env.example` but is often unset
  locally, which surfaces as `could not detect network`. `https://mainnet.shape.network` works.
- **arbitrum** — a rate-limited provider surfaces as `missing revert data in call exception`
  wrapping a quota message, not as an obvious RPC error. `https://arb1.arbitrum.io/rpc` works.

Either can be overridden for one command without touching `.env`:

```bash
SHAPE_MAINNET_JSON_RPC_PROVIDER_URL=https://mainnet.shape.network \
  yarn hardhat run --network shape scripts/engine/V3/factory-upgrade/0_inspect.ts
```

## Salts are mined out of band

`1_prepare-deployments.ts` produces initcode hashes; mining a salt for a vanity address is a
separate job (`create2crunch` or equivalent). Two conventions are in use in this repo, and the
`ImmutableCreate2Factory` enforces the difference:

- **Zero-prefixed salt** (`0x0000…`) — anyone may deploy to the resulting address. Used for
  `V3FlexLib`, `PMPV1`, and everything in the v3.3 rollout.
- **Deployer-prefixed salt** (`0x00df4E8d…`, the deployer EOA) — only that EOA may deploy to
  the resulting address. Used for the v3.2 implementations and factories.

v3.3 uses zero-prefixed salts throughout. Restricting the sender buys nothing here: front-running
a CREATE2 deploy reproduces the _identical_ contract, since the address is a function of the
initcode, and every one of these contracts is either stateless or owned by an address fixed in
its constructor arguments. Zero-prefixing keeps each contract reproducible on a new chain by
anyone.

Salts are recorded in `MINED_SALTS` and `FACTORY_SALTS` in `config.ts`, and every run of
`1_prepare-deployments.ts` re-derives the address from `salt + initcode hash` and throws if it
no longer matches the recorded address. A salt is only valid for the exact initcode it was mined
against, and the phases chain — implementations link the libraries, factories take the
implementations as constructor arguments — so one changed byte invalidates everything downstream
of it. That check is what turns the chain into a single failure rather than a silent one.

## After the rollout

`3_verify.ts` prints the two edits that make the new factory the one the deploy scripts use —
`MAIN_CONFIG` in `scripts/util/constants.ts` and the diagrams in `INFRASTRUCTURE.md` — and it
keeps checking the outgoing factory until `constants.ts` is updated. Until that edit lands,
`deploy:v3-engine:*` still targets the old factory and fails its own core-registry ownership
check, which is the intended failure mode: loud, before anything is deployed.
