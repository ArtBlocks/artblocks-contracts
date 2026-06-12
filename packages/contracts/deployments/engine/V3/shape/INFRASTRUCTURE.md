# Shape Mainnet (chain ID 360) — Infrastructure Bootstrap

| Property | Value |
|----------|-------|
| Hardhat network | `shape` |
| Chain ID | `360` |
| RPC env var | `SHAPE_MAINNET_JSON_RPC_PROVIDER_URL` |
| Explorer | https://shapescan.xyz |
| `MAIN_CONFIG` key | `shape.prod` |
| Batch deploy `environment` | `prod` (`NODE_ENV=prod`) |

## Safe wallets

| Role | Address | Used for |
|------|---------|----------|
| **Deployer Safe** | `0x279c2BEE983b73ba4035Ef5c8aD059CF2d0DB848` | Owner of `EngineFactoryV0` and `UniversalBytecodeStorageReader`; proposes engine batch deploys (`deployNetworkConfiguration.safeAddress`); executes permissioned CREATE2 deploys |
| **Admin Safe** | `0x75EADBfbbc0ac884DBdfBcFc443A561Ce3fa9235` | Super admin of shared `AdminACLV0` (minter filter); optional `newSuperAdminAddress` on studio cores when AB should retain admin |

Contract addresses (`engineFactory`, `sharedMinterFilter`, etc.) are recorded in `MAIN_CONFIG.shape.prod` only **after** each on-chain deploy.

## Bootstrap order

### 0. Prerequisites

- `.env`: `SHAPE_MAINNET_JSON_RPC_PROVIDER_URL` (Alchemy recommended)
- Verify CREATE2 factory exists on Shape: `0x0000000000ffe8b47b3e2130213b802212439497`
- Deploy unpermissioned CREATE2 contracts if not already on Shapescan (see `INFRASTRUCTURE.md` unpermissioned table — same addresses as mainnet/base/arbitrum)

### 1. Deploy `CoreRegistryV1` — done

