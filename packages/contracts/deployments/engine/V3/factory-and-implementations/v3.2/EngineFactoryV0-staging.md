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
    "0xdAe755c2944Ec125a0D8D5CB082c22837593441a", // core registry
    "0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef", // deployer wallet
  ],
  libraries: {},
};
```

## Results:

Deploys to address: `0x000000021e59FE2bc9390d5f5bfe9Ae1DE0cEf98`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0x3333df65a5dca42629c8f84c16a6491bbccfc88a92c56eb45fcd3cd04e79ca9a
