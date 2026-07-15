## 2026-02-03

### MinterSlidingScaleV0

Deployed via git-init-code.ts + keyless create2 factory

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0xdef46ae165a3b29b2bf85fcea0271ac0e74a232b",
  network: "sepolia",
  contractName: "MinterSlidingScaleV0",
  args: ["0x29e9f09244497503f304FA549d50eFC751D818d2"],
  libraries: {},
};
```

## 2026-02-26

### MinterSetPriceOnChainAllowV0

Deployed via git-init-code.ts + keyless create2 factory

Deployment Config:

```
const inputs: T_Inputs = {
  contractName: "MinterSetPriceOnChainAllowV0",
  args: ["0x29e9f09244497503f304FA549d50eFC751D818d2"],
  libraries: {},
};
```

## 2026-07-15

### MinterSetPriceTieredAllowV1

Deployed via get-init-code.ts + keyless create2 factory

Verified: https://sepolia.etherscan.io/address/0x6643ad980bb45ee7bd3ba5ade24f8b8b4daf1a94#code

Salt: `0x0000000000000000000000000000000000000000000000000000000000000000`

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0x6643ad980bb45ee7bd3ba5ade24f8b8b4daf1a94",
  network: "sepolia",
  contractName: "MinterSetPriceTieredAllowV1",
  args: [
    "0x29e9f09244497503f304FA549d50eFC751D818d2", // MinterFilterV2
    "0x803e58545414e0F70a3aDEe948450E70cA529a80", // allowlist
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Circle USDC
  ],
  libraries: {},
};
```
