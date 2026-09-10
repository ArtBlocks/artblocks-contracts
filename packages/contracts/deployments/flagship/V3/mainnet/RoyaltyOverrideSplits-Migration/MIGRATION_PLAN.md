# Royalty Override Splitter Migration Plan

## Mainnet Art Blocks Core Contracts

This document describes the migration of royalty override infrastructure for
Art Blocks core contracts (flagship + partnership) to a new
`GenArt721RoyaltyOverrideSplits` shim, and the associated AdminACL migrations
required for V3 core contracts.

---

## Scope

### Core Contracts

| Label | Contract | Address | Admin Model |
|---|---|---|---|
| V0 Flagship | GenArt721 | `0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a` | `admin()` returns EOA |
| V1 Flagship | GenArt721 | `0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270` | `admin()` returns EOA |
| V3 Flagship | GenArt721CoreV3 | `0x99a9B7c1116f9ceEB1652de04d5969CcE509B069` | `admin()` returns AdminACL (`0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82`) |
| Pace | Art Blocks x Pace | `0x64780CE53f6e966E18a22AF13a2F97369580ec11` | `admin()` returns AB multisig EOA directly |
| Pace V3 | Art Blocks x Pace (V3) | `0xeA698596b6009A622C3eD00dD5a8b5d1CAE4fC36` | `admin()` returns AdminACL (`0x4F68170A7b3C9B52780289ab2E50a5C26b08B09C`) |
| Bright Moments | Art Blocks x Bright Moments | `0x145789247973c5D612bf121E9E4eef84b63eb707` | `admin()` returns AdminACL (`0x4F68170A7b3C9B52780289ab2E50a5C26b08B09C`) |
| Collabs | Collaborations | `0x942BC2d3e7a589FE5bd4A5C6eF9727DFd82F5C8a` | `admin()` returns AdminACL (`0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82`) |

### Excluded (already ERC-2981 compliant)

- Curated Flex (`0xAB00000000002ADE39f58F9D8278a31574fFBe77`) — 10 projects
- All Art Blocks Studio contracts (~55 projects) — per-artist Engine contracts

### Infrastructure

| Contract | Address |
|---|---|
| Royalty Registry (proxy) | `0xaD2184FB5DBcfC05d8f056542fB25b04fa32A95D` |
| Royalty Registry (impl) | `0xd389340d95c851655dD99c5781be1c5e39d30B31` |
| Previous royalty shim | `0x7B5369c24a47A72eCF932bf6974f506dDE4D5Eb1` |
| Current V3 Flagship + Collabs AdminACL (AdminACLV1) | `0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82` |
| Current Pace V3 + Bright Moments AdminACL | `0x4F68170A7b3C9B52780289ab2E50a5C26b08B09C` |
| **New royalty shim (GenArt721RoyaltyOverrideSplits)** | `0xF45a3Ee084a56d6A985B8Ba355E27D58398970ff` |
| **New AdminACL (AdminACLV0RoyaltyRegistry)** | `0xa102DF42e9cAa7a7A2aa8b104Bdc8425B6B23632` |

---

## New Contracts to Deploy

### 1. GenArt721RoyaltyOverrideSplits

