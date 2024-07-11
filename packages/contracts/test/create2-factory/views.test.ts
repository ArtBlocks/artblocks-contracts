import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfig } from "../util/fixtures";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import { T_Config } from "../util/common";
import { OwnedCreate2FactoryV0 } from "../../scripts/contracts";
import { OwnedCreate2FactoryV0__factory } from "../../scripts/contracts/factories/contracts/OwnedCreate2FactoryV0.sol";

const TARGET_TYPE = "OwnedCreate2FactoryV0";

interface T_Create2FactoryTestConfig extends T_Config {
  ownedCreate2Factory: OwnedCreate2FactoryV0;
}

describe(`OwnedCreate2FactoryV0 views`, async function () {
  async function _beforeEach() {
    const config = await loadFixture(setupConfig);
    // deploy new owned create2 factory
    const ownedCreate2FactoryFactory = new OwnedCreate2FactoryV0__factory(
      config.accounts.deployer
    );
    config.ownedCreate2Factory = await ownedCreate2FactoryFactory.deploy(
      config.accounts.deployer.address // owner
    );

    return config as T_Create2FactoryTestConfig;
  }

  // @dev test for predictDeterministicAddress is covered in integration tests

  describe("type_", async function () {
    it("returns expecte value", async function () {
      // #dev this test also serves as a test for the predictDeterministicAddress function
      const config = await loadFixture(_beforeEach);
      expect(await config.ownedCreate2Factory.type_()).to.equal(
        ethers.utils.formatBytes32String(TARGET_TYPE)
      );
    });
  });
});
