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

## ⚠️ Artist confirmation required before deploy/registration — `Print Claimed`

`Print Claimed` is an **Artist-auth `Bool`** that locks on **2027-01-15** — a full year before the
other three params (2028-01-15). On plain PMPV0 today this flag is **not** frozen: the artist can
still flip it after the lock date. Registering this hook makes that lock real, so **after
2027-01-15 the artist can no longer set `Print Claimed` on any token**.

If any print-redemption / fulfillment flow writes `Print Claimed` after that date, this hook would
revert those writes. Before deploying and handing off, explicitly confirm with the artist (Rob Dixon
/ Radix) that:

1. Freezing `Print Claimed` on 2027-01-15 is intended (the date was set by the artist in the PMPV0
   config, presumably expecting the Dashboard's "values cemented permanently" semantics), **and**
2. No print-claim writes need to happen after that date.

If the answer to either is no, adjust the constructor timestamp for `Print Claimed` (or omit the key)
before deploying — the initcode hash and address below will change accordingly.

## Init code — `scripts/create2-deploy/`

Add to `scripts/create2-deploy/config.ts`, then run `yarn hardhat run scripts/create2-deploy/index.ts`:

```typescript
export const deployConfigs: DeployConfig[] = [
  {
    contractName: "PMPConfigureLockHook",
    args: [
      ["Print Claimed", "Shape Series", "Palette", "Brush"],
      [1800000060, 1831536060, 1831536060, 1831536060],
    ],
    libraries: {},
    chainIds: [1], // mainnet only
  },
];
```

- **initcodeHash:** `0x67e282522f8b2be791f40f8e43d836fe991932c6955144d825f4044d30b10212`
- Address with all-zero salt: `0x2Ca400b8152dE9318fa7c1EF960c5E79a6a3ACf5`

Vanity is not required for a one-off hook; the all-zero salt address above is a fine deploy target.
Regenerate the hash if the constructor args change.

## Artist handoff — registration call

Pre-check (indexer snapshot): Hatches has **no** existing post-config or augment hook, so passing
`address(0)` for the augment slot is safe. Re-confirm at handoff time via `getProjectConfig`.

The artist (Rob Dixon / Radix) registers the hook:

```solidity
PMPV0.configureProjectHooks(
    0x0000006693e685fcfc54c9d423b5e321b4a15192, // coreContract
    0,                                          // projectId
    0x2Ca400b8152dE9318fa7c1EF960c5E79a6a3ACf5, // tokenPMPPostConfigHook (deployed)
    address(0)                                  // tokenPMPReadAugmentationHook (none exists)
);
```

Note (residual trust): the lock only holds while this hook stays registered; the artist could later
unregister it. Communicate this at handoff.

> ⏳ Pending: `Print Claimed` lock-date (2027-01-15) confirmation from Rob Dixon. If he wants it
> changed, the hook must be re-deployed (new constructor args → new address) and re-registered.

## Results

salt: `0x0000000000000000000000000000000000000000000000000000000000000000` (all-zero)
Deployed to address: [`0x2Ca400b8152dE9318fa7c1EF960c5E79a6a3ACf5`](https://etherscan.io/address/0x2Ca400b8152dE9318fa7c1EF960c5E79a6a3ACf5) — ✅ verified on Etherscan
initcodeHash: `0x67e282522f8b2be791f40f8e43d836fe991932c6955144d825f4044d30b10212`

On-chain sanity check (post-deploy): `lockedKeysLength() == 4`; `lockedAfter` returns
`Print Claimed → 1800000060`, `Shape Series/Palette/Brush → 1831536060`; ERC165 OK.

### Deployment transactions

- mainnet: [`0xe16c5316…c75990c9b`](https://etherscan.io/tx/0xe16c53162377d4116c4e5623c76ac82cff95efb8093fe4e98369179c75990c9b)
