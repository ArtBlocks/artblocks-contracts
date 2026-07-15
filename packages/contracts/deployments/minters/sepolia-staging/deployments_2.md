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