**Source:** `contracts/royalty-registry/GenArt721RoyaltyOverrideSplits.sol`
**Deployed:** [`0xF45a3Ee084a56d6A985B8Ba355E27D58398970ff`](https://etherscan.io/address/0xF45a3Ee084a56d6A985B8Ba355E27D58398970ff)
**TX:** [0xfcd6bd5e7c90591500671eb1997c321a9a458699d240fc83bb454ac2ee79e1f8](https://etherscan.io/tx/0xfcd6bd5e7c90591500671eb1997c321a9a458699d240fc83bb454ac2ee79e1f8)

A royalty override shim that maps `(coreContract, projectId) → (splitter, bps)`
entirely via admin-configured state. No data is sourced from the underlying core
contracts. The owner configures each project's royalty splitter address and BPS
value. `getRoyalties` returns a single recipient (the splitter) and the
configured BPS.

**Constructor args:**
- `owner_`: `0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283` (Art Blocks multisig)

### 2. AdminACLV0RoyaltyRegistry

**Source:** `contracts/AdminACLV0RoyaltyRegistry.sol`
**Deployed:** [`0xa102DF42e9cAa7a7A2aa8b104Bdc8425B6B23632`](https://etherscan.io/address/0xa102DF42e9cAa7a7A2aa8b104Bdc8425B6B23632)
**TX:** [0x1aa9bca3fc7c578f30769a102e7aa245f3418920263a19738bfeb26c38aee701](https://etherscan.io/tx/0x1aa9bca3fc7c578f30769a102e7aa245f3418920263a19738bfeb26c38aee701)

An AdminACLV0-based contract with a single additional function:
`setRoyaltyLookupAddressOn(royaltyRegistry, tokenAddress, royaltyLookupAddress)`.

This is needed because the V3 core contract returns the AdminACL address from
`admin()`, and the Royalty Registry's `overrideAllowed` check requires
`msg.sender == admin()`. The current AdminACLV1 has no capability to call
`setRoyaltyLookupAddress` on the Royalty Registry.

**Constructor args:**
- `superAdmin_`: `0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283` (Art Blocks multisig)

---

## AdminACL Migration Regression Analysis

Applies to all 4 V3 cores being migrated to `AdminACLV0RoyaltyRegistry`.

Two existing AdminACL contracts are in use:
- `0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82` — serves V3 Flagship + Collabs
- `0x4F68170A7b3C9B52780289ab2E50a5C26b08B09C` — serves Pace V3 + Bright Moments

Both have superAdmin `0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283` (AB multisig).
The regression analysis below applies to all four migrations.

### What AdminACLV1 has that AdminACLV0 does NOT

**Payment Approver Delegation (REMOVED)**

AdminACLV1 maintains an `EnumerableSet` of payment approver addresses. These
addresses are allowed to call `adminAcceptArtistAddressesAndSplits` on the core
contract — allowing non-superAdmin wallets to approve artist-proposed payment
address changes.

In the new AdminACLV0-based contract, the `allowed()` function simply returns
`superAdmin == _sender` for ALL selectors. Only the superAdmin can perform any
admin action, including artist payment approval.

**Impact:**
- Any addresses currently in the `_paymentApprovers` set on the deployed
  AdminACLV1 will **permanently lose** their delegated artist payment approval
  capability upon migration.
- Going forward, only the superAdmin wallet can approve artist payment changes
  on the V3 core.

**Risk assessment:** LOW. This is a simplification that reduces the attack
surface. The superAdmin (multisig) retains full control. Payment approver
delegation was a convenience feature, not a security-critical one.

### What AdminACLV0RoyaltyRegistry adds over AdminACLV0

**Royalty Registry Integration (NEW)**

`setRoyaltyLookupAddressOn(royaltyRegistry, tokenAddress, royaltyLookupAddress)`
allows the superAdmin to configure the Royalty Registry lookup address for any
core contract that reports this AdminACL as its `admin()`.

### What is identical

- `superAdmin` model (single super-admin passes all ACL checks)
- `changeSuperAdmin` (transfer super-admin role)
- `transferOwnershipOn` (migrate to a new AdminACL, with IAdminACLV0 ERC165
  check on the new contract)
- `renounceOwnershipOn`
- `allowed()` (returns `true` only for `superAdmin`)
- ERC165 support for `IAdminACLV0` and `IAdminACLV0_Extended`

### Pre-migration checklist

- [ ] Verify no payment approvers are currently configured on AdminACL
      `0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82` (V3 Flagship + Collabs)
- [ ] Verify no payment approvers are currently configured on AdminACL
      `0x4F68170A7b3C9B52780289ab2E50a5C26b08B09C` (Pace V3 + Bright Moments)
- [ ] If payment approvers exist on either, document them and confirm their
      removal is acceptable
- [ ] Confirm superAdmin is `0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283` on
      both AdminACLs

---

## Migration Steps

### Prerequisites

- [ ] All contracts verified on Etherscan
- [ ] Fork tests pass (simulating the full migration sequence)
- [ ] superAdmin address confirmed as `0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283`
      on both AdminACLs (`0x18b1…` and `0x4F68…`)
- [ ] Royalty splitter contracts deployed and verified for all relevant projects
- [ ] BPS values confirmed for each project's royalty configuration

### Phase 1: Deploy New Contracts — COMPLETED

**Step 1.1** — Deploy `GenArt721RoyaltyOverrideSplits` — **DONE**
- Deployed via immutable CREATE2 factory (`0x0000000000ffe8b47b3e2130213b802212439497`)
- Constructor arg: `owner_ = 0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283`
- Address: `0xF45a3Ee084a56d6A985B8Ba355E27D58398970ff`
- Verified on Etherscan

**Step 1.2** — Deploy `AdminACLV0RoyaltyRegistry` — **DONE**
- Deployed via immutable CREATE2 factory (`0x0000000000ffe8b47b3e2130213b802212439497`)
- Constructor arg: `superAdmin_ = 0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283`
- Address: `0xa102DF42e9cAa7a7A2aa8b104Bdc8425B6B23632`
- Verified on Etherscan

### Phase 2: Configure Royalty Splitters — COMPLETED

**Step 2.1** — On `GenArt721RoyaltyOverrideSplits` (`0xF45a3Ee084a56d6A985B8Ba355E27D58398970ff`),
call `setRoyaltyConfig` for each `(coreContract, projectId)` that requires
royalty configuration — **DONE**

- Executed via multisig batch (Gnosis Safe TX Builder): `deployments/royalty-registry/mainnet/set-royalty-config-txbuilder.json` (490 `setRoyaltyConfig` calls)
- Source mapping: `deployments/royalty-registry/mainnet/royalty-config-mapping.tsv`

**490 total projects** across 7 core contracts:

| Core | Contract | Projects |
|---|---|---|
| V0 Flagship | `0x059EDD72…` | 3 |
| V1 Flagship | `0xa7d8d9ef…` | 359 |
| V3 Flagship | `0x99a9B7c1…` | 115 |
| Pace | `0x64780CE5…` | 5 |
| Pace V3 | `0xeA698596…` | 3 |
| Bright Moments | `0x14578924…` | 2 |
| Collabs | `0x942BC2d3…` | 3 |

All projects use **750 BPS** except Lucky Clover (V3 project 478) which uses
**250 BPS**.

Full mapping: `deployments/royalty-registry/mainnet/royalty-config-mapping.tsv`

For each project:
- `setRoyaltyConfig(coreContract, projectId, splitterAddress, bps)`
- Verify each configuration via `royaltyConfigs(coreContract, projectId)`

**CRITICAL:** Splitter contracts and BPS values must be correct BEFORE the
royalty registry is pointed to the new shim. Once the registry points to the new
shim, misconfigured projects will revert on `getRoyalties` (which is safe — the
registry will fall through — but may cause unexpected behavior on marketplaces).

### Phase 3: EOA-Admin Contracts — Update Royalty Registry Lookup

For contracts where `admin()` returns an EOA, the EOA can directly call
`setRoyaltyLookupAddress` on the Royalty Registry.

**Step 3.1** — V0 Flagship: from admin EOA, call on Royalty Registry proxy
(`0xaD2184FB5DBcfC05d8f056542fB25b04fa32A95D`):
```
setRoyaltyLookupAddress(
    0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a,  // V0 core
    0xF45a3Ee084a56d6A985B8Ba355E27D58398970ff   // GenArt721RoyaltyOverrideSplits
)
```

**Step 3.2** — V1 Flagship: from admin EOA, call on Royalty Registry proxy:
```
setRoyaltyLookupAddress(
    0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270,  // V1 core
    0xF45a3Ee084a56d6A985B8Ba355E27D58398970ff   // GenArt721RoyaltyOverrideSplits
)
```

**Step 3.3** — Pace (V1-era): from AB multisig EOA, call on Royalty Registry proxy — **DONE**
```
setRoyaltyLookupAddress(
    0x64780CE53f6e966E18a22AF13a2F97369580ec11,  // Art Blocks x Pace
    0xF45a3Ee084a56d6A985B8Ba355E27D58398970ff   // GenArt721RoyaltyOverrideSplits
)
```

### Phase 4: V3 Cores — AdminACL Migration + Royalty Registry Update

V3 core contracts return the AdminACL address from `admin()`. The Royalty
Registry requires `msg.sender == admin()` to authorize overrides. The existing
AdminACLs on these contracts lack the ability to call `setRoyaltyLookupAddress`.
Therefore, we must migrate each to the new `AdminACLV0RoyaltyRegistry`.

**The following 4 V3 contracts require this flow:**

| Core | Address | Current AdminACL | superAdmin |
|---|---|---|---|
| V3 Flagship | `0x99a9B7c1116f9ceEB1652de04d5969CcE509B069` | `0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82` | `0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283` |
| Pace V3 | `0xeA698596b6009A622C3eD00dD5a8b5d1CAE4fC36` | `0x4F68170A7b3C9B52780289ab2E50a5C26b08B09C` | `0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283` |
| Bright Moments | `0x145789247973c5D612bf121E9E4eef84b63eb707` | `0x4F68170A7b3C9B52780289ab2E50a5C26b08B09C` | `0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283` |
| Collabs | `0x942BC2d3e7a589FE5bd4A5C6eF9727DFd82F5C8a` | `0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82` | `0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283` |

> **Note:** V3 Flagship and Collabs share the same AdminACL
> (`0x18b18cF97…`). Pace V3 and Bright Moments share a different AdminACL
> (`0x4F68170A…`). All four have the same superAdmin (AB multisig).
> Each `transferOwnershipOn` call migrates a single core contract
> independently — the shared AdminACL does not create ordering dependencies.

**For each V3 core, repeat Steps 4.1–4.3:**

**Step 4.1** — Verify the new `AdminACLV0RoyaltyRegistry` superAdmin is set to
the correct multisig address (`0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283`).
Call `superAdmin()` on `0xa102DF42e9cAa7a7A2aa8b104Bdc8425B6B23632`.

**Step 4.2** — From the current AdminACL of each V3 core, call — **DONE** (all four cores migrated)
```
transferOwnershipOn(
    <V3 core address>,
    0xa102DF42e9cAa7a7A2aa8b104Bdc8425B6B23632   // AdminACLV0RoyaltyRegistry
)
```

Concrete `transferOwnershipOn` calls (all called by superAdmin `0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283`) — **executed:**

**V3 Flagship** — call on `0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82`:
```
transferOwnershipOn(0x99a9B7c1116f9ceEB1652de04d5969CcE509B069, 0xa102DF42e9cAa7a7A2aa8b104Bdc8425B6B23632)
```

**Pace V3** — call on `0x4F68170A7b3C9B52780289ab2E50a5C26b08B09C`:
```
transferOwnershipOn(0xeA698596b6009A622C3eD00dD5a8b5d1CAE4fC36, 0xa102DF42e9cAa7a7A2aa8b104Bdc8425B6B23632)
```

**Bright Moments** — call on `0x4F68170A7b3C9B52780289ab2E50a5C26b08B09C`:
```
transferOwnershipOn(0x145789247973c5D612bf121E9E4eef84b63eb707, 0xa102DF42e9cAa7a7A2aa8b104Bdc8425B6B23632)
```

**Collabs** — call on `0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82`:
```
transferOwnershipOn(0x942BC2d3e7a589FE5bd4A5C6eF9727DFd82F5C8a, 0xa102DF42e9cAa7a7A2aa8b104Bdc8425B6B23632)
```

**CRITICAL SAFETY CHECK after each Step 4.2:** (completed for all four cores)
- [x] Verify `owner()` on each V3 core returns the new AdminACL address
- [x] Verify `admin()` on each V3 core returns the new AdminACL address
- [x] Verify `superAdmin()` on the new AdminACL still returns the multisig
- [x] Verify the multisig can still call admin functions on each V3 core

**Step 4.3** — From the new `AdminACLV0RoyaltyRegistry`
(`0xa102DF42e9cAa7a7A2aa8b104Bdc8425B6B23632`) via superAdmin, call for each — **DONE** (all four V3 cores)
```
setRoyaltyLookupAddressOn(
    0xaD2184FB5DBcfC05d8f056542fB25b04fa32A95D,  // Royalty Registry proxy
    <V3 core address>,
    0xF45a3Ee084a56d6A985B8Ba355E27D58398970ff   // GenArt721RoyaltyOverrideSplits
)
```

Concrete calls — **executed** for each V3 core:

**V3 Flagship:**
```
setRoyaltyLookupAddressOn(0xaD2184FB5DBcfC05d8f056542fB25b04fa32A95D, 0x99a9B7c1116f9ceEB1652de04d5969CcE509B069, 0xF45a3Ee084a56d6A985B8Ba355E27D58398970ff)
```

**Pace V3:**
```
setRoyaltyLookupAddressOn(0xaD2184FB5DBcfC05d8f056542fB25b04fa32A95D, 0xeA698596b6009A622C3eD00dD5a8b5d1CAE4fC36, 0xF45a3Ee084a56d6A985B8Ba355E27D58398970ff)
```

**Bright Moments:**
```
setRoyaltyLookupAddressOn(0xaD2184FB5DBcfC05d8f056542fB25b04fa32A95D, 0x145789247973c5D612bf121E9E4eef84b63eb707, 0xF45a3Ee084a56d6A985B8Ba355E27D58398970ff)
```

**Collabs:**
```
setRoyaltyLookupAddressOn(0xaD2184FB5DBcfC05d8f056542fB25b04fa32A95D, 0x942BC2d3e7a589FE5bd4A5C6eF9727DFd82F5C8a, 0xF45a3Ee084a56d6A985B8Ba355E27D58398970ff)
```

### Phase 5: Post-Migration Verification

- [ ] For each of the 7 core contracts, verify `getRoyaltyLookupAddress(coreContract)`
      on the Royalty Registry returns the new shim address
- [ ] For a sample token on each core contract, call `getRoyalties` on the new
      shim and verify correct splitter address and BPS are returned
- [ ] Verify marketplace royalty behavior (e.g. OpenSea, Blur) for tokens from
      each core contract
- [ ] Verify superAdmin on new AdminACL can perform admin operations on all 4
      V3 cores (V3 Flagship, Pace V3, Bright Moments, Collabs)

---

## Rollback Plan

### V0, V1, and Pace (EOA-admin) Contracts

The admin EOA can call `setRoyaltyLookupAddress` on the Royalty Registry to
point back to the old shim (`0x7B5369c24a47A72eCF932bf6974f506dDE4D5Eb1`) or
set to `address(0)` to clear the override entirely.

### V3 Cores (AdminACL-managed)

The new `AdminACLV0RoyaltyRegistry` supports `transferOwnershipOn`, so the
superAdmin can migrate to any AdminACL that supports `IAdminACLV0`. The new
AdminACL can also call `setRoyaltyLookupAddressOn` to point back to the old shim
or clear.

For the V3 Flagship, to roll back to the original AdminACLV1 at
`0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82`: call `transferOwnershipOn(V3Core,
0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82)` from the new AdminACL. The old
AdminACLV1 still exists on-chain, still supports `IAdminACLV0` (passes the
ERC165 check), and its `superAdmin` is unchanged — so the multisig would
immediately regain full control.

For the other V3 cores, the same rollback pattern applies — call
`transferOwnershipOn` from the new AdminACL to point back to their original
AdminACL:
- Pace V3 → `0x4F68170A7b3C9B52780289ab2E50a5C26b08B09C`
- Bright Moments → `0x4F68170A7b3C9B52780289ab2E50a5C26b08B09C`
- Collabs → `0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82`

---

## Transaction Summary

| Step | Caller | Target | Function | Critical | Status |
|---|---|---|---|---|---|
| 1.1 | Deployer | — | Deploy GenArt721RoyaltyOverrideSplits(`0xCF00…A283`) | | **DONE** |
| 1.2 | Deployer | — | Deploy AdminACLV0RoyaltyRegistry(`0xCF00…A283`) | | **DONE** |
| 2.x | Owner (`0xCF00…A283`) | `0xF45a…70ff` | `setRoyaltyConfig(...)` × 490 projects | | **DONE** |
| 3.1 | V0 admin EOA | `0xaD21…5DBc` | `setRoyaltyLookupAddress(V0, shim)` | YES | |
| 3.2 | V1 admin EOA | `0xaD21…5DBc` | `setRoyaltyLookupAddress(V1, shim)` | YES | |
| 3.3 | AB multisig EOA | `0xaD21…5DBc` | `setRoyaltyLookupAddress(Pace, shim)` | YES | **DONE** |
| 4.2a | superAdmin | `0x18b1…c82` | `transferOwnershipOn(V3 Flagship, 0xa102…632)` | **YES** | **DONE** |
| 4.2b | superAdmin | `0x4F68…B09C` | `transferOwnershipOn(Pace V3, 0xa102…632)` | **YES** | **DONE** |
| 4.2c | superAdmin | `0x4F68…B09C` | `transferOwnershipOn(Bright Moments, 0xa102…632)` | **YES** | **DONE** |
| 4.2d | superAdmin | `0x18b1…c82` | `transferOwnershipOn(Collabs, 0xa102…632)` | **YES** | **DONE** |
| 4.3a | superAdmin | `0xa102…632` | `setRoyaltyLookupAddressOn(registry, V3 Flagship, shim)` | YES | **DONE** |
| 4.3b | superAdmin | `0xa102…632` | `setRoyaltyLookupAddressOn(registry, Pace V3, shim)` | YES | **DONE** |
| 4.3c | superAdmin | `0xa102…632` | `setRoyaltyLookupAddressOn(registry, Bright Moments, shim)` | YES | **DONE** |
| 4.3d | superAdmin | `0xa102…632` | `setRoyaltyLookupAddressOn(registry, Collabs, shim)` | YES | **DONE** |

---

## Test Coverage (implemented)

### Unit Tests

- `test/royalty-registry/GenArt721RoyaltyOverrideSplits.test.ts` — 22 tests
  - Deployment (owner, MAX_BPS)
  - ERC165 interface support
  - setRoyaltyConfig (access control, zero-address, BPS bounds, updates,
    cross-contract independence)
  - removeRoyaltyConfig (access control, state cleanup)
  - getRoyalties (correct values, tokenId→projectId derivation, reverts on
    unconfigured)
  - royaltyConfigs view (introspection)

- `test/admin-acl/AdminACLV0RoyaltyRegistry.test.ts` — 14 tests
  - Deployment (superAdmin, AdminACLType)
  - ERC165 interface support (IAdminACLV0, IERC165)
  - allowed() (superAdmin vs non-superAdmin)
  - changeSuperAdmin (access control, state, old admin revoked)
  - transferOwnershipOn (access control, IAdminACLV0 ERC165 check)
  - renounceOwnershipOn (access control)
  - setRoyaltyLookupAddressOn (access control)

### Mainnet Fork Tests

- `test/royalty-registry/GenArt721RoyaltyOverrideSplits.fork.test.ts` — 5 tests

  Forks mainnet at a pinned block and exercises the full migration against real
  deployed contracts. Verifies:
  - Pre-migration state (V0/V1 admin is EOA, V3 admin is AdminACLV1)
  - Phase 1: Deploy new contracts on fork
  - Phase 2: Configure royalty splitters, verify via view + getRoyalties
  - Phase 3: V0/V1 admin EOA updates Royalty Registry lookup
  - Phase 4: AdminACL migration (transferOwnershipOn) + Royalty Registry update
    via new AdminACL's setRoyaltyLookupAddressOn
  - Phase 5: All three cores point to new shim, getRoyalties returns correct data
  - Reversibility: AdminACL ownership transferred back to original AdminACLV1,
    then re-migrated forward (full round-trip verified)

### Running Tests

```bash
# Unit tests only
npx hardhat test test/royalty-registry/GenArt721RoyaltyOverrideSplits.test.ts test/admin-acl/AdminACLV0RoyaltyRegistry.test.ts

# Fork tests (requires MAINNET_JSON_RPC_PROVIDER_URL in .env)
npx hardhat test test/royalty-registry/GenArt721RoyaltyOverrideSplits.fork.test.ts

# All tests
npx hardhat test test/royalty-registry/ test/admin-acl/AdminACLV0RoyaltyRegistry.test.ts
```
