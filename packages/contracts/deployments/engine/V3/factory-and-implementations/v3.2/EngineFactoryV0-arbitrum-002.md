# Deployments: EngineFactoryV0

## Description

The keyless create2 factory was used to deterministically deploy the EngineFactoryV0, permissioned to deployer wallet 0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef.

_Note: The EngineFactoryV0 is intentionally deployed to different addresses on different networks/environments, due to unique constructor args._

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "EngineFactoryV0",
  args: [
    "0x00000000559cA3F3f1279C0ec121c302ed010457", // engine
    "0x000000008DD9A7CD3f4A267A88082d4a1E2f6553", // flex
    "0x5D8EFdc20272CD3E24a27DfE7F25795a107c99a2", // core registry
    "0xD3bE6e30D901fa2e2Fd7f3Ebd23189f5376a4f9D", // owner of this factory
    "https://token.arbitrum.artblocks.io/", // token uri host
    "0x000000005795aA93c8E5De234Ff0DE0000C98946", // universal bytecode storage reader
  ],
  libraries: {},
};
```

## Results:

salt: `0x00df4e8d293d57718aac0b18cbfbe128c5d484efc3b5cc7cfcd14d68ce0200e0`
Deployed to address: `0x000000007566E6566771d28E91bD465bEE8426a5`

### Deployment transaction:

- https://arbiscan.io/tx/0x0cb3ea534e6ab501f607e2260dad8c60009a0828f87a7b9e57963ae9753cd0ed
