# Deployments: PMPConfigureLockHook — Primavera (mainnet)

## Purpose

One-off configure hook that patches the PMPV0 value-lock gap for **Primavera** by Baret LaVida.
After each `canon*` param's lock timestamp passes, the hook reverts any further value writes,
rolling back the collector's `configureTokenParams()` transaction. Enforcement is per-key, matching
the project's existing PMPV0 `pmpLockedAfterTimestamp` values.

- Contract: `contracts/web3call/configure-hooks/PMPConfigureLockHook.sol`
- Project: `Primavera` — core `0x000019bd92633e9e00dc08adb0d0dffb00a1fe2a`, projectId `0`
- PMPV0: `0x00000000a78e278b2d2e2935faebe19ee9f1ff14`

## Locked params (from PMPV0 config)

| key | paramType | auth | lock date (UTC) | unix |
|---|---|---|---|---|
| `canonYear` | Uint256Range | ArtistAndTokenOwner | 2027-06-21T14:10:00 | 1813587000 |
| `canonHour` | Uint256Range | ArtistAndTokenOwner | 2027-06-21T14:10:00 | 1813587000 |
| `canonMinute` | Uint256Range | ArtistAndTokenOwner | 2027-06-21T14:10:00 | 1813587000 |
| `canonMonth` | Uint256Range | ArtistAndTokenOwner | 2027-06-21T14:10:00 | 1813587000 |
| `canonDay` | Uint256Range | ArtistAndTokenOwner | 2027-06-21T14:10:00 | 1813587000 |

✅ **Unix values confirmed via the Art Blocks MCP indexer** (on-chain-sourced
`pmp_locked_after_timestamp`, UTC). All five `canon*` keys share the same lock: `1813587000`.
Pass these exact values to the constructor.

## Init code — `scripts/create2-deploy/`

Add to `scripts/create2-deploy/config.ts`, then run `yarn hardhat run scripts/create2-deploy/index.ts`:

```typescript
export const deployConfigs: DeployConfig[] = [
  {
    contractName: "PMPConfigureLockHook",
    args: [
      ["canonYear", "canonHour", "canonMinute", "canonMonth", "canonDay"],
      [1813587000, 1813587000, 1813587000, 1813587000, 1813587000],
    ],
    libraries: {},
    chainIds: [1], // mainnet only
  },
];
```

- **initcodeHash:** `0x5c48b0e9f68539134f8999f806e97149f21e20c07587d98230180d144e0b2386`
- Address with all-zero salt: `0x13BFaD75728b6c070bf2585A2fe809Df468Af8Cb`

Vanity is not required for a one-off hook; the all-zero salt address above is a fine deploy target.
All five `canon*` keys share the same lock (`1813587000`). Regenerate the hash if the args change.

## Artist handoff — registration call

Pre-check (indexer snapshot): Primavera has **no** existing post-config or augment hook, so passing
`address(0)` for the augment slot is safe. Re-confirm at handoff time via `getProjectConfig`.

The artist (Baret LaVida) registers the hook:

```solidity
PMPV0.configureProjectHooks(
    0x000019bd92633e9e00dc08adb0d0dffb00a1fe2a, // coreContract
    0,                                          // projectId
    0x13BFaD75728b6c070bf2585A2fe809Df468Af8Cb, // tokenPMPPostConfigHook (deployed)
    address(0)                                  // tokenPMPReadAugmentationHook (none exists)
);
```

Note (residual trust): the lock only holds while this hook stays registered; the artist could later
unregister it. Communicate this at handoff.

## Results

salt: `0x0000000000000000000000000000000000000000000000000000000000000000` (all-zero)
Deployed to address: [`0x13BFaD75728b6c070bf2585A2fe809Df468Af8Cb`](https://etherscan.io/address/0x13BFaD75728b6c070bf2585A2fe809Df468Af8Cb) — ✅ verified on Etherscan
initcodeHash: `0x5c48b0e9f68539134f8999f806e97149f21e20c07587d98230180d144e0b2386`

On-chain sanity check (post-deploy): `lockedKeysLength() == 5`; all five `canon*` keys return
`lockedAfter == 1813587000`; ERC165 OK.

### Deployment transactions

- mainnet: [`0x842a17ce…71f5b1c42`](https://etherscan.io/tx/0x842a17cefc1bc13160f86e7f1ad7765c28df115f3e9b6fb3e2c98bc71f5b1c42)
