# Deployments: EngineFactoryV0, v004

## Description

The keyless create2 factory was used to deterministically deploy the EngineFactoryV0.

_Note: The EngineFactoryV0 is intentionally deployed to different addresses on different networks/environments, due to unique constructor args._

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "EngineFactoryV0",
  args: [
    "0x00000000f10424506961445f935ec76579e0769F", // engine
    "0x000000000132CFBeC18C143aB0AaD021B1fDEA13", // flex
    "0xdAe755c2944Ec125a0D8D5CB082c22837593441a", // core registry
    "0x62DC3F6C7Bf5FA8A834E6B97dee3daB082873600", // owner of this factory
    "https://token.staging.artblocks.io/11155111/", // token uri host + chain id
    "0x000000069EbaecF0d656897bA5527f2145560086", // universal bytecode storage reader
  ],
  libraries: {},
};
```

## Results:

salt: `0x00df4e8d293d57718aac0b18cbfbe128c5d484ef4f92f1b2e48b7a62100200b4`
Deployed to address: `0x00000006741521Ccd80EEd7BfA8bDbe542B425Cf`

### Deployment transactions:

- https://sepolia.etherscan.io/tx/0x9dfc1d0b42102e7ecb8bac4151883d8c16a6a05181f22935910aabd1a6f27141
