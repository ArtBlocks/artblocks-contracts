# Deployments: MintTimeAndTransferCountHooks

## Description

Shared reference combined hook (transfer hook + PMP read-augment hook). Records each token's mint
timestamp and subsequent ownership-changing transfer count on chain, injects those values — plus
live seconds since mint — into PostParams, and writes `transferCount` as an Address-auth PMP so
transfers emit `TokenParamsConfigured`.

One deployment serves every project on the bound PMP, on every v3.3+ Engine core on the network,
that configures this address as its transfer hook and (optionally) its PMP read-augment hook. It
has no owner and no allowlist. Constructor takes the PMP this hook is authorized to write
`transferCount` to.

- Source: `contracts/web3call/combined-hooks/MintTimeAndTransferCountHooks.sol`
- Bound PMP: latest PMPV1 (see [`PMPV1-deployment.md`](../../PMPV1-deployment.md))

The keyless create2 factory was used to deterministically and permissionlessly deploy the contract
to any network.

Use the `scripts/create2-deploy/` tooling. Add this entry to `scripts/create2-deploy/config.ts`,
then run `yarn hardhat run scripts/create2-deploy/index.ts` and drive the local UI:

```typescript
export const deployConfigs: DeployConfig[] = [
  {
    contractName: "MintTimeAndTransferCountHooks",
    args: ["0x00000000B9D3B2461fcFd5D23FCA65227B770f67"], // latest PMPV1 vanity instance
    libraries: {},
    chainIds: [1, 42161, 8453, 360, 11155111], // mainnet, arbitrum, base, shape, sepolia-staging
    salt: "0x00000000000000000000000000000000000000001bfe06d15c949defd28b8b0a",
  },
  {
    contractName: "MintTimeAndTransferCountHooks",
    args: ["0xb380B5c5A1d98Ebcc669feF89bCe0B3db1f36292"], // sepolia-dev PMPV1
    libraries: {},
    chainIds: [11155111],
    salt: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
];
```

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "MintTimeAndTransferCountHooks",
  args: ["0x00000000B9D3B2461fcFd5D23FCA65227B770f67"], // or sepolia-dev PMPV1
  libraries: {},
};
```

> Gas: measured against an otherwise identical project with no hook, on `GenArt721CoreV3_Engine`.
> Without a PMP write, a mint costs ~40,500 more and a transfer ~28,100 more. With Address-auth
> `transferCount` writes, a mint costs ~92,700 more and a transfer ~78,300 more. See the contract
> natspec and `mint-time-and-transfer-count-hooks.test.ts`.

## Init code (deterministic — regenerate if the contract or constructor arg changes)

Constructor argument is the PMP address, so there are two initcodes — one per PMPV1 instance.

| Instance                                        | PMP constructor arg                          | initcodeHash                                                         |
| ----------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| mainnet, arbitrum, base, shape, sepolia-staging | `0x00000000B9D3B2461fcFd5D23FCA65227B770f67` | `0x9555e37544d1898fd2bef9d9f3dbe3d5925304997a7bf6260d829ee9d203ca77` |
| sepolia-dev                                     | `0xb380B5c5A1d98Ebcc669feF89bCe0B3db1f36292` | `0x8748924f043c1009c953feec4b958b61d3f5e0cd23c1035e151eb3c20b695a98` |

> ⚠️ The initcodeHash changes if the hook bytecode or the bound PMP address changes. Always
> regenerate the hash from the current build before mining a salt or deploying.

## Salt strategy (mirrors PMPV1)

PMPV1 used two salts: a mined vanity salt for mainnet / arbitrum / base / shape / sepolia-staging
(so those chains share one address), and the all-zero salt for sepolia-dev (a separate instance on
the same Sepolia chain). This hook is bound to a PMP in its constructor, so it follows the same
split.

The vanity salt's first 20 bytes are **zero** (permissionless on the 0age factory —
`containsCaller` allows first 20 bytes to equal `msg.sender` or be zero). Anyone can deploy the
vanity instances. Sepolia-dev uses the all-zero salt (also permissionless).

| Instance                                        | Salt                                                                 | Address                                                             |
| ----------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| mainnet, arbitrum, base, shape, sepolia-staging | `0x00000000000000000000000000000000000000001bfe06d15c949defd28b8b0a` | `0x000000002099d6BB23Ebd24aDCbee931ad461a39` (4 leading zero bytes) |
| sepolia-dev                                     | `0x00…00` (all-zero)                                                 | `0x2B530627ed72e3F77EAC0d1c8b3904E6d8f67c25`                        |

## Target chains

Deploy to every chain the bound PMPV1 is on: mainnet (1), arbitrum (42161), base (8453), shape
(360), sepolia-staging (11155111, vanity salt), sepolia-dev (11155111, zero salt).

## Results

vanity salt: `0x00000000000000000000000000000000000000001bfe06d15c949defd28b8b0a`
(first 20 bytes zero / permissionless;
used for mainnet/arbitrum/base/shape/sepolia-staging)
vanity address: `0x000000002099d6BB23Ebd24aDCbee931ad461a39` (shared across those chains)
sepolia-dev (zero salt) address: `0x2B530627ed72e3F77EAC0d1c8b3904E6d8f67c25`

### Deployment transactions

All deployed and source-verified.

| Chain                      | Address                                      | Salt   | Deploy tx                                                                                                                   | Verified                  |
| -------------------------- | -------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| mainnet (1)                | `0x000000002099d6BB23Ebd24aDCbee931ad461a39` | vanity | [`0x990542d3…6db599`](https://etherscan.io/tx/0x990542d34ac25704ff0bc6ea1346ec570509be728447ddad4b90dc437f6db599)          | ✅ Etherscan              |
| arbitrum (42161)           | `0x000000002099d6BB23Ebd24aDCbee931ad461a39` | vanity | [`0x0a397549…ce8727`](https://arbiscan.io/tx/0x0a3975493569d797360d8800a06dd4f28abfed1d5274b9cf369e160ef0ce8727)          | ✅ Arbiscan               |
| base (8453)                | `0x000000002099d6BB23Ebd24aDCbee931ad461a39` | vanity | [`0x9d634ed7…35890f`](https://basescan.org/tx/0x9d634ed7608a3c8fee8a389c7abdb83d23ba29adf48f3664766dd335b935890f)         | ✅ Basescan               |
| shape (360)                | `0x000000002099d6BB23Ebd24aDCbee931ad461a39` | vanity | [`0xf3225801…100a3b`](https://shapescan.xyz/tx/0xf3225801a6120c729e64d76f2bf3a2bd45cddfef64744ae423007189a7100a3b)        | ✅ Shapescan (Blockscout) |
| sepolia-staging (11155111) | `0x000000002099d6BB23Ebd24aDCbee931ad461a39` | vanity | [`0x1e523ccc…6bee16`](https://sepolia.etherscan.io/tx/0x1e523ccce9971314072791e0e0bf760b75260bde3670ace860d91459c16bee16) | ✅ Etherscan              |
| sepolia-dev (11155111)     | `0x2B530627ed72e3F77EAC0d1c8b3904E6d8f67c25` | zero   | [`0xe7d5825c…fec6bc`](https://sepolia.etherscan.io/tx/0xe7d5825c6167bc44e7c597015456ee865f1a8589119aeee0093157d0affec6bc) | ✅ Etherscan              |

> Shape verification note: `shapescan.xyz` is a **Blockscout** explorer, so it must be verified via
> the `blockscout` provider in `hardhat.config.ts` (not `etherscan.customChains`, which routes Shape
> through the unsupported Etherscan V2 API). The create2 UI's verify button reports failure because
> the CLI `verify` task also tries Etherscan and exits 1 after Blockscout already succeeded. Command
> used: `SHAPE_MAINNET_JSON_RPC_PROVIDER_URL=https://mainnet.shape.network hardhat verify --network
> shape --contract contracts/web3call/combined-hooks/MintTimeAndTransferCountHooks.sol:MintTimeAndTransferCountHooks
> <addr> <pmpv1>`.
