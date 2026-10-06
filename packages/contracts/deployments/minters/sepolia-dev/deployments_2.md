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

## 2026-10-02

### MinterSetPricePMPV0

One-off deploy. Not approved on the dev minter filter.

Deployed via `scripts/create2-deploy` + keyless create2 factory.

Verified: https://sepolia.etherscan.io/address/0x1C21aC0E5458D2950C85C07C46cD12B247728d41#code

Transaction: https://sepolia.etherscan.io/tx/0xd367d57bdf5d6c36a25be5a4c1b405332a0571927811c8e2d40d7a1eac3bfc4c

Salt: `0x0000000000000000000000000000000000000000000000000000000000000000`

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0x1C21aC0E5458D2950C85C07C46cD12B247728d41",
  network: "sepolia",
  contractName: "MinterSetPricePMPV0",
  args: [
    "0x29e9f09244497503f304FA549d50eFC751D818d2", // dev MinterFilterV2
    "0xb380B5c5A1d98Ebcc669feF89bCe0B3db1f36292", // dev PMPV1
  ],
  libraries: {},
};
```
