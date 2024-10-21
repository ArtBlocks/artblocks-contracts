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
    "0xfeA4f2f4E45c255ceE626a1A994BB214039c2B9A", // core registry
    "0x3c6412FEE019f5c50d6F03Aa6F5045d99d9748c4", // dev deployer wallet
    "https://token.sepolia.artblocks.io/", // token uri host
  ],
  libraries: {},
};
```

> note: ownership transferred to `0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8` post-deployment. Set directly in deployment args on future updates.

## Results:

Deployed to address: `0x000000A8398893f1A9B4a0d234a2eC4F8AFc5838`

### Deployment transaction:

- https://sepolia.etherscan.io/tx/0x8f35005b9a3d457ad1c66efa45a4ace176f6d0b2bc56e630cd5716c696003193
