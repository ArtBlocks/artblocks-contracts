# Deployments: EngineFactoryV0, v005 (base)

## Description

The keyless create2 factory was used to deterministically deploy the EngineFactoryV0 that clones the
core v3.3 implementations, replacing the v004 factory at `0x0000006712ebceb6d73e1F33d70C603B1D090d30`.

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
    "0xe2bC24f74ed326CA4deB75753942731A566ebC83", // core registry
    "0x62F8fa18C079C20743F45E74925F80658c68f7b3", // owner of this factory (Deployer Safe)
    "https://token.artblocks.io/8453/", // token uri host + chain id
    "0x00000000000E85B0806ABB37B6C9d80A7100A0C5", // universal bytecode storage reader
  ],
  libraries: {},
};
```

## Results:

salt: `0x000000000000000000000000000000000000000058be3e8927289424402800c0`
Deployed to address: `0x000000003baa376C3d7B7E757e89B195815D8006`

### Deployment transaction:

- https://basescan.org/tx/0xed383d17236fdcae52c7ba51d5552192be7e834332fb3268f7b2ac8d57ce5a5e

### Handoff

This factory is inert until it owns the Core Registry at `0xe2bC24f74ed326CA4deB75753942731A566ebC83`. The handoff is a
single Safe batch sent by `0x62F8fa18C079C20743F45E74925F80658c68f7b3`, built by
`scripts/engine/V3/factory-upgrade/2_build-handoff-txs.ts`:

1. `0x0000006712ebceb6d73e1F33d70C603B1D090d30.transferCoreRegistryOwnership(0x000000003baa376C3d7B7E757e89B195815D8006)`
2. `0x0000006712ebceb6d73e1F33d70C603B1D090d30.abandon()` — one-way
