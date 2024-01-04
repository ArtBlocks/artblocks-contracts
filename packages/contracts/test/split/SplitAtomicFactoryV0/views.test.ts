import { ethers } from "hardhat";
import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupSplits } from "../../util/fixtures";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import { revertMessages } from "./constants";

const TARGET_TYPE = "SplitAtomicFactoryV0";

describe(`SplitAtomicFactoryV0 Views`, async function () {
  async function _beforeEach() {
    // deploy new splitter factory
    const config = await loadFixture(setupSplits);
    return config;
  }

  describe("splitAtomicImplementation", async function () {
    it("returns expected address", async function () {
      const config = await loadFixture(_beforeEach);
      const splitAtomicImplementation =
        await config.splitterFactory.splitAtomicImplementation();
      expect(splitAtomicImplementation).to.be.equal(
        config.splitterImplementation.address
      );
    });
  });

  describe("requiredSplitAddress", async function () {
    it("returns expected value", async function () {
      const config = await loadFixture(_beforeEach);
      const requiredSplitAddress =
        await config.splitterFactory.requiredSplitAddress();
      expect(requiredSplitAddress).to.be.equal(config.validSplit[0].recipient);
    });
  });

  describe("requiredSplitAddress", async function () {
    it("returns expected value", async function () {
      const config = await loadFixture(_beforeEach);
      const requiredSplitBPS =
        await config.splitterFactory.requiredSplitBasisPoints();
      expect(requiredSplitBPS).to.be.equal(config.validSplit[0].basisPoints);
    });
  });

  describe("deployer", async function () {
    it("returns expected value", async function () {
      const config = await loadFixture(_beforeEach);
      const deployerAddress = await config.splitterFactory.deployer();
      expect(deployerAddress).to.be.equal(config.accounts.deployer.address);
    });
  });

  describe("isAbandoned", async function () {
    it("returns expected value", async function () {
      const config = await loadFixture(_beforeEach);
      const isAbandoned = await config.splitterFactory.isAbandoned();
      expect(isAbandoned).to.be.equal(false);
      // abandon
      await config.splitterFactory.connect(config.accounts.deployer).abandon();
      const isAbandoned2 = await config.splitterFactory.isAbandoned();
      expect(isAbandoned2).to.be.equal(true);
    });
  });

  describe("type_", async function () {
    it("returns expected value", async function () {
      const config = await loadFixture(_beforeEach);
      const contractType = ethers.utils.parseBytes32String(
        await config.splitterFactory.type_()
      );
      expect(contractType).to.be.equal(TARGET_TYPE);
    });
  });
});
