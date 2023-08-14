import { requireLowGasPrice } from "./util/utils";

/**
 * This generic hardhat script throws an error if the current network gas price
 * is above the configured threshold for the network.
 */

async function main() {
  // ensure current network gas price is below configured threshold
  await requireLowGasPrice();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
