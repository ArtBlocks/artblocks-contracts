# Deployments: GenArt721CoreV3_Curated_Flex

## Description

The owned create2 factory was used to deploy a new GenArt721CoreV3_Curated_Flex contract.

This was for the mainnet environment.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

> Note: `newSuperAdminAddress` input param is not used in curated core contract

```typescript
const engineConfiguration = {
  tokenName: "Art Blocks", // TODO - may want to update this to be unique...
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
  contractName: "GenArt721CoreV3_Curated",
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

Deploys to address: `0xAB000TBD`

### Deployment transactions:

- TBD

## Follow-on transactions:

I. Add `GenArt721CoreV3_Curated` to `CoreRegistry` through `EngineFactory` call to `registerMultipleContracts`:

> Note: Must be queued via gnosis safe tx builder and executed by multisig

args:

- `0xAB000TBD` // core address
- `0x76332e322e370000000000000000000000000000000000000000000000000000` // core version = "v3.2.7"
- `0x47656e417274373231436f726556335f456e67696e655f466c657800000000` // core type = "GenArt721CoreV3_Engine_Flex"

Registration tx:

- TBD

II. Re-Call `updateMinterContract` on `GenArt721CoreV3_Curated` to set `MinterFilter` contract:

> Note: This fixes an indexing quirk associated with not approving the core in same block as deployment. It does not alter on-chain state.

- TBD

III. Follow-on configuring:

- update dependency registry
- set render provider primary and secondary sales addresses (secondary sales address is different than primary sales address)
- update render provider primary sales percentage

- TBD

## Off-chain steps:

- hasura metadata update to contracts_metadata:
  - `bucket_name` = `artblocks-mainnet` // TODO - we may need to update this to `artblocks-flex-onchain-mainnet`
  - `name` = "artblocks" // TODO - we may need to update this to `artblocks-flex-onchain`
  - `default_vertical_name` = "curated"
