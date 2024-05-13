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
    "0xa07f47c30C262adcC263A4D44595972c50e04db7", // core registry
    "0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef", // deployer wallet
  ],
  libraries: {},
};
```

## Results:

Deploys to address: `0x000088739C60a490FeE1E20007b61DC500265626`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0x3d79c36f67c91ae60e3f30edaa2498fc17900b38cfb7f305544915735c1cac51
