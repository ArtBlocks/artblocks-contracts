# Deployments: EngineFactoryV0

## Description

The keyless create2 factory was used to deterministically deploy the EngineFactoryV0, permissioned to deployer wallet 0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef.

_Note: The EngineFactoryV0 will be deployed to different addresses on different networks/environments, due to CoreRegistry being a constructor arg._

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "EngineFactoryV0",
  args: [
    "0x00000000AEf91971cc6251936Ec6568B23b55342", // engine
    "0x00000000af817dFBc2b3006E365D2eFef1953334", // flex
    "0x5D8EFdc20272CD3E24a27DfE7F25795a107c99a2", // core registry
    "0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef", // deployer wallet
  ],
  libraries: {},
};
```

## Results:

Deploys to address: `0x000000bbAA3E36b60C06A92430D8956459c2Fd51`

### Deployment transactions:

- sepolia: https://arbiscan.io/tx/0x1fb895d152fe6bc7db8f306597f467745b3af704f3bc5e3f69150a0970cd1706
