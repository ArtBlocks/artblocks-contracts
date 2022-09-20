## zkSync2.0 Testing (LAST UPDATED: 9-19-22)

This document describes the testing process for zkSync2.0 (goerli testnet). Our main goals here were:

- Getting acquainted with the zkSync2.0 deployment/tooling
- Testing the zkSync2.0 smart contracts/noting any differences from eth network
- Gas profiling of mint transactions and project script uploads

It is important to also note the following:

Goerli testnet tx fees/gas costs may not be an actual good indicator of zkSync2.0 mainnet costs. We will really only be able to conirm this once zkSync2.0 has its mainnet release. zkSync2.0 is still in active development as well, so we should aware that there still a big potential for changes around smart contracts, tx fees, tooling and more.

### Testing Process & Tooling

### Gas Profiling

Run 1

```bash
GenArt721CoreV2_zk was deployed to 0x48c2439FA8a49bAd09F63178998623c00bd76515
GenArt721Minter_zk was deployed to 0x5Ad77771aD2D8993d44f29de7259c46Cf4484D7C
Allowlisted the Minter on the Core contract.
succesfully added project 0
succesfully updated max invocations
succesfully added project script 0xbf00c01cbd9f5b2d9cded39daed171f35801e152301b7dedec0553d503330139
Purchased token 0x95d23dd7ac9dc9143d2060ce52732623ea933a7fdd0227da2bb78467a84da0fa
Purchased token 0xe1225e25ce60511ad5357e64658067135f4ccfe848d766291e99e5c24b0ea9bc
Purchased token 0xe94ee4c7242c62770472728bf1eec2fd6c6a33f1d851971bffb069341
```
