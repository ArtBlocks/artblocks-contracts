## Source

based on commit: https://github.com/ArtBlocks/artblocks-contracts/pull/299/commits/929fe661f0f433d8642205f046c5d28727d617cc

Gas test commands:

```bash
# mint gas tests
yarn test test/core/gas-tests/GenArt721CoreV1_GasTests_Mint.test.ts
yarn test test/core/gas-tests/GenArt721CoreV3_GasTests_Mint.test.ts
# script upload gas tests
yarn test test/core/gas-tests/GenArt721CoreV1_GasTests_ScriptUpload.test.ts
yarn test test/core/gas-tests/GenArt721CoreV3_GasTests_ScriptUpload.test.ts
```

## Results

_(summarized and formatted)_

### Mint Costs

_all tests assume Project ID = 2, averages taken to smooth mint cost estimates, rounded to nearest percent_
| Minter Type | V1 Core, avg gas to mint | V1 core, avg mint cost, USD, @ 100gwei, $2k/ETH | V3 Core, avg gas to mint | V3 core, avg mint cost, USD, @ 100gwei, $2k/ETH | Percent Change |
| --- | --- | --- | --- | --- | --- |
| Set Price (ETH) | 316182 | $63.24 | 111553 | $22.31 | -65% |
| Exponential Dutch Auction | 327973 | $65.59 | 111712 | $22.34 | -66% |

### Script Upload Costs

_all tests assume Project ID = 2, rounded to nearest percent_
| Script | V1 Core, avg gas cost | V1 core, avg gas cost, USD, @ 100gwei, $2k/ETH | V3 Core, avg gas cost | V3 core, avg gas cost, USD, @ 100gwei, $2k/ETH | Percent Change |
| --- | --- | --- | --- | --- | --- |
| Chromie Squiggle Script | 2818948 | $563.79 | 951420 | $190.28 | -66% |
| Skulptuur-like | 4588807 | $917.76 | 1499750 | $299.95 | -67% |
| 23.95 KB script | 17431030 | $3486.21 | 5459066 | $1091.81 | -69% |

## Assumptions

Basic randomizer is used for these tests. In reality, mainnet baseline and V3 core use more complex and expensive randomizers for pseudorandomness, so these tests are not a perfect representation of the actual costs. They are, however, a good approximation.

## Reference

raw command outputs:

```bash
  GenArt721CoreV1 Gas Tests
    mint gas optimization
average gas used for mint optimization test: 316182
=USD at 100gwei, $2k USD/ETH: $63.236399999999996
      ✓ test gas cost of mint on MinterSetPrice [ @skip-on-coverage ]
average gas used for mint optimization test: 327973
=USD at 100gwei, $2k USD/ETH: $65.5946
      ✓ test gas cost of mint on MinterDAExp [ @skip-on-coverage ]

  GenArt721CoreV3 Gas Tests
    mint gas optimization
average gas used for mint optimization test: 111553
=USD at 100gwei, $2k USD/ETH: $22.3106
      ✓ test gas cost of mint on MinterSetPrice [ @skip-on-coverage ]
average gas used for mint optimization test: 111712
=USD at 100gwei, $2k USD/ETH: $22.342399999999998
      ✓ test gas cost of mint on MinterSetPriceERC20 [ @skip-on-coverage ]
average gas used for mint optimization test: 120953
=USD at 100gwei, $2k USD/ETH: $24.1906
      ✓ test gas cost of mint on MinterDAExp [ @skip-on-coverage ]
average gas used for mint optimization test: 121059
=USD at 100gwei, $2k USD/ETH: $24.2118
      ✓ test gas cost of mint on MinterDALin [ @skip-on-coverage ]
average gas used for mint optimization test: 126659
=USD at 100gwei, $2k USD/ETH: $25.3318
      ✓ test gas cost of mint on MinterMerkle [ @skip-on-coverage ]
average gas used for mint optimization test: 118067
=USD at 100gwei, $2k USD/ETH: $23.6134
      ✓ test gas cost of mint on MinterHolder [ @skip-on-coverage ]

  GenArt721CoreV1 Gas Tests - Script Upload
    script upload gas optimization
gas used for script upload:  2818948
=USD at 100gwei, $2k USD/ETH: $563.7896
      ✓ test gas cost of uploading Chromie Squiggle script [ @skip-on-coverage ]
gas used for script upload:  4588807
=USD at 100gwei, $2k USD/ETH: $917.7614
      ✓ test gas cost of uploading Skulptuur script [ @skip-on-coverage ]
gas used for script upload:  17431030
=USD at 100gwei, $2k USD/ETH: $3486.206
      ✓ test gas cost of uploading 23.95 KB script [ @skip-on-coverage ]

  GenArt721CoreV3 Gas Tests - Script Upload
    script upload gas optimization
gas used for script upload:  951420
=USD at 100gwei, $2k USD/ETH: $190.28400000000002
      ✓ test gas cost of uploading Chromie Squiggle script [ @skip-on-coverage ]
gas used for script upload:  1499750
=USD at 100gwei, $2k USD/ETH: $299.95
      ✓ test gas cost of uploading Skulptuur script [ @skip-on-coverage ]
gas used for script upload:  5459066
=USD at 100gwei, $2k USD/ETH: $1091.8132
      ✓ test gas cost of uploading 23.95 KB script [ @skip-on-coverage ]
```
