# Deployments: GenArt721CoreV3_Curated

## Description

The owned create2 factory was used to deploy a new GenArt721CoreV3_Curated contract.

This was for the dev environment.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

> Note: `newSuperAdminAddress` input param is not used in curated core contract
> Note: There was a bug in the `defaultBaseURIHost` param, but it was updated after deployment via `updateBaseURI` function

```typescript
const engineConfiguration = {
  tokenName: "Art Blocks Dev",
  tokenSymbol: "BLOCKS_DEV",
  renderProviderAddress: "0x3c6412FEE019f5c50d6F03Aa6F5045d99d9748c4",
  platformProviderAddress: "0x0000000000000000000000000000000000000000",
  // @dev newSuperAdminAddress input param is not used in curated core contract
  newSuperAdminAddress: "0x0000000000000000000000000000000000000000",
  randomizerContract: "0xA6F7e62F3B52552f79b2Baa2858a1DB18016c09B",
  splitProviderAddress: "0x0000000004B100B47f061968a387c82702AFe946",
  minterFilterAddress: "0x29e9f09244497503f304FA549d50eFC751D818d2",
  startingProjectId: 661,
  autoApproveArtistSplitProposals: false,
  nullPlatformProvider: true,
  allowArtistProjectActivation: false,
};
const adminACLContractAddress = "0x000000d4de1341Fe5206Edc4aA19099fA06C91A4";
// FOLLOWING LINE HAS A BUG - DON'T DUPLICATE ON MAINNET
const defaultBaseURIHost = "https://token.artblocks.io/<contractAddress>/";
const bytecodeStorageReaderContract =
  "0x000000069EbaecF0d656897bA5527f2145560086";

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

Deploys to address: `0x000000008d4A636c2b3A157CD7a2142FE7f5688d`

### Deployment transactions:

- https://sepolia.etherscan.io/tx/0x999114fd6d174d04b33cf15bd9d85497bf28a650673131270cdf9443b2ff6c66

## Follow-on transactions:

I. Update `defaultBaseURIHost` from `https://token.artblocks.io/<contractAddress>/` to `https://token.artblocks.io/0x000000008d4a636c2b3a157cd7a2142fe7f5688d/`:

- https://sepolia.etherscan.io/tx/0x035cd4b5747559d0ff16e25f5b8109c945e4f172a57ab4c923f194a742512d33

II. Add `GenArt721CoreV3_Curated` to `CoreRegistry` through `EngineFactory` call to `registerMultipleContracts`:

> Note: Must be queued via gnosis safe tx builder and executed by multisig

args:

- `0x000000008d4A636c2b3A157CD7a2142FE7f5688d` // core address
- `0x76332e322e360000000000000000000000000000000000000000000000000000` // core version = "v3.2.6"
- `0x47656e417274373231436f726556335f456e67696e6500000000000000000000` // core type = "GenArt721CoreV3_Engine"

Registration tx:

- https://sepolia.etherscan.io/tx/0xcb1e306bee145f323dcdcbb7bf6b3bbf61ccc8f4ecd08b5bb795cfaa463d0fec

III. Re-Call `updateMinterContract` on `GenArt721CoreV3_Curated` to set `MinterFilter` contract:

> Note: This fixes an indexing quirk associated with not approving the core in same block as deployment. It does not alter on-chain state.

- https://sepolia.etherscan.io/tx/0x5004b5f15f40b151bd1b12171db85028367f64f9bcfe327a55cac0137bab2926

## Follow-on steps:

- create image bucket on s3: `art-blocks-curated-dev-sepolia`

- hasura metadata update to contracts_metadata:
  - `bucket_name` = `art-blocks-curated-dev-sepolia`
  - `name` = "Art Blocks Curated"
  - `default_vertical_name` = "fullyonchain"
