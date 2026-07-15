## 2026-02-26

### MinterSetPriceOnChainAllowV0

Deployed via git-init-code.ts + keyless create2 factory

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0x6fc8adbb1d6aff277f083da40f9ad3d43e7161e8",
  network: "arbitrum",
  contractName: "MinterSetPriceOnChainAllowV0",
  args: ["0x94560abECb897f359ee1A6Ed0E922315Da11752d"],
  libraries: {},
};
```

## 2026-07-15

### MinterSetPriceTieredAllowV1

Deployed via get-init-code.ts + keyless create2 factory

Verified: https://arbiscan.io/address/0x720d430e9bbcAABCEB62d88693577edA8d36524F#code

Salt: `0x0000000000000000000000000000000000000000000000000000000000000000`

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0x720d430e9bbcAABCEB62d88693577edA8d36524F",
  network: "arbitrum",
  contractName: "MinterSetPriceTieredAllowV1",
  args: [
    "0x94560abECb897f359ee1A6Ed0E922315Da11752d", // MinterFilterV2
    "0x3eECCa88328f624AF5db099888A191139180C9C3", // allowlist
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Circle native USDC
  ],
  libraries: {},
};
```
