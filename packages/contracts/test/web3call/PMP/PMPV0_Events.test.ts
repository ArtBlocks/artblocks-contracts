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
describe("PMPV0_Events", function () {
  // Test fixture with projects, tokens, and PMP contract setup
  async function _beforeEach() {
    const config = await loadFixture(setupPMPFixture);
    return config;
  }

  describe("ProjectHooksConfigured", function () {
    it("emitted when project hooks are configured", async function () {
      const config = await loadFixture(_beforeEach);
      // artist configures hooks for project
      await expect(
        config.pmp
          .connect(config.accounts.artist)
          .configureProjectHooks(
            config.genArt721Core.address,
            config.projectZero,
            config.configureHook.address,
            config.augmentHook.address
          )
      )
        .to.emit(config.pmp, "ProjectHooksConfigured")
        .withArgs(
          config.genArt721Core.address,
          config.projectZero,
          config.configureHook.address,
          config.augmentHook.address
        );
    });
  });

  describe("ProjectConfigured", function () {
    it("emitted when project is configured", async function () {
      const config = await loadFixture(_beforeEach);
      // get config nonce for project 0
      const initialProjectConfig = await config.pmp.getProjectConfig(
        config.genArt721Core.address,
        config.projectZero
      );
      expect(initialProjectConfig.configNonce).to.equal(0);
      // artist configures project
      const pmpConfig = getPMPInputConfig(
        "param1",
        PMP_AUTH_ENUM.Artist,
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        9999999999999,
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000010"
      );
      // validate input params manually
      const tx = await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfig,
        ]);
      const receipt = await tx.wait();
      const event = receipt.events?.find(
        (e) => e.event === "ProjectConfigured"
      );
      expect(event?.args?.[0]).to.equal(config.genArt721Core.address); // genArt721Core address
      expect(event?.args?.[1]).to.equal(config.projectZero); // project id
      expect(event?.args?.[2][0][0]).to.equal("param1"); // pmpConfig key
      expect(event?.args?.[2][0][1].slice(0, 7)).to.deep.equal([
        PMP_AUTH_ENUM.Artist,
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        9999999999999,
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000010",
      ]); // pmpConfig authOption
      expect(event?.args?.[3]).to.equal(1); // config nonce of 1
    });
  });

  describe("TokenParamsConfigured", function () {
    it("emitted when token parameters are configured", async function () {
      const config = await loadFixture(_beforeEach);
      // artist configures project
      const pmpConfig = getPMPInputConfig(
        "param1",
        PMP_AUTH_ENUM.ArtistAndTokenOwner,
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        9999999999999,
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000010"
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfig,
        ]);
      // token owner configures token parameters
      const pmpInput = getPMPInput(
        "param1",
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        "0x0000000000000000000000000000000000000000000000000000000000000002",
        false,
        ""
      );
      // verify values manually due to complex event args
      const tx = await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero,
          [pmpInput]
        );
      const receipt = await tx.wait();
      const event = receipt.events?.find(
        (e) => e.event === "TokenParamsConfigured"
      );
      console.log("event", event);
      expect(event?.args?.[0]).to.equal(config.genArt721Core.address); // genArt721Core address
      expect(event?.args?.[1]).to.equal(config.projectZeroTokenZero); // project id
      expect(event?.args?.[2][0][0]).to.equal("param1"); // pmpInput key
      expect(event?.args?.[2][0][1]).to.equal(PMP_PARAM_TYPE_ENUM.Uint256Range); // pmpInput paramType
      expect(event?.args?.[2][0][2]).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000002"
      ); // pmpInput value
      expect(event?.args?.[2][0][3]).to.equal(false); // pmpInput configuringArtistString
      expect(event?.args?.[2][0][4]).to.deep.equal(""); // pmpInput configuredValueString
    });
  });
});
