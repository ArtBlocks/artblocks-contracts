import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { constants } from "ethers";
import {
  PMP_AUTH_ENUM,
  PMP_PARAM_TYPE_ENUM,
  getPMPInput,
  getPMPInputConfig,
  int256ToBytes32,
  uint256ToBytes32,
  BigNumberToBytes32,
  PMP_TIMESTAMP_MAX,
  PMP_HEX_COLOR_MAX,
  RIGHTS_POST_MINT_PARAMETERS,
  PMPInput,
} from "../../pmpTestUtils";
import { PMPFixtureConfig, setupPMPFixture } from "../../pmpFixtures";
import { InjectBlockHeightProjectInvocationsAndArtistProjectOverrides__factory } from "../../../../../scripts/contracts/factories/contracts/web3call/augment-hooks/InjectBlockHeightProjectInvocationsAndArtistProjectOverrides.sol/InjectBlockHeightProjectInvocationsAndArtistProjectOverrides__factory";
import { InjectBlockHeightProjectInvocationsAndArtistProjectOverrides } from "../../../../../scripts/contracts/contracts/web3call/augment-hooks/InjectBlockHeightProjectInvocationsAndArtistProjectOverrides.sol/InjectBlockHeightProjectInvocationsAndArtistProjectOverrides";
import { revertMessages } from "./constants";
import { advanceTimeAndBlock } from "../../../../util/common";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

export interface PMPFixtureConfigWithPMPInput extends PMPFixtureConfig {
  pmpInput: PMPInput;
}

interface T_ConfigWithHook extends PMPFixtureConfig {
  hook: InjectBlockHeightProjectInvocationsAndArtistProjectOverrides;
}

/**
 * Test suite for InjectBlockHeightProjectInvocationsAndArtistProjectOverrides
 */
