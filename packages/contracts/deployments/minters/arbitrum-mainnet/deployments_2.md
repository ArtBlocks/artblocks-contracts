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

## 2026-10-06

### MinterSetPricePMPV0

One-off deploy. Not approved on the Arbitrum minter filter.

Deployed via `scripts/create2-deploy` + keyless create2 factory.

Verified: https://arbiscan.io/address/0x393487d584abab147957C911398A01c1cdfB0743#code

Transaction: https://arbiscan.io/tx/0x25c66cc3752995c348c53260e5e71ee0fb0c75272a0b110390e3722d721a30cd

Salt: `0x0000000000000000000000000000000000000000000000000000000000000000`

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0x393487d584abab147957C911398A01c1cdfB0743",
  network: "arbitrum",
  contractName: "MinterSetPricePMPV0",
  args: [
    "0x94560abECb897f359ee1A6Ed0E922315Da11752d", // arbitrum MinterFilterV2
    "0x00000000B9D3B2461fcFd5D23FCA65227B770f67", // PMPV1
  ],
  libraries: {},
};
```
