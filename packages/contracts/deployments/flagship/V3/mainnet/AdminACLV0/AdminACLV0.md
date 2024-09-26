# Deployments: AdminACLV0

## Description

The owned create2 factory was used to deploy a new AdminACLV0 contract.

This was for the mainnet environment.

**important**: AdminACLV0 sets superAdmin to msg.sender, which is the deployer, which in this case is the OwnedCreate2FactoryV0 contract.
Therefore, a follow-on transaction to the OwnedCreate2FactoryV0 contract was required to update the superAdmin to the admin's multisig, using the `execCalls` function.
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

Deploys to address: `0x000000abB7A99780820c87c850Af7fD1Bc5e6788`

### Deployment transactions:

- etherscan_tbd

## Follow-on transactions:

Update superAdmin from OwnedCreate2FactoryV0 to mainnet admin (`0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283`):

- etherscan_tbd

note: easy to get appropriate calldata from a failed tx generated on etherscan, then use gnosis tx builder to execute the call
