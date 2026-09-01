# Deployments: V3TransferHookLib

## Description

This deployment of V3TransferHookLib is used on core contracts v3.3.0 and on. It holds the per-project transfer hook configuration, locking, and dispatch logic shared by the Engine and Engine Flex cores.

The keyless create2 factory was used to deterministically and permissionlessly deploy the V3TransferHookLib contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "V3TransferHookLib",
  args: [],
  libraries: {},
};
```

## Results:

salt: `0x0000000000000000000000000000000000000000ed7f80cab01c7f0b3c2500d0`
Deploys to address: `0x0000000020458d4C18397517bA13E43B54Baa56C`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0xc6abed8aceff5019f3039c6298c2cc0ef80903ccf4036eac8c4253844fb50df8
- shape: https://shapescan.xyz/tx/0xde1cf9b431ea6391be8b3c986be4b5948f724451f03ecb4acc22822ebf8dcbe4
- base: https://basescan.org/tx/0xb01dc6df81727fc6c77c7f412d33ca1663a88a5fec1aa50f8c3730e461bd3ff5
- arbitrum: https://arbiscan.io/tx/0x598d13d8d150e95e411e3b2f10b37ef2e1ebfa8fa3dae53c1653ff189837b36d
- mainnet: https://etherscan.io/tx/0xe8a7230e715c9d453e9ed93c7921f3d7c01722038f548176de25b072bcbeabfb
