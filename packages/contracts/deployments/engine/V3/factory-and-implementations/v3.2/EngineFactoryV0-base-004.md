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
    "0xe2bC24f74ed326CA4deB75753942731A566ebC83", // core registry
    "0x62F8fa18C079C20743F45E74925F80658c68f7b3", // owner of this factory
    "https://token.artblocks.io/8453/", // token uri host + chain id
    "0x00000000000E85B0806ABB37B6C9d80A7100A0C5", // universal bytecode storage reader
  ],
  libraries: {},
};
```

## Results:

salt: `0x00df4e8d293d57718aac0b18cbfbe128c5d484ef960c927f6455f6ade9110078`
Deployed to address: `0x0000006712ebceb6d73e1f33d70c603b1d090d30`

### Deployment transaction:

- https://basescan.org/tx/0xec85697f0d330cd4e45d06cf82302c5edcf839c223de06b8d7dcd8a3f3e1f08a
