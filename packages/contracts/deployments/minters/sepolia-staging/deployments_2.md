## 2026-02-03

### MinterSlidingScaleV0

Deployed via git-init-code.ts + keyless create2 factory

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0x950C529Fb199CDC54952e4d630D07a08FB7a24e5",
  network: "sepolia",
  contractName: "MinterSlidingScaleV0",
  args: ["0xa07f47c30C262adcC263A4D44595972c50e04db7"],
  libraries: {},
};
```

## 2026-02-26

### MinterSetPriceOnChainAllowV0

Deployed via git-init-code.ts + keyless create2 factory

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0xE0Ea98c50C415e92106AF95490B69286BBa1cfE1",
  network: "sepolia",
  contractName: "MinterSetPriceOnChainAllowV0",
  args: ["0xa07f47c30C262adcC263A4D44595972c50e04db7"],
  libraries: {},
};
```

## 2026-07-15

### MinterSetPriceTieredAllowV1

Deployed via get-init-code.ts + keyless create2 factory

Verified: https://sepolia.etherscan.io/address/0x72c7835d7E7CE84A786C0eB6c1d5B16f47CF9BE3#code

Salt: `0x0000000000000000000000000000000000000000000000000000000000000000`

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0x72c7835d7E7CE84A786C0eB6c1d5B16f47CF9BE3",
  network: "sepolia",
  contractName: "MinterSetPriceTieredAllowV1",
  args: [
    "0xa07f47c30C262adcC263A4D44595972c50e04db7", // MinterFilterV2
    "0xBF3AfcDAb9F1198Cbb92eB973D8e1d3136a77D44", // allowlist
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Circle USDC
  ],
  libraries: {},
};
```

## 2026-10-02

### MinterSetPricePMPV0

One-off deploy. Not approved on the staging minter filter.

Deployed via `scripts/create2-deploy` + keyless create2 factory.

Verified: https://sepolia.etherscan.io/address/0x32841b18376144e70647Aa1206D1C74CF35C95C4#code

Transaction: https://sepolia.etherscan.io/tx/0x9903ff4104b9d8c93b06143e40c820e1af97dd3132c4161d1f247d0f556556ae

Salt: `0x0000000000000000000000000000000000000000000000000000000000000000`

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0x32841b18376144e70647Aa1206D1C74CF35C95C4",
  network: "sepolia",
  contractName: "MinterSetPricePMPV0",
  args: [
    "0xa07f47c30C262adcC263A4D44595972c50e04db7", // staging MinterFilterV2
    "0x00000000B9D3B2461fcFd5D23FCA65227B770f67", // staging PMPV1
  ],
  libraries: {},
};
```
