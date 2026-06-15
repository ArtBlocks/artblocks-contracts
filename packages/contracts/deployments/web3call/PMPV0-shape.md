# Deployments: PMPV0 (Shape)

## Description

Permissionless CREATE2 deploy — same cross-chain address as mainnet/base/arbitrum.

Constructor wires delegate.xyz v2 (`DelegateRegistry` at `0x00000000000000447e69651d841bD8D104Bed493`).

```typescript
// scripts/get-init-code.ts
const inputs: T_Inputs = {
  contractName: "PMPV0",
  args: ["0x00000000000000447e69651d841bd8d104bed493"],
  libraries: {},
};
```

## Results

salt: `0x00000000000000000000000000000000000000005dc61737e34615adc10a0070`
Deploys to address: `0x00000000A78E278b2d2e2935FaeBe19ee9F1FF14` ([verified](https://shapescan.xyz/address/0x00000000A78E278b2d2e2935FaeBe19ee9F1FF14#code))

### Deployment transactions

- shape: https://shapescan.xyz/tx/0x5c9361cc0af87d2126f9f89ec55fff292e9d6a45be944428db19e35556c717b2
