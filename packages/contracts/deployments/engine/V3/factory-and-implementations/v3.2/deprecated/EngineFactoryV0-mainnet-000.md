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
    "0x2eE7B9bB2E038bE7323A119701A191c030A61ec6", // core registry
    "0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef", // deployer wallet
  ],
  libraries: {},
};
```

## Results:

Deploys to address: `0x00000000F82E4e6D5AB22D63050FCb2bF15eE95d`

### Deployment transactions:

- mainnet: https://etherscan.io/tx/0xd0bf70f13169ddc72192dbd469985ef3847c925a3a9bb2f7a22c9a22e7fd442c
