// This file is used to configure the deployment of shared minter contracts.
// It is intended to be imported by the generic shared minter deployer by running
// `deploy:shared-minters:shape`.
// @dev Update minterFilterAddress after MinterFilterV2 is deployed on Shape.

const SHAPE_MINTER_FILTER_ADDRESS =
  "0x6DdDBbd9aE353fCdaCB83a8fb085714bFc7F3f66";

const SHARED_MINTERS = [
  "MinterMinPriceV0",
  "MinterMinPriceMerkleV0",
  "MinterSetPriceV5",
  "MinterSetPriceERC20V5",
  "MinterSetPriceHolderV5",
  "MinterSetPriceMerkleV5",
  "MinterSetPricePolyptychV5",
  "MinterSetPricePolyptychERC20V5",
  "MinterDAExpV5",
  "MinterDALinV5",
  "MinterDAExpSettlementV3",
  "MinterDAExpHolderV5",
  "MinterDALinHolderV5",
] as const;

export const deployConfigDetailsArray = SHARED_MINTERS.map((minterName) => ({
  network: "shape",
  environment: "shape-mainnet",
  minterName,
  minterFilterAddress: SHAPE_MINTER_FILTER_ADDRESS,
  approveMinterGlobally: true,
  // Required by shared-minters-deployer.ts for `*MinPrice*` minters.
  ...(minterName.includes("MinPrice") ? { minMintFeeETH: "0.0015" } : {}),
}));
