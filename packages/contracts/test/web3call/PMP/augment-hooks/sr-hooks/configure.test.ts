import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers, upgrades } from "hardhat";
import { setupSRHooksFixture } from "./srHooksFixtures";
import {
  srHooksRevertMessages,
  SR_CONSTANTS,
  SEND_STATES,
  RECEIVE_STATES,
} from "./constants";
import {
  bytes,
  emptyBytes,
  updateImage,
  updateSound,
  updateImageAndSound,
  updateSendState,
  updateReceiveState,
  updateImageAndSendState,
  updateImageAndReceiveState,
  updateImageSoundAndStates,
  changeActiveSlot,
} from "./testHelpers";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

/**
 * Test suite for SRHooks configuration functionality
 */
describe("SRHooks_Configure", function () {
  // Test fixture with projects, tokens, and SRHooks contract setup
  async function _beforeEach() {
    const config = await loadFixture(setupSRHooksFixture);
    return config;
  }

  describe("initialize", function () {
    it("cannot be initialized twice", async function () {
      const config = await loadFixture(_beforeEach);
      // Try to initialize again
      await expect(
        config.srHooksProxy.initialize(
          config.accounts.deployer.address,
          config.genArt721Core.address,
          config.projectThree
        )
      ).to.be.reverted; // OZ 5.0 uses custom errors
    });

    it("cannot initialize the implementation contract", async function () {
      const config = await loadFixture(_beforeEach);
      // Try to initialize the implementation
      await expect(
        config.srHooksImplementation.initialize(
          config.accounts.deployer.address,
          config.genArt721Core.address,
          config.projectThree
        )
      ).to.be.reverted; // OZ 5.0 uses custom errors
    });

    it("initializes with correct values", async function () {
      const config = await loadFixture(_beforeEach);
      expect(await config.srHooksProxy.CORE_CONTRACT_ADDRESS()).to.equal(
        config.genArt721Core.address
      );
      expect(await config.srHooksProxy.CORE_PROJECT_ID()).to.equal(
        config.projectThree
      );
      expect(await config.srHooksProxy.owner()).to.equal(
        config.accounts.deployer.address
      );
    });
  });

  describe("ownership and upgrades", function () {
    it("non-owner cannot transfer ownership", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.srHooksProxy
          .connect(config.accounts.user)
          .transferOwnership(config.accounts.user.address)
      ).to.be.reverted; // OZ 5.0 uses custom errors
    });

    it("non-owner cannot upgrade the contract", async function () {
      const config = await loadFixture(_beforeEach);

      // Try to upgrade as non-owner (using upgrades helper which calls through proxy)
      const SRHooksV2Factory = await ethers.getContractFactory(
        "SRHooks",
        config.accounts.user
      );

      // This should fail because user is not the owner
      await expect(
        upgrades.upgradeProxy(config.srHooksProxy.address, SRHooksV2Factory)
      ).to.be.reverted; // OZ 5.0 uses custom errors
    });

    it("owner can transfer ownership", async function () {
      const config = await loadFixture(_beforeEach);
      await config.srHooksProxy
        .connect(config.accounts.deployer)
        .transferOwnership(config.accounts.user.address);
      expect(await config.srHooksProxy.owner()).to.equal(
        config.accounts.user.address
      );
    });

    it("owner can upgrade the contract", async function () {
      const config = await loadFixture(_beforeEach);

      // Deploy a new implementation (using same contract for testing)
      const SRHooksV2Factory = await ethers.getContractFactory(
        "SRHooks",
        config.accounts.deployer
      );

      const upgraded = await upgrades.upgradeProxy(
        config.srHooksProxy.address,
        SRHooksV2Factory,
        { call: { fn: "owner", args: [] } } // Call a view function to verify upgrade worked
      );

      // Verify state is preserved
      expect(await upgraded.CORE_CONTRACT_ADDRESS()).to.equal(
        config.genArt721Core.address
      );
      expect(await upgraded.CORE_PROJECT_ID()).to.equal(config.projectThree);
      expect(await upgraded.owner()).to.equal(config.accounts.deployer.address);
    });
  });

  describe("updateTokenStateAndMetadata", function () {
    describe("reverts for invalid inputs", function () {
      it("reverts when token number is invalid (>= uint16.max)", async function () {
        const config = await loadFixture(_beforeEach);
        const invalidTokenNumber = 65536; // >= type(uint16).max

        await expectRevert(
          config.srHooksProxy
            .connect(config.accounts.user)
            .updateTokenStateAndMetadata(
              invalidTokenNumber,
              false,
              SEND_STATES.NEUTRAL,
              [],
              false,
              RECEIVE_STATES.NEUTRAL,
              [],
              true,
              0,
              {
                updateImage: true,
                imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
                updateSound: false,
                soundDataCompressed: ethers.utils.toUtf8Bytes(""),
              }
            ),
          srHooksRevertMessages.invalidTokenNumber
        );
      });

      it("reverts when caller is not owner or delegate", async function () {
        const config = await loadFixture(_beforeEach);
        // Token 0 belongs to user, try to update as user2
        await expect(
          config.srHooksProxy
            .connect(config.accounts.user2)
            .updateTokenStateAndMetadata(
              0,
              false,
              SEND_STATES.NEUTRAL,
              [],
              false,
              RECEIVE_STATES.NEUTRAL,
              [],
              true,
              0,
              {
                updateImage: true,
                imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
                updateSound: false,
                soundDataCompressed: ethers.utils.toUtf8Bytes(""),
              }
            )
        ).to.be.reverted; // Reverts without specific message in some cases
      });

      it("reverts when no updates are provided", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.srHooksProxy
            .connect(config.accounts.user)
            .updateTokenStateAndMetadata(
              0,
              false,
              0,
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
            ),
          srHooksRevertMessages.atLeastOneUpdate
        );
      });
    });

    describe("metadata updates", function () {
      it("reverts when switching to slot without image", async function () {
        const config = await loadFixture(_beforeEach);

        // Create image at slot 0
        await updateImage(
          config.srHooksProxy,
          0,
          "test image",
          0,
          config.accounts.user
        );

        // Try to switch to empty slot 1 without providing image
        await expectRevert(
          changeActiveSlot(config.srHooksProxy, 0, 1, config.accounts.user),
          srHooksRevertMessages.newActiveSlotMustHaveImage
        );
      });

      it("reverts when active slot is >= NUM_METADATA_SLOTS", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          updateImage(
            config.srHooksProxy,
            0,
            "test",
            SR_CONSTANTS.NUM_METADATA_SLOTS, // Invalid slot
            config.accounts.user
          ),
          srHooksRevertMessages.invalidActiveSlot
        );
      });

      it("reverts when image data is empty when updating", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          updateImage(config.srHooksProxy, 0, "", 0, config.accounts.user),
          srHooksRevertMessages.imageDataRequired
        );
      });

      it("reverts when image data exceeds MAX_IMAGE_DATA_LENGTH", async function () {
        const config = await loadFixture(_beforeEach);
        const tooLargeImageData = Buffer.alloc(
          SR_CONSTANTS.MAX_IMAGE_DATA_LENGTH + 1
        );

        await expectRevert(
          updateImage(
            config.srHooksProxy,
            0,
            tooLargeImageData,
            0,
            config.accounts.user
          ),
          srHooksRevertMessages.imageDataTooLarge
        );
      });

      it("reverts when image data is provided but not updating", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.srHooksProxy
            .connect(config.accounts.user)
            .updateTokenStateAndMetadata(
              0,
              false,
              0,
              [],
              false,
              0,
              [],
              true,
              0,
              {
                updateImage: false,
                imageDataCompressed: bytes("test"),
                updateSound: false,
                soundDataCompressed: emptyBytes(),
              }
            ),
          srHooksRevertMessages.imageDataMustBeEmpty
        );
      });

      it("reverts when sound data exceeds MAX_SOUND_DATA_LENGTH", async function () {
        const config = await loadFixture(_beforeEach);
        const tooLargeSoundData = Buffer.alloc(
          SR_CONSTANTS.MAX_SOUND_DATA_LENGTH + 1
        );

        // First create image
        await updateImage(
          config.srHooksProxy,
          0,
          "test image",
          0,
          config.accounts.user
        );

        // Try to add too large sound
        await expectRevert(
          updateSound(
            config.srHooksProxy,
            0,
            tooLargeSoundData,
            0,
            config.accounts.user
          ),
          srHooksRevertMessages.soundDataTooLarge
        );
      });

      it("reverts when sound data is provided but not updating", async function () {
        const config = await loadFixture(_beforeEach);

        await expectRevert(
          config.srHooksProxy
            .connect(config.accounts.user)
            .updateTokenStateAndMetadata(
              0,
              false,
              0,
              [],
              false,
              0,
              [],
              true,
              0,
              {
                updateImage: true,
                imageDataCompressed: bytes("test image"),
                updateSound: false,
                soundDataCompressed: bytes("test sound"),
              }
            ),
          srHooksRevertMessages.soundDataMustBeEmpty
        );
      });

      it("allows owner to update image metadata at active slot", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = "test image data";

        // Update image at slot 0
        await updateImage(
          config.srHooksProxy,
          0,
          imageData,
          0,
          config.accounts.user
        );

        // Verify the metadata was updated
        const metadata = await config.srHooksProxy.getTokenMetadataAtSlot(0, 0);
        expect(metadata.imageDataCompressed).to.equal(
          ethers.utils.hexlify(bytes(imageData))
        );
        expect(metadata.imageVersion).to.equal(1);
      });

      it("increments image version on each update", async function () {
        const config = await loadFixture(_beforeEach);

        // First update
        await updateImage(
          config.srHooksProxy,
          0,
          "test image 1",
          0,
          config.accounts.user
        );

        let metadata = await config.srHooksProxy.getTokenMetadataAtSlot(0, 0);
        expect(metadata.imageVersion).to.equal(1);

        // Second update
        await updateImage(
          config.srHooksProxy,
          0,
          "test image 2",
          0,
          config.accounts.user
        );

        metadata = await config.srHooksProxy.getTokenMetadataAtSlot(0, 0);
        expect(metadata.imageVersion).to.equal(2);
      });

      it("allows owner to update sound metadata", async function () {
        const config = await loadFixture(_beforeEach);

        // First update image to create slot
        await updateImage(
          config.srHooksProxy,
          0,
          "test image",
          0,
          config.accounts.user
        );

        // Update sound
        await updateSound(
          config.srHooksProxy,
          0,
          "test sound data",
          0,
          config.accounts.user
        );

        // Verify the sound metadata was updated
        const metadata = await config.srHooksProxy.getTokenMetadataAtSlot(0, 0);
        expect(metadata.soundDataCompressed).to.equal(
          ethers.utils.hexlify(bytes("test sound data"))
        );
        expect(metadata.soundVersion).to.equal(1);
      });

      it("allows clearing sound data with empty bytes", async function () {
        const config = await loadFixture(_beforeEach);

        // Setup: create image and sound
        await updateImageAndSound(
          config.srHooksProxy,
          0,
          "test image",
          "test sound",
          0,
          config.accounts.user
        );

        let metadata = await config.srHooksProxy.getTokenMetadataAtSlot(0, 0);
        expect(metadata.soundVersion).to.equal(1);

        // Clear sound data
        await updateSound(config.srHooksProxy, 0, "", 0, config.accounts.user);

        metadata = await config.srHooksProxy.getTokenMetadataAtSlot(0, 0);
        expect(metadata.soundDataCompressed).to.equal("0x");
        expect(metadata.soundVersion).to.equal(2);
      });

      it("allows updating to different slot", async function () {
        const config = await loadFixture(_beforeEach);

        // Create image at slot 0
        await updateImage(
          config.srHooksProxy,
          0,
          "slot 0 image",
          0,
          config.accounts.user
        );

        // Create image at slot 1 and switch to it
        await updateImage(
          config.srHooksProxy,
          0,
          "slot 1 image",
          1,
          config.accounts.user
        );

        // Verify active slot is now 1
        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.activeSlot).to.equal(1);
        expect(state.activeSlotTokenMetadata.imageDataCompressed).to.equal(
          ethers.utils.hexlify(bytes("slot 1 image"))
        );

        // Verify slot 0 still has its data
        const metadata0 = await config.srHooksProxy.getTokenMetadataAtSlot(
          0,
          0
        );
        expect(metadata0.imageDataCompressed).to.equal(
          ethers.utils.hexlify(bytes("slot 0 image"))
        );
      });

      it("allows updating both image and sound in single call", async function () {
        const config = await loadFixture(_beforeEach);

        await updateImageAndSound(
          config.srHooksProxy,
          0,
          "test image",
          "test sound",
          0,
          config.accounts.user
        );

        const metadata = await config.srHooksProxy.getTokenMetadataAtSlot(0, 0);
        expect(metadata.imageDataCompressed).to.equal(
          ethers.utils.hexlify(bytes("test image"))
        );
        expect(metadata.imageVersion).to.equal(1);
        expect(metadata.soundDataCompressed).to.equal(
          ethers.utils.hexlify(bytes("test sound"))
        );
        expect(metadata.soundVersion).to.equal(1);
      });
    });

    describe("send state updates", function () {
      it("reverts when updating send state without image at active slot", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          updateSendState(
            config.srHooksProxy,
            0,
            SEND_STATES.SEND_GENERAL,
            [],
            config.accounts.user
          ),
          srHooksRevertMessages.tokenMustHaveImageAtActiveSlot
        );
      });

      it("reverts when SendTo state has empty tokensSendingTo", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await updateImage(
          config.srHooksProxy,
          0,
          "test",
          0,
          config.accounts.user
        );

        // Try SendTo without tokens
        await expectRevert(
          updateSendState(
            config.srHooksProxy,
            0,
            SEND_STATES.SEND_TO,
            [],
            config.accounts.user
          ),
          srHooksRevertMessages.tokensSendingToMustBeNonEmpty
        );
      });

      it("reverts when non-SendTo state has non-empty tokensSendingTo", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await updateImage(
          config.srHooksProxy,
          0,
          "test",
          0,
          config.accounts.user
        );

        // Try SendGeneral with tokens
        await expectRevert(
          updateSendState(
            config.srHooksProxy,
            0,
            SEND_STATES.SEND_GENERAL,
            [1],
            config.accounts.user
          ),
          srHooksRevertMessages.tokensSendingToMustBeEmpty
        );
      });

      it("reverts when tokensSendingTo exceeds MAX_SENDING_TO_LENGTH", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await updateImage(
          config.srHooksProxy,
          0,
          "test",
          0,
          config.accounts.user
        );

        // Create array that's too long
        const tooManyTokens = Array.from(
          { length: SR_CONSTANTS.MAX_SENDING_TO_LENGTH + 1 },
          (_, i) => i + 1
        );

        await expectRevert(
          updateSendState(
            config.srHooksProxy,
            0,
            SEND_STATES.SEND_TO,
            tooManyTokens,
            config.accounts.user
          ),
          srHooksRevertMessages.tokensSendingToTooLong
        );
      });

      it("allows updating to SendGeneral state", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await updateImage(
          config.srHooksProxy,
          0,
          "test",
          0,
          config.accounts.user
        );

        // Update to SendGeneral
        await updateSendState(
          config.srHooksProxy,
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          config.accounts.user
        );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.SEND_GENERAL);
      });

      it("allows updating to SendTo state", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await updateImage(
          config.srHooksProxy,
          0,
          "test",
          0,
          config.accounts.user
        );

        // Update to SendTo
        await updateSendState(
          config.srHooksProxy,
          0,
          SEND_STATES.SEND_TO,
          [1, 2],
          config.accounts.user
        );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.SEND_TO);
        expect(state.tokensSendingTo.length).to.equal(2);
        expect(state.tokensSendingTo[0]).to.equal(1);
        expect(state.tokensSendingTo[1]).to.equal(2);
      });

      it("allows changing from SendGeneral to SendTo", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup
        await updateImageAndSendState(
          config.srHooksProxy,
          0,
          "test",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          config.accounts.user
        );

        // Change to SendTo
        await updateSendState(
          config.srHooksProxy,
          0,
          SEND_STATES.SEND_TO,
          [1],
          config.accounts.user
        );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.SEND_TO);
      });

      it("allows changing from SendTo to Neutral", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup
        await updateImageAndSendState(
          config.srHooksProxy,
          0,
          "test",
          0,
          SEND_STATES.SEND_TO,
          [1],
          config.accounts.user
        );

        // Change to Neutral
        await updateSendState(
          config.srHooksProxy,
          0,
          SEND_STATES.NEUTRAL,
          [],
          config.accounts.user
        );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.NEUTRAL);
        expect(state.tokensSendingTo.length).to.equal(0);
      });

      it("safely handles SendTo with duplicates then change to Neutral", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup: SendTo with duplicate entries
        await updateImageAndSendState(
          config.srHooksProxy,
          0,
          "test",
          0,
          SEND_STATES.SEND_TO,
          [1, 1, 1],
          config.accounts.user
        );

        // Verify state is set correctly
        let state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.SEND_TO);
        // tokensSendingTo array stores duplicates as entered
        expect(state.tokensSendingTo.length).to.equal(3);

        // Verify getTokensSendingToToken deduplicates (token 0 only appears once)
        const sendingTokens =
          await config.srHooksProxy.getTokensSendingToToken(1);
        expect(sendingTokens.length).to.equal(1);
        expect(sendingTokens[0].toNumber()).to.equal(0);

        // Change to Neutral - this should clean up state without errors
        await expect(
          updateSendState(
            config.srHooksProxy,
            0,
            SEND_STATES.NEUTRAL,
            [],
            config.accounts.user
          )
        ).to.not.be.reverted;

        // Verify cleanup was successful
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.NEUTRAL);
        expect(state.tokensSendingTo.length).to.equal(0);

        // Verify getTokensSendingToToken is now empty
        const sendingTokensAfter =
          await config.srHooksProxy.getTokensSendingToToken(1);
        expect(sendingTokensAfter.length).to.equal(0);
      });
    });

    describe("receive state updates", function () {
      it("reverts when updating receive state without image at active slot", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          updateReceiveState(
            config.srHooksProxy,
            0,
            RECEIVE_STATES.RECEIVE_GENERAL,
            [],
            config.accounts.user
          ),
          srHooksRevertMessages.tokenMustHaveImageAtActiveSlot
        );
      });

      it("reverts when ReceiveFrom state has empty tokensReceivingFrom", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await updateImage(
          config.srHooksProxy,
          0,
          "test",
          0,
          config.accounts.user
        );

        // Try ReceiveFrom without tokens
        await expectRevert(
          updateReceiveState(
            config.srHooksProxy,
            0,
            RECEIVE_STATES.RECEIVE_FROM,
            [],
            config.accounts.user
          ),
          srHooksRevertMessages.tokensReceivingFromMustBeNonEmpty
        );
      });

      it("reverts when non-ReceiveFrom state has non-empty tokensReceivingFrom", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await updateImage(
          config.srHooksProxy,
          0,
          "test",
          0,
          config.accounts.user
        );

        // Try ReceiveGeneral with tokens
        await expectRevert(
          updateReceiveState(
            config.srHooksProxy,
            0,
            RECEIVE_STATES.RECEIVE_GENERAL,
            [1],
            config.accounts.user
          ),
          srHooksRevertMessages.tokensReceivingFromMustBeEmpty
        );
      });

      it("reverts when tokensReceivingFrom exceeds MAX_RECEIVING_FROM_ARRAY_LENGTH", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await updateImage(
          config.srHooksProxy,
          0,
          "test",
          0,
          config.accounts.user
        );

        // Create array that's too long
        const tooManyTokens = Array.from(
          { length: SR_CONSTANTS.MAX_RECEIVING_FROM_ARRAY_LENGTH + 1 },
          (_, i) => i + 1
        );

        await expectRevert(
          updateReceiveState(
            config.srHooksProxy,
            0,
            RECEIVE_STATES.RECEIVE_FROM,
            tooManyTokens,
            config.accounts.user
          ),
          srHooksRevertMessages.tokensReceivingFromTooLong
        );
      });

      it("allows updating to ReceiveGeneral state", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await updateImage(
          config.srHooksProxy,
          0,
          "test",
          0,
          config.accounts.user
        );

        // Update to ReceiveGeneral
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user
        );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_GENERAL);
      });

      it("allows updating to ReceiveFrom state", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await updateImage(
          config.srHooksProxy,
          0,
          "test",
          0,
          config.accounts.user
        );

        // Update to ReceiveFrom
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          [1, 2],
          config.accounts.user
        );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_FROM);
        expect(state.tokensReceivingFrom.length).to.equal(2);
        expect(state.tokensReceivingFrom[0]).to.equal(1);
        expect(state.tokensReceivingFrom[1]).to.equal(2);
      });

      it("allows changing from ReceiveGeneral to ReceiveFrom", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user
        );

        // Change to ReceiveFrom
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          [1],
          config.accounts.user
        );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_FROM);
      });

      it("allows changing from ReceiveFrom to Neutral", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test",
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          [1],
          config.accounts.user
        );

        // Change to Neutral
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.NEUTRAL,
          [],
          config.accounts.user
        );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.NEUTRAL);
        expect(state.tokensReceivingFrom.length).to.equal(0);
      });

      it("allows updating to ReceiveTo state", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await updateImage(
          config.srHooksProxy,
          0,
          "test",
          0,
          config.accounts.user
        );

        // Update to ReceiveTo
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.RECEIVE_TO,
          [],
          config.accounts.user
        );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);
        expect(state.tokensReceivingFrom.length).to.equal(0);
      });

      it("reverts when updating to ReceiveTo state without image at active slot", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          updateReceiveState(
            config.srHooksProxy,
            0,
            RECEIVE_STATES.RECEIVE_TO,
            [],
            config.accounts.user
          ),
          srHooksRevertMessages.tokenMustHaveImageAtActiveSlot
        );
      });

      it("reverts when ReceiveTo state has non-empty tokensReceivingFrom", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await updateImage(
          config.srHooksProxy,
          0,
          "test",
          0,
          config.accounts.user
        );

        // Try ReceiveTo with tokens
        await expectRevert(
          updateReceiveState(
            config.srHooksProxy,
            0,
            RECEIVE_STATES.RECEIVE_TO,
            [1],
            config.accounts.user
          ),
          srHooksRevertMessages.tokensReceivingFromMustBeEmpty
        );
      });

      it("allows changing from ReceiveGeneral to ReceiveTo", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user
        );

        // Change to ReceiveTo
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.RECEIVE_TO,
          [],
          config.accounts.user
        );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);
      });

      it("allows changing from ReceiveFrom to ReceiveTo", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test",
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          [1],
          config.accounts.user
        );

        // Change to ReceiveTo
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.RECEIVE_TO,
          [],
          config.accounts.user
        );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);
        expect(state.tokensReceivingFrom.length).to.equal(0);
      });

      it("allows changing from ReceiveTo to Neutral", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test",
          0,
          RECEIVE_STATES.RECEIVE_TO,
          [],
          config.accounts.user
        );

        // Verify ReceiveTo state
        let state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);

        // Change to Neutral
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.NEUTRAL,
          [],
          config.accounts.user
        );

        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.NEUTRAL);
      });

      it("allows changing from ReceiveTo to ReceiveGeneral", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test",
          0,
          RECEIVE_STATES.RECEIVE_TO,
          [],
          config.accounts.user
        );

        // Change to ReceiveGeneral
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user
        );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_GENERAL);
      });

      it("allows changing from ReceiveTo to ReceiveFrom", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test",
          0,
          RECEIVE_STATES.RECEIVE_TO,
          [],
          config.accounts.user
        );

        // Change to ReceiveFrom
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          [1, 2],
          config.accounts.user
        );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_FROM);
        expect(state.tokensReceivingFrom.length).to.equal(2);
        expect(state.tokensReceivingFrom[0]).to.equal(1);
        expect(state.tokensReceivingFrom[1]).to.equal(2);
      });

      it("allows setting ReceiveTo and metadata in single call", async function () {
        const config = await loadFixture(_beforeEach);

        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_TO,
          [],
          config.accounts.user
        );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);
        expect(state.activeSlotTokenMetadata.imageVersion).to.equal(1);
      });
    });

    describe("combined updates", function () {
      it("allows updating metadata, send, and receive states together", async function () {
        const config = await loadFixture(_beforeEach);

        await updateImageSoundAndStates(
          config.srHooksProxy,
          0,
          "test image",
          "test sound",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user
        );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(1);
        expect(state.receiveState).to.equal(1);
        expect(state.activeSlotTokenMetadata.imageVersion).to.equal(1);
        expect(state.activeSlotTokenMetadata.soundVersion).to.equal(1);
      });

      it("clears tokensSendingTo array when switching away from SendTo state", async function () {
        const config = await loadFixture(_beforeEach);

        // Setup: Create SendTo state with tokens
        await updateImageAndSendState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          SEND_STATES.SEND_TO,
          [1, 2, 3],
          config.accounts.user
        );

        // Verify SendTo state is set with tokens
        let state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.SEND_TO);
        expect(state.tokensSendingTo.length).to.equal(3);
        expect(state.tokensSendingTo[0]).to.equal(1);
        expect(state.tokensSendingTo[1]).to.equal(2);
        expect(state.tokensSendingTo[2]).to.equal(3);

        // Switch to SendGeneral (should clear tokensSendingTo)
        await updateSendState(
          config.srHooksProxy,
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          config.accounts.user
        );

        // Verify tokensSendingTo is empty
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.SEND_GENERAL);
        expect(state.tokensSendingTo.length).to.equal(0);

        // Switch back to SendTo with different tokens
        await updateSendState(
          config.srHooksProxy,
          0,
          SEND_STATES.SEND_TO,
          [2],
          config.accounts.user
        );

        // Verify new SendTo state
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.SEND_TO);
        expect(state.tokensSendingTo.length).to.equal(1);
        expect(state.tokensSendingTo[0]).to.equal(2);

        // Switch to Neutral (should also clear tokensSendingTo)
        await updateSendState(
          config.srHooksProxy,
          0,
          SEND_STATES.NEUTRAL,
          [],
          config.accounts.user
        );

        // Verify tokensSendingTo is empty again
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.NEUTRAL);
        expect(state.tokensSendingTo.length).to.equal(0);
      });

      it("clears tokensReceivingFrom array when switching away from ReceiveFrom state", async function () {
        const config = await loadFixture(_beforeEach);

        // Setup: Create ReceiveFrom state with tokens
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          [1, 2, 3],
          config.accounts.user
        );

        // Verify ReceiveFrom state is set with tokens
        let state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_FROM);
        expect(state.tokensReceivingFrom.length).to.equal(3);
        expect(state.tokensReceivingFrom[0]).to.equal(1);
        expect(state.tokensReceivingFrom[1]).to.equal(2);
        expect(state.tokensReceivingFrom[2]).to.equal(3);

        // Switch to ReceiveGeneral (should clear tokensReceivingFrom)
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user
        );

        // Verify tokensReceivingFrom is empty
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_GENERAL);
        expect(state.tokensReceivingFrom.length).to.equal(0);

        // Switch back to ReceiveFrom with different tokens
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          [2],
          config.accounts.user
        );

        // Verify new ReceiveFrom state
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_FROM);
        expect(state.tokensReceivingFrom.length).to.equal(1);
        expect(state.tokensReceivingFrom[0]).to.equal(2);

        // Switch to Neutral (should also clear tokensReceivingFrom)
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.NEUTRAL,
          [],
          config.accounts.user
        );

        // Verify tokensReceivingFrom is empty again
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.NEUTRAL);
        expect(state.tokensReceivingFrom.length).to.equal(0);
      });

      it("clears ReceiveTo state when switching to other receive states", async function () {
        const config = await loadFixture(_beforeEach);

        // Setup: Create ReceiveTo state
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_TO,
          [],
          config.accounts.user
        );

        // Verify ReceiveTo state is set
        let state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);

        // Switch to ReceiveGeneral (should clear ReceiveTo)
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user
        );

        // Verify state changed
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_GENERAL);

        // Switch back to ReceiveTo
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.RECEIVE_TO,
          [],
          config.accounts.user
        );

        // Verify ReceiveTo state
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);

        // Switch to ReceiveFrom (should clear ReceiveTo)
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          [1, 2],
          config.accounts.user
        );

        // Verify new ReceiveFrom state
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_FROM);
        expect(state.tokensReceivingFrom.length).to.equal(2);

        // Switch back to ReceiveTo
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.RECEIVE_TO,
          [],
          config.accounts.user
        );

        // Verify ReceiveTo state again
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);
        expect(state.tokensReceivingFrom.length).to.equal(0);

        // Switch to Neutral (should also clear ReceiveTo)
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.NEUTRAL,
          [],
          config.accounts.user
        );

        // Verify Neutral state
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.NEUTRAL);
      });

      it("handles token number vs token ID correctly for project 3", async function () {
        const config = await loadFixture(_beforeEach);
        const tokenNumber = 0;
        const expectedTokenId = config.projectThreeTokenZero;

        // Update token 0
        await updateImage(
          config.srHooksProxy,
          tokenNumber,
          "test",
          0,
          config.accounts.user
        );

        // Verify state using token number
        const state = await config.srHooksProxy.getTokenState(tokenNumber);
        expect(state.activeSlot).to.equal(0);

        // Verify ownership using token ID
        const owner = await config.genArt721Core.ownerOf(expectedTokenId);
        expect(owner).to.equal(config.accounts.user.address);
      });
    });
  });
});
