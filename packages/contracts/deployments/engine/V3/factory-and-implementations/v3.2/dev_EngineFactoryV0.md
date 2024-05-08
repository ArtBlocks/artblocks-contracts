# Deployments: GenArt721CoreV3_Engine_Flex Implementation

## Description

The keyless create2 factory was used to deterministically deploy the EngineFactoryV0, permissioned to dev admin wallet 0x3c6412FEE019f5c50d6F03Aa6F5045d99d9748c4.

_Note: The EngineFactoryV0 will be deployed to different addresses on different networks/environments, due to CoreRegistry being a constructor arg._

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "EngineFactoryV0",
  args: [
    "0x00000000BB846ED9fb50fF001C6cD03012fC4485", // engine
    "0x00000000B33F6D5cA8222c87EAc99D206A99E17E", // flex
    "0x985C11541ff1fe763822Dc8f71B581C688B979EE", // core registry
    "0x3c6412FEE019f5c50d6F03Aa6F5045d99d9748c4", // dev deployer wallet
  ],
  libraries: {},
};
```

## Results:

Deploys to address: `0x0000000f84351b503eB3Df72C7E1f169b2D32728`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0x50e0ca75d0fbb2e5bcea5f40245741fb3e7035dc15a28379ad430ab3ead1b237
