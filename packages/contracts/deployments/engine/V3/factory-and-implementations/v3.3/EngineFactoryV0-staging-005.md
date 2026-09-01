# Deployments: EngineFactoryV0, v005 (staging)

## Description

The keyless create2 factory was used to deterministically deploy the EngineFactoryV0 that clones the
core v3.3 implementations, replacing the v004 factory at `0x00000006741521Ccd80EEd7BfA8bDbe542B425Cf`.

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
    "0xdAe755c2944Ec125a0D8D5CB082c22837593441a", // core registry
    "0x62DC3F6C7Bf5FA8A834E6B97dee3daB082873600", // owner of this factory (Deployer Safe)
    "https://token.staging.artblocks.io/11155111/", // token uri host + chain id
    "0x000000069EbaecF0d656897bA5527f2145560086", // universal bytecode storage reader
  ],
  libraries: {},
};
```

## Results:

salt: `0x0000000000000000000000000000000000000000c1cee9156aaeb892181d0040`
Deployed to address: `0x000000007c4b0a672854cEC09812aE3564aA57a6`

### Deployment transaction:

- https://sepolia.etherscan.io/tx/0x90f4ed31449c6ea9d4b6cae0eaddcb609ab1a0a46b40af93cb93f2f2591d4efc

### Handoff

This factory is inert until it owns the Core Registry at `0xdAe755c2944Ec125a0D8D5CB082c22837593441a`. The handoff is a
single Safe batch sent by `0x62DC3F6C7Bf5FA8A834E6B97dee3daB082873600`, built by
`scripts/engine/V3/factory-upgrade/2_build-handoff-txs.ts`:

1. `0x00000006741521Ccd80EEd7BfA8bDbe542B425Cf.transferCoreRegistryOwnership(0x000000007c4b0a672854cEC09812aE3564aA57a6)`
2. `0x00000006741521Ccd80EEd7BfA8bDbe542B425Cf.abandon()` — one-way
