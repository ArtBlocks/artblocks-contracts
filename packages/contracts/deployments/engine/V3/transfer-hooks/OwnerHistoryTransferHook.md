# Deployments: OwnerHistoryTransferHook

## Description

First-party `ITransferHook` reference implementation, shipped with core v3.3. Records on chain every owner a token has had, readable by other contracts including an artwork's own script through the on-chain generator.

One deployment serves every project on every v3.3+ core on the network. It has no owner, no allowlist and nothing to configure — an artist opts a project in with `configureProjectTransferHook`, and may make that permanent with `lockProjectTransferHook`. It is inert until a project points at it.

The keyless create2 factory was used to deterministically and permissionlessly deploy the contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "OwnerHistoryTransferHook",
  args: [],
  libraries: {},
};
```

> Gas: measured against an otherwise identical project with no hook, a transfer costs ~48,400 more
> and a mint ~88,800 more. See `contracts/V3_ENGINE_CHANGELOG.md`.

## Results:

salt: `0x0000000000000000000000000000000000000000e732a9f0bd54b03294010080`
Deploys to address: `0x00000000cb60788043f4F779bfC192F1c5bd09FA`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0xf82ad8982aed1b3d55b0320e7699532d80a11acf700e204038fa798e5d4146df
- shape: https://shapescan.xyz/tx/0xb2812a2701cec7a6985acd6d69ae2d85b976b35908a5adab4271ad6ab56281f7
- base: https://basescan.org/tx/0xef794ffced0ce7894dde48d486f963fdb2ebcc78643d54fc98395758e4bd6aa6
- arbitrum: https://arbiscan.io/tx/0x746f226178065395098d2b3fa970fa09e09e13ac0a3a3f0219135a113de5fe5a
- mainnet: https://etherscan.io/tx/0x3353a38c669bd4d30dc54277ad584e8bd0993f7775ba2c075fd52e2e8d462c9a
