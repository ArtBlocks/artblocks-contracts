# Deployments: EngineFactoryV0

## Description

The keyless create2 factory was used to deterministically deploy the EngineFactoryV0, permissioned to dev admin wallet 0x3c6412FEE019f5c50d6F03Aa6F5045d99d9748c4.

_Note: The EngineFactoryV0 will be deployed to different addresses on different networks/environments, due to CoreRegistry being a constructor arg._

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "EngineFactoryV0",
  args: [
    "0x00000000AEf91971cc6251936Ec6568B23b55342", // engine
    "0x00000000af817dFBc2b3006E365D2eFef1953334", // flex
    "0xfeA4f2f4E45c255ceE626a1A994BB214039c2B9A", // core registry
    "0x3c6412FEE019f5c50d6F03Aa6F5045d99d9748c4", // dev deployer wallet
  ],
  libraries: {},
};
```

## Results:

Deploys to address: `0x0000B005007298838aCF6589d4342920A9cB002a`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0x516b26db4d60c2eaa1ba2943f322d097bff892a591becaab379b6d0cde937c37
