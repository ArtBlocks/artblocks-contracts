## zkSync2.0 Goerli Testing (LAST UPDATED: 9-19-22)

This document describes the testing process for zkSync2.0 (goerli testnet). Our main goals here were:

- Getting acquainted with the zkSync2.0 deployment/tooling
- Testing the zkSync2.0 smart contracts/noting any differences from eth network
- Gas profiling of mint transactions and project script uploads

It is important to also note the following:

Goerli testnet tx fees/gas costs may not be an actual good indicator of zkSync2.0 mainnet costs. We will really only be able to conirm this once zkSync2.0 has its mainnet release. zkSync2.0 is still in active development as well, so we should aware that there still a big potential for changes around smart contracts, tx fees, tooling and more.

### Testing Process & Tooling

We used the following tooling for testing:

- @matterlabs/hardhat-zksync-deploy: handles & abstracts away the complexities/differences of deploying on zkSync2.0 vs eth network. Those differences are describe in more detail here: https://v2-docs.zksync.io/dev/zksync-v2/contracts.html
- @matterlabs/hardhat-zksync-solc: the zksync solidity compiler. This is a fork of the solidity compiler that has been modified to support the zkSync2.0 smart contracts. This is a requirement for deploying zkSync2.0 smart contracts and comes in as a docker image.

Minor issue to note: Currently zksync-solc/zksync-deploy do not support multi-compiler hardhat configs. This is the reason why we needed to copy over the minter + core contract into a seperate directory as a new/independent hardhat project. This is a known issue by the zkSync team and they are working on adding multi-compiler support for the future.

Some other items worth mentioning around eth <> zkSync2.0 differences:

- temporary zksync limitations https://v2-docs.zksync.io/dev/zksync-v2/temp-limits.html#using-libraries-in-solidity
- zksync system contracts https://v2-docs.zksync.io/dev/zksync-v2/system-contracts.html
- zksync fee model https://v2-docs.zksync.io/dev/zksync-v2/fee-model.html

### Gas Profiling

```bash
GenArt721CoreV2_zk was deployed to 0x48c2439FA8a49bAd09F63178998623c00bd76515
GenArt721Minter_zk was deployed to 0x5Ad77771aD2D8993d44f29de7259c46Cf4484D7C
Allowlisted the Minter on the Core contract.
succesfully added project 0
succesfully updated max invocations
succesfully added project script 0xbf00c01cbd9f5b2d9cded39daed171f35801e152301b7dedec0553d503330139
Purchased token 0x95d23dd7ac9dc9143d2060ce52732623ea933a7fdd0227da2bb78467a84da0fa
Purchased token 0xe1225e25ce60511ad5357e64658067135f4ccfe848d766291e99e5c24b0ea9bc
Purchased token 0xe94ee4c7242c62770472728bf1eec2fd6c6a33f1d851971bffb0693414aef22d
```

Results:

- Upload Script: 0.0011221882 ETH (~1.50 USD)
- Mint 1: 0.000087925 ETH (~0.12 USD)
- Mint 2: 0.000087925 ETH (~0.12 USD)
- Mint 3: 0.000087925 ETH (~0.12 USD)

```bash
GenArt721CoreV2_zk was deployed to 0x9de53e13CEeAe01ac3f7074089FCE3C8B66eb1e6
GenArt721Minter_zk was deployed to 0x9b3CCac78C77999C0E45f4b2AC32c9c7666B9885
Allowlisted the Minter on the Core contract.
succesfully added project 0
succesfully updated max invocations
succesfully added project script 0xc778d51a15ddea3c6e611d8ee38cde43611cb42d000ae8d2bc3ef1b6c33b2d40
Purchased token 0x0344262e2cfa1b0b011b487843bdf47552a3d8e6c86eafb62883e5f3800bc9de
Purchased token 0x69b1ef646a76b0efef0adc228168823f948e84b0d23070cf9582160487130f8b
Purchased token 0x941e4be1e74ad5a9d8f76ab0e3ce86658663870b077caeab81ca460f6ff4cb6b
```

Results:

- Upload Script: 0.0011221882 ETH (~1.50 USD)
- Mint 1: 0.000087925 ETH (~0.12 USD)
- Mint 2: 0.000087925 ETH (~0.12 USD)
- Mint 3: 0.000087925 ETH (~0.12 USD)
