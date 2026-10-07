## 2026-02-03

### MinterSlidingScaleV0

Deployed via git-init-code.ts + keyless create2 factory

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0x8c4ceA530b2Ff89d312F15A8DB38f04cDB5371d8",
  network: "mainnet",
  contractName: "MinterSlidingScaleV0",
  args: ["0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b"],
  libraries: {},
};
```

## 2026-02-26

### MinterSetPriceOnChainAllowV0

Deployed via git-init-code.ts + keyless create2 factory

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0x03fF13aCb62340308E816E52Ed4065C2dD3E35b4",
  network: "mainnet",
  contractName: "MinterSetPriceOnChainAllowV0",
  args: ["0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b"],
  libraries: {},
};
```

## 2026-07-15

### MinterSetPriceTieredAllowV1

Deployed via get-init-code.ts + keyless create2 factory

Verified: https://etherscan.io/address/0xeECF28BE5721ce842d2711a92F4dB808F7998f7a#code

Salt: `0x0000000000000000000000000000000000000000000000000000000000000000`

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0xeECF28BE5721ce842d2711a92F4dB808F7998f7a",
  network: "mainnet",
  contractName: "MinterSetPriceTieredAllowV1",
  args: [
    "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b", // MinterFilterV2
    "0x0C37508508aC49A9F1CA1EED2303a8a3a557Bebf", // allowlist
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Circle USDC
  ],
  libraries: {},
};
```

## 2026-10-06

### MinterSetPricePMPV0

One-off deploy. Not approved on the mainnet minter filter.

Deployed via `scripts/create2-deploy` + keyless create2 factory.

Verified: https://etherscan.io/address/0xCB084b813116B3799EB4AD261fe6ba69f8277c26#code

Transaction: https://etherscan.io/tx/0x83eff6fdaf633dab18c0ab94949d97f2be839a916d48f86e215c7eac0bc5d938

Salt: `0x0000000000000000000000000000000000000000000000000000000000000000`

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0xCB084b813116B3799EB4AD261fe6ba69f8277c26",
  network: "mainnet",
  contractName: "MinterSetPricePMPV0",
  args: [
    "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b", // mainnet MinterFilterV2
    "0x00000000B9D3B2461fcFd5D23FCA65227B770f67", // PMPV1
  ],
  libraries: {},
};
```
