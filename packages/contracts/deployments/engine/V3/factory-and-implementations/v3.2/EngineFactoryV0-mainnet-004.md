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
    "0x2eE7B9bB2E038bE7323A119701A191c030A61ec6", // core registry
    "0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA", // owner of this factory
    "https://token.artblocks.io/1/", // token uri host + chain id
    "0x000000000000A791ABed33872C44a3D215a3743B", // universal bytecode storage reader
  ],
  libraries: {},
};
```

## Results:

salt: `0x00df4e8d293d57718aac0b18cbfbe128c5d484ef4a78dbc5fea21c7ed4270005`
Deployed to address: `https://etherscan.io/tx/0x43cfbc5eab66ce1f0a503c2116eea688bfd0b61be49c2b41cf5c7fb2b342daf8`

### Deployment transactions:

- https://etherscan.io/tx/0x43cfbc5eab66ce1f0a503c2116eea688bfd0b61be49c2b41cf5c7fb2b342daf8
