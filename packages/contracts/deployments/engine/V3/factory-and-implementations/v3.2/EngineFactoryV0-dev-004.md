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
    "0xfeA4f2f4E45c255ceE626a1A994BB214039c2B9A", // core registry
    "0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8", // owner of this factory
    "https://token.dev.artblocks.io/11155111/", // token uri host + chain id
    "0x000000069EbaecF0d656897bA5527f2145560086", // universal bytecode storage reader
  ],
  libraries: {},
};
```

## Results:

salt: `0x00df4e8d293d57718aac0b18cbfbe128c5d484ef51bb473faf8400dfe5080004`
Deployed to address: `0x004493006600aDB55FA95244ED29000B2D00F200`

### Deployment transaction:

- https://sepolia.etherscan.io/tx/0x398f8c5fa79a42ae0cad1ea6152457bf503b402f0743abd916e98b3f1e1492cf
