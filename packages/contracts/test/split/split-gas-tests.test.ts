import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupSplits } from "../util/fixtures";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

/**
 * Gas tests for splitter contracts.
 * Used when designing for gas efficiency tradeoffs to aide in decision making.
 */
describe(`Splitter Gas Tests`, async function () {
  describe("new split factory creation gas test", function () {
    it("test gas cost of new split creation [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(setupSplits);
      // get gas cost to deploy new factory
      const tx = await config.splitterFactory
        .connect(config.accounts.user)
        .createSplit([
          { recipient: config.accounts.deployer.address, basisPoints: 2222 },
          { recipient: config.accounts.artist.address, basisPoints: 2778 },
          { recipient: config.accounts.additional.address, basisPoints: 5000 },
        ]);
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const gasUsed = receipt.gasUsed;
      console.log(`gas used for new split creation: ${gasUsed}`);
      const gasCostAt100gwei = receipt.effectiveGasPrice
        .mul(gasUsed)
        .toString();

      const gasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(gasCostAt100gwei, "ether")
      );
      const gasCostAt100gweiAt2kUSDPerETH = gasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${gasCostAt100gweiAt2kUSDPerETH}`
      );
    });
  });

  describe("execute splits", function () {
    it("test gas cost of executing an ETH split (minus 21k base cost) [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(setupSplits);
      const tx_raw = {
        to: config.splitter.address,
        value: ethers.utils.parseEther("1"),
        data: "0x",
      };
      const tx = await config.accounts.user.sendTransaction(tx_raw);
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      // subtract 21k base cost for this test
      const gasUsed = receipt.gasUsed.sub(21_000);
      console.log(`gas used for single split execution: ${gasUsed}`);
      const gasCostAt100gwei = receipt.effectiveGasPrice
        .mul(gasUsed)
        .toString();

      const gasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(gasCostAt100gwei, "ether")
      );
      const gasCostAt100gweiAt2kUSDPerETH = gasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${gasCostAt100gweiAt2kUSDPerETH}`
      );
    });
  });
});
