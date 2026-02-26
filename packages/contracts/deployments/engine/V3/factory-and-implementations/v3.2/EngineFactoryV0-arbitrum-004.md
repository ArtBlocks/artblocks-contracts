# Deployments: EngineFactoryV0, v004

## Description

The keyless create2 factory was used to deterministically deploy the EngineFactoryV0

_Note: The EngineFactoryV0 is intentionally deployed to different addresses on different networks/environments, due to unique constructor args._

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "EngineFactoryV0",
  args: [
    "0x00000000f10424506961445f935ec76579e0769F", // engine
    "0x000000000132CFBeC18C143aB0AaD021B1fDEA13", // flex
    "0x5D8EFdc20272CD3E24a27DfE7F25795a107c99a2", // core registry
    "0xD3bE6e30D901fa2e2Fd7f3Ebd23189f5376a4f9D", // owner of this factory
    "https://token.artblocks.io/42161/", // token uri host + chain id
    "0x000000005795aA93c8E5De234Ff0DE0000C98946", // universal bytecode storage reader
  ],
  libraries: {},
};
```

## Results:

salt: `0x00df4e8d293d57718aac0b18cbfbe128c5d484eff9b0bf5537cd1ea75e120040`
Deployed to address: `0x000000672BF0ff9F0506ed6206772612dd7A798B`

### Deployment transaction:

- https://arbiscan.io//tx/0x0fbf313ecae9ae6265df358c35f05591b9b9a8d433254e4ba078b9e2f814744c
