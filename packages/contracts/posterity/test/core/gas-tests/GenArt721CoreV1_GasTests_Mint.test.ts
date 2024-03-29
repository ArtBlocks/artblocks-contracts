import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../util/constants";

const numInitialMints = 500;
const numMintsToAverage = 15;

/**
 * General Gas tests for V1 core.
 * Used to compare and quantify gas differences between V1 and V3+ cores.
 */
describe("GenArt721CoreV1 Gas Tests", async function () {
  // increase test timeout from 20s to 40s due to minting numInitialMints tokens in beforeEach
  this.timeout(40000);

  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this, 3); // projectZero = 3 on V1 core
    // use a higher max invocations to avoid artifically low gas costs
    this.higherMaxInvocationsForGasTests = 1000;
    // make price artifically low to enable more mints to simulate real-world common use cases
    this.pricePerTokenInWei = ethers.utils.parseEther("0.1");

    // deploy and configure minter filter and minter
    ({ genArt721Core: this.genArt721Core, minterFilter: this.minterFilter } =
      await deployCoreWithMinterFilter.call(
        this,
        "GenArt721CoreV1",
        "MinterFilterV0"
      ));

    this.minter = await deployAndGet.call(this, "MinterSetPriceV1", [
      this.genArt721Core.address,
      this.minterFilter.address,
    ]);

    this.minterDAExp = await deployAndGet.call(this, "MinterDAExpV1", [
      this.genArt721Core.address,
      this.minterFilter.address,
    ]);

    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minter.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minterDAExp.address);
    // add project zero and one
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("project zero", this.accounts.artist.address, 0, false);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(
        this.projectZero,
        this.higherMaxInvocationsForGasTests
      );
    // set project's minter and price
    await this.minter
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(this.projectZero, this.pricePerTokenInWei);
    await this.minterFilter
      .connect(this.accounts.artist)
      .setMinterForProject(this.projectZero, this.minter.address);

    // mint numInitialMints tokens on project zero to simulate a typical real-world use case
    for (let i = 0; i < numInitialMints; i++) {
      await this.minter
        .connect(this.accounts.user)
        .purchase(this.projectZero, { value: this.pricePerTokenInWei });
    }
  });

  describe("mint gas optimization", function () {
    it("test gas cost of mint on MinterSetPrice [ @skip-on-coverage ]", async function () {
      // report gas over an average of numMintsToAverage purchases
      const receipts = [];
      for (let index = 0; index < numMintsToAverage; index++) {
        const tx = await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero, { value: this.pricePerTokenInWei });
        receipts.push(await ethers.provider.getTransactionReceipt(tx.hash));
      }
      const gasUseds = receipts.map((receipt) => receipt.gasUsed);
      const avgGasUsed = gasUseds
        .reduce((a, b) => a.add(b))
        .div(gasUseds.length);
      console.log(`average gas used for mint optimization test: ${avgGasUsed}`);
      const avgGasCostAt100gwei = receipts[0].effectiveGasPrice
        .mul(avgGasUsed)
        .toString();

      const avgGasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(avgGasCostAt100gwei, "ether")
      );
      const avgGasCostAt100gweiAt2kUSDPerETH = avgGasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${avgGasCostAt100gweiAt2kUSDPerETH}`
      );
    });

    it("test gas cost of mint on MinterDAExp [ @skip-on-coverage ]", async function () {
      this.startingPrice = ethers.utils.parseEther("10");
      this.higherPricePerTokenInWei = this.startingPrice.add(
        ethers.utils.parseEther("0.1")
      );
      this.basePrice = ethers.utils.parseEther("0.05");
      this.defaultHalfLife = ONE_HOUR / 2;
      this.auctionStartTimeOffset = ONE_HOUR;
      if (!this.startTime) {
        const blockNumber = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNumber);
        this.startTime = block.timestamp;
      }
      this.startTime = this.startTime + ONE_DAY;

      await ethers.provider.send("evm_mine", [this.startTime - ONE_MINUTE]);
      // set project one minter to minterDAExp, and configure
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minterDAExp.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minterDAExp.address);
      await this.minterDAExp
        .connect(this.accounts.artist)
        .setAuctionDetails(
          this.projectZero,
          this.startTime + this.auctionStartTimeOffset,
          this.defaultHalfLife,
          this.startingPrice,
          this.basePrice
        );
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);

      // report gas over an average of numMintsToAverage purchases
      const receipts = [];
      for (let index = 0; index < numMintsToAverage; index++) {
        const tx = await this.minterDAExp
          .connect(this.accounts.user)
          .purchase(this.projectZero, { value: this.startingPrice });
        receipts.push(await ethers.provider.getTransactionReceipt(tx.hash));
      }
      const gasUseds = receipts.map((receipt) => receipt.gasUsed);
      const avgGasUsed = gasUseds
        .reduce((a, b) => a.add(b))
        .div(gasUseds.length);
      console.log(`average gas used for mint optimization test: ${avgGasUsed}`);
      const avgGasCostAt100gwei = receipts[0].effectiveGasPrice
        .mul(avgGasUsed)
        .toString();

      const avgGasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(avgGasCostAt100gwei, "ether")
      );
      const avgGasCostAt100gweiAt2kUSDPerETH = avgGasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${avgGasCostAt100gweiAt2kUSDPerETH}`
      );
    });
  });
});
