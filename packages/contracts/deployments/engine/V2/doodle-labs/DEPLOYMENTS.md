# Deployments Log

## Mainnet

### Upload 0

**Updated GenArt721Minter:** https://etherscan.io/address/0xc3F0418eD513b988ece236Ca477E3b6ac1AF60a4#code

**Randomizer:** https://etherscan.io/address/0x3b30d421a6da95694eaae09971424f15eb375269
**GenArt721CoreV2:** https://etherscan.io/address/0x28f2d3805652fb5d359486dffb7d08320d403240#code
**GenArt721Minter:** https://etherscan.io/address/0x7497909537ce00fdda93c12d5083d8647c593c67#code

### "MARILYN" Upload

**Updated GenArt721Minter:** https://etherscan.io/address/0x46841060EA6f3C87f0d4BF79B0276127bBcD7F5E#code
**GenArt721CoreV2:** https://etherscan.io/address/0xFF124D975c7792E706552b18ec9DA24781751CAb#code
**GenArt721Minter:** https://etherscan.io/address/0xfB8fEc1DC1A54B7F9edB46Ab979998C9Bc175454#code

`0xcd3b333FC22a128C43cFBcF1Eaf343673299ac57` set as minter owner, whitelisted on core contract, and admin of core contract.

### Additional Details

**Admin Transferee Address**: `0xCD5950ec6CB98Ad62acdBa4b1680563ba3367bF0`
**Original Art Blocks Renderer Payment Address**: `0x51cFD298b73e19ecAB5BE6c88438bE3922f34293`

### Subsequent Deployment Updates

[`0x7497909537ce00fdda93c12d5083d8647c593c67`](https://etherscan.io/address/0x7497909537ce00fdda93c12d5083d8647c593c67#code) is the original GenArt721Minter that we provided, but Doodle Labs has since removed it due to a desired different max invocation logic (see [PR #36](https://github.com/ArtBlocks/artblocks-contracts/pull/36) for added context).

This was removed at ref tx: [`0xed39aa299451e44b123cb4cbffc746f53f011c77cd2e334f086ac0e2d580ec11`](https://etherscan.io/tx/0xed39aa299451e44b123cb4cbffc746f53f011c77cd2e334f086ac0e2d580ec11) and Doodle Labs is now using a MODIFIED minter: https://etherscan.io/address/0x4f598212d55415D83A7024Ddb48d9FcA1AFe4edf#code.

Additionally due to complexity of `.transfer()` out of gas errors caused by the changes in EIP-2930, the "renderer payment address" for Art Blocks was updated to be hardware wallet `0x66c5bfa1c8C8352eACb1E8dD22E3575f804f51df` for the second mint onward. The original multi-sig wallet only has 0.1 MOOK in it.

## Goerli

### Upload 0

**GenArt721CoreV2:** https://goerli.etherscan.io/address/0x5503a3B96D845f33F135429AB18C03C79477B14f#code
**GenArt721Minter:** https://goerli.etherscan.io/address/0x078fc67512A0533d8D1c28100D962135C05208Fd#code

`0x95DcB7b8e99B7B8FCb1DCb9e82Bb12183b2bbE02.` set as minter owner, whitelisted on core contract, and admin of core contract.

## Ropsten (deprecated)

### Upload 0

**GenArt721CoreV2:** https://ropsten.etherscan.io/address/0x7EF730aA9a011fe94e4419Cd921C556EA5A22b38#code
**GenArt721Minter:** https://ropsten.etherscan.io/address/0x90d162f2d7b363752cd1A1377C42ea9F095ab120#code

### Upload 1

**GenArt721CoreV2:** https://ropsten.etherscan.io/address/0xd9f14781f6cba1f4ffb0743bcfd5fc860d1da847#code
**GenArt721Minter:** https://ropsten.etherscan.io/address/0x422f493d257e8efab558137299a509d5a2702bbc#code
