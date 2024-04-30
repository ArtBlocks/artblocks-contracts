# Deployments: SplitProviderV0

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the SplitProviderV0 contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "SplitProviderV0",
  args: [
    "0x80f1B766817D04870f115fEBbcCADF8DBF75E017", // pull split factory, 0xSplits
  ],
  libraries: {},
};
```

salt: `0x0000000000000000000000000000000000000000c5509f5f0d6f52aa410100c0`

## Results:

Deploys to address: `0x00000091287f49E7Cb127FDe957e4318C89ee59C`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0x789d03b309af5886644766d14e0363440100ea6cffe0eab39c4f8a54f127a400
