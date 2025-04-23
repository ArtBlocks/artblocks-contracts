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
 * Test suite for PMPV0 gas tests
 */
describe("PMPV0_Gas", function () {
  // Test fixture with projects, tokens, and PMP contract setup
  async function _beforeEach() {
    const config = await loadFixture(setupPMPFixture);
    return config;
  }

  describe("configureProject", function () {
    it("reports gas when configuring typical project", async function () {
      const config = await loadFixture(_beforeEach);
      const pmpConfig1 = getPMPInputConfig(
        "Colors",
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Select,
        0,
        constants.AddressZero,
        [
          "Dark Lifestyle",
          "Party Time",
          "White on Cream",
          "Luxe-Derived",
          "Cool",
          "Rose",
          "Black",
          "AM",
          "White Mono",
          "Baked",
          "Politique",
          "Rad",
          "Golf Socks",
          "Luxe",
        ],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      const pmpConfig2 = getPMPInputConfig(
        "Spiral",
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Bool,
        0,
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );

      // measure gas to configure project
      const tx = await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfig1,
          pmpConfig2,
        ]);

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed;
      console.log(
        "gasUsed in initial project 2x PMP config:",
        gasUsed.toString()
      );
    });

    it("reports gas when configuring project with 7 parameters", async function () {
      const config = await loadFixture(_beforeEach);
      const pmpConfig1 = getPMPInputConfig(
        "Colors",
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Select,
        0,
        constants.AddressZero,
        [
          "Dark Lifestyle",
          "Party Time",
          "White on Cream",
          "Luxe-Derived",
          "Cool",
          "Rose",
          "Black",
          "AM",
          "White Mono",
          "Baked",
          "Politique",
          "Rad",
          "Golf Socks",
          "Luxe",
        ],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      const pmpConfig2 = getPMPInputConfig(
        "Spiral",
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Bool,
        0,
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      const pmpConfig3 = getPMPInputConfig(
        "Param3",
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        0,
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x000000000000000000000000000000000000ffffffffffffffffffffffffffff"
      );
      const pmpConfig4 = getPMPInputConfig(
        "Param4",
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        0,
        constants.AddressZero,
        [],
        "0x00000000000000000000000000000000000000000000000000000000000000ff",
        "0x0000000000000000000000000000000000000000ffffffffffffffffffffffff"
      );
      const pmpConfig5 = getPMPInputConfig(
        "Param5",
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        0,
        constants.AddressZero,
        [],
        "0x00000000000000000000000000000000000000000000000000000000000000ff",
        "0x0000000000000000000000000000000000000000ffffffffffffffffffffffff"
      );
      const pmpConfig6 = getPMPInputConfig(
        "Param6",
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        0,
        constants.AddressZero,
        [],
        "0x00000000000000000000000000000000000000000000000000000000000000ff",
        "0x0000000000000000000000000000000000000000ffffffffffffffffffffffff"
      );
      const pmpConfig7 = getPMPInputConfig(
        "Param7",
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        0,
        constants.AddressZero,
        [],
        "0x00000000000000000000000000000000000000000000000000000000000000ff",
        "0x0000000000000000000000000000000000000000ffffffffffffffffffffffff"
      );

      // measure gas to configure project
      const tx = await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfig1,
          pmpConfig2,
          pmpConfig3,
          pmpConfig4,
          pmpConfig5,
          pmpConfig6,
          pmpConfig7,
        ]);

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed;
      console.log(
        "gasUsed in initial project 7x PMP config:",
        gasUsed.toString()
      );
    });
  });

  describe("configureTokenParams", function () {
    it("reports gas when configuring typical token param", async function () {
      const config = await loadFixture(_beforeEach);
      const pmpConfig1 = getPMPInputConfig(
        "Colors",
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Select,
        0,
        constants.AddressZero,
        [
          "Dark Lifestyle",
          "Party Time",
          "White on Cream",
          "Luxe-Derived",
          "Cool",
          "Rose",
          "Black",
          "AM",
          "White Mono",
          "Baked",
          "Politique",
          "Rad",
          "Golf Socks",
          "Luxe",
        ],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      const pmpConfig2 = getPMPInputConfig(
        "Spiral",
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Bool,
        0,
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );

      // configure project
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfig1,
          pmpConfig2,
        ]);

      // measure gas to configure token params
      const pmpParam1 = getPMPInput(
        "Colors",
        PMP_PARAM_TYPE_ENUM.Select,
        "0x0000000000000000000000000000000000000000000000000000000000000004",
        false,
        ""
      );
      const pmpParam2 = getPMPInput(
        "Spiral",
        PMP_PARAM_TYPE_ENUM.Bool,
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        false,
        ""
      );
      const tx = await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZero,
          [pmpParam1, pmpParam2]
        );

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed;
      console.log(
        "gas used in initial token 2x token param config:",
        gasUsed.toString()
      );
    });
  });
});
