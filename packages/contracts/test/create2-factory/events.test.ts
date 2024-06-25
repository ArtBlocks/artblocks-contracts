import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfig } from "../util/fixtures";
import { ethers } from "hardhat";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import { T_Config } from "../util/common";
import { OwnedCreate2FactoryV0 } from "../../scripts/contracts";
import { OwnedCreate2FactoryV0__factory } from "../../scripts/contracts/factories";
import { constants } from "ethers";

interface T_Create2FactoryTestConfig extends T_Config {
  ownedCreate2Factory: OwnedCreate2FactoryV0;
}

describe(`OwnedCreate2FactoryV0 Events`, async function () {
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

  describe("Deployed", async function () {
    it("emits Deployed", async function () {
      const config = await loadFixture(setupConfig);
      const ownedCreate2FactoryFactory = new OwnedCreate2FactoryV0__factory(
        config.accounts.deployer
      );
      const txRequest = await ownedCreate2FactoryFactory.getDeployTransaction(
        config.accounts.user.address
      );
      const tx = await config.accounts.deployer.sendTransaction(txRequest);
      const result = await tx.wait();
      const event = result.logs[1];
      expect(event.topics[0]).to.be.equal(
        ethers.utils.solidityKeccak256(["string"], ["Deployed()"])
      );
    });
  });

  describe("ContractCreated", async function () {
    it("emits ContractCreated", async function () {
      const config = await loadFixture(_beforeEach);
      const newAddress =
        await config.ownedCreate2Factory.predictDeterministicAddress(
          constants.HashZero,
          "0x00"
        );
      await expect(
        config.ownedCreate2Factory.deployCreate2(constants.HashZero, "0x00")
      )
        .to.emit(config.ownedCreate2Factory, "ContractCreated")
        .withArgs(newAddress);
    });
  });
});
