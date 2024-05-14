# Deployments: EngineFactoryV0

## Description

The keyless create2 factory was used to deterministically deploy the EngineFactoryV0, permissioned to dev admin wallet 0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef.

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

Deploys to address: `0x000000FF72D2bf6A83a21452aD5f80906472AF55`

### Deployment transactions:

- Arbitrum sepolia: https://sepolia.arbiscan.io/tx/0x48c2247825b753cf5e206a99b0070eb100ed8cf029333ded1826568627cd4bbc
