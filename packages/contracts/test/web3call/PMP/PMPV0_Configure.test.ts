import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { constants } from "ethers";
import {
  PMP_AUTH_ENUM,
  PMP_PARAM_TYPE_ENUM,
  getPMPInputConfig,
  getDefaultPMPInputConfig,
  int256ToBytes32,
  uint256ToBytes32,
  BigNumberToBytes32,
  PMP_TIMESTAMP_MAX,
} from "./pmpTestUtils";
import { setupPMPFixture } from "./pmpFixtures";
import { revertMessages } from "./constants";
import { advanceTimeAndBlock } from "../../util/common";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

/**
 * Test suite for PMPV0 configuration functionality
 */
describe("PMPV0_Configure", function () {
  // Test fixture with projects, tokens, and PMP contract setup
  async function _beforeEach() {
    const config = await loadFixture(setupPMPFixture);
    return config;
  }

  describe("configureProjectHooks", function () {
    it("reverts when non-artist calls", async function () {
      const config = await loadFixture(_beforeEach);
      // call from non-artist
      await expectRevert(
        config.pmp
          .connect(config.accounts.deployer)
          .configureProjectHooks(
            config.genArt721Core.address,
            config.projectZero,
            config.configureHook.address,
            config.augmentHook.address
          ),
        revertMessages.onlyArtist
      );
    });

    it("allows the artist to configure hooks", async function () {
      const config = await loadFixture(_beforeEach);
      // call from artist
      await config.pmp
        .connect(config.accounts.artist)
        .configureProjectHooks(
          config.genArt721Core.address,
          config.projectZero,
          config.configureHook.address,
          config.augmentHook.address
        );

      // Verify the hooks are set
      const projectConfig = await config.pmp.getProjectConfig(
        config.genArt721Core.address,
        config.projectZero
      );
      expect(projectConfig.tokenPMPPostConfigHook).to.equal(
        config.configureHook.address
      );
      expect(projectConfig.tokenPMPReadAugmentationHook).to.equal(
        config.augmentHook.address
      );
    });

    it("validates that tokenPMPPostConfigHook hook implements correct interface", async function () {
      const config = await loadFixture(_beforeEach);
      // Deploy a contract that doesn't implement IPMPConfigureHook
      const invalidHookFactory = await ethers.getContractFactory(
        "ReentrancyMock",
        config.accounts.deployer
      );
      const invalidHook = await invalidHookFactory.deploy();

      // Try to set an invalid hook
      await expectRevert(
        config.pmp
          .connect(config.accounts.artist)
          .configureProjectHooks(
            config.genArt721Core.address,
            config.projectZero,
            invalidHook.address,
            constants.AddressZero
          ),
        revertMessages.invalidConfigHook
      );
    });

    it("validates that tokenPMPReadAugmentationHook hook implements correct interface", async function () {
      const config = await loadFixture(_beforeEach);
      // Deploy a contract that doesn't implement IPMPAugmentHook
      const invalidHookFactory = await ethers.getContractFactory(
        "ReentrancyMock",
        config.accounts.deployer
      );
      const invalidHook = await invalidHookFactory.deploy();

      // Try to set an invalid hook
      await expectRevert(
        config.pmp
          .connect(config.accounts.artist)
          .configureProjectHooks(
            config.genArt721Core.address,
            config.projectZero,
            constants.AddressZero,
            invalidHook.address
          ),
        revertMessages.invalidAugmentHook
      );
    });
  });

  describe("configureProject", function () {
    it("reverts when non-artist calls", async function () {
      const config = await loadFixture(_beforeEach);
      // call from non-artist
      await expectRevert(
        config.pmp
          .connect(config.accounts.deployer)
          .configureProject(
            config.genArt721Core.address,
            config.projectZero,
            []
          ),
        revertMessages.onlyArtist
      );
    });

    // @dev no coverage for pmp config length > 256 due to >30M gas cost

    it("reverts if pmp key is empty", async function () {
      const config = await loadFixture(_beforeEach);
      const pmpConfig = getPMPInputConfig(
        "",
        PMP_AUTH_ENUM.Artist,
        PMP_PARAM_TYPE_ENUM.Bool,
        0,
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      await expectRevert(
        config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig,
          ]),
        revertMessages.emptyPMPKey
      );
    });

    describe("__validatePMPConfig", function () {
      it("reverts when invalid pmpInputConfig: unconfigured parameter type", async function () {
        const config = await loadFixture(_beforeEach);
        // call with invalid input
        const pmpConfig = getPMPInputConfig(
          "invalid",
          PMP_AUTH_ENUM.Artist,
          PMP_PARAM_TYPE_ENUM.Unconfigured, // unconfigured param type
          0,
          constants.AddressZero,
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig]
            ),
          revertMessages.unconfiguredParamType
        );
      });

      it("reverts when invalid pmpInputConfig: timestamp is nonzero in past", async function () {
        const config = await loadFixture(_beforeEach);
        // call with invalid input
        const pmpConfig = getPMPInputConfig(
          "invalid",
          PMP_AUTH_ENUM.Artist,
          PMP_PARAM_TYPE_ENUM.Bool,
          1, // timestamp is nonzero in past
          constants.AddressZero,
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig]
            ),
          revertMessages.timestampInPast
        );
      });

      it("reverts when invalid pmpInputConfig: auth option is out of bounds", async function () {
        const config = await loadFixture(_beforeEach);
        // call with invalid input
        // @dev no revert message - soldity reverts with low level error for out of bounds enum
        const pmpConfig = getPMPInputConfig(
          "invalid",
          PMP_AUTH_ENUM.ArtistAndTokenOwnerAndAddress + 1, // out of bounds
          PMP_PARAM_TYPE_ENUM.Bool,
          0,
          constants.AddressZero,
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
        await expectRevert.unspecified(
          config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig]
            )
        );
      });

      it("reverts when invalid pmpInputConfig: auth option is out of bounds", async function () {
        const config = await loadFixture(_beforeEach);
        // call with invalid input
        // @dev no revert message - soldity reverts with low level error for out of bounds enum
        const pmpConfig = getPMPInputConfig(
          "invalid",
          PMP_AUTH_ENUM.Artist,
          PMP_PARAM_TYPE_ENUM.String + 1, // out of bounds
          0,
          constants.AddressZero,
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
        await expectRevert.unspecified(
          config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig]
            )
        );
      });

      it("reverts when invalid pmpInputConfig: string type and non-artist auth option", async function () {
        const config = await loadFixture(_beforeEach);
        // call with invalid input
        const pmpConfig = getPMPInputConfig(
          "invalid",
          PMP_AUTH_ENUM.TokenOwner, // non-artist auth option
          PMP_PARAM_TYPE_ENUM.String,
          0,
          constants.AddressZero,
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig]
            ),
          revertMessages.stringParamWithNonArtistAuth
        );
      });

      it("reverts when invalid pmpInputConfig: address auth option and auth address is zero", async function () {
        const config = await loadFixture(_beforeEach);
        // call with invalid input
        const pmpConfig = getPMPInputConfig(
          "invalid",
          PMP_AUTH_ENUM.ArtistAndAddress, // address auth option
          PMP_PARAM_TYPE_ENUM.String,
          0,
          constants.AddressZero, // address is zero
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig]
            ),
          revertMessages.addressAuthWithZeroAuthAddress
        );
      });

      it("reverts when invalid pmpInputConfig: non-address auth option and non-zero auth address", async function () {
        const config = await loadFixture(_beforeEach);
        // call with invalid input
        const pmpConfig = getPMPInputConfig(
          "invalid",
          PMP_AUTH_ENUM.ArtistAndTokenOwner, // non-address auth option
          PMP_PARAM_TYPE_ENUM.String,
          0,
          config.accounts.deployer.address, // address is non-zero
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig]
            ),
          revertMessages.nonAddressAuthWithNonZeroAuthAddress
        );
      });

      it("reverts when invalid pmpInputConfig: selectOptions non-empty for non-select param type", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [
          PMP_PARAM_TYPE_ENUM.Bool,
          PMP_PARAM_TYPE_ENUM.String,
          PMP_PARAM_TYPE_ENUM.HexColor,
        ]) {
          // call with invalid input
          const pmpConfig = getPMPInputConfig(
            "invalid",
            PMP_AUTH_ENUM.Artist,
            paramType,
            0,
            constants.AddressZero,
            ["option1"], // selectOptions is non-empty
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );
          await expectRevert(
            config.pmp
              .connect(config.accounts.artist)
              .configureProject(
                config.genArt721Core.address,
                config.projectZero,
                [pmpConfig]
              ),
            revertMessages.selectOptionsNonEmptyForNonSelectParamType
          );
        }
      });

      it("reverts when invalid pmpInputConfig: minRange non-zero for non-range param type", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [
          PMP_PARAM_TYPE_ENUM.Bool,
          PMP_PARAM_TYPE_ENUM.String,
          PMP_PARAM_TYPE_ENUM.HexColor,
        ]) {
          // call with invalid input
          const pmpConfig = getPMPInputConfig(
            "invalid",
            PMP_AUTH_ENUM.Artist,
            paramType,
            0,
            constants.AddressZero,
            [],
            "0x0000000000000000000000000000000000000000000000000000000000000001", // minRange is non-zero
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );
          await expectRevert(
            config.pmp
              .connect(config.accounts.artist)
              .configureProject(
                config.genArt721Core.address,
                config.projectZero,
                [pmpConfig]
              ),
            revertMessages.minRangeNonZeroForNonRangeParamType
          );
        }
      });

      it("reverts when invalid pmpInputConfig: maxRange non-zero for non-range param type", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [
          PMP_PARAM_TYPE_ENUM.Bool,
          PMP_PARAM_TYPE_ENUM.String,
          PMP_PARAM_TYPE_ENUM.HexColor,
        ]) {
          // call with invalid input
          const pmpConfig = getPMPInputConfig(
            "invalid",
            PMP_AUTH_ENUM.Artist,
            paramType,
            0,
            constants.AddressZero,
            [],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000001" // maxRange is non-zero
          );
          await expectRevert(
            config.pmp
              .connect(config.accounts.artist)
              .configureProject(
                config.genArt721Core.address,
                config.projectZero,
                [pmpConfig]
              ),
            revertMessages.maxRangeNonZeroForNonRangeParamType
          );
        }
      });

      it("reverts when invalid pmpInputConfig: selectOptions is empty for select param type", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.Select]) {
          // call with invalid input
          const pmpConfig = getPMPInputConfig(
            "invalid",
            PMP_AUTH_ENUM.Artist,
            paramType,
            0,
            constants.AddressZero,
            [], // selectOptions is empty
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );
          await expectRevert(
            config.pmp
              .connect(config.accounts.artist)
              .configureProject(
                config.genArt721Core.address,
                config.projectZero,
                [pmpConfig]
              ),
            revertMessages.selectOptionsEmptyForSelectParamType
          );
        }
      });

      it("reverts when invalid pmpInputConfig: selectOptions is > 256 length", async function () {
        const config = await loadFixture(_beforeEach);
        const selectOptions = Array.from({ length: 257 }, (_, i) => `${i}`);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.Select]) {
          // call with invalid input
          const pmpConfig = getPMPInputConfig(
            "invalid",
            PMP_AUTH_ENUM.Artist,
            paramType,
            0,
            constants.AddressZero,
            selectOptions, // selectOptions is > 256 length
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );
          await expectRevert(
            config.pmp
              .connect(config.accounts.artist)
              .configureProject(
                config.genArt721Core.address,
                config.projectZero,
                [pmpConfig]
              ),
            revertMessages.selectOptionsLengthGreaterThan256
          );
        }
      });

      it("reverts when invalid pmpInputConfig: selectOptions with non-zero minRange", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.Select]) {
          // call with invalid input
          const pmpConfig = getPMPInputConfig(
            "invalid",
            PMP_AUTH_ENUM.Artist,
            paramType,
            0,
            constants.AddressZero,
            ["option1", "option2"],
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );
          await expectRevert(
            config.pmp
              .connect(config.accounts.artist)
              .configureProject(
                config.genArt721Core.address,
                config.projectZero,
                [pmpConfig]
              ),
            revertMessages.minRangeNonZeroForSelectParamType
          );
        }
      });

      it("reverts when invalid pmpInputConfig: selectOptions with non-zero maxRange", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.Select]) {
          // call with invalid input
          const pmpConfig = getPMPInputConfig(
            "invalid",
            PMP_AUTH_ENUM.Artist,
            paramType,
            0,
            constants.AddressZero,
            ["option1", "option2"],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000001"
          );
          await expectRevert(
            config.pmp
              .connect(config.accounts.artist)
              .configureProject(
                config.genArt721Core.address,
                config.projectZero,
                [pmpConfig]
              ),
            revertMessages.maxRangeNonZeroForSelectParamType
          );
        }
      });

      it("reverts when invalid pmpInputConfig: range param with non-empty selectOptions ", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          PMP_PARAM_TYPE_ENUM.Int256Range,
          PMP_PARAM_TYPE_ENUM.DecimalRange,
          PMP_PARAM_TYPE_ENUM.Timestamp,
        ]) {
          // call with invalid input
          const pmpConfig = getPMPInputConfig(
            "invalid",
            PMP_AUTH_ENUM.Artist,
            paramType,
            0,
            constants.AddressZero,
            ["option1"],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000001"
          );
          await expectRevert(
            config.pmp
              .connect(config.accounts.artist)
              .configureProject(
                config.genArt721Core.address,
                config.projectZero,
                [pmpConfig]
              ),
            revertMessages.selectOptionsNonEmptyForNonSelectParamType
          );
        }
      });

      it("reverts when invalid pmpInputConfig: range < max range for int256 range", async function () {
        const config = await loadFixture(_beforeEach);
        const intRangeMin = int256ToBytes32(1);
        const intRangeMax = int256ToBytes32(-1);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.Int256Range]) {
          // call with invalid input
          const pmpConfig = getPMPInputConfig(
            "invalid",
            PMP_AUTH_ENUM.Artist,
            paramType,
            0,
            constants.AddressZero,
            [],
            intRangeMin,
            intRangeMax
          );
          await expectRevert(
            config.pmp
              .connect(config.accounts.artist)
              .configureProject(
                config.genArt721Core.address,
                config.projectZero,
                [pmpConfig]
              ),
            revertMessages.minRangeGreaterThanMaxRange
          );
        }
      });

      it("reverts when invalid pmpInputConfig: range < max range for non-negative range types", async function () {
        const config = await loadFixture(_beforeEach);
        const intRangeMin = uint256ToBytes32(5);
        const intRangeMax = uint256ToBytes32(4);
        for (const paramType of [
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          PMP_PARAM_TYPE_ENUM.DecimalRange,
          PMP_PARAM_TYPE_ENUM.Timestamp,
        ]) {
          // call with invalid input
          const pmpConfig = getPMPInputConfig(
            "invalid",
            PMP_AUTH_ENUM.Artist,
            paramType,
            0,
            constants.AddressZero,
            [],
            intRangeMin,
            intRangeMax
          );
          await expectRevert(
            config.pmp
              .connect(config.accounts.artist)
              .configureProject(
                config.genArt721Core.address,
                config.projectZero,
                [pmpConfig]
              ),
            revertMessages.minRangeGreaterThanMaxRange
          );
        }
      });

      it("reverts when invalid pmpInputConfig: enforces max pmp timestamp value", async function () {
        const config = await loadFixture(_beforeEach);
        const intRangeMin = uint256ToBytes32(0);
        const intRangeMax = BigNumberToBytes32(PMP_TIMESTAMP_MAX.add(1)); // gt max timestamp value
        for (const paramType of [PMP_PARAM_TYPE_ENUM.Timestamp]) {
          // call with invalid input
          const pmpConfig = getPMPInputConfig(
            "invalid",
            PMP_AUTH_ENUM.Artist,
            paramType,
            0,
            constants.AddressZero,
            [],
            intRangeMin,
            intRangeMax
          );
          await expectRevert(
            config.pmp
              .connect(config.accounts.artist)
              .configureProject(
                config.genArt721Core.address,
                config.projectZero,
                [pmpConfig]
              ),
            revertMessages.maxRangeGreaterThanTimestampMax
          );
        }
      });
    });

    it("reverts if current PMP is locked", async function () {
      const config = await loadFixture(_beforeEach);
      // first, configure a PMP that locks shortly after tx
      // get next block timestamp
      const latestBlock = await ethers.provider.getBlock("latest");
      const lockTime = latestBlock.timestamp + 10;
      const pmpConfig = getPMPInputConfig(
        "param1",
        PMP_AUTH_ENUM.Artist,
        PMP_PARAM_TYPE_ENUM.String,
        lockTime, // pmp locks shortly after tx
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfig,
        ]);
      // next tx should fail due to locked pmp
      await advanceTimeAndBlock(60); // advance 60 seconds to ensure pmp is locked
      const newLatestBlock = await ethers.provider.getBlock("latest");
      expect(newLatestBlock.timestamp).to.be.greaterThan(lockTime);
      const newPmpConfig = getPMPInputConfig(
        "param1",
        PMP_AUTH_ENUM.Artist,
        PMP_PARAM_TYPE_ENUM.String,
        0, // pmp is now unlocked
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      await expectRevert(
        config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            newPmpConfig,
          ]),
        revertMessages.pmpLockedAfterTimestamp
      );
    });

    it("updates with all effects upon successful configuration", async function () {
      const config = await loadFixture(_beforeEach);
      // future timestamp
      const latestBlock = await ethers.provider.getBlock("latest");
      const futureTimestamp = latestBlock.timestamp + 100000;
      const pmpConfigString = getPMPInputConfig(
        "param1",
        PMP_AUTH_ENUM.Artist,
        PMP_PARAM_TYPE_ENUM.String,
        0,
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      const pmpConfigUint256 = getPMPInputConfig(
        "param2",
        PMP_AUTH_ENUM.ArtistAndTokenOwnerAndAddress,
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        futureTimestamp,
        config.accounts.deployer.address,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000111"
      );
      // record initial project config
      const initialProjectConfig = await config.pmp.getProjectConfig(
        config.genArt721Core.address,
        config.projectZero
      );
      const initialProjectPMPConfigParam1 =
        await config.pmp.getProjectPMPConfig(
          config.genArt721Core.address,
          config.projectZero,
          "param1"
        );
      const initialProjectPMPConfigParam2 =
        await config.pmp.getProjectPMPConfig(
          config.genArt721Core.address,
          config.projectZero,
          "param2"
        );
      // expect initial project conditions
      expect(initialProjectConfig.configNonce).to.equal(0);
      expect(initialProjectConfig.pmpKeys).to.deep.equal([]);
      expect(initialProjectConfig.tokenPMPPostConfigHook).to.equal(
        constants.AddressZero
      );
      expect(initialProjectConfig.tokenPMPReadAugmentationHook).to.equal(
        constants.AddressZero
      );
      expect(initialProjectPMPConfigParam1.highestConfigNonce).to.equal(0);
      expect(initialProjectPMPConfigParam1.paramType).to.equal(
        PMP_PARAM_TYPE_ENUM.Unconfigured
      );
      expect(initialProjectPMPConfigParam2.highestConfigNonce).to.equal(0);
      expect(initialProjectPMPConfigParam2.paramType).to.equal(
        PMP_PARAM_TYPE_ENUM.Unconfigured
      );

      // configure project
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfigString,
          pmpConfigUint256,
        ]);
      // verify effects
      const projectConfig = await config.pmp.getProjectConfig(
        config.genArt721Core.address,
        config.projectZero
      );
      expect(projectConfig.configNonce).to.equal(1);
      expect(projectConfig.pmpKeys).to.deep.equal([
        pmpConfigString.key,
        pmpConfigUint256.key,
      ]);
      expect(projectConfig.tokenPMPPostConfigHook).to.equal(
        constants.AddressZero
      );
      expect(projectConfig.tokenPMPReadAugmentationHook).to.equal(
        constants.AddressZero
      );
      const projectPMPConfigParam1 = await config.pmp.getProjectPMPConfig(
        config.genArt721Core.address,
        config.projectZero,
        "param1"
      );
      const projectPMPConfigParam2 = await config.pmp.getProjectPMPConfig(
        config.genArt721Core.address,
        config.projectZero,
        "param2"
      );
      expect(projectPMPConfigParam1.highestConfigNonce).to.equal(1);
      expect(projectPMPConfigParam1.paramType).to.equal(
        PMP_PARAM_TYPE_ENUM.String
      );
      expect(projectPMPConfigParam2.highestConfigNonce).to.equal(1);
      expect(projectPMPConfigParam2.paramType).to.equal(
        PMP_PARAM_TYPE_ENUM.Uint256Range
      );
      expect(projectPMPConfigParam1.authOption).to.equal(PMP_AUTH_ENUM.Artist);
      expect(projectPMPConfigParam2.authOption).to.equal(
        PMP_AUTH_ENUM.ArtistAndTokenOwnerAndAddress
      );
      expect(projectPMPConfigParam1.pmpLockedAfterTimestamp).to.equal(0);
      expect(projectPMPConfigParam2.pmpLockedAfterTimestamp).to.equal(
        futureTimestamp
      );
      expect(projectPMPConfigParam1.authAddress).to.equal(
        constants.AddressZero
      );
      expect(projectPMPConfigParam2.authAddress).to.equal(
        config.accounts.deployer.address
      );
      expect(projectPMPConfigParam1.selectOptions).to.deep.equal([]);
      expect(projectPMPConfigParam2.selectOptions).to.deep.equal([]);
      expect(projectPMPConfigParam1.minRange).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(projectPMPConfigParam2.minRange).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(projectPMPConfigParam1.maxRange).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(projectPMPConfigParam2.maxRange).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000111"
      );

      // call again, keeping param1 the same, but updating param2 to select type
      const pmpConfigUint256Select = getPMPInputConfig(
        "param2",
        PMP_AUTH_ENUM.Artist,
        PMP_PARAM_TYPE_ENUM.Select,
        futureTimestamp,
        constants.AddressZero,
        ["option1", "option2", "option3"],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfigString,
          pmpConfigUint256Select,
        ]);
      // verify effects
      const projectConfig2 = await config.pmp.getProjectConfig(
        config.genArt721Core.address,
        config.projectZero
      );
      expect(projectConfig2.configNonce).to.equal(2);
      expect(projectConfig2.pmpKeys).to.deep.equal([
        pmpConfigString.key,
        pmpConfigUint256Select.key,
      ]);
      expect(projectConfig2.tokenPMPPostConfigHook).to.equal(
        constants.AddressZero
      );
      expect(projectConfig2.tokenPMPReadAugmentationHook).to.equal(
        constants.AddressZero
      );
      const projectPMPConfigParam1_2 = await config.pmp.getProjectPMPConfig(
        config.genArt721Core.address,
        config.projectZero,
        "param1"
      );
      const projectPMPConfigParam2_2 = await config.pmp.getProjectPMPConfig(
        config.genArt721Core.address,
        config.projectZero,
        "param2"
      );
      expect(projectPMPConfigParam1_2.highestConfigNonce).to.equal(2);
      expect(projectPMPConfigParam1_2.paramType).to.equal(
        PMP_PARAM_TYPE_ENUM.String
      );
      expect(projectPMPConfigParam2_2.highestConfigNonce).to.equal(2);
      expect(projectPMPConfigParam2_2.paramType).to.equal(
        PMP_PARAM_TYPE_ENUM.Select
      );
      expect(projectPMPConfigParam1_2.authOption).to.equal(
        PMP_AUTH_ENUM.Artist
      );
      expect(projectPMPConfigParam2_2.authOption).to.equal(
        PMP_AUTH_ENUM.Artist
      );
      expect(projectPMPConfigParam1_2.pmpLockedAfterTimestamp).to.equal(0);
      expect(projectPMPConfigParam2_2.pmpLockedAfterTimestamp).to.equal(
        futureTimestamp
      );
      expect(projectPMPConfigParam1_2.authAddress).to.equal(
        constants.AddressZero
      );
      expect(projectPMPConfigParam2_2.authAddress).to.equal(
        constants.AddressZero
      );
      expect(projectPMPConfigParam2_2.selectOptions).to.deep.equal([
        "option1",
        "option2",
        "option3",
      ]);
      expect(projectPMPConfigParam1_2.minRange).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(projectPMPConfigParam1_2.maxRange).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(projectPMPConfigParam2_2.minRange).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(projectPMPConfigParam2_2.maxRange).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });
  });

  describe("configureTokenParams", function () {
    // TODO
  });
});
