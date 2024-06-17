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
    "0x2eE7B9bB2E038bE7323A119701A191c030A61ec6", // core registry
    "0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA", // owner of this factory
    "https://token.artblocks.io/", // token uri host
    "0x000000000000A791ABed33872C44a3D215a3743B", // universal bytecode storage reader
  ],
  libraries: {},
};
```

## Results:

salt: `0x00df4e8d293d57718aac0b18cbfbe128c5d484efc311c6c8db72927e03030080`
Deployed to address: `0x000000004058B5159ABB5a3Dd8cf775A7519E75F`

### Deployment transactions:

- https://etherscan.io/tx/
