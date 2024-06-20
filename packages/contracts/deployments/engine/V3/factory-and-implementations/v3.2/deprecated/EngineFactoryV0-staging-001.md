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
    "0xdAe755c2944Ec125a0D8D5CB082c22837593441a", // core registry
    "0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef", // deployer wallet
    "https://token.sepolia.artblocks.io/", // token uri host
  ],
  libraries: {},
};
```

> note: ownership transferred to `0x62DC3F6C7Bf5FA8A834E6B97dee3daB082873600` post-deployment. Set directly in deployment args on future updates.

## Results:

Deployed to address: `0x000000E238ebffe826c960aB0b53B299CB4eBbE0`

### Deployment transactions:

- https://sepolia.etherscan.io/tx/0xc6f81d780017789cc0b8d8b31a7c23ac0876137cd0e1174d6d0fb448bfc0e801