**Address:** `0x440E1B5A98332BcA7564DbffA4146f976CE75397` ([Shapescan](https://shapescan.xyz/address/0x440E1B5A98332BcA7564DbffA4146f976CE75397))

Deployed + verified from deployer EOA `0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef` (current owner).

### 2. Deploy `UniversalBytecodeStorageReader` (CREATE2) — done

**Address:** `0x25eFD6E38Bd12f97C997696eEE07f5d587CE1FdA` ([Shapescan](https://shapescan.xyz/address/0x25eFD6E38Bd12f97C997696eEE07f5d587CE1FdA#code))

Salt: `0x279c2bee983b73ba4035ef5c8ad059cf2d0db848000000000000000000000000`

**Follow-on (done):** `updateBytecodeStorageReaderContract(0x000000000005e4192e8789423aEC2FA32E4D52a0)` — https://shapescan.xyz/tx/0x448ea301c4e29048c2064dfd9f2f13185d6334314b46fce76c381654b521e999

### 3. Deploy `EngineFactoryV0` v004 (CREATE2) — done

**Address:** `0x69Ee773e7DC7386581aFAAacd345113e34238806` ([Shapescan](https://shapescan.xyz/address/0x69Ee773e7DC7386581aFAAacd345113e34238806))

**Tx:** https://shapescan.xyz/tx/0x1a2cc8f0e3f43a455a863d446dedb91065f2ab3ad0d309c7b4b7f53e68205e8d

Salt: `0x00df4e8d293d57718aac0b18cbfbe128c5d484ef000000000000000000000000`

### 4. Transfer Core Registry ownership → Engine Factory — done

`CoreRegistryV1.transferOwnership(0x69Ee773e7DC7386581aFAAacd345113e34238806)` from deployer EOA — https://shapescan.xyz/tx/0x70c8650baea40428e40df52e53da7d1e2518a197cb7783cc758cffd54f885725

`EngineFactory` (`0x69Ee773e7DC7386581aFAAacd345113e34238806`) now owns `CoreRegistry` (`0x440E1B5A98332BcA7564DbffA4146f976CE75397`).

### 5. Deploy `DelegationRegistry` v1 — already on Shape

**Address:** `0x00000000000076A84feF008CDAbe6409d2FE638B` ([Shapescan](https://shapescan.xyz/address/0x00000000000076A84feF008CDAbe6409d2FE638B#code), verified)

Permissionless CREATE2 address was deployed on Shape before our bootstrap. A redeploy reverts with *"contract has already been deployed"* — expected.

`DELEGATION_REGISTRY_V1_ADDRESSES.shape` is set in `scripts/util/constants.ts`.

### 6. Deploy shared randomizer — done

**SharedRandomizerV0:** `0x5705023921B577e5BAeFF66f1fC7d52f5ccF1232` ([Shapescan](https://shapescan.xyz/address/0x5705023921B577e5BAeFF66f1fC7d52f5ccF1232#code))

**PseudorandomAtomic:** `0x2d3f8D5c5294B7934aFBe4B901EEb5E7B48a4e97`

### 7. Deploy shared minter filter — done

| Contract | Address |
| -------- | ------- |
| **MinterFilterV2** | `0x6DdDBbd9aE353fCdaCB83a8fb085714bFc7F3f66` ([Shapescan](https://shapescan.xyz/address/0x6DdDBbd9aE353fCdaCB83a8fb085714bFc7F3f66#code)) |
| **AdminACLV0** | `0x37861f95882ACDba2cCD84F5bFc4598e2ECDDdAF` |
| **CoreRegistry** (existing) | `0x440E1B5A98332BcA7564DbffA4146f976CE75397` |

**Follow-on (done):** `changeSuperAdmin(0x75EADBfbbc0ac884DBdfBcFc443A561Ce3fa9235, [])` from deployer EOA — https://shapescan.xyz/tx/0x1987776bacbe492cee5cb957329736b3dacafd4999b5397298dafcc45af40806

### 8. Deploy shared minters — done

All 11 shared minters deployed and globally approved. See `deployments/minters/shape/DEPLOYMENTS.md`.

| Minter | Address |
| ------ | ------- |
| MinterSetPriceV5 | `0xeE4494Cb6178979f3B0481AE4653fE8A8A204c53` |
| MinterSetPriceERC20V5 | `0x4Ce51FefEcfc333471965ad10a852dEe8BbD6a1d` |
| MinterSetPriceHolderV5 | `0x4C9d23D14fF4D4d336dD7eF75B20Ef45D25B3e92` |
| MinterSetPriceMerkleV5 | `0xB68920a9a209eAfA7a65771f33Aa894cdcC96398` |
| MinterSetPricePolyptychV5 | `0xE573cfcEb462A9500741e60452756bFDcA726f22` |
| MinterSetPricePolyptychERC20V5 | `0x8651eFeBA58F94A3785113B6Bc60a50Aa305df4c` |
| MinterDAExpV5 | `0x4A339cEaB9862782B7a78FD89a7003F65a604373` |
| MinterDALinV5 | `0xe35f98a29c37f805d4cFaD44d97562Dea3CcffA1` |
| MinterDAExpSettlementV3 | `0xF8ad843D1022d4752e938435e3EaC65d81dF2fbb` |
| MinterDAExpHolderV5 | `0xc4550De36d32b9822659Df4cEE37473B7A52163A` |
| MinterDALinHolderV5 | `0x0D39AB55664007ff2d089A25480f169C6D0597Bb` |

### 9. `MAIN_CONFIG.shape.prod` — done

Filled in `scripts/util/constants.ts` (`engineFactory`, `sharedMinterFilter`, `sharedRandomizer`, `universalBytecodeStorageReader`).

### 10. On-chain bootstrap — complete

All permissioned infra and shared suite contracts are deployed; `AdminACLV0` super admin is Admin Safe `0x75EADBfbbc0ac884DBdfBcFc443A561Ce3fa9235`.

**Remaining (off-chain / studio):**

1. **Off-chain:** register `chain_id: 360` in Hasura prod
2. **Studio deploys:** `yarn deploy:v3-engine:shape:txbuilder` when ready

## Engine / studio batch deploys

Deployment configs should use:

```typescript
export const deployNetworkConfiguration = {
  network: "shape",
  environment: "prod",
  useLedgerSigner: true,
  useGnosisSafe: true,
  safeAddress: "0x279c2BEE983b73ba4035Ef5c8aD059CF2d0DB848", // Deployer Safe
  transactionServiceUrl: "", // not available on Shape yet — use txbuilder
  transactionHash: "",
};
```

Use `yarn deploy:v3-engine:shape:txbuilder` until Safe Transaction Service supports chain 360.

## Yarn commands

```bash
yarn deploy:shared-randomizer:shape
yarn deploy:shared-minter-filter:shape
yarn deploy:shared-minters:shape
yarn deploy:v3-engine:shape:txbuilder
yarn post-deploy:v3-engine:shape
```
