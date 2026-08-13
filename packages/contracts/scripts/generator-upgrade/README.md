# Upgrading the on-chain generator

Tooling for rolling a new `GenArt721GeneratorV0` implementation out to every network
that has a generator proxy.

## Topology

The generator exists on **two chains only**. Arbitrum, Base, Shape, and Hoodi have
`UniversalBytecodeStorageReader` and engine infrastructure but no generator proxy.

| Environment | Proxy | ProxyAdmin | Owner |
| --- | --- | --- | --- |
| sepolia dev | `0x705E55FCD5CB00eB727213aa777C914B814817Be` | `0xb71b829185159AB5B26D7F0BB7f991D0E17d5a7a` | Safe `0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8` (1-of-1) |
| sepolia staging | `0xdC862938cA0a2D8dcabe5733C23e54ac7aAFFF27` | `0xb71b829185159AB5B26D7F0BB7f991D0E17d5a7a` | same Safe |
| mainnet | `0x953D288708bB771F969FCfD9BA0819eF506Ac718` | `0x5705023921B577e5BAeFF66f1fC7d52f5ccF1232` | Safe `0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA` (2-of-4) |

**No environment can be upgraded by an EOA**, including the testnets. Every ProxyAdmin
is owned by a Safe, and a direct EOA call reverts with `Ownable: caller is not the owner`.
The sepolia Safe is 1-of-1 and its sole owner is the dev deployer, so a single signature
suffices there — but it still has to be routed through the Safe.

Both sepolia proxies share one ProxyAdmin and one Safe, so they upgrade together in a
single two-call batch.

## Flow

> The older `scripts/on-chain-generator/2_reference_upgrade-*.ts` scripts use
> `upgrades.prepareUpgrade`, which deploys a *separate* implementation at a
> non-deterministic address. Don't mix them into this rollout — they would leave a second,
> unused implementation on-chain and an address that doesn't match the other network.

Implementations are deployed through the CREATE2 factory with the **all-zero salt**,
which is permissionless on the 0age factory. That matters because mainnet and sepolia
are deployed by different EOAs — a caller-bound vanity salt would bind the address to
one deployer and produce a different address per chain. With the zero salt the
implementation lands at the same address everywhere, so the same address appears in
both Safe batches and is trivial to cross-check.

### 1. Validate

Run per network, before deploying anything. Fails loudly if the new implementation is
not storage-layout compatible with what each live proxy is currently running, and
prints the CREATE2 address the implementation will occupy.

```bash
yarn hardhat run --network sepolia scripts/generator-upgrade/1_validate-and-prepare.ts
yarn hardhat run --network mainnet scripts/generator-upgrade/1_validate-and-prepare.ts
```

### 2. Deploy the implementation

`scripts/create2-deploy/config.ts` is a scratch file that is committed empty, so add
the batch entry before running and revert it afterwards:

```ts
export const deployConfigs: DeployConfig[] = [
  {
    contractName: "GenArt721GeneratorV0",
    args: [],
    libraries: {},
    chainIds: [11155111, 1],
  },
];
```

No `proxy` field — the transparent proxies already exist and are switched over
separately, via the ProxyAdmin's Safe.

```bash
yarn create2-deploy
```

Open <http://localhost:3000>, connect the deploying wallet, and deploy on each chain.
**Leave the salt at its all-zero default** — changing it changes the address. The UI
queues Etherscan verification and appends to `deployments/create2-deployments.md`.

### 3. Build the Safe batch

```bash
yarn hardhat run --network sepolia scripts/generator-upgrade/2_build-upgrade-txs.ts
yarn hardhat run --network mainnet scripts/generator-upgrade/2_build-upgrade-txs.ts
```

Refuses to emit a batch unless the implementation is already deployed and its runtime
bytecode matches the local build, and simulates every call as if the Safe were sending
it, so a batch can never point at a stale address or fail on execution.

Writes to `deployments/generator/safe-txs/`, which is gitignored — upload the file to
the Safe's Transaction Builder app and discard it. The executed transactions are
recorded in the rollout table in
`deployments/generator/GenArt721GeneratorV0-custom-na-upgrade.md`, which is the durable
record; the batch file itself is reproducible by re-running this script.

### 4. Verify

```bash
yarn hardhat run --network sepolia scripts/generator-upgrade/3_verify-upgrade.ts
yarn hardhat run --network mainnet scripts/generator-upgrade/3_verify-upgrade.ts
```

Confirms every proxy's implementation slot, and on mainnet re-derives the HTML for the
five affected `custom@na` projects plus the PRELUDES and Crypt controls, asserting the
former are injected verbatim and the latter are still wrapped.

### 5. Sync the OpenZeppelin manifest

The proxies were upgraded outside `hardhat-upgrades`, so the manifests in
`.openzeppelin/` still record the previous implementation. Re-import them once the
upgrade has executed, and commit the result, so the next upgrade validates against the
right layout:

```bash
yarn hardhat run --network mainnet scripts/generator-upgrade/4_sync-manifest.ts
```
