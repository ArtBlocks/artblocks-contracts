# Royalty Override Splitter Migration Plan

## Mainnet Flagship Core Contracts

This document describes the migration of royalty override infrastructure for the
three mainnet flagship Art Blocks core contracts to a new
`GenArt721RoyaltyOverrideSplits` shim, and the associated AdminACL migration
required for the V3 core contract.

---

## Scope

### Core Contracts

| Contract | Address | Admin Model |
|---|---|---|
| V0 Flagship | `0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a` | `admin()` returns EOA |
| V1 Flagship | `0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270` | `admin()` returns EOA |
| V3 Flagship | `0x99a9B7c1116f9ceEB1652de04d5969CcE509B069` | `admin()` returns AdminACL (`0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82`) |

### Infrastructure

| Contract | Address |
|---|---|
| Royalty Registry (proxy) | `0xaD2184FB5DBcfC05d8f056542fB25b04fa32A95D` |
| Royalty Registry (impl) | `0xd389340d95c851655dD99c5781be1c5e39d30B31` |
| Current royalty shim | `0x7B5369c24a47A72eCF932bf6974f506dDE4D5Eb1` |
| Current V3 AdminACL (AdminACLV1) | `0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82` |

---

## New Contracts to Deploy

### 1. GenArt721RoyaltyOverrideSplits

**Source:** `contracts/royalty-registry/GenArt721RoyaltyOverrideSplits.sol`

A royalty override shim that maps `(coreContract, projectId) → (splitter, bps)`
entirely via admin-configured state. No data is sourced from the underlying core
contracts. The owner configures each project's royalty splitter address and BPS
value. `getRoyalties` returns a single recipient (the splitter) and the
configured BPS.

**Constructor args:**
- `owner_`: Address of the owner wallet (Art Blocks multisig)

### 2. AdminACLV0RoyaltyRegistry

**Source:** `contracts/AdminACLV0RoyaltyRegistry.sol`

An AdminACLV0-based contract with a single additional function:
`setRoyaltyLookupAddressOn(royaltyRegistry, tokenAddress, royaltyLookupAddress)`.

This is needed because the V3 core contract returns the AdminACL address from
`admin()`, and the Royalty Registry's `overrideAllowed` check requires
`msg.sender == admin()`. The current AdminACLV1 has no capability to call
`setRoyaltyLookupAddress` on the Royalty Registry.

**Constructor args:** none (sets `superAdmin = msg.sender`)

---

## AdminACL Migration Regression Analysis: AdminACLV1 → AdminACLV0RoyaltyRegistry

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

- [ ] Verify no payment approvers are currently configured on AdminACLV1
      (`getNumPaymentApprovers()` on `0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82`)
- [ ] If payment approvers exist, document them and confirm their removal is
      acceptable
- [ ] Confirm the superAdmin address on the current AdminACLV1
      (`superAdmin()` on `0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82`)

---

## Migration Steps

### Prerequisites

- [ ] All contracts verified on Etherscan
- [ ] Fork tests pass (simulating the full migration sequence)
- [ ] superAdmin address confirmed on current AdminACLV1
- [ ] Royalty splitter contracts deployed and verified for all relevant projects
- [ ] BPS values confirmed for each project's royalty configuration

### Phase 1: Deploy New Contracts

**Step 1.1** — Deploy `GenArt721RoyaltyOverrideSplits`
- Constructor arg: Art Blocks multisig address as `owner_`
- Verify on Etherscan

**Step 1.2** — Deploy `AdminACLV0RoyaltyRegistry`
- Constructor sets `superAdmin = msg.sender`
- If deployed via OwnedCreate2Factory: follow up with `changeSuperAdmin` to
  transfer superAdmin to the Art Blocks multisig
- If deployed directly from multisig: superAdmin is already correct
- Verify on Etherscan

### Phase 2: Configure Royalty Splitters

**Step 2.1** — On `GenArt721RoyaltyOverrideSplits`, call `setRoyaltyConfig` for
each `(coreContract, projectId)` that requires royalty configuration.

For each of the three core contracts, configure every active project:
- `setRoyaltyConfig(coreContract, projectId, splitterAddress, bps)`
- Verify each configuration via `royaltyConfigs(coreContract, projectId)`

**CRITICAL:** Splitter contracts and BPS values must be correct BEFORE the
royalty registry is pointed to the new shim. Once the registry points to the new
shim, misconfigured projects will revert on `getRoyalties` (which is safe — the
registry will fall through — but may cause unexpected behavior on marketplaces).

### Phase 3: V0 and V1 Core — Update Royalty Registry Lookup

For V0 and V1 core contracts, the `admin()` function returns an EOA. That EOA
can directly call `setRoyaltyLookupAddress` on the Royalty Registry.

