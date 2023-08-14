import hre from "hardhat";
import { ethers } from "ethers";

/**
 * This generic hardhat script throws an error if the current network gas price
 * is above the configured threshold for the network.
 */

/**
 * Gets the configured max nominal gas price in gwei for the current network
 * @returns the max nominal gas price in gwei for the current network
 */
function getMaxNominalGasPriceGwei(): number {
  // Require maxNominalGasPrice defined in hardhat config
  const maxNominalGasPriceGwei: number =
    hre.network.config.maxNominalGasPriceGwei;
  if (!maxNominalGasPriceGwei) {
    throw new Error(
      `[ERROR] maxNominalGasPrice must be defined in hardhat.config.ts for the current network ${hre.network.name}`
    );
  }
  return maxNominalGasPriceGwei;
}

/**
 * Ensures the current gas price is below the configured max nominal gas price
 * Throws an error if the current gas price is above the configured max nominal gas price
 */
async function requireLowGasPrice() {
  const maxNominalGasPriceGwei = getMaxNominalGasPriceGwei();
  // get gas price and ensure it is below the max nominal gas price
  const gasPriceGwei = parseFloat(
    ethers.utils.formatUnits(await hre.ethers.provider.getGasPrice(), "gwei")
  );
  if (gasPriceGwei > maxNominalGasPriceGwei) {
    throw new Error(
      `[ERROR] Gas price is ${gasPriceGwei.toString()} gwei, which is above the configured max nominal gas price of ${maxNominalGasPriceGwei} gwei`
    );
  }
  console.log(
    `[INFO] Gas price is ${gasPriceGwei.toString()} gwei, which is lt the configured max nominal gas price of ${maxNominalGasPriceGwei} gwei`
  );
}

requireLowGasPrice()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
