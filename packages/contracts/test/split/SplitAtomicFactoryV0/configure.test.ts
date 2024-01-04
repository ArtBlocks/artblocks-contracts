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

describe(`SplitAtomicFactoryV0 Configure`, async function () {
  async function _beforeEach() {
    // deploy new splitter factory
    const config = await loadFixture(setupSplits);
    return config;
  }

  describe("Deployment", async function () {
    const config = await loadFixture(_beforeEach);
    // deploy new splitter factory
    const splitAtomicFactory = await ethers.getContractFactory(TARGET_TYPE);
    await expectRevert(
      splitAtomicFactory.connect(config.accounts.deployer).deploy(
        config.splitterImplementation.address,
        config.accounts.deployer.address,
        10_001 // invalid split BPS > 10_000
      ),
      revertMessages.invalidSplitBPS
    );
  });

  describe("abandon", async function () {
    it("allows deployer to abandon factory", async function () {
      const config = await loadFixture(_beforeEach);
      await config.splitterFactory.connect(config.accounts.deployer).abandon();
    });

    it("does not allow non-deployer to abandon factory", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.splitterFactory.connect(config.accounts.artist).abandon(),
        revertMessages.onlyDeployerAbandon
      );
    });

    it("does not allow deployer to abandon factory more than once", async function () {
      const config = await loadFixture(_beforeEach);
      await config.splitterFactory.connect(config.accounts.deployer).abandon();
      // abandon a second time
      await expectRevert(
        config.splitterFactory.connect(config.accounts.deployer).abandon(),
        revertMessages.factoryAbandoned
      );
    });
  });
});
