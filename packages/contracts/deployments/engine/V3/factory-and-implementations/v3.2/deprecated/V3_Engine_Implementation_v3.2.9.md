# Deployments: GenArt721CoreV3_Engine Implementation v3.2.9

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the GenArt721CoreV3_Engine implementation contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "GenArt721CoreV3_Engine",
  args: [],
  libraries: {
    "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
      "0x000000000016A5A5ff2FA7799C4BEe89bA59B74e",
  },
};
```

## Results:

salt: `0x00df4e8d293d57718aac0b18cbfbe128c5d484ef88ab72f9b1808b3ce3000034`
Deploys to address: `0x00000000f10424506961445f935ec76579e0769F`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0x20d3f32fe6ed6dfb46e2e35fc0e48a4e3aaf70103c28883a41173363815d9041
- arbitrum: https://arbiscan.io//tx/0x14f5426712be2a8c1b74655b846c7b84935c084c7b2f80be031a46330ff1d27a
- base: https://basescan.org/tx/0xba1439a1faf1447a703382fc8a6fd7a7b89670e849ce694c012dec0c699e2610
- mainnet: https://etherscan.io/tx/0x5a2c9bf1f9a912f55ea5066f869ecef461366ee2e677c168be92e320f3db039c
