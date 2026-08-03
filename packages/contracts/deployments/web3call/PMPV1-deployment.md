# Deployments: PMPV1

## Description

PMPV1 is a minimal successor to PMPV0. It shares the identical `IPMPV0` / `IWeb3Call` ABI and
constructor, and differs by a single behavioral change: `pmpLockedAfterTimestamp` is enforced as
**both** a configuration lock (unchanged from PMPV0) **and** a value lock. Once a param's lock
timestamp has passed, no party may configure that param's value on any token
(`configureTokenParams` reverts with `"PMP: param is locked"`). This makes the Creator Dashboard's
"Lock Date" ("values cemented permanently") true on-chain.

- Source: `contracts/web3call/PMPV1.sol`
- The only diff vs PMPV0 is a lock check added near the top of `_validatePMPInputAndAuth`.

## Deployment method

Permissionless keyless CREATE2, same as PMPV0 — matching cross-chain address because the single
constructor argument (delegate.xyz v2 `DelegateRegistry`) is identical on every chain.

Init code inputs for `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "PMPV1",
  args: ["0x00000000000000447e69651d841bd8d104bed493"], // delegate.xyz v2 DelegateRegistry
  libraries: {},
};
```

## Target chains

Deploy to every chain PMPV0 is on: mainnet, arbitrum, base, shape, sepolia-staging, sepolia-dev.

## Results (fill in on deploy)

salt: `TBD`
Deploys to address: `TBD` (should be identical across chains)

### Deployment transactions

- mainnet: `TBD`
- arbitrum: `TBD`
- base: `TBD`
- shape: `TBD`
- sepolia-staging: `TBD`
- sepolia-dev: `TBD`

## Notes

- No PMPV1-specific interface is needed; existing `IPMPV0` bindings work unchanged.
- Follow-on (separate effort): route new projects to PMPV1 while continuing to support existing
  projects on PMPV0.
