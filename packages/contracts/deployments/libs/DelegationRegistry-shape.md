# Deployments: DelegationRegistry v1 (Shape)

## Description

Permissionless CREATE2 deploy — same cross-chain address as mainnet/base/arbitrum.

```typescript
// scripts/get-init-code.ts
const inputs: T_Inputs = {
  contractName: "DelegationRegistry",
  args: [],
  libraries: {},
};
```

## Results (predicted, historical initcode from mainnet)

| Field | Value |
| ----- | ----- |
| Salt | `0x00000000000000000000000000000000000000008b99e5a778edb02572010000` |
| Initcode hash | `0xa145a33949f7e385bbed2840bea773d47d66546c54428d17cd52576ec42c89d9` |
| Address | `0x00000000000076A84feF008CDAbe6409d2FE638B` |
| CREATE2 factory | `0x0000000000ffe8b47b3e2130213b802212439497` |
| Mainnet reference tx | https://etherscan.io/tx/0x7bc162ef3dfb331b5a138c339c653cef830b350e127205f6fb62ee412fa52e78 |

### Deployment transaction (Shape)

Pre-existing on Shape at the cross-chain CREATE2 address (deploy by another party). No Art Blocks deploy tx required.

- Contract: https://shapescan.xyz/address/0x00000000000076A84feF008CDAbe6409d2FE638B#code (verified)
