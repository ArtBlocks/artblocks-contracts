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
import { SQUIGGLE_SCRIPT, SKULPTUUR_SCRIPT_APPROX } from "../../util/constants";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

/**
 * General Gas tests for V3 core.
 * Used to test the gas cost of different operations on the core, specifically
 * when optimizing for gas to quantify % reductions to aide in decision making.
 */
describe("GenArt721CoreV3 Gas Tests - Script Upload", async function () {
  // increase test timeout from 20s to 40s due to minting numMintsToAverage tokens in beforeEach
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
  });

  describe("script upload gas optimization", function () {
    it("test gas cost of uploading Chromie Squiggle script [ @skip-on-coverage ]", async function () {
      const tx = await this.genArt721Core
        .connect(this.accounts.artist)
        .addProjectScript(this.projectThree, SQUIGGLE_SCRIPT);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.toNumber();
      console.log("gas used for script upload: ", gasUsed);
      // also report in USD at specific conditions
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
      // ensure value was updated
      const script0 = await this.genArt721Core.projectScriptByIndex(
        this.projectThree,
        0
      );
      // console.info(script0);
      expect(script0).to.equal(SQUIGGLE_SCRIPT);
    });

    it("test gas cost of uploading Skulptuur script [ @skip-on-coverage ]", async function () {
      const tx = await this.genArt721Core
        .connect(this.accounts.artist)
        .addProjectScript(this.projectThree, SKULPTUUR_SCRIPT_APPROX);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.toNumber();
      console.log("gas used for script upload: ", gasUsed);
      // also report in USD at specific conditions
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
      // ensure value was updated
      const script0 = await this.genArt721Core.projectScriptByIndex(
        this.projectThree,
        0
      );
      // console.info(script0);
      expect(script0).to.equal(SKULPTUUR_SCRIPT_APPROX);
    });
  });
});
