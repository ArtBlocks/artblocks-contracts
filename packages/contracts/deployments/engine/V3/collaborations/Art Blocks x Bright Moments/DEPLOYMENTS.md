# Deployments Log

## Mainnet

_note, details extracted from https://github.com/ArtBlocks/artblocks-contracts/pull/415_

Deployment params:

```
  {
    tokenName: "Art Blocks x Bright Moments",
    tokenTicker: "ABXBMG",
    // new contract, starts at 0
    startingProjectId: 0,
  }
```

**AdminACLV1 (shared):** https://etherscan.io/address/0x4F68170A7b3C9B52780289ab2E50a5C26b08B09C#code

**EngineRegistryV0 (shared):** https://etherscan.io/address/0x652490c8BB6e7ec3Fd798537D2F348D7904BBbc2#code

**GenArt721CoreV3_Engine:** https://etherscan.io/address/0x145789247973C5D612bF121e9E4Eef84b63Eb707#code

**MinterFilterV1:** https://etherscan.io/address/0x6E522449C1642E7cB0B12a2889CcBf79b51C69f8#code

**MinterSetPriceV2 (do not use, defunct):** https://etherscan.io/address/0x5112c52535449513c81bDF113b8DCC757d7f122b#code

`0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63` (deployer address) left as the admin of everything.

#### Full Minter Suite Deployment

**MinterDAExpV4:**
https://etherscan.io/address/0x609564FDd916e45E4396BceD647Ac800c1621F4d#code

**MinterDAExpSettlementV1:**
https://etherscan.io/address/0xd38CB6D95BFb5Eb7C61F36938e7B3Ca08810e7F7#code

**MinterDALinV4:**
https://etherscan.io/address/0x40A07aD414EC4214d03bF76571FDF38D6b0DE598#code

**MinterHolderV4:**
https://etherscan.io/address/0x27F79CB37B08E4C2FF56DB0f69aE875d4f5A6311#code

**MinterMerkleV5:**
https://etherscan.io/address/0x4610dB225D7305e31690658D674E7D37eB244f7e#code

**MinterSetPriceV4:**
https://etherscan.io/address/0x090860b07ae1413B9A08339F54cb621B392bB73d#code

**Updated MinterSetPriceERC20V4:** https://etherscan.io/address/0x44fa83C329bAE521E3226c3072F9CC775956a7E7#code

**MinterSetPriceERC20V4:**
https://etherscan.io/address/0x07619C21fBf6A9CB10ce0B3B34934ba3b995C9Fb#code

## Goerli (artist-staging targetted)

### Upload 0

_note, details extracted from https://github.com/ArtBlocks/artblocks-contracts/pull/415_

Deployment params:

```
  {
    tokenName: "Art Blocks x Bright Moments",
    tokenTicker: "ABXBMG",
    // new contract, starts at 0
    startingProjectId: 0,
  }
```

**AdminACLV1 (shared):** https://goerli.etherscan.io/address/0x50DB09A76E9B762d9161c1710102B8C407Fd3ae0#code

**EngineRegistryV0 (shared):** https://goerli.etherscan.io/address/0xEa698596b6009A622C3eD00dD5a8b5d1CAE4fC36#code

**GenArt721CoreV3_Engine:** https://goerli.etherscan.io/address/0x5112c52535449513c81bDF113b8DCC757d7f122b#code

**MinterFilterV1:** https://goerli.etherscan.io/address/0x75b123eAcBf813804bAc83e1D6e5c3d1758746e6#code

**MinterSetPriceV2 (do not use, defunct):** https://goerli.etherscan.io/address/0xcda5742D1727c4816A365a5E36ad861EE488354a#code

`0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63` (deployer address) left as the admin of everything.

#### Full Minter Suite Deployment

**MinterDAExpV4:**
https://goerli.etherscan.io/address/0x10BD2A01996711b0A66d8D5203a919463383701A#code

**MinterDAExpSettlementV1:**
https://goerli.etherscan.io/address/0x9e05816E151708Efc1C52243a18A0cC804b33819#code

**MinterDALinV4:**
https://goerli.etherscan.io/address/0xD00495689D5161C511882364E0C342e12Dcc5f08#code

**MinterHolderV4:**
https://goerli.etherscan.io/address/0xB64116A7D5D84fE9795DD022ea191217A2e32076#code

**MinterMerkleV5:**
https://goerli.etherscan.io/address/0x7a67130593A161124686EA55484D1A64d99eefc9#code

**MinterSetPriceV4:**
https://goerli.etherscan.io/address/0xcBA628BcF6f458f6F929d875B69FE5f0F3fB99b6#code

**MinterSetPriceERC20V4:**
https://goerli.etherscan.io/address/0xdADB127c1565156C3Ce004E11db7E1ba626267E7#code

# Minter Deployment

Date: 2023-02-22T23:00:34.949Z

## **Network:** mainnet

## **Environment:** mainnet

**Deployment Input File:** `deployments/engine/V3/collaborations/Art Blocks x Bright Moments/polyptych-minter-deploy-config.mainnet.ts`

**MinterPolyptychV0:** https://etherscan.io/address/0x407A746DAd6a18ec6c4Bb4028Bb54c74366ccCe3#code

**Associated core contract:** 0x145789247973C5D612bF121e9E4Eef84b63Eb707

**Associated minter filter:** 0x6E522449C1642E7cB0B12a2889CcBf79b51C69f8

**Deployment Args:** 0x145789247973C5D612bF121e9E4Eef84b63Eb707,0x6E522449C1642E7cB0B12a2889CcBf79b51C69f8,0x00000000000076A84feF008CDAbe6409d2FE638B

---

# Minter Deployment

Date: 2024-01-19T18:45:36.292Z

## **Network:** mainnet

## **Environment:** mainnet

**Deployment Input File:** `deployments/engine/V3/collaborations/Art-Blocks-x-Bright-Moments/minter-deploy-config-01.mainnet.ts`

**MinterSetPriceERC20V4:** https://etherscan.io/address/0x44fa83C329bAE521E3226c3072F9CC775956a7E7#code

**Associated core contract:** 0x145789247973C5D612bF121e9E4Eef84b63Eb707

**Associated minter filter:** 0x6E522449C1642E7cB0B12a2889CcBf79b51C69f8

**Deployment Args:** 0x145789247973C5D612bF121e9E4Eef84b63Eb707,0x6E522449C1642E7cB0B12a2889CcBf79b51C69f8

---
