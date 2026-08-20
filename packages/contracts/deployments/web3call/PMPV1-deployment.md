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

- **initcodeHash:** `0xf3ae2894412d3105c111dd2b6bb1d09c91aba015bb5c348ace4bdf34846293c3`
- Address with all-zero salt: `0x7A347a2D3B13a839b34d0004D44c2580a1bf9E39`

### Salt strategy (mirrors PMPV0)

PMPV0 used two salts:

- A **mined vanity salt** → address `0x00000000A78E…`, used on mainnet, arbitrum, base, shape, **and
  sepolia-staging** (so staging shares the production address).
- The **all-zero salt** → a distinct address, used on **sepolia-dev** (a separate instance on the
  same Sepolia chain).

Do the same for PMPV1:

| Instance                                        | Salt                                                                 | Address                                                             |
| ----------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| mainnet, arbitrum, base, shape, sepolia-staging | `0x00df4e8d293d57718aac0b18cbfbe128c5d484ef433143d2ba53f183c32e0008` | `0x00000000829C0278FBa4327efd97ab45493364cC` (4 leading zero bytes) |
| sepolia-dev                                     | `0x00…00` (all-zero)                                                 | `0x7A347a2D3B13a839b34d0004D44c2580a1bf9E39`                        |

The vanity salt's first 20 bytes are **caller-bound** to the deployer wallet
`0x00df4e8d293d57718aac0b18cbfbe128c5d484ef` (the 0age factory's `containsCaller` check requires the
first 20 salt bytes to equal `msg.sender` or be zero). Deploy the vanity instances from that wallet
on every chain to land the same address. Sepolia-dev uses the all-zero salt (permissionless).

> ⚠️ The initcodeHash changes if PMPV1's bytecode changes. Always regenerate the hash from the
> current build before mining a salt or deploying.
>
> The addresses in this file are the **original** V1 bytecode (value-lock only, no locked-key
> pass-through). This source change requires a new CREATE2 deploy: the existing vanity address
> cannot be reused. Treat the table below as historical until the new canonical V1 is deployed
> and these references are updated.

## Target chains

Deploy to every chain PMPV0 is on: mainnet (1), arbitrum (42161), base (8453), shape (360),
sepolia-staging (11155111, vanity salt), sepolia-dev (11155111, zero salt).

## Results (fill in on deploy)

vanity salt: `0x00df4e8d293d57718aac0b18cbfbe128c5d484ef433143d2ba53f183c32e0008`
(caller-bound to deployer `0x00df4e8d293d57718aac0b18cbfbe128c5d484ef`;
used for mainnet/arbitrum/base/shape/sepolia-staging)
vanity address: `0x00000000829C0278FBa4327efd97ab45493364cC` (shared across those chains)
sepolia-dev (zero salt) address: `0x7A347a2D3B13a839b34d0004D44c2580a1bf9E39`

### Deployment transactions

All deployed and source-verified (verified `pmpType()` returns `"PMPV1"`; on-chain code identical
across all vanity instances, ~20,209 bytes).

| Chain                      | Address                                      | Salt   | Deploy tx                                                                                                                   | Verified                  |
| -------------------------- | -------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| mainnet (1)                | `0x00000000829C0278FBa4327efd97ab45493364cC` | vanity | [`0x54d54f7b…31ff610`](https://etherscan.io/tx/0x54d54f7b419c3df6f6e4a20ef54762fcc6a7024b8055a50c4dd2e7c0831ff610)          | ✅ Etherscan              |
| arbitrum (42161)           | `0x00000000829C0278FBa4327efd97ab45493364cC` | vanity | [`0x599ba28b…a37a0e9e`](https://arbiscan.io/tx/0x599ba28b1f0b760113a8261c692c2b8622b0ddd3f4c77e627c64aa09a37a0e9e)          | ✅ Arbiscan               |
| base (8453)                | `0x00000000829C0278FBa4327efd97ab45493364cC` | vanity | [`0x3dd02476…c9c8c893`](https://basescan.org/tx/0x3dd02476b5f8168fb4dc8b3b61427b7921c0cb10fcd747a974bf04e4c9c8c893)         | ✅ Basescan               |
| shape (360)                | `0x00000000829C0278FBa4327efd97ab45493364cC` | vanity | [`0x29812259…b9112ff1`](https://shapescan.xyz/tx/0x29812259f16a6e614b193bf6423b9db054972f9a63a6246bd34d2884b9112ff1)        | ✅ Shapescan (Blockscout) |
| sepolia-staging (11155111) | `0x00000000829C0278FBa4327efd97ab45493364cC` | vanity | [`0xfa8de5d7…402dbf90`](https://sepolia.etherscan.io/tx/0xfa8de5d7045ac0f4d3eafd5f8a0d59c19a406d9419c2a1e13ca1b532402dbf90) | ✅ Etherscan              |
| sepolia-dev (11155111)     | `0x7A347a2D3B13a839b34d0004D44c2580a1bf9E39` | zero   | [`0xd9553ed5…ec131546`](https://sepolia.etherscan.io/tx/0xd9553ed5d77d8638f496a95daf16b5ef372debe4453d798f43cedd0aec131546) | ✅ Etherscan              |

> Shape verification note: `shapescan.xyz` is a **Blockscout** explorer, so it must be verified via
> the `blockscout` provider in `hardhat.config.ts` (not `etherscan.customChains`, which routes Shape
> through the unsupported Etherscan V2 API). Command used:
> `hardhat verify --network shape --contract contracts/web3call/PMPV1.sol:PMPV1 <addr> <delegateRegistry>`.

## Notes

- No PMPV1-specific interface is needed; existing `IPMPV0` bindings work unchanged.
- Follow-on (separate effort): route new projects to PMPV1 while continuing to support existing
  projects on PMPV0.
