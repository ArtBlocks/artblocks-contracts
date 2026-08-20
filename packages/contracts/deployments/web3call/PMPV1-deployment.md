# Deployments: PMPV1

## Description

PMPV1 is a minimal successor to PMPV0. It shares the identical `IPMPV0` / `IWeb3Call` ABI and
constructor, and differs from V0 in two ways:

1. `pmpLockedAfterTimestamp` is enforced as **both** a configuration lock (unchanged from PMPV0)
   **and** a value lock. Once a param's lock timestamp has passed, no party may configure that
   param's value on any token (`configureTokenParams` reverts with `"PMP: param is locked"`).
   This makes the Creator Dashboard's "Lock Date" ("values cemented permanently") true on-chain.
2. A locked param **definition** may be restated in a later `configureProject` call if and only
   if every artist-configured field is identical to storage. This lets the artist add or edit
   still-unlocked params without rewriting locked ones. Omitting a locked key is still allowed
   (it drops out of the active key list). Any difference reverts. Locked definition fields are
   never written; only `highestConfigNonce` is bumped so the key stays in the active config.

- Source: `contracts/web3call/PMPV1.sol`
- Diff vs PMPV0: value-lock check in `_validatePMPInputAndAuth`, plus locked-key pass-through
  in `configureProject`.

## Deployment method

Permissionless keyless CREATE2 via the `0age` ImmutableCreate2Factory
(`0x0000000000ffe8b47b3e2130213b802212439497`), same factory PMPV0 used. The address is identical on
every chain because the init code is identical on every chain — the single constructor argument
(delegate.xyz v2 `DelegateRegistry`) is the same address on all target chains.

Use the `scripts/create2-deploy/` tooling. Add this entry to `scripts/create2-deploy/config.ts`,
then run `yarn hardhat run scripts/create2-deploy/index.ts` and drive the local UI:

```typescript
export const deployConfigs: DeployConfig[] = [
  {
    contractName: "PMPV1",
    args: ["0x00000000000000447e69651d841bd8d104bed493"], // delegate.xyz v2 DelegateRegistry
    libraries: {},
    chainIds: [1, 42161, 8453, 360, 11155111], // mainnet, arbitrum, base, shape, sepolia
  },
];
```

### Init code (deterministic — regenerate if the contract changes)

- **initcodeHash:** `0xf2a6ba173039b35c4341a69f7b422d7e7e0bc76216d4cbc76ca18aff12346658`
- Address with all-zero salt: `0xb380B5c5A1d98Ebcc669feF89bCe0B3db1f36292`

### Salt strategy (mirrors PMPV0)

PMPV0 used two salts:

- A **mined vanity salt** → address `0x00000000A78E…`, used on mainnet, arbitrum, base, shape, **and
  sepolia-staging** (so staging shares the production address).
- The **all-zero salt** → a distinct address, used on **sepolia-dev** (a separate instance on the
  same Sepolia chain).

Do the same for PMPV1. The vanity salt's first 20 bytes are **zero** (permissionless on the 0age
factory — `containsCaller` allows first 20 bytes to equal `msg.sender` or be zero). Anyone can
deploy the vanity instances. Sepolia-dev uses the all-zero salt (also permissionless).

| Instance                                        | Salt                                                                 | Address                                                             |
| ----------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| mainnet, arbitrum, base, shape, sepolia-staging | `0x0000000000000000000000000000000000000000119450434c6eff48ef020040` | `0x00000000B9D3B2461fcFd5D23FCA65227B770f67` (4 leading zero bytes) |
| sepolia-dev                                     | `0x00…00` (all-zero)                                                 | `0xb380B5c5A1d98Ebcc669feF89bCe0B3db1f36292`                        |

> ⚠️ The initcodeHash changes if PMPV1's bytecode changes. Always regenerate the hash from the
> current build before mining a salt or deploying.

## Target chains

Deploy to every chain PMPV0 is on: mainnet (1), arbitrum (42161), base (8453), shape (360),
sepolia-staging (11155111, vanity salt), sepolia-dev (11155111, zero salt).

## Results

vanity salt: `0x0000000000000000000000000000000000000000119450434c6eff48ef020040`
(first 20 bytes zero / permissionless;
used for mainnet/arbitrum/base/shape/sepolia-staging)
vanity address: `0x00000000B9D3B2461fcFd5D23FCA65227B770f67` (shared across those chains)
sepolia-dev (zero salt) address: `0xb380B5c5A1d98Ebcc669feF89bCe0B3db1f36292`

### Deployment transactions

All deployed and source-verified (verified `pmpType()` returns `"PMPV1"`; on-chain code identical
across all vanity instances).

| Chain                      | Address                                      | Salt   | Deploy tx                                                                                                                   | Verified                  |
| -------------------------- | -------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| mainnet (1)                | `0x00000000B9D3B2461fcFd5D23FCA65227B770f67` | vanity | [`0x2f81cef0…20421f26`](https://etherscan.io/tx/0x2f81cef01a7ca7af944e271da99b240f4fe3801be84850caa98817d820421f26)          | ✅ Etherscan              |
| arbitrum (42161)           | `0x00000000B9D3B2461fcFd5D23FCA65227B770f67` | vanity | [`0xb638d930…6908fcc8`](https://arbiscan.io/tx/0xb638d93064b2ffda4290329a7d5a77afe95aac0bedcb33050fd4b00c6908fcc8)          | ✅ Arbiscan               |
| base (8453)                | `0x00000000B9D3B2461fcFd5D23FCA65227B770f67` | vanity | [`0x6f45ecf4…783ac7d1`](https://basescan.org/tx/0x6f45ecf411609b352fbec48f2501362553c8392ba3065238f6ec9eee783ac7d1)         | ✅ Basescan               |
| shape (360)                | `0x00000000B9D3B2461fcFd5D23FCA65227B770f67` | vanity | [`0x652bd490…5bba5232`](https://shapescan.xyz/tx/0x652bd490b178c9c1226fddabb14a79af58cd7b95a941a36838681db05bba5232)        | ✅ Shapescan (Blockscout) |
| sepolia-staging (11155111) | `0x00000000B9D3B2461fcFd5D23FCA65227B770f67` | vanity | [`0x81261172…84a17aaa`](https://sepolia.etherscan.io/tx/0x8126117259bc89657da72098267d6f8b93f7cb2a443c91d199228b4984a17aaa) | ✅ Etherscan              |
| sepolia-dev (11155111)     | `0xb380B5c5A1d98Ebcc669feF89bCe0B3db1f36292` | zero   | [`0x809d01a6…09315e10`](https://sepolia.etherscan.io/tx/0x809d01a6d87b7ced5e922074fa57d549f3176fc8e38a31111fd1e89309315e10) | ✅ Etherscan              |

> Shape verification note: `shapescan.xyz` is a **Blockscout** explorer, so it must be verified via
> the `blockscout` provider in `hardhat.config.ts` (not `etherscan.customChains`, which routes Shape
> through the unsupported Etherscan V2 API). Command used:
> `hardhat verify --network shape --contract contracts/web3call/PMPV1.sol:PMPV1 <addr> <delegateRegistry>`.

## Notes

- No PMPV1-specific interface is needed; existing `IPMPV0` bindings work unchanged.
- Follow-on (separate effort): route new projects to PMPV1 while continuing to support existing
  projects on PMPV0.
