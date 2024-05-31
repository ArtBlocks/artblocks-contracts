# Deployments: EngineFactoryV0

## Description

The keyless create2 factory was used to deterministically deploy the EngineFactoryV0, permissioned to deployer wallet 0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef.

_Note: The EngineFactoryV0 is intentionally deployed to different addresses on different networks/environments, due to unique constructor args._

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "EngineFactoryV0",
  args: [
    "0x000000F74f006CE6480042f001c45c928D1Ae6E7", // engine
    "0x0066009B13b8DfDabbE07800ee00004b008257D9", // flex
    "0x2eE7B9bB2E038bE7323A119701A191c030A61ec6", // core registry
    "0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef", // deployer wallet
    "https://token.artblocks.io/", // token uri host
  ],
  libraries: {},
};
```

> note: ownership transferred to `0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA` post-deployment. Set directly in deployment args on future updates.

## Results:

Deployed to address: `0x000000AB1a0786eE8c71516d9AbB8a36fbdDb7CB`

### Deployment transactions:

- https://etherscan.io/tx/0xa8bda2db05517e9b829be9618655df51d46aa73afd7cb976d600a43f77f5dffb
