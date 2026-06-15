# Deployments: delegate.xyz on Shape

Permissionless CREATE2 deploys — same cross-chain addresses as mainnet/base/arbitrum.

## v1 — `DelegationRegistry`

Used by shared minters (Holder, Merkle, etc.) for mint-time delegation.

```typescript
// scripts/get-init-code.ts
const inputs: T_Inputs = {
  contractName: "DelegationRegistry",
  args: [],
  libraries: {},
};
```

| Field | Value |
| ----- | ----- |
| Salt | `0x00000000000000000000000000000000000000008b99e5a778edb02572010000` |
| Initcode hash | `0xa145a33949f7e385bbed2840bea773d47d66546c54428d17cd52576ec42c89d9` |
| Address | `0x00000000000076A84feF008CDAbe6409d2FE638B` |
| CREATE2 factory | `0x0000000000ffe8b47b3e2130213b802212439497` |
| Mainnet reference tx | https://etherscan.io/tx/0x7bc162ef3dfb331b5a138c339c653cef830b350e127205f6fb62ee412fa52e78 |

Pre-existing on Shape (deploy by another party). No Art Blocks deploy tx required.

- Contract: https://shapescan.xyz/address/0x00000000000076A84feF008CDAbe6409d2FE638B#code (verified)

`DELEGATION_REGISTRY_V1_ADDRESSES.shape` is set in `scripts/util/constants.ts`.

## v2 — `DelegateRegistry`

Required for PMP (`PMPV0`) and Web3Call hooks that authorize token owners via delegate.xyz v2 `postmintparameters` rights.

```typescript
// scripts/get-init-code.ts
const inputs: T_Inputs = {
  contractName: "DelegateRegistry",
  args: [],
  libraries: {},
};
```

| Field | Value |
| ----- | ----- |
| Address | `0x00000000000000447e69651d841bD8D104Bed493` |
| CREATE2 factory | `0x0000000000ffe8b47b3e2130213b802212439497` |

Pre-existing on Shape (deploy by another party). No Art Blocks deploy tx required.

- Contract: https://shapescan.xyz/address/0x00000000000000447e69651d841bD8D104Bed493#code (verified)

`DELEGATION_REGISTRY_V2_ADDRESSES.shape` is set in `scripts/util/constants.ts`.
