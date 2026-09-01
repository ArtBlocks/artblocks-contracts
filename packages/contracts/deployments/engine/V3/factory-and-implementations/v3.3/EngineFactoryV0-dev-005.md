# Deployments: EngineFactoryV0, v005 (dev)

## Description

The keyless create2 factory was used to deterministically deploy the EngineFactoryV0 that clones the
core v3.3 implementations, replacing the v004 factory at `0x004493006600aDB55FA95244ED29000B2D00F200`.

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
    "0xfeA4f2f4E45c255ceE626a1A994BB214039c2B9A", // core registry
    "0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8", // owner of this factory (Deployer Safe)
    "https://token.dev.artblocks.io/11155111/", // token uri host + chain id
    "0x000000069EbaecF0d656897bA5527f2145560086", // universal bytecode storage reader
  ],
  libraries: {},
};
```

## Results:

salt: `0x00000000000000000000000000000000000000004b21b383ef40b6883b18000a`
Deployed to address: `0x00000000c031Da9C81530457C5CACdd781Efb689`

### Deployment transaction:

- https://sepolia.etherscan.io/tx/0xad8f9bd9eb1c2e73146fa22cf0efe82a8aecf998c1aed648f243970b168e8cc8

### Handoff

This factory is inert until it owns the Core Registry at `0xfeA4f2f4E45c255ceE626a1A994BB214039c2B9A`. The handoff is a
single Safe batch sent by `0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8`, built by
`scripts/engine/V3/factory-upgrade/2_build-handoff-txs.ts`:

1. `0x004493006600aDB55FA95244ED29000B2D00F200.transferCoreRegistryOwnership(0x00000000c031Da9C81530457C5CACdd781Efb689)`
2. `0x004493006600aDB55FA95244ED29000B2D00F200.abandon()` — one-way
