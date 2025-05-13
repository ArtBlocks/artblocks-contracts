import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { constants } from "ethers";
import {
  PMP_AUTH_ENUM,
  PMP_PARAM_TYPE_ENUM,
  getPMPInput,
  getPMPInputConfig,
} from "./pmpTestUtils";
import { setupPMPFixture } from "./pmpFixtures";
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
      const pmpConfig1 = getPMPInputConfig(
        "param1",
        PMP_AUTH_ENUM.ArtistAndTokenOwner,
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        9999999999999,
        constants.AddressZero,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000010"
      );
      // add pmpConfig2 to check artist auth
      const pmpConfig2 = getPMPInputConfig(
        "param2",
        PMP_AUTH_ENUM.ArtistAndTokenOwnerAndAddress,
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        0,
        config.accounts.deployer.address,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000010"
      );
      // add pmpConfig3 to check address auth
      const pmpConfig3 = getPMPInputConfig(
        "param3",
        PMP_AUTH_ENUM.ArtistAndTokenOwnerAndAddress,
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        0,
        config.accounts.user2.address,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000010"
      );

      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfig1,
          pmpConfig2,
          pmpConfig3,
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
      expect(event?.args?.[0]).to.equal(config.genArt721Core.address); // genArt721Core address
      expect(event?.args?.[1]).to.equal(config.projectZeroTokenZero); // project id
      expect(event?.args?.[2][0][0]).to.equal("param1"); // pmpInput key
      expect(event?.args?.[2][0][1]).to.equal(PMP_PARAM_TYPE_ENUM.Uint256Range); // pmpInput paramType
      expect(event?.args?.[2][0][2]).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000002"
      ); // pmpInput value
      expect(event?.args?.[2][0][3]).to.equal(false); // pmpInput configuringArtistString
      expect(event?.args?.[2][0][4]).to.deep.equal(""); // pmpInput configuredValueString
      // verify auth addresses
      expect(event?.args?.[3][0]).to.equal(config.accounts.user.address); // auth address for pmpInput is user, since user is token owner
      // artist configures token param2
      const pmpInput2 = getPMPInput(
        "param2",
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        "0x0000000000000000000000000000000000000000000000000000000000000002",
        false,
        ""
      );
      const tx2 = await config.pmp
        .connect(config.accounts.artist)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero,
          [pmpInput2]
        );
      const receipt2 = await tx2.wait();
      const event2 = receipt2.events?.find(
        (e) => e.event === "TokenParamsConfigured"
      );
      expect(event2?.args?.[3][0]).to.equal(config.accounts.artist.address); // auth address for pmpInput2 is artist address, since artist called the function
      // user2 configures token param3
      const pmpInput3 = getPMPInput(
        "param3",
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        "0x0000000000000000000000000000000000000000000000000000000000000002",
        false,
        ""
      );
      const tx3 = await config.pmp
        .connect(config.accounts.user2)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero,
          [pmpInput3]
        );
      const receipt3 = await tx3.wait();
      const event3 = receipt3.events?.find(
        (e) => e.event === "TokenParamsConfigured"
      );
      expect(event3?.args?.[3][0]).to.equal(config.accounts.user2.address); // auth address for pmpInput3 is user2, since user2 is address
      // token owner delegates all permissions to deployer
      await config.delegateRegistry
        .connect(config.accounts.user)
        .delegateAll(
          config.accounts.deployer.address,
          constants.HashZero,
          true
        );
      // deployer configures token param 1
      const pmpInput4 = getPMPInput(
        "param1",
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        "0x0000000000000000000000000000000000000000000000000000000000000002",
        false,
        ""
      );
      const tx4 = await config.pmp
        .connect(config.accounts.deployer)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero,
          [pmpInput4]
        );
      const receipt4 = await tx4.wait();
      const event4 = receipt4.events?.find(
        (e) => e.event === "TokenParamsConfigured"
      );
      // auth address for event4 is user, not deployer, since deployer used user's auth only as a delegate
      expect(event4?.args?.[3][0]).to.equal(config.accounts.user.address);
    });
  });
});