describe("InjectBlockHeightProjectInvocationsAndArtistProjectOverrides", function () {
  // Test fixture with projects, tokens, and PMP contract setup
  async function _beforeEach() {
    const config = await loadFixture(setupPMPFixture);
    // deploy the hook
    const hookFactory =
      new InjectBlockHeightProjectInvocationsAndArtistProjectOverrides__factory(
        config.accounts.deployer
      );
    const hook = await hookFactory.deploy();
    // configure the hook
    await config.pmp.connect(config.accounts.artist).configureProjectHooks(
      config.genArt721Core.address,
      config.projectZero,
      constants.AddressZero, // tokenPMPPostConfigHook
      hook.address // tokenPMPReadAugmentationHook
    );
    // return the config with the typed hook
    return {
      ...config,
      hook: hook,
    } as T_ConfigWithHook;
  }

  describe("artistSetProjectOverride", function () {
    it("reverts when non-artist calls", async function () {
      const config = await loadFixture(_beforeEach);
      // call from non-artist
      await expectRevert(
        config.hook
          .connect(config.accounts.deployer)
          .artistSetProjectOverride(
            config.genArt721Core.address,
            config.projectZero,
            "testKey",
            "testValue"
          ),
        revertMessages.onlyArtist
      );
    });

    it("sets the project override for single key", async function () {
      const config = await loadFixture(_beforeEach);
      // call from artist
      await config.hook
        .connect(config.accounts.artist)
        .artistSetProjectOverride(
          config.genArt721Core.address,
          config.projectZero,
          "testKey",
          "testValue"
        );
      // verify the override was set
      const override = await config.hook.getArtistProjectOverrides(
        config.genArt721Core.address,
        config.projectZero
      );
      expect(override[0].key).to.equal("testKey");
      expect(override[0].value).to.equal("testValue");
    });

    it("sets the project override for multiple keys", async function () {
      const config = await loadFixture(_beforeEach);
      // call from artist
      await config.hook
        .connect(config.accounts.artist)
        .artistSetProjectOverride(
          config.genArt721Core.address,
          config.projectZero,
          "testKey1",
          "testValue1"
        );
      await config.hook
        .connect(config.accounts.artist)
        .artistSetProjectOverride(
          config.genArt721Core.address,
          config.projectZero,
          "testKey2",
          "testValue2"
        );
      // verify the overrides were set
      const overrides = await config.hook.getArtistProjectOverrides(
        config.genArt721Core.address,
        config.projectZero
      );
      expect(overrides[0].key).to.equal("testKey1");
      expect(overrides[0].value).to.equal("testValue1");
      expect(overrides[1].key).to.equal("testKey2");
      expect(overrides[1].value).to.equal("testValue2");
    });

    it("reverts when key is too long", async function () {
      const config = await loadFixture(_beforeEach);
      // call from artist
      await expectRevert(
        config.hook
          .connect(config.accounts.artist)
          .artistSetProjectOverride(
            config.genArt721Core.address,
            config.projectZero,
            "testKey".repeat(100),
            "testValue"
          ),
        revertMessages.stringTooLong
      );
    });

    it("reverts when value is too long", async function () {
      const config = await loadFixture(_beforeEach);
      // call from artist
      await expectRevert(
        config.hook
          .connect(config.accounts.artist)
          .artistSetProjectOverride(
            config.genArt721Core.address,
            config.projectZero,
            "testKey",
            "testValue".repeat(100)
          ),
        revertMessages.stringTooLong
      );
    });
  });

  describe("artistClearProjectOverride", function () {
    it("reverts when non-artist calls", async function () {
      const config = await loadFixture(_beforeEach);
      // call from non-artist
      await expectRevert(
        config.hook
          .connect(config.accounts.deployer)
          .artistClearProjectOverride(
            config.genArt721Core.address,
            config.projectZero,
            "testKey"
          ),
        revertMessages.onlyArtist
      );
    });

    it("reverts when key does not exist", async function () {
      const config = await loadFixture(_beforeEach);
      // call from artist
      await expectRevert(
        config.hook
          .connect(config.accounts.artist)
          .artistClearProjectOverride(
            config.genArt721Core.address,
            config.projectZero,
            "testKey"
          ),
        revertMessages.keyNotFound
      );
    });

    it("clears the project override for a single key", async function () {
      const config = await loadFixture(_beforeEach);
      // call from artist
      await config.hook
        .connect(config.accounts.artist)
        .artistSetProjectOverride(
          config.genArt721Core.address,
          config.projectZero,
          "testKey",
          "testValue"
        );
      // call from artist to clear the override
      await config.hook
        .connect(config.accounts.artist)
        .artistClearProjectOverride(
          config.genArt721Core.address,
          config.projectZero,
          "testKey"
        );
      // verify the override was cleared
      const overrides = await config.hook.getArtistProjectOverrides(
        config.genArt721Core.address,
        config.projectZero
      );
      expect(overrides.length).to.equal(0);
    });

    it("clears project overrides for multiple keys", async function () {
      const config = await loadFixture(_beforeEach);
      // call from artist
      await config.hook
        .connect(config.accounts.artist)
        .artistSetProjectOverride(
          config.genArt721Core.address,
          config.projectZero,
          "testKey1",
          "testValue1"
        );
      await config.hook
        .connect(config.accounts.artist)
        .artistSetProjectOverride(
          config.genArt721Core.address,
          config.projectZero,
          "testKey2",
          "testValue2"
        );
      // call from artist to clear the overrides
      await config.hook
        .connect(config.accounts.artist)
        .artistClearProjectOverride(
          config.genArt721Core.address,
          config.projectZero,
          "testKey1"
        );
      // verify the overrides were cleared
      const overrides = await config.hook.getArtistProjectOverrides(
        config.genArt721Core.address,
        config.projectZero
      );
      expect(overrides.length).to.equal(1);
      expect(overrides[0].key).to.equal("testKey2");
      expect(overrides[0].value).to.equal("testValue2");
    });

    it("reverts when key is too long", async function () {
      const config = await loadFixture(_beforeEach);
      // call from artist
      await expectRevert(
        config.hook
          .connect(config.accounts.artist)
          .artistClearProjectOverride(
            config.genArt721Core.address,
            config.projectZero,
            "testKey".repeat(100)
          ),
        revertMessages.stringTooLong
      );
    });
  });

  describe("onTokenPMPReadAugmentation", function () {
    it("appends only block height and project invocations when no overrides exist", async function () {
      const config = await loadFixture(_beforeEach);
      // record block number of the read call
      const blockNumber = await ethers.provider.getBlockNumber();
      // get project state data
      const projectStateData = await config.genArt721Core.projectStateData(
        config.projectZero
      );
      const invocations = projectStateData[0];
      expect(invocations).to.equal(2);

      const augmentedTokenParams = await config.hook.onTokenPMPReadAugmentation(
        config.genArt721Core.address,
        config.projectZero,
        [
          { key: "testKey1", value: "testValue1" },
          { key: "testKey2", value: "testValue2" },
        ]
      );
      expect(augmentedTokenParams.length).to.equal(4);
      expect(augmentedTokenParams[0].key).to.equal("testKey1");
      expect(augmentedTokenParams[0].value).to.equal("testValue1");
      expect(augmentedTokenParams[1].key).to.equal("testKey2");
      expect(augmentedTokenParams[1].value).to.equal("testValue2");
      expect(augmentedTokenParams[2].key).to.equal("blockHeight");
      expect(augmentedTokenParams[2].value).to.equal(blockNumber.toString());
      expect(augmentedTokenParams[3].key).to.equal("projectInvocations");
      expect(augmentedTokenParams[3].value).to.equal(invocations.toString());
    });

    it("appends block height and overrides when overrides exist (non-conflicting keys)", async function () {
      const config = await loadFixture(_beforeEach);
      // call from artist
      await config.hook
        .connect(config.accounts.artist)
        .artistSetProjectOverride(
          config.genArt721Core.address,
          config.projectZero,
          "testKey",
          "testValue"
        );
      // record block number of the read call
      const blockNumber = await ethers.provider.getBlockNumber();
      // get project state data
      const projectStateData = await config.genArt721Core.projectStateData(
        config.projectZero
      );
      const invocations = projectStateData[0];
      expect(invocations).to.equal(2);

      const augmentedTokenParams = await config.hook.onTokenPMPReadAugmentation(
        config.genArt721Core.address,
        config.projectZero,
        [
          { key: "testKey1", value: "testValue1" },
          { key: "testKey2", value: "testValue2" },
        ]
      );
      expect(augmentedTokenParams.length).to.equal(5);
      expect(augmentedTokenParams[0].key).to.equal("testKey1");
      expect(augmentedTokenParams[0].value).to.equal("testValue1");
      expect(augmentedTokenParams[1].key).to.equal("testKey2");
      expect(augmentedTokenParams[1].value).to.equal("testValue2");
      expect(augmentedTokenParams[2].key).to.equal("blockHeight");
      expect(augmentedTokenParams[2].value).to.equal(blockNumber.toString());
      expect(augmentedTokenParams[3].key).to.equal("projectInvocations");
      expect(augmentedTokenParams[3].value).to.equal(invocations.toString());
      expect(augmentedTokenParams[4].key).to.equal("testKey");
      expect(augmentedTokenParams[4].value).to.equal("testValue");
    });

    it("replaces conflicting override values with new values", async function () {
      const config = await loadFixture(_beforeEach);
      // call from artist
      await config.hook
        .connect(config.accounts.artist)
        .artistSetProjectOverride(
          config.genArt721Core.address,
          config.projectZero,
          "testKey",
          "testValueOverride"
        );
      // record block number of the read call
      const blockNumber = await ethers.provider.getBlockNumber();
      // get project state data
      const projectStateData = await config.genArt721Core.projectStateData(
        config.projectZero
      );
      const invocations = projectStateData[0];
      expect(invocations).to.equal(2);

      const augmentedTokenParams = await config.hook.onTokenPMPReadAugmentation(
        config.genArt721Core.address,
        config.projectZero,
        [{ key: "testKey", value: "testValue" }]
      );
      expect(augmentedTokenParams.length).to.equal(3);
      expect(augmentedTokenParams[0].key).to.equal("testKey");
      expect(augmentedTokenParams[0].value).to.equal("testValueOverride");
      expect(augmentedTokenParams[1].key).to.equal("blockHeight");
      expect(augmentedTokenParams[1].value).to.equal(blockNumber.toString());
      expect(augmentedTokenParams[2].key).to.equal("projectInvocations");
      expect(augmentedTokenParams[2].value).to.equal(invocations.toString());
    });

    it("replaces conflicting override values with new values (multiple overrides)", async function () {
      const config = await loadFixture(_beforeEach);
      // call from artist
      await config.hook
        .connect(config.accounts.artist)
        .artistSetProjectOverride(
          config.genArt721Core.address,
          config.projectZero,
          "testKey",
          "testValueOverride"
        );
      await config.hook
        .connect(config.accounts.artist)
        .artistSetProjectOverride(
          config.genArt721Core.address,
          config.projectZero,
          "testKey2",
          "testValue2Override"
        );
      // record block number of the read call
      const blockNumber = await ethers.provider.getBlockNumber();
      // get project state data
      const projectStateData = await config.genArt721Core.projectStateData(
        config.projectZero
      );
      const invocations = projectStateData[0];
      expect(invocations).to.equal(2);

      const augmentedTokenParams = await config.hook.onTokenPMPReadAugmentation(
        config.genArt721Core.address,
        config.projectZero,
        [
          { key: "testKey", value: "testValue" },
          { key: "testNonDuplicateKey", value: "testNonDuplicateValue" },
        ]
      );
      expect(augmentedTokenParams.length).to.equal(5);
      expect(augmentedTokenParams[0].key).to.equal("testKey");
      expect(augmentedTokenParams[0].value).to.equal("testValueOverride");
      expect(augmentedTokenParams[1].key).to.equal("testNonDuplicateKey");
      expect(augmentedTokenParams[1].value).to.equal("testNonDuplicateValue");
      expect(augmentedTokenParams[2].key).to.equal("blockHeight");
      expect(augmentedTokenParams[2].value).to.equal(blockNumber.toString());
      expect(augmentedTokenParams[3].key).to.equal("projectInvocations");
      expect(augmentedTokenParams[3].value).to.equal(invocations.toString());
      expect(augmentedTokenParams[4].key).to.equal("testKey2");
      expect(augmentedTokenParams[4].value).to.equal("testValue2Override");
    });
  });
});
