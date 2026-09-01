# Deployments: EngineFactoryV0, v005 (shape)

## Description

The keyless create2 factory was used to deterministically deploy the EngineFactoryV0 that clones the
core v3.3 implementations, replacing the v004 factory at `0x69Ee773e7DC7386581aFAAacd345113e34238806`.

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
    "0x440E1B5A98332BcA7564DbffA4146f976CE75397", // core registry
    "0x279c2BEE983b73ba4035Ef5c8aD059CF2d0DB848", // owner of this factory (Deployer Safe)
    "https://token.artblocks.io/360/", // token uri host + chain id
    "0x25eFD6E38Bd12f97C997696eEE07f5d587CE1FdA", // universal bytecode storage reader
  ],
  libraries: {},
};
```

## Results:

salt: `0x00000000000000000000000000000000000000004e8cd0a96d159eaeea210060`
Deployed to address: `0x00000000498832081b5827d11AFbBD0ee8C9f2D8`

### Deployment transaction:

- https://shapescan.xyz/tx/0x39cb43469de5070b0b483578a83916050fc4eb57d7934a592b5dc67613346d1a

### Handoff

This factory is inert until it owns the Core Registry at `0x440E1B5A98332BcA7564DbffA4146f976CE75397`. The handoff is a
single Safe batch sent by `0x279c2BEE983b73ba4035Ef5c8aD059CF2d0DB848`, built by
`scripts/engine/V3/factory-upgrade/2_build-handoff-txs.ts`:

1. `0x69Ee773e7DC7386581aFAAacd345113e34238806.transferCoreRegistryOwnership(0x00000000498832081b5827d11AFbBD0ee8C9f2D8)`
2. `0x69Ee773e7DC7386581aFAAacd345113e34238806.abandon()` — one-way
