# Deployments: AdminACLV0

## Description

The owned create2 factory was used to deploy a new AdminACLV0 contract.

This was for the dev environment.

**important**: AdminACLV0 sets superAdmin to msg.sender, which is the deployer, which in this case is the OwnedCreate2FactoryV0 contract.
Therefore, a follow-on transaction to the OwnedCreate2FactoryV0 contract was required to update the superAdmin to the dev admin's multisig, using the `execCalls` function.
That transaction is included in the deployment transactions below, for reference.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "AdminACLV0",
  args: [],
  libraries: {},
};
```

## Results:

Deploys to address: `0x000000d4de1341Fe5206Edc4aA19099fA06C91A4`

### Deployment transactions:

- https://sepolia.etherscan.io/tx/0x2c13420139e13178382744869032aaa54787cc9e93f616391c52cc5edf74809a

## Follow-on transactions:

Update superAdmin from OwnedCreate2FactoryV0 to dev admin (`0x3c6412FEE019f5c50d6F03Aa6F5045d99d9748c4`):

- https://sepolia.etherscan.io/tx/0xa8a6f9918a47a0958bc0886fe00313dae84bb8a191ea14498bdc303dec077d3d

note: easy to get appropriate calldata from a failed tx generated on etherscan, then use gnosis tx builder to execute the call
