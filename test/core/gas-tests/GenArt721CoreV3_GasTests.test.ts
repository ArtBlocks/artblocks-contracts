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
  safeAddProject,
} from "../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../util/constants";

/**
 * General Gas tests for V3 core.
 * Used to test the gas cost of different operations on the core, specifically
 * when optimizing for gas to quantify % reductions to aide in decision making.
 */
describe("GenArt721CoreV3 Gas Tests", async function () {
  // increase test timeout from 20s to 40s due to minting 500 tokens in beforeEach
  this.timeout(40000);

  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);
    // use a higher max invocations to avoid artifically low gas costs
    this.higherMaxInvocationsForGasTests = 1000;
    // make price artifically low to enable more mints to simulate real-world common use cases
    this.pricePerTokenInWei = ethers.utils.parseEther("0.1");

    // deploy and configure minter filter and minter
    ({
      genArt721Core: this.genArt721Core,
      minterFilter: this.minterFilter,
      randomizer: this.randomizer,
    } = await deployCoreWithMinterFilter.call(
      this,
      "GenArt721CoreV3",
      "MinterFilterV1"
    ));

    this.minter = await deployAndGet.call(this, "MinterSetPriceV2", [
      this.genArt721Core.address,
      this.minterFilter.address,
    ]);

    this.minterDAExp = await deployAndGet.call(this, "MinterDAExpV2", [
      this.genArt721Core.address,
      this.minterFilter.address,
    ]);

    // add four projects, test on project three to directly compare to V1 core, which starts at projectId = 3
    for (let i = 0; i < 4; i++) {
      await safeAddProject(
        this.genArt721Core,
        this.accounts.deployer,
        this.accounts.artist.address
      );
    }

    // configure project three (to compare directly to V1 core)
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectThree);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectThree);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(
        this.projectThree,
        this.higherMaxInvocationsForGasTests
      );
    // configure minter for project one
    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minter.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minterDAExp.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(this.projectThree, this.minter.address);
    await this.minter
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(this.projectThree, this.pricePerTokenInWei);
    // mint 500 tokens on project one to simulate a typical real-world use case
    for (let i = 0; i < 500; i++) {
      await this.minter
        .connect(this.accounts.user)
        .purchase(this.projectThree, { value: this.pricePerTokenInWei });
    }

    // gas tests should mint token 1+ on project one+
  });

  describe("mint gas optimization", function () {
    it("test gas cost of mint on MinterSetPrice", async function () {
      // mint
      const tx = await this.minter
        .connect(this.accounts.user)
        .purchase(this.projectThree, { value: this.pricePerTokenInWei });
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      console.log(`gas used for mint optimization test: ${receipt.gasUsed}`);
      const gasCostAt100gwei = receipt.effectiveGasPrice
        .mul(receipt.gasUsed)
        .toString();
      const gasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(gasCostAt100gwei, "ether")
      );
      const gasCostAt100gweiAt2kUSDPerETH = gasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${gasCostAt100gweiAt2kUSDPerETH}`
      );
    });

    it("test gas cost of mint on MinterDAExp", async function () {
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
        .setMinterForProject(this.projectThree, this.minterDAExp.address);
      await this.minterDAExp
        .connect(this.accounts.artist)
        .setAuctionDetails(
          this.projectThree,
          this.startTime + this.auctionStartTimeOffset,
          this.defaultHalfLife,
          this.startingPrice,
          this.basePrice
        );
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);

      // mint
      const tx = await this.minterDAExp
        .connect(this.accounts.user)
        .purchase(this.projectThree, { value: this.startingPrice });
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      console.log(`gas used for mint optimization test: ${receipt.gasUsed}`);
      const gasCostAt100gwei = receipt.effectiveGasPrice
        .mul(receipt.gasUsed)
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
