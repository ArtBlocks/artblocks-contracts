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

    it("accepts tokenPMPReadAugmentationHook of zero address", async function () {
      const config = await loadFixture(_beforeEach);
      // assign zero addresses to both hooks
      await config.pmp
        .connect(config.accounts.artist)
        .configureProjectHooks(
          config.genArt721Core.address,
          config.projectZero,
          constants.AddressZero,
          constants.AddressZero
        );
      // verify that the hooks are set to zero addresses
      const projectConfig = await config.pmp.getProjectConfig(
        config.genArt721Core.address,
        config.projectZero
      );
      expect(projectConfig.tokenPMPReadAugmentationHook).to.equal(
        constants.AddressZero
      );
      expect(projectConfig.tokenPMPPostConfigHook).to.equal(
        constants.AddressZero
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
        revertMessages.emptyOrLongPMPKey
      );
    });

    it("reverts if pmp key is >255 bytes", async function () {
      const config = await loadFixture(_beforeEach);
      const pmpConfig = getPMPInputConfig(
        "a".repeat(256),
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
        revertMessages.emptyOrLongPMPKey
      );
    });

    describe("_validatePMPConfig", function () {
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

      it("does not reverts when pmpInputConfig: string type and artist+ auth option", async function () {
        const config = await loadFixture(_beforeEach);
        for (const authOption of [
          PMP_AUTH_ENUM.Artist,
          PMP_AUTH_ENUM.ArtistAndTokenOwner,
          PMP_AUTH_ENUM.ArtistAndTokenOwnerAndAddress,
          PMP_AUTH_ENUM.ArtistAndAddress,
        ]) {
          // call with invalid input
          const pmpConfig = getPMPInputConfig(
            "invalid",
            authOption,
            PMP_PARAM_TYPE_ENUM.String,
            0,
            authOption === PMP_AUTH_ENUM.ArtistAndAddress ||
              authOption === PMP_AUTH_ENUM.ArtistAndTokenOwnerAndAddress
              ? config.accounts.deployer.address
              : constants.AddressZero,
            [],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );
          // expect no revert
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig]
            );
        }
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

      it("reverts when invalid pmpInputConfig: selectOptions is > 255 length", async function () {
        const config = await loadFixture(_beforeEach);
        const selectOptions = Array.from({ length: 256 }, (_, i) => `${i}`);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.Select]) {
          // call with invalid input
          const pmpConfig = getPMPInputConfig(
            "invalid",
            PMP_AUTH_ENUM.Artist,
            paramType,
            0,
            constants.AddressZero,
            selectOptions, // selectOptions is > 255 length
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

      it("reverts when invalid pmpInputConfig: min range < max range for int256 range", async function () {
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

      it("accepts: min range > max range for int256 range", async function () {
        const config = await loadFixture(_beforeEach);
        const intRangeMin = int256ToBytes32(-11); // valid min range is lt max range
        const intRangeMax = int256ToBytes32(0);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.Int256Range]) {
          // call with valid input
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
          // expect no revert
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig]
            );
        }
      });

      it("reverts when invalid pmpInputConfig: min range < max range for non-negative range types", async function () {
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

      it("reverts when invalid pmpInputConfig: min range < max range for non-negative range types", async function () {
        const config = await loadFixture(_beforeEach);
        const intRangeMin = uint256ToBytes32(0); // valid min range is gt max range
        const intRangeMax = uint256ToBytes32(10);
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
          // expect no revert
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig]
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

    it("handles pmpKeys changes without length changes", async function () {
      const config = await loadFixture(_beforeEach);
      // artist configures a two params
      const pmpConfig1 = getPMPInputConfig(
        "param1",
        PMP_AUTH_ENUM.Artist,
        PMP_PARAM_TYPE_ENUM.String,
        0,
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      const pmpConfig2 = getPMPInputConfig(
        "param2",
        PMP_AUTH_ENUM.Artist,
        PMP_PARAM_TYPE_ENUM.String,
        0,
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfig1,
          pmpConfig2,
        ]);
      // artist updates the second param key string
      pmpConfig2.key = "alternate key name";
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfig1,
          pmpConfig2,
        ]);
      // expect pmpKeys to be updated
      const projectConfig = await config.pmp.getProjectConfig(
        config.genArt721Core.address,
        config.projectZero
      );
      expect(projectConfig.pmpKeys).to.deep.equal([
        pmpConfig1.key,
        "alternate key name",
      ]);
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
    describe("_validatePMPInputAndAuth", function () {
      it("reverts if highest config nonce of PMP is int in latest project config nonce", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.Artist,
          PMP_PARAM_TYPE_ENUM.String,
          0,
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
        // expect revert when trying to configure a non-existing PMP param2
        const pmpInput2 = getPMPInput(
          "param2",
          PMP_PARAM_TYPE_ENUM.String,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          true,
          "param_not_in_config"
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              [pmpInput2]
            ),
          revertMessages.paramNotPartOfMostRecentlyConfiguredPMPParams
        );
      });

      it("reverts if param is stale and not in most recently configured PMP params", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.Artist,
          PMP_PARAM_TYPE_ENUM.String,
          0,
          constants.AddressZero,
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
        const pmpConfig2 = getPMPInputConfig(
          "param2",
          PMP_AUTH_ENUM.Artist,
          PMP_PARAM_TYPE_ENUM.String,
          0,
          constants.AddressZero,
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
        // configure project with both params
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig,
            pmpConfig2,
          ]);
        // configure project with only param1
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig,
          ]);
        // expect revert when trying to configure the stale param2
        const pmpInput2 = getPMPInput(
          "param2",
          PMP_PARAM_TYPE_ENUM.String,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          true,
          "param_not_in_config"
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              [pmpInput2]
            ),
          revertMessages.paramNotPartOfMostRecentlyConfiguredPMPParams
        );
      });

      it("reverts if param input as empty key string", async function () {
        // @dev empty key will never be part of a project config
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInput(
          "", // empty key
          PMP_PARAM_TYPE_ENUM.Unconfigured,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          true,
          "param_not_in_config"
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              [pmpConfig]
            ),
          revertMessages.unconfiguredParamInput
        );
      });

      it("reverts if param type is not same as configured param type", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.Artist,
          PMP_PARAM_TYPE_ENUM.String,
          0,
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
        // expect revert when configuring param1 with type Uint256Range != String
        const pmpConfigInvalid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          "0x0000000000000000000000000000000000000000000000000000000000000001",
          false,
          "0"
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              [pmpConfigInvalid]
            ),
          revertMessages.paramTypeMismatch
        );
      });

      it("reverts if configured with artist auth, but sent by non-artist", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.Artist,
          PMP_PARAM_TYPE_ENUM.String,
          0,
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
        // expect revert when configuring param1 with artist auth, but sent by non-artist
        const pmpInputValid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.String,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          true,
          "param invalid auth"
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.user) // non-artist
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              [pmpInputValid]
            ),
          revertMessages.onlyArtistAuth
        );
      });

      it("allows artist to update param configured with artist auth", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.Artist,
          PMP_PARAM_TYPE_ENUM.String,
          0,
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
        // expect no revert when updating param1 with artist auth
        const pmpInputValid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.String,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          false,
          "world"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [pmpInputValid]
          );
      });

      it("reverts if configured with tokenOwner auth, but sent by unallowed", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.TokenOwner,
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          0,
          constants.AddressZero,
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig,
          ]);
        // expect revert when configuring param1 with artist auth, but sent by non-artist
        const pmpInputValid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          false,
          ""
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist) // unallowed
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              [pmpInputValid]
            ),
          revertMessages.onlyTokenOwnerAuth
        );
      });

      it("does not revert if token owner updates param configured with token owner auth", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.TokenOwner,
          PMP_PARAM_TYPE_ENUM.Bool,
          0,
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
        // expect no revert when updating param1 with token owner auth
        const pmpInputValid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.Bool,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          false,
          ""
        );
        await config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [pmpInputValid]
          );
      });

      it("reverts if configured with artist+tokenOwner auth, but sent by unallowed", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndTokenOwner,
          PMP_PARAM_TYPE_ENUM.String,
          0,
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
        // expect revert when configuring param1 with artist auth, but sent by non-artist
        const pmpInputValid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.String,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          true,
          "param invalid auth"
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.deployer) // non-artist or tokenOwner
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              [pmpInputValid]
            ),
          revertMessages.onlyArtistAndTokenOwnerAuth
        );
      });

      it("reverts if configured with address auth, but sent by unallowed", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.Address,
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          0,
          config.accounts.deployer.address, // allow deployer
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig,
          ]);
        // expect revert when configuring param1 with artist auth, but sent by non-artist
        const pmpInputValid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          false,
          ""
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist) // unallowed
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              [pmpInputValid]
            ),
          revertMessages.onlyAddressAuth
        );
      });

      it("does not revert if address updates param configured with address auth", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.Address,
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          0,
          config.accounts.deployer.address, // allow deployer
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig,
          ]);
        // expect no revert when updating param1 with address auth
        const pmpInputValid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          "0x0000000000000000000000000000000000000000000000000000000000000001",
          false,
          ""
        );
        await config.pmp
          .connect(config.accounts.deployer)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [pmpInputValid]
          );
      });

      it("reverts if configured with artist+tokenOwner+address auth, but sent by unallowed", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndTokenOwnerAndAddress,
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          0,
          config.accounts.deployer.address, // allow deployer
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig,
          ]);
        // expect revert when configuring param1 with artist auth, but sent by non-artist
        const pmpInputValid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          false,
          ""
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.user2) // unallowed
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              [pmpInputValid]
            ),
          revertMessages.onlyArtistAndTokenOwnerAndAddressAuth
        );
      });

      it("does not revert if artist+tokenOwner+address updates param configured with artist+tokenOwner+address auth", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndTokenOwnerAndAddress,
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          0,
          config.accounts.deployer.address, // allow deployer
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig,
          ]);
        // expect no revert when updating param1 with artist+tokenOwner+address auth
        const pmpInputValid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          false,
          ""
        );
        await config.pmp
          .connect(config.accounts.deployer)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [pmpInputValid]
          );
      });

      it("reverts if configured with artist+address auth, but sent by unallowed", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndAddress,
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          0,
          config.accounts.deployer.address, // allow deployer
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig,
          ]);
        // expect revert when configuring param1 with artist auth, but sent by non-artist
        const pmpInputValid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          false,
          ""
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.user) // tokenOwner unallowed
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              [pmpInputValid]
            ),
          revertMessages.onlyArtistAndAddressAuth
        );
      });

      it("does not revert if artist+address updates param configured with artist+address auth", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndAddress,
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          0,
          config.accounts.deployer.address, // allow deployer
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig,
          ]);
        // expect no revert when updating param1 with artist+address auth by deployer
        const pmpInputValid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          false,
          ""
        );
        await config.pmp
          .connect(config.accounts.deployer)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [pmpInputValid]
          );
      });

      it("reverts if configured with tokenOwner+address auth, but sent by unallowed", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.TokenOwnerAndAddress,
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          0,
          config.accounts.deployer.address, // allow deployer
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig,
          ]);
        // expect revert when configuring param1 with artist auth, but sent by non-artist
        const pmpInputValid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          false,
          ""
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist) // artist unallowed
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              [pmpInputValid]
            ),
          revertMessages.onlyTokenOwnerAndAddressAuth
        );
      });

      it("does not revert if tokenOwner+address updates param configured with tokenOwner+address auth", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.TokenOwnerAndAddress,
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          0,
          config.accounts.deployer.address, // allow deployer
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig,
          ]);
        // expect no revert when updating param1 with tokenOwner+address auth by deployer
        const pmpInputValid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          false,
          ""
        );
        await config.pmp
          .connect(config.accounts.deployer)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [pmpInputValid]
          );
      });

      it("reverts if type Select and index is out of bounds", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndTokenOwner,
          PMP_PARAM_TYPE_ENUM.Select,
          0,
          constants.AddressZero,
          ["option1", "option2"],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig,
          ]);
        // expect revert when configuring param1 with index out of bounds
        const pmpInputInvalid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.Select,
          "0x0000000000000000000000000000000000000000000000000000000000000002", // out of bounds
          false,
          ""
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              [pmpInputInvalid]
            ),
          revertMessages.selectOptionsIndexOutOfBounds
        );
      });

      it("reverts if type Bool and value is not 0 or 1", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndTokenOwner,
          PMP_PARAM_TYPE_ENUM.Bool,
          0,
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
        // expect revert when configuring param1 with invalid bool value
        const pmpInputInvalid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.Bool,
          "0x0000000000000000000000000000000000000000000000000000000000000002", // invalid
          false,
          ""
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              [pmpInputInvalid]
            ),
          revertMessages.boolParamValueMustBe0Or1
        );
      });

      it("reverts if type (uint256Range or decimalRange) and value is not in range", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        for (const paramType of [
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          PMP_PARAM_TYPE_ENUM.DecimalRange,
        ]) {
          for (const configuredValue of [
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x000000000000000000000000000000000000000000000000000000000000000a",
          ]) {
            const pmpConfig = getPMPInputConfig(
              "param1",
              PMP_AUTH_ENUM.ArtistAndTokenOwner,
              paramType,
              0,
              constants.AddressZero,
              [],
              "0x0000000000000000000000000000000000000000000000000000000000000001",
              "0x0000000000000000000000000000000000000000000000000000000000000009"
            );
            await config.pmp
              .connect(config.accounts.artist)
              .configureProject(
                config.genArt721Core.address,
                config.projectZero,
                [pmpConfig]
              );
            // expect revert when configuring param1 with invalid bool value
            const pmpInputInvalid = getPMPInput(
              "param1",
              paramType,
              configuredValue, // out of range
              false,
              ""
            );
            await expectRevert(
              config.pmp
                .connect(config.accounts.artist)
                .configureTokenParams(
                  config.genArt721Core.address,
                  config.projectZeroTokenZero.toNumber(),
                  [pmpInputInvalid]
                ),
              revertMessages.paramValueOutOfBounds
            );
          }
        }
      });

      it("reverts if type Int256Range and value is not in range", async function () {
        const config = await loadFixture(_beforeEach);
        for (const configValue of [int256ToBytes32(-2), int256ToBytes32(2)]) {
          // configure a PMP on a project
          const pmpConfig = getPMPInputConfig(
            "param1",
            PMP_AUTH_ENUM.ArtistAndTokenOwner,
            PMP_PARAM_TYPE_ENUM.Int256Range,
            0,
            constants.AddressZero,
            [],
            int256ToBytes32(-1),
            int256ToBytes32(1)
          );
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig]
            );
          // expect revert when configuring param1 with invalid bool value
          const pmpInputInvalid = getPMPInput(
            "param1",
            PMP_PARAM_TYPE_ENUM.Int256Range,
            configValue, // invalid
            false,
            ""
          );
          await expectRevert(
            config.pmp
              .connect(config.accounts.artist)
              .configureTokenParams(
                config.genArt721Core.address,
                config.projectZeroTokenZero.toNumber(),
                [pmpInputInvalid]
              ),
            revertMessages.paramValueOutOfBounds
          );
        }
      });

      it("reverts if type Timestamp and value is gt _TIMESTAMP_MAX", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndTokenOwner,
          PMP_PARAM_TYPE_ENUM.Timestamp,
          0,
          constants.AddressZero,
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig,
          ]);
        // expect revert when configuring param1 with invalid bool value
        const pmpInputInvalid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.Timestamp,
          BigNumberToBytes32(PMP_TIMESTAMP_MAX.add(1)), // invalid
          false,
          ""
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              [pmpInputInvalid]
            ),
          revertMessages.paramValueOutOfBounds
        );
      });

      it("reverts if type HexColor and value is gt _HEX_COLOR_MAX", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndTokenOwner,
          PMP_PARAM_TYPE_ENUM.HexColor,
          0,
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
        // expect revert when configuring param1 with invalid bool value
        const pmpInputInvalid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.HexColor,
          BigNumberToBytes32(PMP_HEX_COLOR_MAX.add(1)), // invalid
          false,
          ""
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              [pmpInputInvalid]
            ),
          revertMessages.invalidHexColor
        );
      });

      it("reverts if type String and value is not empty", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndTokenOwner,
          PMP_PARAM_TYPE_ENUM.String,
          0,
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
        // expect revert when configuring param1 with non-empty string value
        const pmpInputInvalid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.String,
          "0x0000000000000000000000000000000000000000000000000000000000000001", // invalid
          false,
          "valid string"
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              [pmpInputInvalid]
            ),
          revertMessages.onlyNullValueForStringParam
        );
      });

      it("reverts if indicating configuring artist string with non-artist", async function () {
        const config = await loadFixture(_beforeEach);
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndTokenOwner,
          PMP_PARAM_TYPE_ENUM.String,
          0,
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
        // expect revert when indicating configuring artist string with non-artist
        const pmpInputInvalid = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.String,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          true, // indicating artist string
          "artist's string"
        );
        await expectRevert(
          config.pmp
            .connect(config.accounts.user) // non-artist
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              [pmpInputInvalid]
            ),
          revertMessages.artistAuthRequiredToConfigureArtistString
        );
      });

      it("reverts if non-string param has non-empty string input param", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          PMP_PARAM_TYPE_ENUM.DecimalRange,
          PMP_PARAM_TYPE_ENUM.Int256Range,
          PMP_PARAM_TYPE_ENUM.Timestamp,
          PMP_PARAM_TYPE_ENUM.HexColor,
          PMP_PARAM_TYPE_ENUM.Select,
          PMP_PARAM_TYPE_ENUM.Bool,
        ]) {
          // configure a PMP on a project
          const pmpConfig = getPMPInputConfig(
            "param1",
            PMP_AUTH_ENUM.ArtistAndTokenOwner,
            paramType,
            0,
            constants.AddressZero,
            paramType === PMP_PARAM_TYPE_ENUM.Select
              ? ["option1", "option2"]
              : [],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            paramType == PMP_PARAM_TYPE_ENUM.Uint256Range ||
              paramType == PMP_PARAM_TYPE_ENUM.DecimalRange ||
              paramType == PMP_PARAM_TYPE_ENUM.Int256Range ||
              paramType == PMP_PARAM_TYPE_ENUM.Timestamp
              ? "0x0000000000000000000000000000000000000000000000000000000000000001"
              : "0x0000000000000000000000000000000000000000000000000000000000000000"
          );
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig]
            );
          // expect revert when non-string param has non-empty string input param
          const pmpInputInvalid = getPMPInput(
            "param1",
            paramType,
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            false,
            "non-empty string"
          );
          await expectRevert(
            config.pmp
              .connect(config.accounts.artist)
              .configureTokenParams(
                config.genArt721Core.address,
                config.projectZeroTokenZero.toNumber(),
                [pmpInputInvalid]
              ),
            revertMessages.nonStringParamHasNonEmptyStringInputParam
          );
        }
      });

      it("reverts if non-string param has true for configuring artist string", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          PMP_PARAM_TYPE_ENUM.DecimalRange,
          PMP_PARAM_TYPE_ENUM.Int256Range,
          PMP_PARAM_TYPE_ENUM.Timestamp,
          PMP_PARAM_TYPE_ENUM.HexColor,
          PMP_PARAM_TYPE_ENUM.Select,
          PMP_PARAM_TYPE_ENUM.Bool,
        ]) {
          // configure a PMP on a project
          const pmpConfig = getPMPInputConfig(
            "param1",
            PMP_AUTH_ENUM.ArtistAndTokenOwner,
            paramType,
            0,
            constants.AddressZero,
            paramType === PMP_PARAM_TYPE_ENUM.Select
              ? ["option1", "option2"]
              : [],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            paramType == PMP_PARAM_TYPE_ENUM.Uint256Range ||
              paramType == PMP_PARAM_TYPE_ENUM.DecimalRange ||
              paramType == PMP_PARAM_TYPE_ENUM.Int256Range ||
              paramType == PMP_PARAM_TYPE_ENUM.Timestamp
              ? "0x0000000000000000000000000000000000000000000000000000000000000001"
              : "0x0000000000000000000000000000000000000000000000000000000000000000"
          );
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig]
            );
          // expect revert when non-string param has non-empty string input param
          const pmpInputInvalid = getPMPInput(
            "param1",
            paramType,
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            true, // indicating artist string
            ""
          );
          await expectRevert(
            config.pmp
              .connect(config.accounts.artist)
              .configureTokenParams(
                config.genArt721Core.address,
                config.projectZeroTokenZero.toNumber(),
                [pmpInputInvalid]
              ),
            revertMessages.artistStringCannotBeConfiguredForNonStringParams
          );
        }
      });
    });

    it("updates storage as expected for non-artist string param", async function () {
      const config = await loadFixture(_beforeEach);
      // configure a PMP on a project
      const pmpConfig = getPMPInputConfig(
        "param1",
        PMP_AUTH_ENUM.ArtistAndTokenOwner,
        PMP_PARAM_TYPE_ENUM.String,
        0,
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
      // configure token param
      const pmpInput = getPMPInput(
        "param1",
        PMP_PARAM_TYPE_ENUM.String,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        false,
        "string value"
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          [pmpInput]
        );
      // expect storage to be updated as expected
      const pmpStorage = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero.toNumber()
      );
      expect(pmpStorage[0].value).to.equal("string value");
    });

    it("updates storage as expected for artist string param", async function () {
      const config = await loadFixture(_beforeEach);
      // configure a PMP on a project
      const pmpConfig = getPMPInputConfig(
        "param1",
        PMP_AUTH_ENUM.ArtistAndTokenOwner,
        PMP_PARAM_TYPE_ENUM.String,
        0,
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
      // configure token param
      const pmpInput = getPMPInput(
        "param1",
        PMP_PARAM_TYPE_ENUM.String,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        true, // indicating artist string
        "artist string value"
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          [pmpInput]
        );
      // expect storage to be updated as expected
      const pmpStorage = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero.toNumber()
      );
      expect(pmpStorage[0].value).to.equal("artist string value");
      // should remain as artist string if non-artist string param is configured
      const pmpInput2 = getPMPInput(
        "param1",
        PMP_PARAM_TYPE_ENUM.String,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        false,
        "non-artist string value"
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          [pmpInput2]
        );
      // expect storage to reflect original artist string
      const pmpStorage2 = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero.toNumber()
      );
      expect(pmpStorage2[0].value).to.equal("artist string value");
      // should be updated to non-artist string if artist string param is cleared
      const pmpInput3 = getPMPInput(
        "param1",
        PMP_PARAM_TYPE_ENUM.String,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        true,
        ""
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          [pmpInput3]
        );
      // expect storage to reflect non-artist string
      const pmpStorage3 = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero.toNumber()
      );
      expect(pmpStorage3[0].value).to.equal("non-artist string value");
    });

    it("updates configured value for non-string params", async function () {
      const config = await loadFixture(_beforeEach);
      for (const paramType of [
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        PMP_PARAM_TYPE_ENUM.DecimalRange,
        PMP_PARAM_TYPE_ENUM.Int256Range,
        PMP_PARAM_TYPE_ENUM.Timestamp,
        PMP_PARAM_TYPE_ENUM.HexColor,
        PMP_PARAM_TYPE_ENUM.Select,
        PMP_PARAM_TYPE_ENUM.Bool,
      ]) {
        // configure a PMP on a project
        const pmpConfig = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndTokenOwner,
          paramType,
          0,
          constants.AddressZero,
          paramType === PMP_PARAM_TYPE_ENUM.Select
            ? ["option1", "option2"]
            : [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          paramType == PMP_PARAM_TYPE_ENUM.Uint256Range ||
            paramType == PMP_PARAM_TYPE_ENUM.DecimalRange ||
            paramType == PMP_PARAM_TYPE_ENUM.Int256Range ||
            paramType == PMP_PARAM_TYPE_ENUM.Timestamp
            ? "0x0000000000000000000000000000000000000000000000000000000000000001"
            : "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig,
          ]);
        // configure token param
        const pmpInput = getPMPInput(
          "param1",
          paramType,
          "0x0000000000000000000000000000000000000000000000000000000000000001",
          false,
          ""
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [pmpInput]
          );
        // expect configured value to be updated as expected
        const pmpStorage = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
        const pmpValue = pmpStorage[0].value;
        if (paramType === PMP_PARAM_TYPE_ENUM.Uint256Range) {
          expect(pmpValue).to.equal("1");
        } else if (paramType === PMP_PARAM_TYPE_ENUM.DecimalRange) {
          expect(pmpValue).to.equal("0.0000000001");
        } else if (paramType === PMP_PARAM_TYPE_ENUM.Int256Range) {
          expect(pmpValue).to.equal("1");
        } else if (paramType === PMP_PARAM_TYPE_ENUM.Timestamp) {
          expect(pmpValue).to.equal("1");
        } else if (paramType === PMP_PARAM_TYPE_ENUM.HexColor) {
          expect(pmpValue).to.equal("#000001");
        } else if (paramType === PMP_PARAM_TYPE_ENUM.Select) {
          expect(pmpValue).to.equal("option2");
        } else if (paramType === PMP_PARAM_TYPE_ENUM.Bool) {
          expect(pmpValue).to.equal("true");
        }
      }
    });

    it("calls token post configure hook when configured", async function () {
      const config = await loadFixture(_beforeEach);
      // configure a PMP on a project
      const pmpConfig = getPMPInputConfig(
        "param1",
        PMP_AUTH_ENUM.ArtistAndTokenOwner,
        PMP_PARAM_TYPE_ENUM.String,
        0,
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
      // configure a post-config hook on the project
      await config.pmp
        .connect(config.accounts.artist)
        .configureProjectHooks(
          config.genArt721Core.address,
          config.projectZero,
          config.configureHook.address,
          constants.AddressZero
        );
      // configure token param
      const pmpInput = getPMPInput(
        "param1",
        PMP_PARAM_TYPE_ENUM.String,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        false,
        "string value sent to hook"
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          [pmpInput]
        );
      // expect token post configure hook to be called and state updated as expected
      const lastConfiguredValueString =
        await config.configureHook.lastConfiguredValueString();
      expect(lastConfiguredValueString).to.equal("string value sent to hook");
      const lastTokenId = await config.configureHook.lastTokenId();
      expect(lastTokenId).to.equal(config.projectZeroTokenZero.toNumber());
      const lastCoreContract = await config.configureHook.lastCoreContract();
      expect(lastCoreContract).to.equal(config.genArt721Core.address);
      const lastPmpKey = await config.configureHook.lastPmpKey();
      expect(lastPmpKey).to.equal("param1");
      const lastConfiguredValue =
        await config.configureHook.lastConfiguredValue();
      expect(lastConfiguredValue).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("calls reverts when post-config hook reverts", async function () {
      const config = await loadFixture(_beforeEach);
      // configure a PMP on a project
      const pmpConfig = getPMPInputConfig(
        "param1",
        PMP_AUTH_ENUM.ArtistAndTokenOwner,
        PMP_PARAM_TYPE_ENUM.String,
        0,
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
      // configure a post-config hook on the project to revert when called
      await config.pmp
        .connect(config.accounts.artist)
        .configureProjectHooks(
          config.genArt721Core.address,
          config.projectZero,
          config.configureHook.address,
          constants.AddressZero
        );
      // configure the hook behavior
      await config.configureHook.setShouldRevert(true);
      // configure token param
      const pmpInput = getPMPInput(
        "param1",
        PMP_PARAM_TYPE_ENUM.String,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        false,
        "string value sent to hook"
      );
      await expectRevert(
        config.pmp
          .connect(config.accounts.artist)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [pmpInput]
          ),
        "MockPMPConfigureHook: Intentional revert"
      );
    });
  });
});
