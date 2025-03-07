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
 * Test suite for PMPV0 view functionality
 */
describe("PMPV0_Views", function () {
  // Test fixture with projects, tokens, and PMP contract setup
  async function _beforeEach() {
    const config = await loadFixture(setupPMPFixture);
    return config;
  }

  describe("getTokenParams", function () {
    it("returns no params if none are set and none are configured", async function () {
      const config = await loadFixture(_beforeEach);
      const params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );
      expect(params.length).to.equal(0);
    });

    it("returns no params if none are set but project is configured", async function () {
      const config = await loadFixture(_beforeEach);
      // artist configures a token param for project zero
      const pmpConfig1 = getPMPInputConfig(
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
          pmpConfig1,
        ]);
      const params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );
      expect(params.length).to.equal(0);
    });

    it("returns one param if one is set and greater than one is configured", async function () {
      const config = await loadFixture(_beforeEach);
      // artist configures a token param for project zero
      const pmpConfig1 = getPMPInputConfig(
        "param1",
        PMP_AUTH_ENUM.ArtistAndTokenOwner,
        PMP_PARAM_TYPE_ENUM.String,
        0,
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      const pmpConfig2 = getPMPInputConfig(
        "param2",
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
          pmpConfig1,
          pmpConfig2,
        ]);
      // token owner sets a string param
      const pmpInput1 = getPMPInput(
        "param1",
        PMP_PARAM_TYPE_ENUM.String,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        false,
        "my param is now configured"
      );
      await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero,
          [pmpInput1]
        );
      // expect one param to be returned
      const params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );
      expect(params.length).to.equal(1);
      expect(params[0].key).to.equal("param1");
      expect(params[0].value).to.equal("my param is now configured");
    });

    it("returns final two params if two are set and three are configured", async function () {
      const config = await loadFixture(_beforeEach);
      // artist configures a token param for project zero
      const pmpConfig1 = getPMPInputConfig(
        "param1",
        PMP_AUTH_ENUM.ArtistAndTokenOwner,
        PMP_PARAM_TYPE_ENUM.String,
        0,
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      const pmpConfig2 = getPMPInputConfig(
        "param2",
        PMP_AUTH_ENUM.ArtistAndTokenOwner,
        PMP_PARAM_TYPE_ENUM.String,
        0,
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      const pmpConfig3 = getPMPInputConfig(
        "param3",
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
          pmpConfig1,
          pmpConfig2,
          pmpConfig3,
        ]);
      // token owner sets a string param
      const pmpInput2 = getPMPInput(
        "param2",
        PMP_PARAM_TYPE_ENUM.String,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        false,
        "param2 is now configured"
      );
      const pmpInput3 = getPMPInput(
        "param3",
        PMP_PARAM_TYPE_ENUM.String,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        false,
        "param3 is now configured"
      );
      await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero,
          [pmpInput2, pmpInput3]
        );
      // expect two params to be returned
      const params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );
      expect(params.length).to.equal(2);
      expect(params[0].key).to.equal("param2");
      expect(params[0].value).to.equal("param2 is now configured");
      expect(params[1].key).to.equal("param3");
      expect(params[1].value).to.equal("param3 is now configured");
    });

    it("does not return empty strings, treats as unconfigured", async function () {
      const config = await loadFixture(_beforeEach);
      // artist configures a token param for project zero
      const pmpConfig1 = getPMPInputConfig(
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
          pmpConfig1,
        ]);
      // token owner sets a string param to empty string
      const pmpInput1 = getPMPInput(
        "param1",
        PMP_PARAM_TYPE_ENUM.String,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        false,
        ""
      );
      await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero,
          [pmpInput1]
        );
      // expect no params to be returned
      const params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );
      expect(params.length).to.equal(0);
    });

    it("does not return stale out-of-bounds select params", async function () {
      const config = await loadFixture(_beforeEach);
      // artist configures a token param for project zero
      const pmpConfig1 = getPMPInputConfig(
        "param1",
        PMP_AUTH_ENUM.ArtistAndTokenOwner,
        PMP_PARAM_TYPE_ENUM.Select,
        0,
        constants.AddressZero,
        ["option1", "option2", "option3"],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfig1,
        ]);
      // token owner sets a select param to index 3
      const pmpInput1 = getPMPInput(
        "param1",
        PMP_PARAM_TYPE_ENUM.Select,
        "0x0000000000000000000000000000000000000000000000000000000000000002",
        false,
        ""
      );
      await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero,
          [pmpInput1]
        );
      // initially, option 3 is returned
      const params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );
      expect(params.length).to.equal(1);
      expect(params[0].key).to.equal("param1");
      expect(params[0].value).to.equal("option3");
      // artist then removes option 3
      pmpConfig1.pmpConfig.selectOptions = ["option1", "option2"];
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfig1,
        ]);
      // expect no params to be returned (out of bounds now that option 3 is removed)
      const params2 = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );
      expect(params2.length).to.equal(0);
    });

    it("does not return a stale PMP with different configured param type", async function () {
      const config = await loadFixture(_beforeEach);
      // artist configures a token param for project zero
      const pmpConfig1 = getPMPInputConfig(
        "param1",
        PMP_AUTH_ENUM.ArtistAndTokenOwner,
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
          pmpConfig1,
        ]);
      // token owner configures a param with appropriate type
      const pmpInput1 = getPMPInput(
        "param1",
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        false,
        ""
      );
      await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero,
          [pmpInput1]
        );
      // artist then updates the param type
      pmpConfig1.pmpConfig.paramType = PMP_PARAM_TYPE_ENUM.Bool;
      pmpConfig1.pmpConfig.maxRange = uint256ToBytes32(0);
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfig1,
        ]);
      // expect no params to be returned (obviously stale due to param type change)
      const params2 = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );
      expect(params2.length).to.equal(0);
    });

    it("returns false for false bool", async function () {
      const config = await loadFixture(_beforeEach);
      // artist configures a token param for project zero
      const pmpConfig1 = getPMPInputConfig(
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
          pmpConfig1,
        ]);
      // token owner sets a bool param to false
      const pmpInput1 = getPMPInput(
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
          config.projectZeroTokenZero,
          [pmpInput1]
        );
      // expect false for false bool
      const params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );
      expect(params.length).to.equal(1);
      expect(params[0].key).to.equal("param1");
      expect(params[0].value).to.equal("false");
    });

    it("returns true for true bool", async function () {
      const config = await loadFixture(_beforeEach);
      // artist configures a token param for project zero
      const pmpConfig1 = getPMPInputConfig(
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
          pmpConfig1,
        ]);
      // token owner sets a bool param to true
      const pmpInput1 = getPMPInput(
        "param1",
        PMP_PARAM_TYPE_ENUM.Bool,
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        false,
        ""
      );
      await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero,
          [pmpInput1]
        );
      // expect true for true bool
      const params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );
      expect(params.length).to.equal(1);
      expect(params[0].key).to.equal("param1");
      expect(params[0].value).to.equal("true");
    });

    it("skips stale, out-of-range uint, timestamp and decimal range params", async function () {
      const config = await loadFixture(_beforeEach);
      for (const paramType of [
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        PMP_PARAM_TYPE_ENUM.Timestamp,
        PMP_PARAM_TYPE_ENUM.DecimalRange,
      ]) {
        // artist configures a token param for project zero
        const pmpConfig1 = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndTokenOwner,
          paramType,
          0,
          constants.AddressZero,
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000003"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig1,
          ]);
        // token owner sets a param to a valid value
        const pmpInput1 = getPMPInput(
          "param1",
          paramType,
          "0x0000000000000000000000000000000000000000000000000000000000000003",
          false,
          ""
        );
        await config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero,
            [pmpInput1]
          );
        // artist then updates the range, making the previous value out of bounds
        pmpConfig1.pmpConfig.minRange = uint256ToBytes32(0);
        pmpConfig1.pmpConfig.maxRange = uint256ToBytes32(2);
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig1,
          ]);
        // expect no params to be returned (out of bounds now that range is updated)
        const params2 = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero
        );
        expect(params2.length).to.equal(0);
      }
    });

    it("skips int256 range params if out of range and obviously stale", async function () {
      const config = await loadFixture(_beforeEach);
      // artist configures a token param for project zero
      const pmpConfig1 = getPMPInputConfig(
        "param1",
        PMP_AUTH_ENUM.ArtistAndTokenOwner,
        PMP_PARAM_TYPE_ENUM.Int256Range,
        0,
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000005"
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfig1,
        ]);
      // token owner sets a param to a valid value
      const pmpInput1 = getPMPInput(
        "param1",
        PMP_PARAM_TYPE_ENUM.Int256Range,
        "0x0000000000000000000000000000000000000000000000000000000000000005",
        false,
        ""
      );
      await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero,
          [pmpInput1]
        );
      // artist then updates the range, making the previous value out of bounds
      pmpConfig1.pmpConfig.minRange = int256ToBytes32(0);
      pmpConfig1.pmpConfig.maxRange = int256ToBytes32(2);
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfig1,
        ]);
      // expect no params to be returned (out of bounds now that range is updated)
      const params2 = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );
      expect(params2.length).to.equal(0);
      // artist updates range again, making the previous value out of bounds on negative side
      pmpConfig1.pmpConfig.minRange = int256ToBytes32(6);
      pmpConfig1.pmpConfig.maxRange = int256ToBytes32(10);
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfig1,
        ]);
      // expect no params to be returned (out of bounds now that range is updated)
      const params3 = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );
      expect(params3.length).to.equal(0);
    });

    it("returns stale, out-of-range uint, timestamp range params if in range", async function () {
      const config = await loadFixture(_beforeEach);
      for (const paramType of [
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        PMP_PARAM_TYPE_ENUM.Timestamp,
      ]) {
        // artist configures a token param for project zero
        const pmpConfig1 = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndTokenOwner,
          paramType,
          0,
          constants.AddressZero,
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000010"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig1,
          ]);
        // token owner sets a param to a valid value
        const pmpInput1 = getPMPInput(
          "param1",
          paramType,
          "0x0000000000000000000000000000000000000000000000000000000000000003",
          false,
          ""
        );
        await config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero,
            [pmpInput1]
          );
        // expect the param to be returned
        const params = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero
        );
        expect(params.length).to.equal(1);
        expect(params[0].key).to.equal("param1");
        expect(params[0].value).to.equal("3");
        // artist updates the range, but keeps the previous value in range
        pmpConfig1.pmpConfig.minRange = uint256ToBytes32(0);
        pmpConfig1.pmpConfig.maxRange = uint256ToBytes32(4);
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig1,
          ]);
        // expect the param to be returned (still in range)
        const params2 = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero
        );
        expect(params2.length).to.equal(1);
        expect(params2[0].key).to.equal("param1");
        expect(params2[0].value).to.equal("3");
      }
    });

    it("returns stale, out-of-range decimal range params if in range", async function () {
      const config = await loadFixture(_beforeEach);
      for (const paramType of [PMP_PARAM_TYPE_ENUM.DecimalRange]) {
        // artist configures a token param for project zero
        const pmpConfig1 = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndTokenOwner,
          paramType,
          0,
          constants.AddressZero,
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000010"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig1,
          ]);
        // token owner sets a param to a valid value
        const pmpInput1 = getPMPInput(
          "param1",
          paramType,
          "0x0000000000000000000000000000000000000000000000000000000000000003",
          false,
          ""
        );
        await config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero,
            [pmpInput1]
          );
        // expect the param to be returned
        const params = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero
        );
        expect(params.length).to.equal(1);
        expect(params[0].key).to.equal("param1");
        expect(params[0].value).to.equal("0.0000000003");
        // artist updates the range, but keeps the previous value in range
        pmpConfig1.pmpConfig.minRange = uint256ToBytes32(0);
        pmpConfig1.pmpConfig.maxRange = uint256ToBytes32(4);
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig1,
          ]);
        // expect the param to be returned (still in range)
        const params2 = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero
        );
        expect(params2.length).to.equal(1);
        expect(params2[0].key).to.equal("param1");
        expect(params2[0].value).to.equal("0.0000000003");
      }
    });

    describe("output formatting", function () {
      it("correctly formats uint, timestamp param types", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          PMP_PARAM_TYPE_ENUM.Timestamp,
        ]) {
          // artist configures a token param for project zero
          const pmpConfig1 = getPMPInputConfig(
            "param1",
            PMP_AUTH_ENUM.ArtistAndTokenOwner,
            paramType,
            0,
            constants.AddressZero,
            [],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x000000000000000000000000000000000000000000000000000000000000000a"
          );
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig1]
            );
          // token owner sets a param to a valid value
          const pmpInput1 = getPMPInput(
            "param1",
            paramType,
            "0x000000000000000000000000000000000000000000000000000000000000000a",
            false,
            ""
          );
          await config.pmp
            .connect(config.accounts.user)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero,
              [pmpInput1]
            );
          // expect the param to be returned
          const params = await config.pmp.getTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero
          );
          expect(params.length).to.equal(1);
          expect(params[0].key).to.equal("param1");
          expect(params[0].value).to.equal("10");
        }
      });

      it("correctly formats decimal param types > 1", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.DecimalRange]) {
          // artist configures a token param for project zero
          const pmpConfig1 = getPMPInputConfig(
            "param1",
            PMP_AUTH_ENUM.ArtistAndTokenOwner,
            paramType,
            0,
            constants.AddressZero,
            [],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
          );
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig1]
            );
          // token owner sets a param to a valid value
          const pmpInput1 = getPMPInput(
            "param1",
            paramType,
            "0x00000000000000000000000000000000000000ffffffffffffffffffffffffff",
            false,
            ""
          );
          await config.pmp
            .connect(config.accounts.user)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero,
              [pmpInput1]
            );
          // expect the param to be returned
          const params = await config.pmp.getTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero
          );
          expect(params.length).to.equal(1);
          expect(params[0].key).to.equal("param1");
          expect(params[0].value).to.equal("2028240960365167042394.7251286015");
        }
      });

      it("correctly formats decimal param types < 1", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.DecimalRange]) {
          // artist configures a token param for project zero
          const pmpConfig1 = getPMPInputConfig(
            "param1",
            PMP_AUTH_ENUM.ArtistAndTokenOwner,
            paramType,
            0,
            constants.AddressZero,
            [],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x000000000000000000000000000000000000000000000000000000000000000a"
          );
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig1]
            );
          // token owner sets a param to a valid value
          const pmpInput1 = getPMPInput(
            "param1",
            paramType,
            "0x000000000000000000000000000000000000000000000000000000000000000a",
            false,
            ""
          );
          await config.pmp
            .connect(config.accounts.user)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero,
              [pmpInput1]
            );
          // expect the param to be returned
          const params = await config.pmp.getTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero
          );
          expect(params.length).to.equal(1);
          expect(params[0].key).to.equal("param1");
          expect(params[0].value).to.equal("0.0000000010");
        }
      });

      it("correctly formats decimal param types at value 0", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.DecimalRange]) {
          // artist configures a token param for project zero
          const pmpConfig1 = getPMPInputConfig(
            "param1",
            PMP_AUTH_ENUM.ArtistAndTokenOwner,
            paramType,
            0,
            constants.AddressZero,
            [],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x000000000000000000000000000000000000000000000000000000000000000a"
          );
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig1]
            );
          // token owner sets a param to a valid value
          const pmpInput1 = getPMPInput(
            "param1",
            paramType,
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            false,
            ""
          );
          await config.pmp
            .connect(config.accounts.user)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero,
              [pmpInput1]
            );
          // expect the param to be returned
          const params = await config.pmp.getTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero
          );
          expect(params.length).to.equal(1);
          expect(params[0].key).to.equal("param1");
          expect(params[0].value).to.equal("0.0000000000");
        }
      });

      it("correctly formats negative int256 range params", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.Int256Range]) {
          // artist configures a token param for project zero
          const minRange = int256ToBytes32(-10);
          const maxRange = int256ToBytes32(10);
          const pmpConfig1 = getPMPInputConfig(
            "param1",
            PMP_AUTH_ENUM.ArtistAndTokenOwner,
            paramType,
            0,
            constants.AddressZero,
            [],
            minRange,
            maxRange
          );
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig1]
            );
          // token owner sets a param to a valid value
          const int256Value = int256ToBytes32(-5);
          const pmpInput1 = getPMPInput(
            "param1",
            paramType,
            int256Value,
            false,
            ""
          );
          await config.pmp
            .connect(config.accounts.user)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero,
              [pmpInput1]
            );
          // expect the param to be returned
          const params = await config.pmp.getTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero
          );
          expect(params.length).to.equal(1);
          expect(params[0].key).to.equal("param1");
          expect(params[0].value).to.equal("-5");
        }
      });

      it("correctly formats positive int256 range params", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.Int256Range]) {
          // artist configures a token param for project zero
          const minRange = int256ToBytes32(-10);
          const maxRange = int256ToBytes32(10);
          const pmpConfig1 = getPMPInputConfig(
            "param1",
            PMP_AUTH_ENUM.ArtistAndTokenOwner,
            paramType,
            0,
            constants.AddressZero,
            [],
            minRange,
            maxRange
          );
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig1]
            );
          // token owner sets a param to a valid value
          const int256Value = int256ToBytes32(5);
          const pmpInput1 = getPMPInput(
            "param1",
            paramType,
            int256Value,
            false,
            ""
          );
          await config.pmp
            .connect(config.accounts.user)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero,
              [pmpInput1]
            );
          // expect the param to be returned
          const params = await config.pmp.getTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero
          );
          expect(params.length).to.equal(1);
          expect(params[0].key).to.equal("param1");
          expect(params[0].value).to.equal("5");
        }
      });

      it("correctly formats 0-value int256 range params", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.Int256Range]) {
          // artist configures a token param for project zero
          const minRange = int256ToBytes32(-10);
          const maxRange = int256ToBytes32(10);
          const pmpConfig1 = getPMPInputConfig(
            "param1",
            PMP_AUTH_ENUM.ArtistAndTokenOwner,
            paramType,
            0,
            constants.AddressZero,
            [],
            minRange,
            maxRange
          );
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig1]
            );
          // token owner sets a param to a valid value
          const int256Value = int256ToBytes32(0);
          const pmpInput1 = getPMPInput(
            "param1",
            paramType,
            int256Value,
            false,
            ""
          );
          await config.pmp
            .connect(config.accounts.user)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero,
              [pmpInput1]
            );
          // expect the param to be returned
          const params = await config.pmp.getTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero
          );
          expect(params.length).to.equal(1);
          expect(params[0].key).to.equal("param1");
          expect(params[0].value).to.equal("0");
        }
      });

      it("correctly formats true bool params", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.Bool]) {
          // artist configures a token param for project zero
          const pmpConfig1 = getPMPInputConfig(
            "param1",
            PMP_AUTH_ENUM.ArtistAndTokenOwner,
            paramType,
            0,
            constants.AddressZero,
            [],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig1]
            );
          // token owner sets a param to a valid value
          const pmpInput1 = getPMPInput(
            "param1",
            paramType,
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            false,
            ""
          );
          await config.pmp
            .connect(config.accounts.user)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero,
              [pmpInput1]
            );
          // expect the param to be returned
          const params = await config.pmp.getTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero
          );
          expect(params.length).to.equal(1);
          expect(params[0].key).to.equal("param1");
          expect(params[0].value).to.equal("true");
        }
      });

      it("correctly formats false bool params", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.Bool]) {
          // artist configures a token param for project zero
          const pmpConfig1 = getPMPInputConfig(
            "param1",
            PMP_AUTH_ENUM.ArtistAndTokenOwner,
            paramType,
            0,
            constants.AddressZero,
            [],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig1]
            );
          // token owner sets a param to a valid value
          const pmpInput1 = getPMPInput(
            "param1",
            paramType,
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            false,
            ""
          );
          await config.pmp
            .connect(config.accounts.user)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero,
              [pmpInput1]
            );
          // expect the param to be returned
          const params = await config.pmp.getTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero
          );
          expect(params.length).to.equal(1);
          expect(params[0].key).to.equal("param1");
          expect(params[0].value).to.equal("false");
        }
      });

      it("correctly formats hex color params", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.HexColor]) {
          // artist configures a token param for project zero
          const pmpConfig1 = getPMPInputConfig(
            "param1",
            PMP_AUTH_ENUM.ArtistAndTokenOwner,
            paramType,
            0,
            constants.AddressZero,
            [],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig1]
            );
          // token owner sets a param to a valid value
          const pmpInput1 = getPMPInput(
            "param1",
            paramType,
            "0x000000000000000000000000000000000000000000000000000000000000ffff",
            false,
            ""
          );
          await config.pmp
            .connect(config.accounts.user)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero,
              [pmpInput1]
            );
          // expect the param to be returned
          const params = await config.pmp.getTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero
          );
          expect(params.length).to.equal(1);
          expect(params[0].key).to.equal("param1");
          expect(params[0].value).to.equal("#00ffff");
        }
      });

      it("correctly formats select params", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.Select]) {
          // artist configures a token param for project zero
          const pmpConfig1 = getPMPInputConfig(
            "param1",
            PMP_AUTH_ENUM.ArtistAndTokenOwner,
            paramType,
            0,
            constants.AddressZero,
            ["option 1!", "option 2!", "option 3!"],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig1]
            );
          // token owner sets a param to a valid value
          const pmpInput1 = getPMPInput(
            "param1",
            paramType,
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            false,
            ""
          );
          await config.pmp
            .connect(config.accounts.user)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero,
              [pmpInput1]
            );
          // expect the param to be returned
          const params = await config.pmp.getTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero
          );
          expect(params.length).to.equal(1);
          expect(params[0].key).to.equal("param1");
          expect(params[0].value).to.equal("option 2!");
        }
      });

      it("correctly formats arbitrary string params", async function () {
        const config = await loadFixture(_beforeEach);
        for (const paramType of [PMP_PARAM_TYPE_ENUM.String]) {
          // artist configures a token param for project zero
          const pmpConfig1 = getPMPInputConfig(
            "param1",
            PMP_AUTH_ENUM.ArtistAndTokenOwner,
            paramType,
            0,
            constants.AddressZero,
            [],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [pmpConfig1]
            );
          // token owner sets a param to a valid value
          const pmpInput1 = getPMPInput(
            "param1",
            paramType,
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            false,
            "Hello, world!"
          );
          await config.pmp
            .connect(config.accounts.user)
            .configureTokenParams(
              config.genArt721Core.address,
              config.projectZeroTokenZero,
              [pmpInput1]
            );
          // expect the param to be returned
          const params = await config.pmp.getTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero
          );
          expect(params.length).to.equal(1);
          expect(params[0].key).to.equal("param1");
          expect(params[0].value).to.equal("Hello, world!");
        }
      });
    });

    describe("augmentation hooks", function () {
      it("calls augmentation hook if configured", async function () {
        const config = await loadFixture(_beforeEach);
        // configure project to use hook
        await config.pmp
          .connect(config.accounts.artist)
          .configureProjectHooks(
            config.genArt721Core.address,
            config.projectZero,
            constants.AddressZero,
            config.augmentHook.address
          );
        // configure hook to add a param
        await config.augmentHook.setHookBehavior(true, false, false);
        await config.augmentHook.setAugmentValues(
          "augmentation",
          "I'm augmented!"
        );

        // artist configures a token param for project zero
        const pmpConfig1 = getPMPInputConfig(
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
            pmpConfig1,
          ]);

        // token owner configures a param
        const pmpInput1 = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.String,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          false,
          "configured string"
        );
        await config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero,
            [pmpInput1]
          );

        // expect the param to be returned
        const params = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero
        );
        expect(params.length).to.equal(2);
        expect(params[0].key).to.equal("param1");
        expect(params[0].value).to.equal("configured string");
        expect(params[1].key).to.equal("augmentation");
        expect(params[1].value).to.equal("I'm augmented!");
      });
    });

    describe("getProjectConfig", function () {
      it("returns uninitialized values and empty array for uninitialized projects", async function () {
        const config = await loadFixture(_beforeEach);
        const projectConfig = await config.pmp.getProjectConfig(
          config.genArt721Core.address,
          999
        );
        expect(projectConfig.pmpKeys.length).to.equal(0);
        expect(projectConfig.configNonce).to.equal(0);
        expect(projectConfig.tokenPMPPostConfigHook).to.equal(
          constants.AddressZero
        );
        expect(projectConfig.tokenPMPReadAugmentationHook).to.equal(
          constants.AddressZero
        );
      });

      it("returns populated values for initialized projects", async function () {
        const config = await loadFixture(_beforeEach);
        // artist configures a project
        const pmpConfig1 = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndTokenOwner,
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          0,
          constants.AddressZero,
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000001",
          "0x0000000000000000000000000000000000000000000000000000000000000010"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig1,
          ]);
        // artist configures hooks
        await config.pmp
          .connect(config.accounts.artist)
          .configureProjectHooks(
            config.genArt721Core.address,
            config.projectZero,
            config.configureHook.address,
            config.augmentHook.address
          );
        const projectConfig = await config.pmp.getProjectConfig(
          config.genArt721Core.address,
          config.projectZero
        );
        expect(projectConfig.pmpKeys.length).to.equal(1);
        expect(projectConfig.pmpKeys[0]).to.equal("param1");
        expect(projectConfig.configNonce).to.equal(1);
        expect(projectConfig.tokenPMPPostConfigHook).to.equal(
          config.configureHook.address
        );
        expect(projectConfig.tokenPMPReadAugmentationHook).to.equal(
          config.augmentHook.address
        );
      });
    });

    describe("getProjectPMPConfig", function () {
      it("returns uninitialized values and empty array for uninitialized projects", async function () {
        const config = await loadFixture(_beforeEach);
        const pmpConfigStorage = await config.pmp.getProjectPMPConfig(
          config.genArt721Core.address,
          999,
          "param1"
        );
        expect(pmpConfigStorage.highestConfigNonce).to.equal(0);
        expect(pmpConfigStorage.authOption).to.equal(PMP_AUTH_ENUM.Artist); // default value at index 0
        expect(pmpConfigStorage.paramType).to.equal(
          PMP_PARAM_TYPE_ENUM.Unconfigured // default value at index 0
        );
        expect(pmpConfigStorage.pmpLockedAfterTimestamp).to.equal(0);
        expect(pmpConfigStorage.authAddress).to.equal(constants.AddressZero);
        expect(pmpConfigStorage.selectOptions).to.deep.equal([]);
        expect(pmpConfigStorage.minRange).to.equal(
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
        expect(pmpConfigStorage.maxRange).to.equal(
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("returns populated values for initialized projects", async function () {
        const config = await loadFixture(_beforeEach);
        // artist configures a project
        const pmpConfig1 = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndTokenOwnerAndAddress,
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          9991741376533, // far future timestamp
          config.accounts.deployer.address,
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000001",
          "0x0000000000000000000000000000000000000000000000000000000000000010"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            pmpConfig1,
          ]);
        const pmpConfigStorage = await config.pmp.getProjectPMPConfig(
          config.genArt721Core.address,
          config.projectZero,
          "param1"
        );
        expect(pmpConfigStorage.highestConfigNonce).to.equal(1);
        expect(pmpConfigStorage.authOption).to.equal(
          PMP_AUTH_ENUM.ArtistAndTokenOwnerAndAddress
        );
        expect(pmpConfigStorage.paramType).to.equal(
          PMP_PARAM_TYPE_ENUM.Uint256Range
        );
        expect(pmpConfigStorage.pmpLockedAfterTimestamp).to.equal(
          9991741376533
        );
        expect(pmpConfigStorage.authAddress).to.equal(
          config.accounts.deployer.address
        );
        expect(pmpConfigStorage.selectOptions).to.deep.equal([]);
        expect(pmpConfigStorage.minRange).to.equal(
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
        expect(pmpConfigStorage.maxRange).to.equal(
          "0x0000000000000000000000000000000000000000000000000000000000000010"
        );
      });
    });

    describe("getTokenPMPStorage", function () {
      it("returns uninitialized values for uninitialized tokens", async function () {
        const config = await loadFixture(_beforeEach);
        const pmpStorage = await config.pmp.getTokenPMPStorage(
          config.genArt721Core.address,
          config.projectZeroTokenZero,
          "param1"
        );
        expect(pmpStorage.configuredParamType).to.equal(
          PMP_PARAM_TYPE_ENUM.Unconfigured // default value at index 0
        );
        expect(pmpStorage.configuredValue).to.equal(
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
        expect(pmpStorage.artistConfiguredValueString).to.equal("");
        expect(pmpStorage.nonArtistConfiguredValueString).to.equal("");
      });

      it("returns populated values for initialized tokens", async function () {
        const config = await loadFixture(_beforeEach);
        // artist configures a token
        const pmpConfig1 = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndTokenOwner,
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          0,
          constants.AddressZero,
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000001",
          "0x0000000000000000000000000000000000000000000000000000000000000010"
        );
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(
            config.genArt721Core.address,
            config.projectZeroTokenZero,
            [pmpConfig1]
          );
        // token owner configures a param
        const pmpInput1 = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          "0x000000000000000000000000000000000000000000000000000000000000000a",
          false,
          ""
        );
        await config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero,
            [pmpInput1]
          );
        const pmpStorage = await config.pmp.getTokenPMPStorage(
          config.genArt721Core.address,
          config.projectZeroTokenZero,
          "param1"
        );
        expect(pmpStorage.configuredParamType).to.equal(
          PMP_PARAM_TYPE_ENUM.Uint256Range
        );
        expect(pmpStorage.configuredValue).to.equal(
          "0x000000000000000000000000000000000000000000000000000000000000000a"
        );
        expect(pmpStorage.artistConfiguredValueString).to.equal("");
        expect(pmpStorage.nonArtistConfiguredValueString).to.equal("");
      });
    });
  });
});
