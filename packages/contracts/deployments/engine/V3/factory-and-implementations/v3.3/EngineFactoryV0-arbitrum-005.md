# Deployments: EngineFactoryV0, v005 (arbitrum)

## Description

The keyless create2 factory was used to deterministically deploy the EngineFactoryV0 that clones the
core v3.3 implementations, replacing the v004 factory at `0x000000672BF0ff9F0506ed6206772612dd7A798B`.

_Note: The EngineFactoryV0 is intentionally deployed to different addresses on different networks/environments, due to unique constructor args._

Every argument other than the two implementations is carried over unchanged from the outgoing
factory, read from its live state rather than transcribed.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "EngineFactoryV0",
  args: [
    "0x00000000E8227826CB865a4ee37B1300C6b6120E", // engine implementation (v3.3.0)
    "0x00000000824067A9E7fcB6CB084eCcd8f3Cb8399", // engine flex implementation (v3.3.1)
    "0x5D8EFdc20272CD3E24a27DfE7F25795a107c99a2", // core registry
    "0xD3bE6e30D901fa2e2Fd7f3Ebd23189f5376a4f9D", // owner of this factory (Deployer Safe)
    "https://token.artblocks.io/42161/", // token uri host + chain id
    "0x000000005795aA93c8E5De234Ff0DE0000C98946", // universal bytecode storage reader
  ],
  libraries: {},
};
```

## Results:

salt: `0x000000000000000000000000000000000000000022c0c239ef16d165e5010078`
Deployed to address: `0x00000000d5dE2813d00C972eB95941196a1FafeC`

### Deployment transaction:

- https://arbiscan.io/tx/0x9780737006a6c9d531f4ccba12679df1867ac586ca9e71a7c2b6d77f07d2477c

### Handoff

This factory is inert until it owns the Core Registry at `0x5D8EFdc20272CD3E24a27DfE7F25795a107c99a2`. The handoff is a
single Safe batch sent by `0xD3bE6e30D901fa2e2Fd7f3Ebd23189f5376a4f9D`, built by
`scripts/engine/V3/factory-upgrade/2_build-handoff-txs.ts`:

1. `0x000000672BF0ff9F0506ed6206772612dd7A798B.transferCoreRegistryOwnership(0x00000000d5dE2813d00C972eB95941196a1FafeC)`
2. `0x000000672BF0ff9F0506ed6206772612dd7A798B.abandon()` — one-way