**Step 3.1** — From the V0 core admin EOA, call on the Royalty Registry proxy
(`0xaD2184FB5DBcfC05d8f056542fB25b04fa32A95D`):
```
setRoyaltyLookupAddress(
    0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a,  // V0 core
    <new GenArt721RoyaltyOverrideSplits address>
)
```

**Step 3.2** — From the V1 core admin EOA, call on the Royalty Registry proxy:
```
setRoyaltyLookupAddress(
    0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270,  // V1 core
    <new GenArt721RoyaltyOverrideSplits address>
)
```

### Phase 4: V3 Core — AdminACL Migration + Royalty Registry Update

The V3 core contract returns the AdminACL address from `admin()`. The Royalty
Registry requires `msg.sender == admin()` to authorize overrides. The current
AdminACLV1 cannot call `setRoyaltyLookupAddress`. Therefore, we must first
migrate the AdminACL.

**Step 4.1** — Verify the new `AdminACLV0RoyaltyRegistry` superAdmin is set to
the correct multisig address.

**Step 4.2** — From the current AdminACLV1 (`0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82`),
call:
```
transferOwnershipOn(
    0x99a9B7c1116f9ceEB1652de04d5969CcE509B069,  // V3 core
    <new AdminACLV0RoyaltyRegistry address>
)
```

This transfers ownership of the V3 core to the new AdminACL. The V3 core's
internal `adminACLContract` reference is updated atomically.

**CRITICAL SAFETY CHECK after Step 4.2:**
- [ ] Verify `owner()` on V3 core returns the new AdminACL address
- [ ] Verify `admin()` on V3 core returns the new AdminACL address
- [ ] Verify `superAdmin()` on the new AdminACL returns the multisig
- [ ] Verify the multisig can still call admin functions on V3 core (e.g.
      read-only check via `allowed()`)

**Step 4.3** — From the new `AdminACLV0RoyaltyRegistry` (via superAdmin), call:
```
setRoyaltyLookupAddressOn(
    0xaD2184FB5DBcfC05d8f056542fB25b04fa32A95D,  // Royalty Registry proxy
    0x99a9B7c1116f9ceEB1652de04d5969CcE509B069,  // V3 core
    <new GenArt721RoyaltyOverrideSplits address>
)
```

### Phase 5: Post-Migration Verification

- [ ] For each core contract, verify `getRoyaltyLookupAddress(coreContract)`
      on the Royalty Registry returns the new shim address
- [ ] For a sample token on each core contract, call `getRoyalties` on the new
      shim and verify correct splitter address and BPS are returned
- [ ] Verify marketplace royalty behavior (e.g. OpenSea, Blur) for tokens from
      each core contract
- [ ] Verify superAdmin on new AdminACL can perform admin operations on V3 core

---

## Rollback Plan

### V0 and V1 Core

The admin EOA can call `setRoyaltyLookupAddress` on the Royalty Registry to
point back to the old shim (`0x7B5369c24a47A72eCF932bf6974f506dDE4D5Eb1`) or
set to `address(0)` to clear the override entirely.

### V3 Core — AdminACL

The new `AdminACLV0RoyaltyRegistry` supports `transferOwnershipOn`, so the
superAdmin can migrate to any AdminACL that supports `IAdminACLV0`. The new
AdminACL can also call `setRoyaltyLookupAddressOn` to point back to the old shim
or clear.

To roll back to the original AdminACLV1 at
`0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82`: call `transferOwnershipOn(V3Core,
0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82)` from the new AdminACL. The old
AdminACLV1 still exists on-chain, still supports `IAdminACLV0` (passes the
ERC165 check), and its `superAdmin` is unchanged — so the multisig would
immediately regain full control of the V3 core through it.

---

## Transaction Summary

| Step | Caller | Target | Function | Critical |
|---|---|---|---|---|
| 1.1 | Deployer | — | Deploy GenArt721RoyaltyOverrideSplits | |
| 1.2 | Deployer | — | Deploy AdminACLV0RoyaltyRegistry | |
| 1.2b | Deployer (if factory) | AdminACLV0RoyaltyRegistry | `changeSuperAdmin(multisig, [...])` | |
| 2.x | Owner (multisig) | GenArt721RoyaltyOverrideSplits | `setRoyaltyConfig(...)` per project | |
| 3.1 | V0 admin EOA | Royalty Registry proxy | `setRoyaltyLookupAddress(V0, newShim)` | YES |
| 3.2 | V1 admin EOA | Royalty Registry proxy | `setRoyaltyLookupAddress(V1, newShim)` | YES |
| 4.2 | superAdmin (multisig) | AdminACLV1 | `transferOwnershipOn(V3, newAdminACL)` | **YES** |
| 4.3 | superAdmin (multisig) | AdminACLV0RoyaltyRegistry | `setRoyaltyLookupAddressOn(registry, V3, newShim)` | YES |

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
