# Deployments: GenArt721CoreV3_Curated_Flex

## Description

The owned create2 factory was used to deploy a new GenArt721CoreV3_Curated_Flex contract.

This was for the mainnet environment.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

> Note: `newSuperAdminAddress` input param is not used in curated core contract

```typescript
const engineConfiguration = {
  tokenName: "Art Blocks",
  tokenSymbol: "BLOCKS",
  renderProviderAddress: "0x21A89ef8c577ebaCfe8198644222B49DFD9284F9", // for primary sales - after deployment, update secondary sales address
  platformProviderAddress: "0x0000000000000000000000000000000000000000",
  // @dev newSuperAdminAddress input param is not used in curated core contract
  newSuperAdminAddress: "0x0000000000000000000000000000000000000000",
  randomizerContract: "0x13178A7a8A1A9460dBE39f7eCcEbD91B31752b91",
  splitProviderAddress: "0x00000000CE5EEBAB4B5C2d6Cc5E73eaafA634DB3",
  minterFilterAddress: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
  startingProjectId: 505,
  autoApproveArtistSplitProposals: false,
  nullPlatformProvider: true,
  allowArtistProjectActivation: false,
};
const adminACLContractAddress = "0x000000abB7A99780820c87c850Af7fD1Bc5e6788";
const defaultBaseURIHost = "https://token.artblocks.io/";
const bytecodeStorageReaderContract =
  "0x000000000000A791ABed33872C44a3D215a3743B";

const inputs: T_Inputs = {
  contractName: "GenArt721CoreV3_Curated_Flex",
  args: [
    engineConfiguration,
    adminACLContractAddress,
    defaultBaseURIHost,
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

Deploys to address: `0xAB00000000002ADE39f58F9D8278a31574fFBe77`

### Deployment transactions:

- https://etherscan.io/tx/0x5c95b77aa37a8a26c496cc989f7cd37ca0be96b25dd4a0764375a3a4fa1d78a9

## Follow-on transactions: UP NEXT

I. Add `GenArt721CoreV3_Curated` to `CoreRegistry` through `EngineFactory` call to `registerMultipleContracts`:

> Note: Must be queued via gnosis safe tx builder and executed by multisig

args:

- `0xAB00000000002ADE39f58F9D8278a31574fFBe77` // core address
- `0x76332e322e370000000000000000000000000000000000000000000000000000` // core version = "v3.2.7"
- `0x47656e417274373231436f726556335f456e67696e655f466c657800000000` // core type = "GenArt721CoreV3_Engine_Flex"

Registration tx:

- https://etherscan.io/tx/0xa89054cdefb1799515af3f9caefbdaa06cb6180fde22ddb6658432221ed227fb

II. Re-Call `updateMinterContract` on `GenArt721CoreV3_Curated_Flex` to set `MinterFilter` contract:

> Note: This fixes an indexing quirk associated with not approving the core in same block as deployment. It does not alter on-chain state.

- https://etherscan.io/tx/0x7e4f07444243ca16b2c5eeb1936715a58463f46b4f3f409b23a31cc04a6666ef

III. Follow-on configuring:

- update dependency registry
- update on-chain generator
- set render provider primary and secondary sales addresses (secondary sales address is different than primary sales address)
- update render provider primary sales percentage

- https://etherscan.io/tx/0x7e4f07444243ca16b2c5eeb1936715a58463f46b4f3f409b23a31cc04a6666ef

## Off-chain steps:

- hasura metadata update to contracts_metadata:
  - `bucket_name` = `artblocks-mainnet` // use same bucket as previous curated core contract
  - `name` = "artblocks-curated-flex-onchain" // use different name from previous curated core contract due to db constraint
  - `default_vertical_name` = "curated"
