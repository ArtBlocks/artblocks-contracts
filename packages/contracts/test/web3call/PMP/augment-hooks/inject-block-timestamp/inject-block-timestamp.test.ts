import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import helpers = require("@nomicfoundation/hardhat-network-helpers");
import { ethers } from "hardhat";
import { constants } from "ethers";
import { PMPFixtureConfig, setupPMPFixture } from "../../pmpFixtures";
import { Contract } from "ethers";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

interface T_ConfigWithHook extends PMPFixtureConfig {
  hook: Contract;
}

describe("InjectBlockTimestamp", function () {
  async function _beforeEach(): Promise<T_ConfigWithHook> {
    const config = await loadFixture(setupPMPFixture);
    // deploy the hook
    const hookFactory = await ethers.getContractFactory("InjectBlockTimestamp");
    const hook = await hookFactory.deploy();
    await hook.deployed();
    // configure the hook on project zero
    await config.pmp.connect(config.accounts.artist).configureProjectHooks(
      config.genArt721Core.address,
      config.projectZero,
      constants.AddressZero, // tokenPMPPostConfigHook
      hook.address // tokenPMPReadAugmentationHook
    );
    return {
      ...config,
      hook,
    } as T_ConfigWithHook;
  }

  describe("onTokenPMPReadAugmentation", function () {
    it("appends blockTimestamp to empty params", async function () {
      const config = await loadFixture(_beforeEach);

      const augmentedParams = await config.hook.onTokenPMPReadAugmentation(
        config.genArt721Core.address,
        config.projectZeroTokenZero,
        []
      );

      expect(augmentedParams.length).to.equal(1);
      expect(augmentedParams[0].key).to.equal("blockTimestamp");
      // value should be a numeric string representing a reasonable timestamp
      const timestamp = parseInt(augmentedParams[0].value, 10);
      expect(timestamp).to.be.greaterThan(0);
    });

    it("appends blockTimestamp to existing params", async function () {
      const config = await loadFixture(_beforeEach);

      const augmentedParams = await config.hook.onTokenPMPReadAugmentation(
        config.genArt721Core.address,
        config.projectZeroTokenZero,
        [
          { key: "param1", value: "value1" },
          { key: "param2", value: "value2" },
        ]
      );

      expect(augmentedParams.length).to.equal(3);
      expect(augmentedParams[0].key).to.equal("param1");
      expect(augmentedParams[0].value).to.equal("value1");
      expect(augmentedParams[1].key).to.equal("param2");
      expect(augmentedParams[1].value).to.equal("value2");
      expect(augmentedParams[2].key).to.equal("blockTimestamp");
      const timestamp = parseInt(augmentedParams[2].value, 10);
      expect(timestamp).to.be.greaterThan(0);
    });

    it("returns different timestamps after time passes", async function () {
      const config = await loadFixture(_beforeEach);

      const params1 = await config.hook.onTokenPMPReadAugmentation(
        config.genArt721Core.address,
        config.projectZeroTokenZero,
        []
      );
      const timestamp1 = parseInt(params1[0].value, 10);

      // advance time by 60 seconds
      await helpers.time.increase(60);

      const params2 = await config.hook.onTokenPMPReadAugmentation(
        config.genArt721Core.address,
        config.projectZeroTokenZero,
        []
      );
      const timestamp2 = parseInt(params2[0].value, 10);

      expect(timestamp2).to.be.greaterThan(timestamp1);
      expect(timestamp2 - timestamp1).to.be.at.least(60);
    });
  });

  describe("Integration with PMP system", function () {
    it("returns blockTimestamp via PMP getTokenParams", async function () {
      const config = await loadFixture(_beforeEach);

      const params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );

      // should have at least the blockTimestamp param
      const timestampParam = params.find(
        (p: { key: string }) => p.key === "blockTimestamp"
      );
      expect(timestampParam).to.not.be.undefined;
      const timestamp = parseInt(timestampParam!.value, 10);
      expect(timestamp).to.be.greaterThan(0);
    });
  });

  describe("supportsInterface", function () {
    it("supports IPMPAugmentHook interface", async function () {
      const config = await loadFixture(_beforeEach);
      // IPMPAugmentHook interface ID
      const IPMPAugmentHookInterfaceId = "0x58f8699f";
      expect(
        await config.hook.supportsInterface(IPMPAugmentHookInterfaceId)
      ).to.be.true;
    });

    it("supports ERC165 interface", async function () {
      const config = await loadFixture(_beforeEach);
      const IERC165InterfaceId = "0x01ffc9a7";
      expect(await config.hook.supportsInterface(IERC165InterfaceId)).to.be
        .true;
    });

    it("does not support random interface", async function () {
      const config = await loadFixture(_beforeEach);
      expect(await config.hook.supportsInterface("0xdeadbeef")).to.be.false;
    });
  });
});
