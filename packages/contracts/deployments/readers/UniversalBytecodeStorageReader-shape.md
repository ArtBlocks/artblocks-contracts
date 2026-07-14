# Deployments: UniversalBytecodeStorageReader (Shape)

## Description

Permissioned CREATE2 deploy on Shape mainnet (chain ID 360). Owner = Shape Deployer Safe.

```typescript
// scripts/get-init-code.ts
const inputs: T_Inputs = {
  contractName: "UniversalBytecodeStorageReader",
  args: ["0x279c2BEE983b73ba4035Ef5c8aD059CF2d0DB848"],
  libraries: {},
};
```

## Results

| Field | Value |
| ----- | ----- |
| Deployer (msg.sender) | `0x279c2BEE983b73ba4035Ef5c8aD059CF2d0DB848` (Deployer Safe) |
| Salt | `0x279c2bee983b73ba4035ef5c8ad059cf2d0db848000000000000000000000000` |
| Initcode hash | `0x94fbb6c85d45db8271cf37227e385d93d3da69ff06552fa001e84301ed22baab` |
| Address | `0x25eFD6E38Bd12f97C997696eEE07f5d587CE1FdA` |
| CREATE2 factory | `0x0000000000ffe8b47b3e2130213b802212439497` |
| Verified | https://shapescan.xyz/address/0x25eFD6E38Bd12f97C997696eEE07f5d587CE1FdA#code |

### Deployment transaction

- https://shapescan.xyz/tx/0xc408b7e084828df427046e8f1be607b01603128fea94ee685278165eaa1f2f59

> Follow-on (done): `updateBytecodeStorageReaderContract(0x000000000005e4192e8789423aEC2FA32E4D52a0)` — https://shapescan.xyz/tx/0x448ea301c4e29048c2064dfd9f2f13185d6334314b46fce76c381654b521e999
