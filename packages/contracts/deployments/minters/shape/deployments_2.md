## 2026-10-06

### MinterSetPricePMPV0

One-off deploy. Not approved on the Shape minter filter.

Deployed via `scripts/create2-deploy` + keyless create2 factory.

Verified: https://shapescan.xyz/address/0xcA88Fd9582d0E7697a740579AbC65a0F2717aA96#code

Transaction: https://shapescan.xyz/tx/0xa3af09fa8476c3737f84ddb2688b9befac7df9670b6fffc00a1e0b574b05893e

Salt: `0x0000000000000000000000000000000000000000000000000000000000000000`

Deployment Config:

```
const inputs: T_Inputs = {
  address: "0xcA88Fd9582d0E7697a740579AbC65a0F2717aA96",
  network: "shape",
  contractName: "MinterSetPricePMPV0",
  args: [
    "0x6DdDBbd9aE353fCdaCB83a8fb085714bFc7F3f66", // shape MinterFilterV2
    "0x00000000B9D3B2461fcFd5D23FCA65227B770f67", // PMPV1
  ],
  libraries: {},
};
```
