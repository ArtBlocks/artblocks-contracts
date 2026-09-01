# Deployments: EngineFactoryV0, v005 (mainnet)

## Description

The keyless create2 factory was used to deterministically deploy the EngineFactoryV0 that clones the
core v3.3 implementations, replacing the v004 factory at `0x00000067f7CE2C47f295b2DE3485a796d2FC058f`.

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
    "0x2eE7B9bB2E038bE7323A119701A191c030A61ec6", // core registry
    "0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA", // owner of this factory (Deployer Safe)
    "https://token.artblocks.io/1/", // token uri host + chain id
    "0x000000000000A791ABed33872C44a3D215a3743B", // universal bytecode storage reader
  ],
  libraries: {},
};
```

## Results:

salt: `0x00000000000000000000000000000000000000000623ffa546602abdf60100c0`
Deployed to address: `0x00000000a337ce098Bf11265176a2bDDA1f41060`

### Deployment transaction:

- https://etherscan.io/tx/0xd1ea918d20448ba4b54c72b640b67b00c4ce2e5b20b1d20c2cb3450f72c9fe8f

### Handoff

This factory is inert until it owns the Core Registry at `0x2eE7B9bB2E038bE7323A119701A191c030A61ec6`. The handoff is a
single Safe batch sent by `0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA`, built by
`scripts/engine/V3/factory-upgrade/2_build-handoff-txs.ts`:

1. `0x00000067f7CE2C47f295b2DE3485a796d2FC058f.transferCoreRegistryOwnership(0x00000000a337ce098Bf11265176a2bDDA1f41060)`
2. `0x00000067f7CE2C47f295b2DE3485a796d2FC058f.abandon()` — one-way
