# Deployments: GenArt721CoreV3_Explorations_Flex

## Description

The owned create2 factory was used to deploy a new GenArt721CoreV3_Explorations_Flex contract.

This was for the mainnet environment.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

> Note: `newSuperAdminAddress` input param is not used in Explorations core contract

```typescript
const engineConfiguration = {
  tokenName: "Art Blocks Explorations",
  tokenSymbol: "EXPLORE",
  renderProviderAddress: "0x21A89ef8c577ebaCfe8198644222B49DFD9284F9", // for primary sales - after deployment, update secondary sales address
  platformProviderAddress: "0x0000000000000000000000000000000000000000",
  // @dev newSuperAdminAddress input param is not used in Explorations core contract
  newSuperAdminAddress: "0x0000000000000000000000000000000000000000",
  randomizerContract: "0x13178A7a8A1A9460dBE39f7eCcEbD91B31752b91",
  splitProviderAddress: "0x00000000CE5EEBAB4B5C2d6Cc5E73eaafA634DB3",
  minterFilterAddress: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
  startingProjectId: 3,
  autoApproveArtistSplitProposals: false,
  nullPlatformProvider: true,
  allowArtistProjectActivation: false,
};
const adminACLContractAddress = "0x000000abB7A99780820c87c850Af7fD1Bc5e6788";
const bytecodeStorageReaderContract =
  "0x000000000000A791ABed33872C44a3D215a3743B";

const inputs: T_Inputs = {
  contractName: "GenArt721CoreV3_Explorations_Flex",
  args: [
    engineConfiguration,
    adminACLContractAddress,
    bytecodeStorageReaderContract,
  ],
  libraries: {
    "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
      "0x000000000016A5A5ff2FA7799C4BEe89bA59B74e",
    "contracts/libs/v0.8.x/V3FlexLib.sol:V3FlexLib":
      "0x00000000Db6f2EBe627260e411E6c973B7c48A62",
  },
};
```

## Results:

Deploys to address: `0xAbaBabABAb20053426aD1C782de9ea8444358070`

### Deployment transactions:

- https://etherscan.io/tx/0x0645bd0b96d9ac2a705001eda3a61b13784876237e1eb1c8f937155792946159

## Follow-on transactions:

I. Add `GenArt721CoreV3_Explorations` to `CoreRegistry` through `EngineFactory` call to `registerMultipleContracts`:

> Note: Must be queued via gnosis safe tx builder and executed by multisig

args:

- `0xAbaBabABAb20053426aD1C782de9ea8444358070` // core address
- `0x76332e322e380000000000000000000000000000000000000000000000000000` // core version = "v3.2.8"
- `0x47656e417274373231436f726556335f456e67696e655f466c657800000000` // core type = "GenArt721CoreV3_Engine_Flex"

Registration tx:

https://etherscan.io/tx/0xec4d1161be91b2989309151fa650ec93fd4c32ed9e7fadd9b0f1dd31a45d5a3e

II. Re-Call `updateMinterContract` on `GenArt721CoreV3_Explorations_Flex` to set `MinterFilter` contract:

> Note: This fixes an indexing quirk associated with not approving the core in same block as deployment. It does not alter on-chain state.

- https://etherscan.io/tx/0x53204250b97a5a58bae3ce697a572242b20d34147f9dc31af00c140ef116789e

III. Follow-on configuring:

- update dependency registry to `0x37861f95882ACDba2cCD84F5bFc4598e2ECDDdAF`
- update on-chain generator to `0x953D288708bB771F969FCfD9BA0819eF506Ac718`
- set render provider primary and secondary sales addresses (secondary sales address is different than primary sales address)

  - render provider primary `0x21A89ef8c577ebaCfe8198644222B49DFD9284F9`
  - render provider secondary `0xC40FD6D2A8e06ba753F6Fd3CB562835Eff990b51`

- https://etherscan.io/tx/0xa63551a769d40ae594df06a0d40efe8f0a18e16d76e4f71bfe57483ff223105a

## Retire previous curated core contract

## Off-chain steps:

- hasura metadata update to contracts_metadata:
  - `bucket_name` = `art-blocks-explorations-mainnet` // use same bucket as previous explorations core contract
  - `name` = "artblocks-explorations-flex-onchain" // use different name from previous explorations (previous never had name in db)
  - `default_vertical_name` = "explorations"

## Add new projects
