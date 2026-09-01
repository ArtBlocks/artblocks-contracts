# Deployments: V3EngineLib

## Description

This deployment of V3EngineLib is used on core contracts v3.3.0 and on. It holds logic shared by the Engine and Engine Flex cores — ERC-2981 royalty info, primary revenue splits, royalty splitter assignment, artist payment proposal/acceptance, aspect ratio and script type validation, and default base URI construction — so the two cores cannot drift.

The keyless create2 factory was used to deterministically and permissionlessly deploy the V3EngineLib contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "V3EngineLib",
  args: [],
  libraries: {},
};
```

## Results:

salt: `0x00000000000000000000000000000000000000005ae836bdd80f0bd662040000`
Deploys to address: `0x000000001d81F6Ed8c3646293bD485Cef06416db`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0x13911c9ccd81c7a096676bd902d402eee987d8ffc8e93f0fa7bfe466a9557e2b
- shape: https://shapescan.xyz/tx/0x424d80cd9be9d04a6d3981485f980fee3f8acf5d19bb59eb804a620d651702ad
- base: https://basescan.org/tx/0x4ac0445da073fe18cc126d635d2bdb83a751d0039522e066ee3423fe16f64fb2
- arbitrum: https://arbiscan.io/tx/0x7bdc7a70b1f52ef19f1b92c16c3d6e4efa1690e774cbd7e946e9479a263e19b4
- mainnet: https://etherscan.io/tx/0x32d93761696eff295a03b4bb91325efd0d32a5e32079d579e90c5b5f725373a8
