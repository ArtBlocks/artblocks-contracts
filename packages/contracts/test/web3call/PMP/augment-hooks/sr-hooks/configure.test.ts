import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers, upgrades } from "hardhat";
import { constants } from "ethers";
import { SRHooksFixtureConfig, setupSRHooksFixture } from "./srHooksFixtures";
import {
  srHooksRevertMessages,
  SR_CONSTANTS,
  SEND_STATES,
  RECEIVE_STATES,
} from "./constants";
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
          config.pmp.address,
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
          config.pmp.address,
          config.accounts.deployer.address,
          config.genArt721Core.address,
          config.projectThree
        )
      ).to.be.reverted; // OZ 5.0 uses custom errors
    });

    it("initializes with correct values", async function () {
      const config = await loadFixture(_beforeEach);
      expect(await config.srHooksProxy.PMPV0_ADDRESS()).to.equal(
        config.pmp.address
      );
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
      expect(await upgraded.PMPV0_ADDRESS()).to.equal(config.pmp.address);
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
        const imageData = ethers.utils.toUtf8Bytes("test image");

        // Create image at slot 0
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Try to switch to empty slot 1 without providing image
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
              1,
              {
                updateImage: false,
                imageDataCompressed: ethers.utils.toUtf8Bytes(""),
                updateSound: false,
                soundDataCompressed: ethers.utils.toUtf8Bytes(""),
              }
            ),
          srHooksRevertMessages.newActiveSlotMustHaveImage
        );
      });

      it("reverts when active slot is >= NUM_METADATA_SLOTS", async function () {
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
              SR_CONSTANTS.NUM_METADATA_SLOTS, // Invalid slot
              {
                updateImage: true,
                imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
                updateSound: false,
                soundDataCompressed: ethers.utils.toUtf8Bytes(""),
              }
            ),
          srHooksRevertMessages.invalidActiveSlot
        );
      });

      it("reverts when image data is empty when updating", async function () {
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
                imageDataCompressed: ethers.utils.toUtf8Bytes(""),
                updateSound: false,
                soundDataCompressed: ethers.utils.toUtf8Bytes(""),
              }
            ),
          srHooksRevertMessages.imageDataRequired
        );
      });

      it("reverts when image data exceeds MAX_IMAGE_DATA_LENGTH", async function () {
        const config = await loadFixture(_beforeEach);
        const tooLargeImageData = Buffer.alloc(
          SR_CONSTANTS.MAX_IMAGE_DATA_LENGTH + 1
        );

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
                imageDataCompressed: tooLargeImageData,
                updateSound: false,
                soundDataCompressed: ethers.utils.toUtf8Bytes(""),
              }
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
                imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
                updateSound: false,
                soundDataCompressed: ethers.utils.toUtf8Bytes(""),
              }
            ),
          srHooksRevertMessages.imageDataMustBeEmpty
        );
      });

      it("reverts when sound data exceeds MAX_SOUND_DATA_LENGTH", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");
        const tooLargeSoundData = Buffer.alloc(
          SR_CONSTANTS.MAX_SOUND_DATA_LENGTH + 1
        );

        // First create image
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Try to add too large sound
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
                imageDataCompressed: ethers.utils.toUtf8Bytes(""),
                updateSound: true,
                soundDataCompressed: tooLargeSoundData,
              }
            ),
          srHooksRevertMessages.soundDataTooLarge
        );
      });

      it("reverts when sound data is provided but not updating", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");

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
                imageDataCompressed: imageData,
                updateSound: false,
                soundDataCompressed: ethers.utils.toUtf8Bytes("test sound"),
              }
            ),
          srHooksRevertMessages.soundDataMustBeEmpty
        );
      });

      it("allows owner to update image metadata at active slot", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image data");

        // Update image at slot 0
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Verify the metadata was updated
        const metadata = await config.srHooksProxy.getTokenMetadataAtSlot(0, 0);
        expect(metadata.imageDataCompressed).to.equal(
          ethers.utils.hexlify(imageData)
        );
        expect(metadata.imageVersion).to.equal(1);
      });

      it("increments image version on each update", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData1 = ethers.utils.toUtf8Bytes("test image 1");
        const imageData2 = ethers.utils.toUtf8Bytes("test image 2");

        // First update
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData1,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        let metadata = await config.srHooksProxy.getTokenMetadataAtSlot(0, 0);
        expect(metadata.imageVersion).to.equal(1);

        // Second update
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData2,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        metadata = await config.srHooksProxy.getTokenMetadataAtSlot(0, 0);
        expect(metadata.imageVersion).to.equal(2);
      });

      it("allows owner to update sound metadata", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");
        const soundData = ethers.utils.toUtf8Bytes("test sound data");

        // First update image to create slot
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Update sound
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: false,
            imageDataCompressed: ethers.utils.toUtf8Bytes(""),
            updateSound: true,
            soundDataCompressed: soundData,
          });

        // Verify the sound metadata was updated
        const metadata = await config.srHooksProxy.getTokenMetadataAtSlot(0, 0);
        expect(metadata.soundDataCompressed).to.equal(
          ethers.utils.hexlify(soundData)
        );
        expect(metadata.soundVersion).to.equal(1);
      });

      it("allows clearing sound data with empty bytes", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");
        const soundData = ethers.utils.toUtf8Bytes("test sound");

        // Setup: create image and sound
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: true,
            soundDataCompressed: soundData,
          });

        let metadata = await config.srHooksProxy.getTokenMetadataAtSlot(0, 0);
        expect(metadata.soundVersion).to.equal(1);

        // Clear sound data
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: false,
            imageDataCompressed: ethers.utils.toUtf8Bytes(""),
            updateSound: true,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        metadata = await config.srHooksProxy.getTokenMetadataAtSlot(0, 0);
        expect(metadata.soundDataCompressed).to.equal("0x");
        expect(metadata.soundVersion).to.equal(2);
      });

      it("allows updating to different slot", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData0 = ethers.utils.toUtf8Bytes("slot 0 image");
        const imageData1 = ethers.utils.toUtf8Bytes("slot 1 image");

        // Create image at slot 0
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData0,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Create image at slot 1 and switch to it
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 1, {
            updateImage: true,
            imageDataCompressed: imageData1,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Verify active slot is now 1
        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.activeSlot).to.equal(1);
        expect(state.activeSlotTokenMetadata.imageDataCompressed).to.equal(
          ethers.utils.hexlify(imageData1)
        );

        // Verify slot 0 still has its data
        const metadata0 = await config.srHooksProxy.getTokenMetadataAtSlot(
          0,
          0
        );
        expect(metadata0.imageDataCompressed).to.equal(
          ethers.utils.hexlify(imageData0)
        );
      });

      it("allows updating both image and sound in single call", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");
        const soundData = ethers.utils.toUtf8Bytes("test sound");

        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: true,
            soundDataCompressed: soundData,
          });

        const metadata = await config.srHooksProxy.getTokenMetadataAtSlot(0, 0);
        expect(metadata.imageDataCompressed).to.equal(
          ethers.utils.hexlify(imageData)
        );
        expect(metadata.imageVersion).to.equal(1);
        expect(metadata.soundDataCompressed).to.equal(
          ethers.utils.hexlify(soundData)
        );
        expect(metadata.soundVersion).to.equal(1);
      });
    });

    describe("send state updates", function () {
      it("reverts when updating send state without image at active slot", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.srHooksProxy
            .connect(config.accounts.user)
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
            ),
          srHooksRevertMessages.tokenMustHaveImageAtActiveSlot
        );
      });

      it("reverts when SendTo state has empty tokensSendingTo", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Try SendTo without tokens
        await expectRevert(
          config.srHooksProxy
            .connect(config.accounts.user)
            .updateTokenStateAndMetadata(
              0,
              true,
              SEND_STATES.SEND_TO,
              [], // empty array
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
          srHooksRevertMessages.tokensSendingToMustBeNonEmpty
        );
      });

      it("reverts when non-SendTo state has non-empty tokensSendingTo", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Try SendGeneral with tokens
        await expectRevert(
          config.srHooksProxy
            .connect(config.accounts.user)
            .updateTokenStateAndMetadata(
              0,
              true,
              SEND_STATES.SEND_GENERAL,
              [1], // non-empty array
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
          srHooksRevertMessages.tokensSendingToMustBeEmpty
        );
      });

      it("reverts when tokensSendingTo exceeds MAX_SENDING_TO_LENGTH", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Create array that's too long
        const tooManyTokens = Array.from(
          { length: SR_CONSTANTS.MAX_SENDING_TO_LENGTH + 1 },
          (_, i) => i + 1
        );

        await expectRevert(
          config.srHooksProxy
            .connect(config.accounts.user)
            .updateTokenStateAndMetadata(
              0,
              true,
              SEND_STATES.SEND_TO,
              tooManyTokens,
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
          srHooksRevertMessages.tokensSendingToTooLong
        );
      });

      it("allows updating to SendGeneral state", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Update to SendGeneral
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
            false,
            0,
            {
              updateImage: false,
              imageDataCompressed: ethers.utils.toUtf8Bytes(""),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.SEND_GENERAL);
      });

      it("allows updating to SendTo state", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Update to SendTo
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            true,
            SEND_STATES.SEND_TO,
            [1, 2], // sending to tokens 1 and 2
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

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.SEND_TO);
        expect(state.tokensSendingTo.length).to.equal(2);
        expect(state.tokensSendingTo[0]).to.equal(1);
        expect(state.tokensSendingTo[1]).to.equal(2);
      });

      it("allows changing from SendGeneral to SendTo", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup
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
              imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        // Change to SendTo
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            true,
            SEND_STATES.SEND_TO,
            [1],
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

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.SEND_TO);
      });

      it("allows changing from SendTo to Neutral", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            true,
            SEND_STATES.SEND_TO,
            [1],
            false,
            0,
            [],
            true,
            0,
            {
              updateImage: true,
              imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        // Change to Neutral
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            true,
            SEND_STATES.NEUTRAL,
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
          );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.NEUTRAL);
        expect(state.tokensSendingTo.length).to.equal(0);
      });
    });

    describe("receive state updates", function () {
      it("reverts when updating receive state without image at active slot", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.srHooksProxy
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
            ),
          srHooksRevertMessages.tokenMustHaveImageAtActiveSlot
        );
      });

      it("reverts when ReceiveFrom state has empty tokensReceivingFrom", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Try ReceiveFrom without tokens
        await expectRevert(
          config.srHooksProxy
            .connect(config.accounts.user)
            .updateTokenStateAndMetadata(
              0,
              false,
              0,
              [],
              true,
              RECEIVE_STATES.RECEIVE_FROM,
              [], // empty array
              false,
              0,
              {
                updateImage: false,
                imageDataCompressed: ethers.utils.toUtf8Bytes(""),
                updateSound: false,
                soundDataCompressed: ethers.utils.toUtf8Bytes(""),
              }
            ),
          srHooksRevertMessages.tokensReceivingFromMustBeNonEmpty
        );
      });

      it("reverts when non-ReceiveFrom state has non-empty tokensReceivingFrom", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Try ReceiveGeneral with tokens
        await expectRevert(
          config.srHooksProxy
            .connect(config.accounts.user)
            .updateTokenStateAndMetadata(
              0,
              false,
              0,
              [],
              true,
              RECEIVE_STATES.RECEIVE_GENERAL,
              [1], // non-empty array
              false,
              0,
              {
                updateImage: false,
                imageDataCompressed: ethers.utils.toUtf8Bytes(""),
                updateSound: false,
                soundDataCompressed: ethers.utils.toUtf8Bytes(""),
              }
            ),
          srHooksRevertMessages.tokensReceivingFromMustBeEmpty
        );
      });

      it("reverts when tokensReceivingFrom exceeds MAX_RECEIVING_FROM_ARRAY_LENGTH", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Create array that's too long
        const tooManyTokens = Array.from(
          { length: SR_CONSTANTS.MAX_RECEIVING_FROM_ARRAY_LENGTH + 1 },
          (_, i) => i + 1
        );

        await expectRevert(
          config.srHooksProxy
            .connect(config.accounts.user)
            .updateTokenStateAndMetadata(
              0,
              false,
              0,
              [],
              true,
              RECEIVE_STATES.RECEIVE_FROM,
              tooManyTokens,
              false,
              0,
              {
                updateImage: false,
                imageDataCompressed: ethers.utils.toUtf8Bytes(""),
                updateSound: false,
                soundDataCompressed: ethers.utils.toUtf8Bytes(""),
              }
            ),
          srHooksRevertMessages.tokensReceivingFromTooLong
        );
      });

      it("allows updating to ReceiveGeneral state", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Update to ReceiveGeneral
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

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_GENERAL);
      });

      it("allows updating to ReceiveFrom state", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Update to ReceiveFrom
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            false,
            0,
            [],
            true,
            RECEIVE_STATES.RECEIVE_FROM,
            [1, 2], // receiving from tokens 1 and 2
            false,
            0,
            {
              updateImage: false,
              imageDataCompressed: ethers.utils.toUtf8Bytes(""),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
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
            true,
            0,
            {
              updateImage: true,
              imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        // Change to ReceiveFrom
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

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_FROM);
      });

      it("allows changing from ReceiveFrom to Neutral", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup
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
              imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        // Change to Neutral
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            false,
            0,
            [],
            true,
            RECEIVE_STATES.NEUTRAL,
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

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.NEUTRAL);
        expect(state.tokensReceivingFrom.length).to.equal(0);
      });

      it("allows updating to ReceiveTo state", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Update to ReceiveTo
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

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);
        expect(state.tokensReceivingFrom.length).to.equal(0);
      });

      it("reverts when updating to ReceiveTo state without image at active slot", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.srHooksProxy
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
            ),
          srHooksRevertMessages.tokenMustHaveImageAtActiveSlot
        );
      });

      it("reverts when ReceiveTo state has non-empty tokensReceivingFrom", async function () {
        const config = await loadFixture(_beforeEach);
        // First create image
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Try ReceiveTo with tokens
        await expectRevert(
          config.srHooksProxy
            .connect(config.accounts.user)
            .updateTokenStateAndMetadata(
              0,
              false,
              0,
              [],
              true,
              RECEIVE_STATES.RECEIVE_TO,
              [1], // non-empty array
              false,
              0,
              {
                updateImage: false,
                imageDataCompressed: ethers.utils.toUtf8Bytes(""),
                updateSound: false,
                soundDataCompressed: ethers.utils.toUtf8Bytes(""),
              }
            ),
          srHooksRevertMessages.tokensReceivingFromMustBeEmpty
        );
      });

      it("allows changing from ReceiveGeneral to ReceiveTo", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup
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
            true,
            0,
            {
              updateImage: true,
              imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        // Change to ReceiveTo
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

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);
      });

      it("allows changing from ReceiveFrom to ReceiveTo", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup
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
              imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        // Change to ReceiveTo
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

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);
        expect(state.tokensReceivingFrom.length).to.equal(0);
      });

      it("allows changing from ReceiveTo to Neutral", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup
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
              imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        // Verify ReceiveTo state
        let state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);

        // Change to Neutral
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            false,
            0,
            [],
            true,
            RECEIVE_STATES.NEUTRAL,
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

        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.NEUTRAL);
      });

      it("allows changing from ReceiveTo to ReceiveGeneral", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup
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
              imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        // Change to ReceiveGeneral
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

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_GENERAL);
      });

      it("allows changing from ReceiveTo to ReceiveFrom", async function () {
        const config = await loadFixture(_beforeEach);
        // Setup
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
              imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        // Change to ReceiveFrom
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            false,
            0,
            [],
            true,
            RECEIVE_STATES.RECEIVE_FROM,
            [1, 2],
            false,
            0,
            {
              updateImage: false,
              imageDataCompressed: ethers.utils.toUtf8Bytes(""),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_FROM);
        expect(state.tokensReceivingFrom.length).to.equal(2);
        expect(state.tokensReceivingFrom[0]).to.equal(1);
        expect(state.tokensReceivingFrom[1]).to.equal(2);
      });

      it("allows setting ReceiveTo and metadata in single call", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");

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

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);
        expect(state.activeSlotTokenMetadata.imageVersion).to.equal(1);
      });
    });

    describe("combined updates", function () {
      it("allows updating metadata, send, and receive states together", async function () {
        const config = await loadFixture(_beforeEach);

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
              imageDataCompressed: ethers.utils.toUtf8Bytes("test image"),
              updateSound: true,
              soundDataCompressed: ethers.utils.toUtf8Bytes("test sound"),
            }
          );

        const state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(1);
        expect(state.receiveState).to.equal(1);
        expect(state.activeSlotTokenMetadata.imageVersion).to.equal(1);
        expect(state.activeSlotTokenMetadata.soundVersion).to.equal(1);
      });

      it("clears tokensSendingTo array when switching away from SendTo state", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");

        // Setup: Create SendTo state with tokens
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            true,
            SEND_STATES.SEND_TO,
            [1, 2, 3], // sending to tokens 1, 2, 3
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

        // Verify SendTo state is set with tokens
        let state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.SEND_TO);
        expect(state.tokensSendingTo.length).to.equal(3);
        expect(state.tokensSendingTo[0]).to.equal(1);
        expect(state.tokensSendingTo[1]).to.equal(2);
        expect(state.tokensSendingTo[2]).to.equal(3);

        // Switch to SendGeneral (should clear tokensSendingTo)
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
            false,
            0,
            {
              updateImage: false,
              imageDataCompressed: ethers.utils.toUtf8Bytes(""),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        // Verify tokensSendingTo is empty
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.SEND_GENERAL);
        expect(state.tokensSendingTo.length).to.equal(0);

        // Switch back to SendTo with different tokens
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            true,
            SEND_STATES.SEND_TO,
            [2], // only token 2 this time
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

        // Verify new SendTo state
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.SEND_TO);
        expect(state.tokensSendingTo.length).to.equal(1);
        expect(state.tokensSendingTo[0]).to.equal(2);

        // Switch to Neutral (should also clear tokensSendingTo)
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            true,
            SEND_STATES.NEUTRAL,
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
          );

        // Verify tokensSendingTo is empty again
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.sendState).to.equal(SEND_STATES.NEUTRAL);
        expect(state.tokensSendingTo.length).to.equal(0);
      });

      it("clears tokensReceivingFrom array when switching away from ReceiveFrom state", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");

        // Setup: Create ReceiveFrom state with tokens
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            false,
            0,
            [],
            true,
            RECEIVE_STATES.RECEIVE_FROM,
            [1, 2, 3], // receiving from tokens 1, 2, 3
            true,
            0,
            {
              updateImage: true,
              imageDataCompressed: imageData,
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        // Verify ReceiveFrom state is set with tokens
        let state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_FROM);
        expect(state.tokensReceivingFrom.length).to.equal(3);
        expect(state.tokensReceivingFrom[0]).to.equal(1);
        expect(state.tokensReceivingFrom[1]).to.equal(2);
        expect(state.tokensReceivingFrom[2]).to.equal(3);

        // Switch to ReceiveGeneral (should clear tokensReceivingFrom)
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

        // Verify tokensReceivingFrom is empty
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_GENERAL);
        expect(state.tokensReceivingFrom.length).to.equal(0);

        // Switch back to ReceiveFrom with different tokens
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            false,
            0,
            [],
            true,
            RECEIVE_STATES.RECEIVE_FROM,
            [2], // only token 2 this time
            false,
            0,
            {
              updateImage: false,
              imageDataCompressed: ethers.utils.toUtf8Bytes(""),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        // Verify new ReceiveFrom state
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_FROM);
        expect(state.tokensReceivingFrom.length).to.equal(1);
        expect(state.tokensReceivingFrom[0]).to.equal(2);

        // Switch to Neutral (should also clear tokensReceivingFrom)
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            false,
            0,
            [],
            true,
            RECEIVE_STATES.NEUTRAL,
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

        // Verify tokensReceivingFrom is empty again
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.NEUTRAL);
        expect(state.tokensReceivingFrom.length).to.equal(0);
      });

      it("clears ReceiveTo state when switching to other receive states", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");

        // Setup: Create ReceiveTo state
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

        // Verify ReceiveTo state is set
        let state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);

        // Switch to ReceiveGeneral (should clear ReceiveTo)
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

        // Verify state changed
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_GENERAL);

        // Switch back to ReceiveTo
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

        // Verify ReceiveTo state
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);

        // Switch to ReceiveFrom (should clear ReceiveTo)
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            false,
            0,
            [],
            true,
            RECEIVE_STATES.RECEIVE_FROM,
            [1, 2],
            false,
            0,
            {
              updateImage: false,
              imageDataCompressed: ethers.utils.toUtf8Bytes(""),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        // Verify new ReceiveFrom state
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_FROM);
        expect(state.tokensReceivingFrom.length).to.equal(2);

        // Switch back to ReceiveTo
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

        // Verify ReceiveTo state again
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);
        expect(state.tokensReceivingFrom.length).to.equal(0);

        // Switch to Neutral (should also clear ReceiveTo)
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            false,
            0,
            [],
            true,
            RECEIVE_STATES.NEUTRAL,
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

        // Verify Neutral state
        state = await config.srHooksProxy.getTokenState(0);
        expect(state.receiveState).to.equal(RECEIVE_STATES.NEUTRAL);
      });

      it("handles token number vs token ID correctly for project 3", async function () {
        const config = await loadFixture(_beforeEach);
        const tokenNumber = 0;
        const expectedTokenId = config.projectThreeTokenZero;

        // Update token 0
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            tokenNumber,
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
              imageDataCompressed: ethers.utils.toUtf8Bytes("test"),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
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
