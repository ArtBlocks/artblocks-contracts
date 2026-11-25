# Rolling out ABX FS dependencies

Tooling for the upgrade that makes `DependencyRegistryV0` ABX FS-only and has
`GenArt721GeneratorV0` inline dependency files from [ABX FS](https://github.com/ArtBlocks/abxfs).
The change is described in
`deployments/generator/GenArt721GeneratorV0-abxfs-dependencies.md`.

The scripts reuse the topology helpers, CREATE2 implementation checks and Safe batch builder from
`scripts/registry-driven-rendering/`. Topology is read from chain state, not configured, and
every call is simulated from the account that will send it.

## Prerequisite: the ABX FS FileDataReader

The generator and the registry read dependency files through ABX FS's FileDataReader companion
at its canonical address (`ABXFS_FILE_DATA_READER` in `config.ts`, `AbxfsCanonical` in the
contracts). Step 1 refuses to build a batch on a network where it is not deployed. It is deployed
from the ABX FS repository (`packages/contracts-companion/script/DeployDataReader.s.sol`) through
the keyless CREATE2 deployer, so any account can deploy it, and it lands at the same address on
every chain.

## 0. Rehearse on a fork

```bash
FORK_NETWORK=sepolia FORK_RPC_URL=<sepolia RPC> \
  FILE_DATA_READER_INITCODE=<FileDataReader init code, hex> \
  [FORK_BLOCK=<n>] [DUMP_DIR=<dir>] \
  yarn hardhat run scripts/abxfs-dependencies/fork-verify.ts
```

Use `FORK_NETWORK=mainnet` with a mainnet RPC for mainnet. This forks the network into the
in-process hardhat network, then:

- validates both storage layouts with OpenZeppelin;
- deploys FileDataReader on the fork if the network lacks it;
- runs both steps from the real ProxyAdmin owner and AdminACL superAdmin;
- renders every check token on every generator before, between and after the steps.

It fails unless every token is byte-identical except the one tag its dependency changes. Between
the steps, an inlined dependency's tag becomes its CDN tag. After step 2, the dependency's tag
becomes the inlined ABX FS file, which must decode to the expected library.

It also checks that:

- the registry refuses an absent CID, a directory, and a file without a codec;
- the repaired staging generator (sepolia) renders exactly what the dev generator does;
- the registry's indexed slices of the largest file decode to it.

Each render is classified against 2^24 of execution gas: EIP-8037's transaction budget (live on
sepolia, mainnet at Glamsterdam), which binds a render inside a transaction, and the limit that
Sepolia RPCs on clients without the eth_call fix (reth until it ships) still apply to `eth_call`.
The fork repeats each call with a 16,777,216 gas limit, which is the same budget, because a view
creates no state. `DUMP_DIR` writes
each token's HTML before and after, to open in a browser.

## 1. Upgrade every registry and generator proxy, in one batch

Deploy both implementations with `yarn create2-deploy` (all-zero salt — see
`scripts/registry-driven-rendering/README.md`), then:

```bash
yarn hardhat run --network <sepolia|mainnet> scripts/abxfs-dependencies/1_upgrade.ts
```

This writes one batch for the ProxyAdmin's Safe to the gitignored
`deployments/generator/safe-txs/`. The registry and generator upgrades must land together. The new
generator reads the new registry's details and FileDataReader. The deployed generator reads script
chunks that the new registry no longer stores. On sepolia, the batch covers the dev registry and
both generators.

Until step 2, dependencies render from their preferred CDN. The script lists the ones this changes
(those inlined until now) and refuses if any has no preferred CDN.

## 2. Set the ABX FS files

```bash
yarn hardhat run --network mainnet scripts/abxfs-dependencies/2_set-abxfs-files.ts
SERVE=true yarn hardhat run --network sepolia scripts/abxfs-dependencies/2_set-abxfs-files.ts
```

The script verifies each file on the network's ABX FS. Each file must be present, gzip, and decode
to the SHA-256 in `config.ts`. It then plans, from the registry's AdminACL `superAdmin`:

- one `updateDependencyAbxfsFileCid` per dependency;
- the zdog preferred-CDN pin;
- on sepolia, the staging generator's `updateScriptyBuilder` fix.

A Safe superAdmin (mainnet) gets a Transaction Builder batch. Sepolia's superAdmin is an EOA, so
the script writes the calls as JSON. With `SERVE=true` it serves a local page that sends them from
a browser wallet. Already-applied calls are skipped. Clearing a CID (setting it to zero) takes a
dependency off chain and back to its CDN.
