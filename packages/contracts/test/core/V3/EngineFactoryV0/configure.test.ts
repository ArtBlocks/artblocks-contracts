import { ethers } from "hardhat";
import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupEngineFactory } from "../../../util/fixtures";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import { revertMessages } from "./constants";
import { DEFAULT_BASE_URI } from "../../../util/constants";

const TARGET_TYPE = "EngineFactoryV0";

describe(`EngineFactoryV0 Configure`, async function () {
  async function _beforeEach() {
    // deploy new Engine factory
    const config = await loadFixture(setupEngineFactory);
    return config;
  }

  describe("Deployment", async function () {
    const config = await loadFixture(_beforeEach);
    // deploy new Engine factory
    const engineFactory = await ethers.getContractFactory(TARGET_TYPE);
    // reverts if owner address is null
    await expectRevert(
      engineFactory
        .connect(config.accounts.deployer)
        .deploy(
          config?.engineImplementation?.address,
          config?.engineFlexImplementation?.address,
          config?.coreRegistry?.address,
          "0x0000000000000000000000000000000000000000",
          DEFAULT_BASE_URI
        ),
      revertMessages.onlyNonZeroAddress
    );
    // reverts if engine implementation address is null
    await expectRevert(
      engineFactory
        .connect(config.accounts.deployer)
        .deploy(
          "0x0000000000000000000000000000000000000000",
          config?.engineFlexImplementation?.address,
          config?.coreRegistry?.address,
          config.accounts.deployer.address
        ),
      revertMessages.onlyNonZeroAddress
    );
    // reverts if engine flex implementation address is null
    await expectRevert(
      engineFactory
        .connect(config.accounts.deployer)
        .deploy(
          config?.engineImplementation?.address,
          "0x0000000000000000000000000000000000000000",
          config?.coreRegistry?.address,
          config.accounts.deployer.address
        ),
      revertMessages.onlyNonZeroAddress
    );
    // reverts if core registry address is null
    await expectRevert(
      engineFactory
        .connect(config.accounts.deployer)
        .deploy(
          config?.engineImplementation?.address,
          config?.engineFlexImplementation?.address,
          "0x0000000000000000000000000000000000000000",
          config.accounts.deployer.address
        ),
      revertMessages.onlyNonZeroAddress
    );
  });

  describe("abandon", async function () {
    it("allows deployer to abandon factory", async function () {
      const config = await loadFixture(_beforeEach);
      await config?.engineFactory?.connect(config.accounts.deployer).abandon();
    });

    it("does not allow non-deployer to abandon factory", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(config.engineFactory.connect(config.accounts.user).abandon())
        .to.be.revertedWithCustomError(
          config.engineFactory,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(config.accounts.user.address);
    });

    it("does not allow deployer to abandon factory more than once", async function () {
      const config = await loadFixture(_beforeEach);
      await config?.engineFactory?.connect(config.accounts.deployer).abandon();
      // abandon a second time
      await expectRevert(
        config?.engineFactory?.connect(config.accounts.deployer).abandon(),
        revertMessages.factoryAbandoned
      );
    });
  });
});
