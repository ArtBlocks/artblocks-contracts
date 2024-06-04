import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expectRevert } from "@openzeppelin/test-helpers";
import { setupEngineFactory } from "../../../util/fixtures";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_TYPE = "EngineFactoryV0";

describe(`EngineFactoryV0 Views`, async function () {
  async function _beforeEach() {
    // deploy new Engine factory
    const config = await loadFixture(setupEngineFactory);
    return config;
  }

  describe("engineImplementation", async function () {
    it("returns expected address", async function () {
      const config = await loadFixture(_beforeEach);
      const engineImplementation =
        await config?.engineFactory?.engineImplementation();
      expect(engineImplementation).to.be.equal(
        config?.engineImplementation?.address
      );
    });
    it("returns expected engineCoreType", async function () {
      const config = await loadFixture(_beforeEach);
      const expectedEngineCoreType =
        await config?.engineImplementation?.coreType();
      const engineCoreType = await config?.engineFactory?.engineCoreType();
      expect(engineCoreType).to.be.equal(expectedEngineCoreType);
    });
    it("returns expected engineCoreVersion", async function () {
      const config = await loadFixture(_beforeEach);
      const expectedEngineCoreVersion =
        await config?.engineImplementation?.coreVersion();
      const engineCoreVersion =
        await config?.engineFactory?.engineCoreVersion();
      expect(engineCoreVersion).to.be.equal(expectedEngineCoreVersion);
    });
  });

  describe("engineFlexImplementation", async function () {
    it("returns expected address", async function () {
      const config = await loadFixture(_beforeEach);
      const engineFlexImplementation =
        await config?.engineFactory?.engineFlexImplementation();
      expect(engineFlexImplementation).to.be.equal(
        config?.engineFlexImplementation?.address
      );
    });
    it("returns expected flexCoreType", async function () {
      const config = await loadFixture(_beforeEach);
      const expectedEngineFlexCoreType =
        await config?.engineFlexImplementation?.coreType();
      const engineFlexCoreType = await config?.engineFactory?.flexCoreType();
      expect(engineFlexCoreType).to.be.equal(expectedEngineFlexCoreType);
    });
    it("returns expected flexCoreVersion", async function () {
      const config = await loadFixture(_beforeEach);
      const expectedEngineFlexCoreVersion =
        await config?.engineFlexImplementation?.coreVersion();
      const engineFlexCoreVersion =
        await config?.engineFactory?.flexCoreVersion();
      expect(engineFlexCoreVersion).to.be.equal(expectedEngineFlexCoreVersion);
    });
  });

  describe("coreRegistryAddress", async function () {
    it("returns expected value", async function () {
      const config = await loadFixture(_beforeEach);
      const coreRegistryAddress = await config?.engineFactory?.coreRegistry();
      expect(coreRegistryAddress).to.be.equal(config?.coreRegistry?.address);
    });
  });

  describe("isAbandoned", async function () {
    it("returns expected value", async function () {
      const config = await loadFixture(_beforeEach);
      const isAbandoned = await config?.engineFactory?.isAbandoned();
      expect(isAbandoned).to.be.equal(false);
      // abandon
      await config?.engineFactory?.connect(config.accounts.deployer).abandon();
      const isAbandoned2 = await config?.engineFactory?.isAbandoned();
      expect(isAbandoned2).to.be.equal(true);
    });
  });

  describe("type_", async function () {
    it("returns expected value", async function () {
      const config = await loadFixture(_beforeEach);
      const contractType = ethers.utils.parseBytes32String(
        await config?.engineFactory?.type_()
      );
      expect(contractType).to.be.equal(TARGET_TYPE);
    });
  });

  describe("predictDeterministicAddress", async function () {
    const ENGINE_ENUM = 0;
    const ENGINE_FLEX_ENUM = 1;
    it("reverts if salt is null", async function () {
      const config = await loadFixture(_beforeEach);
      const salt = ethers.utils.hexZeroPad("0x0", 32);
      await expectRevert(
        config?.engineFactory?.predictDeterministicAddress(ENGINE_ENUM, salt),
        "null salt = pseudorandom addr"
      );
    });

    it("returns expected value", async function () {
      const config = await loadFixture(_beforeEach);
      // predict address manually
      const salt = ethers.utils.solidityKeccak256(
        ["string"],
        ["non-zero-salt"]
      );
      const initcodehash = ethers.utils.solidityKeccak256(
        ["bytes"],
        [
          // per ERC-1167 spec: keccak256(
          // 3d602d80600a3d3981f3 (init code) +
          // 363d3d373d3d3d363d73 + address + 5af43d82803e903d91602b57fd5bf3
          // )
          [
            "0x3d602d80600a3d3981f3",
            "363d3d373d3d3d363d73",
            config.engineImplementation.address.slice(2),
            "5af43d82803e903d91602b57fd5bf3",
          ].join(""),
        ]
      );
      const deterministicAddress = await ethers.utils.getCreate2Address(
        config.engineFactory.address,
        salt,
        initcodehash
      );
      const predictedAddress =
        await config.engineFactory.predictDeterministicAddress(
          ENGINE_ENUM,
          salt
        );
      expect(predictedAddress).to.be.equal(deterministicAddress);
    });
  });
});
