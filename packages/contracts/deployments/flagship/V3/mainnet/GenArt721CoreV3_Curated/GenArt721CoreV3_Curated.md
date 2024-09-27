# Deployments: GenArt721CoreV3_Curated

## Description

The owned create2 factory was used to deploy a new GenArt721CoreV3_Curated contract.

This was for the mainnet environment.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

> Note: `newSuperAdminAddress` input param is not used in curated core contract

```typescript
const engineConfiguration = {
  tokenName: "Art Blocks",
  tokenSymbol: "BLOCKS",
  renderProviderAddress: "0x21A89ef8c577ebaCfe8198644222B49DFD9284F9",
  platformProviderAddress: "0x0000000000000000000000000000000000000000",
  // @dev newSuperAdminAddress input param is not used in curated core contract
  newSuperAdminAddress: "0x0000000000000000000000000000000000000000",
  randomizerContract: "0x13178A7a8A1A9460dBE39f7eCcEbD91B31752b91",
  splitProviderAddress: "0x0000000004B100B47f061968a387c82702AFe946",
  minterFilterAddress: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
  startingProjectId: 494,
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
  },
};
```

## Results:

Deploys to address: `0xAB0000000000aa06f89B268D604a9c1C41524Ac6`

### Deployment transactions:

- etherscan_tbd

## Follow-on transactions:

I. Add `GenArt721CoreV3_Curated` to `CoreRegistry` through `EngineFactory` call to `registerMultipleContracts`:

> Note: Must be queued via gnosis safe tx builder and executed by multisig

args:

- `0xAB0000000000aa06f89B268D604a9c1C41524Ac6` // core address
- `0x76332e322e360000000000000000000000000000000000000000000000000000` // core version = "v3.2.6"
- `0x47656e417274373231436f726556335f456e67696e6500000000000000000000` // core type = "GenArt721CoreV3_Engine"

Registration tx:

- etherscan_tbd

III. Re-Call `updateMinterContract` on `GenArt721CoreV3_Curated` to set `MinterFilter` contract:

> Note: This fixes an indexing quirk associated with not approving the core in same block as deployment. It does not alter on-chain state.

- etherscan_tbd

## Follow-on steps:

- create image bucket on s3: `art-blocks-curated-mainnet`

- hasura metadata update to contracts_metadata:
  - `bucket_name` = `artblocks-mainnet`
  - `name` = "artblocks"
  - `default_vertical_name` = "curated"
