# Deployments: PMPConfigureLockHook — Hatches (mainnet)

## Purpose

One-off configure hook that patches the PMPV0 value-lock gap for **Hatches** by Rob Dixon (Radix).
After each locked param's timestamp passes, the hook reverts any further value writes, rolling back
the collector's `configureTokenParams()` transaction. Enforcement is per-key, matching the project's
existing PMPV0 `pmpLockedAfterTimestamp` values (note: two different lock dates).

- Contract: `contracts/web3call/configure-hooks/PMPConfigureLockHook.sol`
- Project: `Hatches` — core `0x0000006693e685fcfc54c9d423b5e321b4a15192`, projectId `0`
- PMPV0: `0x00000000a78e278b2d2e2935faebe19ee9f1ff14`

## Locked params (from PMPV0 config)

| key | paramType | auth | lock date (UTC) | unix |
|---|---|---|---|---|
| `Print Claimed` | Bool | Artist | 2027-01-15T08:01:00 | 1800000060 |
| `Shape Series` | Int256Range | ArtistAndTokenOwner | 2028-01-15T08:01:00 | 1831536060 |
| `Palette` | Select | ArtistAndTokenOwner | 2028-01-15T08:01:00 | 1831536060 |
| `Brush` | Select | ArtistAndTokenOwner | 2028-01-15T08:01:00 | 1831536060 |

✅ **Unix values confirmed via the Art Blocks MCP indexer** (on-chain-sourced
`pmp_locked_after_timestamp`, UTC). Note the two distinct lock dates. The keys `Print Claimed`,
`Shape Series`, `Palette` contain spaces/caps — pass them byte-for-byte exactly as configured on
PMPV0 (the hook hashes the raw key string).

## Init code inputs for `scripts/get-init-code.ts`

```typescript
const inputs: T_Inputs = {
  contractName: "PMPConfigureLockHook",
  args: [
    ["Print Claimed", "Shape Series", "Palette", "Brush"],
    [1800000060, 1831536060, 1831536060, 1831536060],
  ],
  libraries: {},
};
```

## Artist handoff — registration call

Pre-check (indexer snapshot): Hatches has **no** existing post-config or augment hook, so passing
`address(0)` for the augment slot is safe. Re-confirm at handoff time via `getProjectConfig`.

The artist (Rob Dixon / Radix) registers the hook:

```solidity
PMPV0.configureProjectHooks(
    0x0000006693e685fcfc54c9d423b5e321b4a15192, // coreContract
    0,                                          // projectId
    <deployed PMPConfigureLockHook address>,    // tokenPMPPostConfigHook
    address(0)                                  // tokenPMPReadAugmentationHook (none exists)
);
```

Note (residual trust): the lock only holds while this hook stays registered; the artist could later
unregister it. Communicate this at handoff.

## Results (fill in on deploy)

salt: `TBD`
Deploys to address: `TBD`

### Deployment transactions

- mainnet: `TBD`
