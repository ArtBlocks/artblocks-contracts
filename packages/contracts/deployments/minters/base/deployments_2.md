## 2026-05-26

### MinterSetPriceTieredOnChainAllowV0

Deployed via git-init-code.ts + keyless create2 factory

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0xc4d4f9d1dfd6a7c8cef205b29973df73342afa84",
  network: "base",
  contractName: "MinterSetPriceTieredOnChainAllowV0",
  args: ["0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5"],
  libraries: {},
};
```

## 2026-02-26

### MinterSetPriceOnChainAllowV0

Deployed via git-init-code.ts + keyless create2 factory

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0xD4AF8eAC9c0F4A6375e8C296452beACa9e98810b",
  network: "base",
  contractName: "MinterSetPriceOnChainAllowV0",
  args: ["0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5"],
  libraries: {},
};
```

## 2026-07-15

### MinterSetPriceTieredAllowV1

Deployed via get-init-code.ts + keyless create2 factory

Verified: https://basescan.org/address/0x0c1962b3c0c36b54Adf7FD1296aD8734A913e630#code

Salt: `0x0000000000000000000000000000000000000000000000000000000000000000`

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0x0c1962b3c0c36b54Adf7FD1296aD8734A913e630",
  network: "base",
  contractName: "MinterSetPriceTieredAllowV1",
  args: [
    "0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5", // MinterFilterV2
    "0xAb9ED4a55a6995076c0BfC0fb8f577C11C7489D6", // allowlist
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Circle USDC
  ],
  libraries: {},
};
```
