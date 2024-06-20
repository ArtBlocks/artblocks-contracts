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
    "0x5D8EFdc20272CD3E24a27DfE7F25795a107c99a2", // core registry
    "0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef", // deployer wallet
    "https://token.arbitrum.artblocks.io/", // token uri host
  ],
  libraries: {},
};
```

> note: ownership transferred to `0xD3bE6e30D901fa2e2Fd7f3Ebd23189f5376a4f9D` post-deployment. Set directly in deployment args on future updates.

## Results:

Deployed to address: `0x000000da9D51CC51a50Dc296246075859b13ab0B`

### Deployment transaction:

- https://arbiscan.io/tx/0x758591083ef06ef4325adc1b32e4399813edc0e92902f65a380ad5f6e2a4565f
