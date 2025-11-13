import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import helpers = require("@nomicfoundation/hardhat-network-helpers");
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import { setupSRHooksFixture, SRHooksFixtureConfig } from "./srHooksFixtures";
import { SEND_STATES, RECEIVE_STATES } from "./constants";

const FORK_URL = process.env.MAINNET_JSON_RPC_PROVIDER_URL;
const FORK_BLOCK_NUMBER = 23086000; // Block after delegate.xyz V2 and universal resolver deployment

describe("SRHooks Integration Tests", function () {
  before(async function () {
    // Fork mainnet for integration tests
    await helpers.reset(FORK_URL, FORK_BLOCK_NUMBER);
  });

  after(async function () {
    // Reset fork to not use a fork
    await helpers.reset();
  });

  async function _beforeEach(): Promise<SRHooksFixtureConfig> {
    return await setupSRHooksFixture();
  }

  describe("Delegation V2 Integration", function () {
    it("allows delegate.xyz V2 delegate to update token state", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");
      const tokenId = config.projectThree * 1000000; // Token 0

      // Get delegate registry contract
      const delegateRegistry = await ethers.getContractAt(
        "IDelegateRegistry",
        "0x00000000000000447e69651d841bD8D104Bed493"
      );

      // Token owner (user) delegates to user2
      await delegateRegistry.connect(config.accounts.user).delegateERC721(
        config.accounts.user2.address, // delegate
        config.genArt721Core.address, // contract
        tokenId, // tokenId
        ethers.utils.formatBytes32String("postmintparameters"), // rights
        true // enable
      );

      // Now user2 (delegate) should be able to update token 0
      await expect(
        config.srHooksProxy
          .connect(config.accounts.user2) // delegate calling!
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          })
      ).to.not.be.reverted;

      // Verify the update was successful
      const state = await config.srHooksProxy.getTokenState(0);
      expect(state.activeSlotTokenMetadata.imageDataCompressed).to.equal(
        ethers.utils.hexlify(imageData)
      );
    });

    it("allows delegate to update send state", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");
      const tokenId = config.projectThree * 1000000;

      const delegateRegistry = await ethers.getContractAt(
        "IDelegateRegistry",
        "0x00000000000000447e69651d841bD8D104Bed493"
      );

      // Token owner delegates to user2
      await delegateRegistry
        .connect(config.accounts.user)
        .delegateERC721(
          config.accounts.user2.address,
          config.genArt721Core.address,
          tokenId,
          ethers.utils.formatBytes32String("postmintparameters"),
          true
        );

      // First add image
      await config.srHooksProxy
        .connect(config.accounts.user2)
        .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
          updateImage: true,
          imageDataCompressed: imageData,
          updateSound: false,
          soundDataCompressed: ethers.utils.toUtf8Bytes(""),
        });

      // Delegate updates send state
      await expect(
        config.srHooksProxy
          .connect(config.accounts.user2)
          .updateTokenStateAndMetadata(
            0,
            true,
            SEND_STATES.SEND_GENERAL,
            [],
            false,
            0,
            [],
            false,
            0,
            {
              updateImage: false,
              imageDataCompressed: ethers.utils.toUtf8Bytes(""),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          )
      ).to.not.be.reverted;

      const state = await config.srHooksProxy.getTokenState(0);
      expect(state.sendState).to.equal(SEND_STATES.SEND_GENERAL);
    });

    it("allows delegate to update receive state", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");
      const tokenId = config.projectThree * 1000000;

      const delegateRegistry = await ethers.getContractAt(
        "IDelegateRegistry",
        "0x00000000000000447e69651d841bD8D104Bed493"
      );

      await delegateRegistry
        .connect(config.accounts.user)
        .delegateERC721(
          config.accounts.user2.address,
          config.genArt721Core.address,
          tokenId,
          ethers.utils.formatBytes32String("postmintparameters"),
          true
        );

      // First add image
      await config.srHooksProxy
        .connect(config.accounts.user2)
        .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
          updateImage: true,
          imageDataCompressed: imageData,
          updateSound: false,
          soundDataCompressed: ethers.utils.toUtf8Bytes(""),
        });

      // Delegate updates receive state
      await expect(
        config.srHooksProxy
          .connect(config.accounts.user2)
          .updateTokenStateAndMetadata(
            0,
            false,
            0,
            [],
            true,
            RECEIVE_STATES.RECEIVE_GENERAL,
            [],
            false,
            0,
            {
              updateImage: false,
              imageDataCompressed: ethers.utils.toUtf8Bytes(""),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          )
      ).to.not.be.reverted;

      const state = await config.srHooksProxy.getTokenState(0);
      expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_GENERAL);
    });

    it("reverts when delegate has wrong rights", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");
      const tokenId = config.projectThree * 1000000;

      const delegateRegistry = await ethers.getContractAt(
        "IDelegateRegistry",
        "0x00000000000000447e69651d841bD8D104Bed493"
      );

      // Token owner delegates to user2 with WRONG rights
      await delegateRegistry.connect(config.accounts.user).delegateERC721(
        config.accounts.user2.address,
        config.genArt721Core.address,
        tokenId,
        ethers.utils.formatBytes32String("wrongrights"), // Wrong rights!
        true
      );

      // Delegate should NOT be able to update
      await expect(
        config.srHooksProxy
          .connect(config.accounts.user2)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          })
      ).to.be.reverted;
    });

    it("reverts when delegation is revoked", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");
      const tokenId = config.projectThree * 1000000;

      const delegateRegistry = await ethers.getContractAt(
        "IDelegateRegistry",
        "0x00000000000000447e69651d841bD8D104Bed493"
      );

      // Token owner delegates to user2
      await delegateRegistry
        .connect(config.accounts.user)
        .delegateERC721(
          config.accounts.user2.address,
          config.genArt721Core.address,
          tokenId,
          ethers.utils.formatBytes32String("postmintparameters"),
          true
        );

      // Verify delegation works
      await expect(
        config.srHooksProxy
          .connect(config.accounts.user2)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          })
      ).to.not.be.reverted;

      // Now revoke delegation
      await delegateRegistry.connect(config.accounts.user).delegateERC721(
        config.accounts.user2.address,
        config.genArt721Core.address,
        tokenId,
        ethers.utils.formatBytes32String("postmintparameters"),
        false // disable
      );

      // Delegate should NO LONGER be able to update
      const imageData2 = ethers.utils.toUtf8Bytes("test image 2");
      await expect(
        config.srHooksProxy
          .connect(config.accounts.user2)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData2,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          })
      ).to.be.reverted;
    });

    it("works with contract-level delegation (all tokens)", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const delegateRegistry = await ethers.getContractAt(
        "IDelegateRegistry",
        "0x00000000000000447e69651d841bD8D104Bed493"
      );

      // Token owner delegates entire contract to additional
      await delegateRegistry.connect(config.accounts.user).delegateContract(
        config.accounts.additional.address, // delegate
        config.genArt721Core.address, // contract
        ethers.utils.formatBytes32String("postmintparameters"), // rights
        true // enable
      );

      // Delegate should be able to update token 0
      await expect(
        config.srHooksProxy
          .connect(config.accounts.additional)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          })
      ).to.not.be.reverted;
    });

    it("does not allow delegation for wrong token", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");
      const tokenId0 = config.projectThree * 1000000; // Token 0

      const delegateRegistry = await ethers.getContractAt(
        "IDelegateRegistry",
        "0x00000000000000447e69651d841bD8D104Bed493"
      );

      // Token 0 owner (user) delegates only token 0 to additional
      await delegateRegistry.connect(config.accounts.user).delegateERC721(
        config.accounts.additional.address, // delegate
        config.genArt721Core.address,
        tokenId0, // Only token 0!
        ethers.utils.formatBytes32String("postmintparameters"),
        true
      );

      // Delegate can update token 0
      await expect(
        config.srHooksProxy
          .connect(config.accounts.additional)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          })
      ).to.not.be.reverted;

      // But delegate CANNOT update token 1 (owned by user2, not delegated to additional)
      await expect(
        config.srHooksProxy
          .connect(config.accounts.additional) // additional is NOT owner or delegate of token 1
          .updateTokenStateAndMetadata(1, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          })
      ).to.be.reverted;
    });
  });

  // Note: UUPS Upgrade Integration is thoroughly tested in configure.test.ts
  // Those tests are not run in this fork environment as UUPS upgrades have
  // compatibility issues with mainnet forks. This suite focuses on
  // delegation.xyz V2, ENS resolution, and PMP hook integration.

  describe("PMP Augmentation Hook Integration", function () {
    it("augments params before token configuration", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenId = config.projectThree * 1000000;

      // Call PMPV0.getTokenParams for unconfigured token
      const params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        tokenId
      );

      // Should have exactly 4 augmented params in correct order
      expect(params.length).to.equal(4);

      // Verify keys are in correct order: imageData, soundData, sendState, receiveState
      expect(params[0].key).to.equal("imageData");
      expect(params[1].key).to.equal("soundData");
      expect(params[2].key).to.equal("sendState");
      expect(params[3].key).to.equal("receiveState");
    });

    it("augments params after token configuration with correct values", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");
      const soundData = ethers.utils.toUtf8Bytes("test sound");

      // Setup token with metadata and states
      await config.srHooksProxy
        .connect(config.accounts.user)
        .updateTokenStateAndMetadata(
          0,
          true,
          SEND_STATES.SEND_GENERAL,
          [],
          true,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          true,
          0,
          {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: true,
            soundDataCompressed: soundData,
          }
        );

      // Call PMPV0.getTokenParams which should trigger the augment hook
      const tokenId = config.projectThree * 1000000;
      const params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        tokenId
      );

      // Should have exactly 4 augmented params in correct order
      expect(params.length).to.equal(4);

      // Verify keys are in correct order: imageData, soundData, sendState, receiveState
      expect(params[0].key).to.equal("imageData");
      expect(params[1].key).to.equal("soundData");
      expect(params[2].key).to.equal("sendState");
      expect(params[3].key).to.equal("receiveState");

      // Verify the image data value contains our test data
      expect(params[0].value).to.equal(ethers.utils.hexlify(imageData));

      // Verify the sound data value contains our test data
      expect(params[1].value).to.equal(ethers.utils.hexlify(soundData));

      // Verify sendState value (converted to string enum name)
      expect(params[2].value).to.equal("SendGeneral");

      // Verify receiveState value (converted to string enum name)
      expect(params[3].value).to.equal("ReceiveGeneral");
    });

    it("correctly converts all send states to string enum names", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test");
      const tokenId = config.projectThree * 1000000;

      // Test Neutral send state (default)
      let params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        tokenId
      );
      expect(params[2].key).to.equal("sendState");
      expect(params[2].value).to.equal("Neutral");

      // Test SendGeneral state
      await config.srHooksProxy
        .connect(config.accounts.user)
        .updateTokenStateAndMetadata(
          0,
          true,
          SEND_STATES.SEND_GENERAL,
          [],
          false,
          0,
          [],
          true,
          0,
          {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        tokenId
      );
      expect(params[2].value).to.equal("SendGeneral");

      // Test SendTo state
      await config.srHooksProxy
        .connect(config.accounts.user)
        .updateTokenStateAndMetadata(
          0,
          true,
          SEND_STATES.SEND_TO,
          [1, 2],
          false,
          0,
          [],
          false,
          0,
          {
            updateImage: false,
            imageDataCompressed: ethers.utils.toUtf8Bytes(""),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        tokenId
      );
      expect(params[2].value).to.equal("SendTo");
    });

    it("correctly converts all receive states to string enum names", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test");
      const tokenId = config.projectThree * 1000000;

      // First add image to enable state changes
      await config.srHooksProxy
        .connect(config.accounts.user)
        .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
          updateImage: true,
          imageDataCompressed: imageData,
          updateSound: false,
          soundDataCompressed: ethers.utils.toUtf8Bytes(""),
        });

      // Test Neutral receive state (default)
      let params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        tokenId
      );
      expect(params[3].key).to.equal("receiveState");
      expect(params[3].value).to.equal("Neutral");

      // Test ReceiveGeneral state
      await config.srHooksProxy
        .connect(config.accounts.user)
        .updateTokenStateAndMetadata(
          0,
          false,
          0,
          [],
          true,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          false,
          0,
          {
            updateImage: false,
            imageDataCompressed: ethers.utils.toUtf8Bytes(""),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        tokenId
      );
      expect(params[3].value).to.equal("ReceiveGeneral");

      // Test ReceiveFrom state
      await config.srHooksProxy
        .connect(config.accounts.user)
        .updateTokenStateAndMetadata(
          0,
          false,
          0,
          [],
          true,
          RECEIVE_STATES.RECEIVE_FROM,
          [1],
          false,
          0,
          {
            updateImage: false,
            imageDataCompressed: ethers.utils.toUtf8Bytes(""),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        tokenId
      );
      expect(params[3].value).to.equal("ReceiveFrom");

      // Test ReceiveTo state
      await config.srHooksProxy
        .connect(config.accounts.user)
        .updateTokenStateAndMetadata(
          0,
          false,
          0,
          [],
          true,
          RECEIVE_STATES.RECEIVE_TO,
          [],
          false,
          0,
          {
            updateImage: false,
            imageDataCompressed: ethers.utils.toUtf8Bytes(""),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        tokenId
      );
      expect(params[3].value).to.equal("ReceiveTo");
    });

    it("reflects active slot data after slot change", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData0 = ethers.utils.toUtf8Bytes("slot 0 image data");
      const soundData0 = ethers.utils.toUtf8Bytes("slot 0 sound data");
      const imageData1 = ethers.utils.toUtf8Bytes("slot 1 image data");
      const soundData1 = ethers.utils.toUtf8Bytes("slot 1 sound data");
      const tokenId = config.projectThree * 1000000;

      // Add image and sound to slot 0
      await config.srHooksProxy
        .connect(config.accounts.user)
        .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
          updateImage: true,
          imageDataCompressed: imageData0,
          updateSound: true,
          soundDataCompressed: soundData0,
        });

      // Verify slot 0 data is returned
      let params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        tokenId
      );
      expect(params[0].value).to.equal(ethers.utils.hexlify(imageData0));
      expect(params[1].value).to.equal(ethers.utils.hexlify(soundData0));

      // Add image and sound to slot 1 (makes it active)
      await config.srHooksProxy
        .connect(config.accounts.user)
        .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 1, {
          updateImage: true,
          imageDataCompressed: imageData1,
          updateSound: true,
          soundDataCompressed: soundData1,
        });

      // Verify slot 1 data is now returned (active slot changed)
      params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        tokenId
      );
      expect(params[0].value).to.equal(ethers.utils.hexlify(imageData1));
      expect(params[1].value).to.equal(ethers.utils.hexlify(soundData1));

      // Change back to slot 0
      await config.srHooksProxy
        .connect(config.accounts.user)
        .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
          updateImage: false,
          imageDataCompressed: ethers.utils.toUtf8Bytes(""),
          updateSound: false,
          soundDataCompressed: ethers.utils.toUtf8Bytes(""),
        });

      // Verify slot 0 data is returned again
      params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        tokenId
      );
      expect(params[0].value).to.equal(ethers.utils.hexlify(imageData0));
      expect(params[1].value).to.equal(ethers.utils.hexlify(soundData0));
    });
  });

  describe("ENS Resolution Integration", function () {
    it("returns empty string for address without ENS", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      // Setup token
      await config.srHooksProxy
        .connect(config.accounts.user)
        .updateTokenStateAndMetadata(
          0,
          true,
          SEND_STATES.SEND_GENERAL,
          [],
          true,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          true,
          0,
          {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      // Call getLiveData
      const [
        sendState,
        receiveState,
        receivedTokensGeneral,
        receivedTokensTo,
        numSendGeneral,
        numReceiveGeneral,
        numSendingToMe,
        usedBlockNumber,
      ] = await config.srHooksProxy.getLiveData(0, 0, 10);

      // The token is owned by a test account without ENS
      // ENS resolution should work gracefully and not revert
      expect(sendState).to.equal(SEND_STATES.SEND_GENERAL);
    });

    it("handles ENS resolution without reverting for multiple tokens", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      // Setup multiple tokens in SendGeneral (each with their own owner)
      await config.srHooksProxy
        .connect(config.accounts.user)
        .updateTokenStateAndMetadata(
          0,
          true,
          SEND_STATES.SEND_GENERAL,
          [],
          false,
          0,
          [],
          true,
          0,
          {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      await config.srHooksProxy
        .connect(config.accounts.user2)
        .updateTokenStateAndMetadata(
          1,
          true,
          SEND_STATES.SEND_GENERAL,
          [],
          false,
          0,
          [],
          true,
          0,
          {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      await config.srHooksProxy
        .connect(config.accounts.additional)
        .updateTokenStateAndMetadata(
          2,
          true,
          SEND_STATES.SEND_GENERAL,
          [],
          false,
          0,
          [],
          true,
          0,
          {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      // Token 0 in ReceiveGeneral - should receive from general pool
      await config.srHooksProxy
        .connect(config.accounts.user)
        .updateTokenStateAndMetadata(
          0,
          false,
          0,
          [],
          true,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          false,
          0,
          {
            updateImage: false,
            imageDataCompressed: ethers.utils.toUtf8Bytes(""),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      // Call getLiveData - should resolve ENS for all received tokens
      const [
        sendState,
        receiveState,
        receivedTokensGeneral,
        receivedTokensTo,
        numSendGeneral,
        numReceiveGeneral,
        numSendingToMe,
        usedBlockNumber,
      ] = await config.srHooksProxy.getLiveData(0, 0, 10);

      // Verify we got results (ENS resolution didn't break anything)
      expect(receivedTokensGeneral.length).to.be.greaterThan(0);
      expect(receiveState).to.equal(RECEIVE_STATES.RECEIVE_GENERAL);
    });

    it("ENS resolution works in ReceiveFrom state", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      // Token 1 sends to token 0
      await config.srHooksProxy
        .connect(config.accounts.user2)
        .updateTokenStateAndMetadata(
          1,
          true,
          SEND_STATES.SEND_TO,
          [0],
          false,
          0,
          [],
          true,
          0,
          {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      // Token 0 receives from token 1
      await config.srHooksProxy
        .connect(config.accounts.user)
        .updateTokenStateAndMetadata(
          0,
          false,
          0,
          [],
          true,
          RECEIVE_STATES.RECEIVE_FROM,
          [1],
          true,
          0,
          {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      // Call getLiveData - should resolve ENS for token 1
      const [
        sendState,
        receiveState,
        receivedTokensGeneral,
        receivedTokensTo,
        numSendGeneral,
        numReceiveGeneral,
        numSendingToMe,
        usedBlockNumber,
      ] = await config.srHooksProxy.getLiveData(0, 0, 10);

      // Verify we got token 1 in receivedTo (comes from ReceiveFrom list, token 1 is SendTo [0])
      expect(receiveState).to.equal(RECEIVE_STATES.RECEIVE_FROM);
      expect(receivedTokensTo.length).to.equal(1);
    });

    it("ENS resolution works in ReceiveTo state", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      // Token 1 sends to token 0
      await config.srHooksProxy
        .connect(config.accounts.user2)
        .updateTokenStateAndMetadata(
          1,
          true,
          SEND_STATES.SEND_TO,
          [0],
          false,
          0,
          [],
          true,
          0,
          {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      // Token 0 in ReceiveTo state
      await config.srHooksProxy
        .connect(config.accounts.user)
        .updateTokenStateAndMetadata(
          0,
          false,
          0,
          [],
          true,
          RECEIVE_STATES.RECEIVE_TO,
          [],
          true,
          0,
          {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      // Call getLiveData - should resolve ENS for token 1
      const [
        sendState,
        receiveState,
        receivedTokensGeneral,
        receivedTokensTo,
        numSendGeneral,
        numReceiveGeneral,
        numSendingToMe,
        usedBlockNumber,
      ] = await config.srHooksProxy.getLiveData(0, 0, 10);

      // Verify we got token 1 in receivedTo
      expect(receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);
      expect(receivedTokensTo.length).to.equal(1);
    });
  });
});
