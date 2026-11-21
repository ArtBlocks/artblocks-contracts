# Rolling out ABX FS dependencies

Tooling for letting `GenArt721GeneratorV0` inline dependency libraries stored on
[ABX FS](https://github.com/ArtBlocks/abxfs) instead of loading them from a CDN. The change
itself is described in
`deployments/generator/GenArt721GeneratorV0-abxfs-dependencies.md`.

## Steps

The rollout reuses the topology helpers, CREATE2 implementation checks and Safe batch builder
from `scripts/registry-driven-rendering/`, so topology is read from chain state rather than
configured, and every call is simulated from the account that will send it.

### 0. Rehearse on a fork (optional, recommended)

```bash
FORK_RPC_URL=<mainnet RPC> [FORK_BLOCK=<n>] [DUMP_DIR=<dir>] \
  yarn hardhat run scripts/abxfs-dependencies/fork-verify.ts
```

Forks mainnet into the in-process hardhat network, validates both storage layouts with
OpenZeppelin, applies the whole rollout locally from the real ProxyAdmin owner and AdminACL
superAdmin, and renders one live token per dependency at each step. It fails unless every
untouched token stays byte-identical and every switched token's only change is its CDN tag
becoming the inlined ABX FS file, and it prints render gas against common RPC caps. Execution is
local, so a public RPC with a low `eth_call` gas cap works as `FORK_RPC_URL`; a first run reads a
lot of state through it (about 30 minutes on a public endpoint), and re-runs at the same pinned
`FORK_BLOCK` come from hardhat's fork cache. `DUMP_DIR` writes each token's HTML before and after,
to open in a browser.

### 1. Upgrade the registry, then the generator

Deploy both implementations with `yarn create2-deploy` (all-zero salt — see
`scripts/registry-driven-rendering/README.md`), then:

```bash
yarn hardhat run --network mainnet scripts/abxfs-dependencies/1_upgrade.ts
```

Writes two batches for the ProxyAdmin's Safe to the gitignored
`deployments/generator/safe-txs/`. **Execute the registry batch first.** The order matters in one
direction only: the new generator cannot decode the old registry's `getDependencyDetailsV2`, but
the deployed generator decodes the new registry's struct correctly (the new field is trailing).
Neither upgrade changes any output.

### 2. Set the ABX FS files

```bash
yarn hardhat run --network mainnet scripts/abxfs-dependencies/2_set-abxfs-files.ts
```

Verifies each file on the network's ABX FS — present, gzip, decodes to the SHA-256 in
`config.ts` — then writes one batch for the registry's AdminACL `superAdmin` with an
`updateDependencyAbxfsFileCid` call per dependency, plus the zdog preferred-CDN pin. Already
applied calls are skipped. Each call can be applied independently, and clearing a CID (setting it
to zero) returns a dependency to its CDN.

The AB500 files are not on Ethereum Sepolia's ABX FS, so step 2 refuses on sepolia. Step 1 is
harmless there.
