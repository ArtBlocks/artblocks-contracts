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
      "<PMP address>", // PMPV1 for the target environment
      "<form core contract>", // core hosting the form project
      0, // form project ID
    ],
    libraries: {},
    chainIds: [11155111], // sepolia
    salt: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
];
```

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

<!-- Fill in per deployment. -->

| Environment | Chain ID | Form project | Hook address | Deployment tx |
| ----------- | -------- | ------------ | ------------ | ------------- |
|             |          |              |              |               |
