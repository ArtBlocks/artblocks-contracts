# Deployments: FormPaletteBindingHooks

## Description

Combined hook: a transfer hook, a PostParams configure hook, and a PostParams read-augment hook in
one contract. Binds one token of a palette project to one token of a form project, 1:1, while both
are held by the same wallet. Either token changing hands breaks the pairing and re-renders the form
token.

The contract is also the registry and resolver for palette data. The form project's artist registers
a palette project together with its complete palette list, written once via SSTORE2 and immutable
afterwards. The hook resolves which entry each palette token receives, as
`uint256(tokenIdToHash) % paletteCount`, and injects it as `paletteData` on both the form and the
palette side. Neither art script derives a palette, so neither needs updating when a collection is
added, and both may be locked.

Unlike `MintTimeAndTransferCountHooks`, this is **not** a shared singleton. Each deployment is bound
in its constructor to one form project, so it serves that project only. Palette projects may live on
any core contract and are added after deployment.

- Source: `contracts/web3call/combined-hooks/FormPaletteBindingHooks.sol`
- Interface: `contracts/interfaces/v0.8.x/IFormPaletteBindingHooks.sol`
- Artist setup directions: [`FormPaletteBindingHooks-artist-guide.md`](../../../../contracts/web3call/combined-hooks/FormPaletteBindingHooks-artist-guide.md)
- Bound PMP: PMPV1 (see [`PMPV1-deployment.md`](../../PMPV1-deployment.md))

Constructor arguments are `(pmp, formCore, formProjectId)`.

## Deployment

The keyless create2 factory is used, via the `scripts/create2-deploy/` tooling. Because each
deployment serves a single project on a single chain, there is no reason to mine a vanity salt or to
deploy the same address across chains. A zero salt is fine.

Add this entry to `scripts/create2-deploy/config.ts`, then run
`yarn hardhat run scripts/create2-deploy/index.ts` and drive the local UI:

```typescript
export const deployConfigs: DeployConfig[] = [
  {
    contractName: "FormPaletteBindingHooks",
    args: [
      "0x00000000B9D3B2461fcFd5D23FCA65227B770f67", // PMPV1, sepolia-staging
      "0x3747a7c0959177b31dd91d20d00652de304011d9", // Engine Flex v3.3.1 core
      14, // form project ID
    ],
    libraries: {},
    chainIds: [11155111], // sepolia
    salt: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
];
```

With a zero salt, CREATE2 puts that entry at a deterministic address:

|                   |                                                                      |
| ----------------- | -------------------------------------------------------------------- |
| initcode hash     | `0x382805bee45e80ef1913469161cca232c6f9b162865561ed0a0ec96771ce162f` |
| predicted address | `0xd5C1aaFF09e7E0C246107a3CFeAa66bE4b5088c9`                         |

Confirm the UI reports the same address before broadcasting. A mismatch means the
initcode changed, so the contract or its constructor arguments are not what this
document describes.

PMPV1 addresses:

| Environment                                       | PMPV1                                        |
| ------------------------------------------------- | -------------------------------------------- |
| mainnet, Arbitrum, Base, Shape, Sepolia (staging) | `0x00000000B9D3B2461fcFd5D23FCA65227B770f67` |
| Sepolia (dev)                                     | `0xb380B5c5A1d98Ebcc669feF89bCe0B3db1f36292` |

Verify the contract on the block explorer as part of deployment. Registering palette projects is a
direct call to the hook, so without a verified contract there is no write form to use.

## Post-deployment setup

The hook does nothing until the form project and each palette project are wired to it. Both
checklists live in the
[artist guide](../../../../contracts/web3call/combined-hooks/FormPaletteBindingHooks-artist-guide.md).
In short: configure the `boundPaletteRef` parameter on the form project with the hook as its auth
address and no lock date, set the hook as the form project's post-config hook, read augmentation
hook and transfer hook, then for each palette project call `registerPaletteProject` and set the hook
as that project's read augmentation hook and transfer hook.

**Register a palette project before its first token mints.** A palette token's image renders at
mint, and palette projects carry no PostParam, so nothing exists to write afterward that would
trigger a re-render. This is the only step in the setup with no recovery.

## Verification

`scripts/web3call/verify-form-palette-binding-hooks.ts` checks every requirement against the live
PMP and core contracts, for the form project and for every registered palette project. Set
`HOOK_ADDRESS` at the top and run:

```bash
yarn hardhat run scripts/web3call/verify-form-palette-binding-hooks.ts --network sepolia
```

It exits non-zero if anything is missing. Run it before any palette project mints.

## Results

| Environment     | Chain ID | Form project                                     | Hook address                                 | Deployment tx                                                                                                                 |
| --------------- | -------- | ------------------------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| sepolia-staging | 11155111 | `0x3747a7C0959177B31dd91D20D00652de304011d9` #14 | `0xd5C1aaFF09e7E0C246107a3CFeAa66bE4b5088c9` | [`0x31f4ea9a...d78fd71a`](https://sepolia.etherscan.io/tx/0x31f4ea9a86338e015742cafc9d698355582f4dc00b52d277db1b8eb2d78fd71a) |

Staging form project 14 is the Engine Flex v3.3.1 core's project 14, artist
`0xB3B212da1F50DE8eCDE59C932e36DF7aFb6319cB`. Project 10 on the same core is the
palette project for the staging run.

Registration and every dashboard step must come from the artist wallet, since
`registerPaletteProject` reads `projectIdToArtistAddress(formProjectId)` live
from the core and the PMP and core configuration calls are artist-gated too.
Deployment itself is permissionless.
