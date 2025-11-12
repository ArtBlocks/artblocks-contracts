import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import { setupSRHooksFixture, SRHooksFixtureConfig } from "./srHooksFixtures";
import { SEND_STATES, RECEIVE_STATES } from "./constants";

describe("SRHooks Events", function () {
  async function _beforeEach(): Promise<SRHooksFixtureConfig> {
    return await setupSRHooksFixture();
  }

  describe("Initialization events", function () {
    it("contract is properly initialized after fixture setup", async function () {
      const config = await loadFixture(_beforeEach);

      // Verify the contract was initialized correctly by checking storage
      // Cannot be re-initialized (tested in configure.test.ts)
      await expect(
        config.srHooksProxy.initialize(
          config.accounts.deployer.address,
          config.genArt721Core.address,
          config.projectThree
        )
      ).to.be.reverted;
    });

    it("emits Initialized event with correct parameters", async function () {
      const config = await loadFixture(_beforeEach);

      const SRHooksFactory = await ethers.getContractFactory("SRHooks");
      const { upgrades } = await import("hardhat");
      const testProjectId = config.projectThree + 1;

      // Deploy proxy - this will call initialize and emit the Initialized event
      const proxy = await upgrades.deployProxy(
        SRHooksFactory,
        [
          config.accounts.deployer.address,
          config.genArt721Core.address,
          testProjectId,
        ],
        {
          kind: "uups",
          initializer: "initialize",
        }
      );
      const deployReceipt = await proxy.deployTransaction.wait();

      // Find Initialized event in the deployment logs
      const initializedTopic = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("Initialized(address,uint256)")
      );

      const initializedLog = deployReceipt.logs.find(
        (log) => log.topics[0] === initializedTopic
      );

      expect(initializedLog).to.not.be.undefined;

      // Decode the event
      const iface = new ethers.utils.Interface([
        "event Initialized(address coreContractAddress, uint256 coreProjectId)",
      ]);
      const decodedEvent = iface.parseLog(initializedLog!);

      // Verify event parameters
      expect(decodedEvent.args.coreContractAddress).to.equal(
        config.genArt721Core.address
      );
      expect(decodedEvent.args.coreProjectId).to.equal(testProjectId);
    });

    it("initialization succeeds without reverting", async function () {
      const config = await loadFixture(_beforeEach);

      const SRHooksFactory = await ethers.getContractFactory("SRHooks");
      const { upgrades } = await import("hardhat");
      const testProjectId = config.projectThree + 2;

      // Verify deployment succeeds (only emits Initialized event)
      await expect(
        upgrades.deployProxy(
          SRHooksFactory,
          [
            config.accounts.deployer.address,
            config.genArt721Core.address,
            testProjectId,
          ],
          {
            kind: "uups",
            initializer: "initialize",
          }
        )
      ).to.not.be.reverted;
    });
  });

  describe("TokenSendingToUpdated", function () {
    it("emits when token enters SendTo state", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tokenId = config.projectThreeTokenZero.toNumber();

      await expect(
        config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            true,
            SEND_STATES.SEND_TO,
            [1, 2],
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
          )
      )
        .to.emit(config.srHooksProxy, "TokenSendingToUpdated")
        .withArgs(config.genArt721Core.address, tokenId, [1, 2]);
    });

    it("emits when token changes SendTo targets", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tokenId = config.projectThreeTokenZero.toNumber();

      // First set SendTo [1, 2]
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
          true,
          0,
          {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      // Change to SendTo [3]
      await expect(
        config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            true,
            SEND_STATES.SEND_TO,
            [3],
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
      )
        .to.emit(config.srHooksProxy, "TokenSendingToUpdated")
        .withArgs(config.genArt721Core.address, tokenId, [3]);
    });

    it("emits with empty array when transitioning from SendTo to Neutral", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tokenId = config.projectThreeTokenZero.toNumber();

      // First set SendTo [1]
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
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      // Change to Neutral
      await expect(
        config.srHooksProxy
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
          )
      )
        .to.emit(config.srHooksProxy, "TokenSendingToUpdated")
        .withArgs(config.genArt721Core.address, tokenId, []);
    });

    it("emits with empty array when transitioning from SendTo to SendGeneral", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tokenId = config.projectThreeTokenZero.toNumber();

      // First set SendTo [1]
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
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      // Change to SendGeneral
      await expect(
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
          )
      )
        .to.emit(config.srHooksProxy, "TokenSendingToUpdated")
        .withArgs(config.genArt721Core.address, tokenId, []);
    });

    it("does NOT emit when entering SendGeneral state", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tx = await config.srHooksProxy
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

      const receipt = await tx.wait();

      // Check that TokenSendingToUpdated was NOT emitted
      const event = receipt.events?.find(
        (e) => e.event === "TokenSendingToUpdated"
      );
      expect(event).to.be.undefined;
    });

    it("does NOT emit when entering Neutral state from Neutral", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tx = await config.srHooksProxy
        .connect(config.accounts.user)
        .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
          updateImage: true,
          imageDataCompressed: imageData,
          updateSound: false,
          soundDataCompressed: ethers.utils.toUtf8Bytes(""),
        });

      const receipt = await tx.wait();

      // Check that TokenSendingToUpdated was NOT emitted
      const event = receipt.events?.find(
        (e) => e.event === "TokenSendingToUpdated"
      );
      expect(event).to.be.undefined;
    });

    it("emits with duplicate array entries as provided", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tokenId = config.projectThreeTokenZero.toNumber();

      await expect(
        config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            true,
            SEND_STATES.SEND_TO,
            [1, 1, 1],
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
          )
      )
        .to.emit(config.srHooksProxy, "TokenSendingToUpdated")
        .withArgs(config.genArt721Core.address, tokenId, [1, 1, 1]);
    });
  });

  describe("TokenReceivingFromUpdated", function () {
    it("emits when token enters ReceiveFrom state", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tokenId = config.projectThreeTokenZero.toNumber();

      await expect(
        config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            false,
            0,
            [],
            true,
            RECEIVE_STATES.RECEIVE_FROM,
            [1, 2],
            true,
            0,
            {
              updateImage: true,
              imageDataCompressed: imageData,
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          )
      )
        .to.emit(config.srHooksProxy, "TokenReceivingFromUpdated")
        .withArgs(config.genArt721Core.address, tokenId, [1, 2]);
    });

    it("emits when token changes ReceiveFrom targets", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tokenId = config.projectThreeTokenZero.toNumber();

      // First set ReceiveFrom [1, 2]
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
          true,
          0,
          {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      // Change to ReceiveFrom [3]
      await expect(
        config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            false,
            0,
            [],
            true,
            RECEIVE_STATES.RECEIVE_FROM,
            [3],
            false,
            0,
            {
              updateImage: false,
              imageDataCompressed: ethers.utils.toUtf8Bytes(""),
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          )
      )
        .to.emit(config.srHooksProxy, "TokenReceivingFromUpdated")
        .withArgs(config.genArt721Core.address, tokenId, [3]);
    });

    it("emits with empty array when transitioning from ReceiveFrom to Neutral", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tokenId = config.projectThreeTokenZero.toNumber();

      // First set ReceiveFrom [1]
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

      // Change to Neutral
      await expect(
        config.srHooksProxy
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
          )
      )
        .to.emit(config.srHooksProxy, "TokenReceivingFromUpdated")
        .withArgs(config.genArt721Core.address, tokenId, []);
    });

    it("emits with empty array when transitioning from ReceiveFrom to ReceiveGeneral", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tokenId = config.projectThreeTokenZero.toNumber();

      // First set ReceiveFrom [1]
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

      // Change to ReceiveGeneral
      await expect(
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
          )
      )
        .to.emit(config.srHooksProxy, "TokenReceivingFromUpdated")
        .withArgs(config.genArt721Core.address, tokenId, []);
    });

    it("emits with empty array when transitioning from ReceiveFrom to ReceiveTo", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tokenId = config.projectThreeTokenZero.toNumber();

      // First set ReceiveFrom [1]
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

      // Change to ReceiveTo
      await expect(
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
          )
      )
        .to.emit(config.srHooksProxy, "TokenReceivingFromUpdated")
        .withArgs(config.genArt721Core.address, tokenId, []);
    });

    it("does NOT emit when entering ReceiveGeneral state", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tx = await config.srHooksProxy
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
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          }
        );

      const receipt = await tx.wait();

      // Check that TokenReceivingFromUpdated was NOT emitted
      const event = receipt.events?.find(
        (e) => e.event === "TokenReceivingFromUpdated"
      );
      expect(event).to.be.undefined;
    });

    it("does NOT emit when entering ReceiveTo state", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tx = await config.srHooksProxy
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

      const receipt = await tx.wait();

      // Check that TokenReceivingFromUpdated was NOT emitted
      const event = receipt.events?.find(
        (e) => e.event === "TokenReceivingFromUpdated"
      );
      expect(event).to.be.undefined;
    });

    it("does NOT emit when entering Neutral state from Neutral", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tx = await config.srHooksProxy
        .connect(config.accounts.user)
        .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
          updateImage: true,
          imageDataCompressed: imageData,
          updateSound: false,
          soundDataCompressed: ethers.utils.toUtf8Bytes(""),
        });

      const receipt = await tx.wait();

      // Check that TokenReceivingFromUpdated was NOT emitted
      const event = receipt.events?.find(
        (e) => e.event === "TokenReceivingFromUpdated"
      );
      expect(event).to.be.undefined;
    });

    it("emits with duplicate array entries as provided", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tokenId = config.projectThreeTokenZero.toNumber();

      await expect(
        config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            false,
            0,
            [],
            true,
            RECEIVE_STATES.RECEIVE_FROM,
            [1, 1, 1],
            true,
            0,
            {
              updateImage: true,
              imageDataCompressed: imageData,
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          )
      )
        .to.emit(config.srHooksProxy, "TokenReceivingFromUpdated")
        .withArgs(config.genArt721Core.address, tokenId, [1, 1, 1]);
    });
  });

  describe("PMPV0.TokenParamsConfigured", function () {
    describe("Image data updates - slots 0-4", function () {
      for (let slot = 0; slot <= 4; slot++) {
        it(`emits correct event for image update at slot ${slot}`, async function () {
          const config = await loadFixture(_beforeEach);
          const imageData = ethers.utils.toUtf8Bytes(`test image slot ${slot}`);
          const tokenId = config.projectThree * 1000000;

          const tx = await config.srHooksProxy
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
              slot,
              {
                updateImage: true,
                imageDataCompressed: imageData,
                updateSound: false,
                soundDataCompressed: ethers.utils.toUtf8Bytes(""),
              }
            );

          const receipt = await tx.wait();
          const event = receipt.events?.find(
            (e) => e.event === "TokenParamsConfigured"
          );

          // Verify event was emitted
          expect(event).to.not.be.undefined;

          // Verify coreContract
          expect(event?.args?.[0]).to.equal(config.genArt721Core.address);

          // Verify tokenId
          expect(event?.args?.[1]).to.equal(tokenId);

          // Verify pmpInputs array
          expect(event?.args?.[2].length).to.equal(1);
          expect(event?.args?.[2][0][0]).to.equal(`ImageVersionSlot${slot}`); // key
          expect(event?.args?.[2][0][1]).to.equal(3); // ParamType.Uint256Range
          expect(event?.args?.[2][0][2]).to.equal(
            ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32)
          ); // configuredValue = version 1
          expect(event?.args?.[2][0][3]).to.equal(false); // configuringArtistString
          expect(event?.args?.[2][0][4]).to.equal(""); // configuredValueString

          // Verify authAddresses
          expect(event?.args?.[3].length).to.equal(1);
          expect(event?.args?.[3][0]).to.equal(config.accounts.user.address);
        });
      }

      it("increments version number on subsequent image updates", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData1 = ethers.utils.toUtf8Bytes("first image");
        const imageData2 = ethers.utils.toUtf8Bytes("second image");

        // First update - version 1
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData1,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Second update - version 2
        const tx = await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData2,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        const receipt = await tx.wait();
        const event = receipt.events?.find(
          (e) => e.event === "TokenParamsConfigured"
        );

        expect(event?.args?.[2][0][0]).to.equal("ImageVersionSlot0");
        expect(event?.args?.[2][0][2]).to.equal(
          ethers.utils.hexZeroPad(ethers.utils.hexlify(2), 32)
        ); // version 2
      });
    });

    describe("Sound data updates - slots 0-4", function () {
      for (let slot = 0; slot <= 4; slot++) {
        it(`emits correct event for sound update at slot ${slot}`, async function () {
          const config = await loadFixture(_beforeEach);
          const imageData = ethers.utils.toUtf8Bytes("test image");
          const soundData = ethers.utils.toUtf8Bytes(`test sound slot ${slot}`);
          const tokenId = config.projectThree * 1000000;

          // First add image (required)
          await config.srHooksProxy
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
              slot,
              {
                updateImage: true,
                imageDataCompressed: imageData,
                updateSound: false,
                soundDataCompressed: ethers.utils.toUtf8Bytes(""),
              }
            );

          // Then update sound
          const tx = await config.srHooksProxy
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
              slot,
              {
                updateImage: false,
                imageDataCompressed: ethers.utils.toUtf8Bytes(""),
                updateSound: true,
                soundDataCompressed: soundData,
              }
            );

          const receipt = await tx.wait();
          const event = receipt.events?.find(
            (e) => e.event === "TokenParamsConfigured"
          );

          expect(event).to.not.be.undefined;
          expect(event?.args?.[0]).to.equal(config.genArt721Core.address);
          expect(event?.args?.[1]).to.equal(tokenId);
          expect(event?.args?.[2][0][0]).to.equal(`SoundVersionSlot${slot}`); // key
          expect(event?.args?.[2][0][1]).to.equal(3); // ParamType.Uint256Range
          expect(event?.args?.[2][0][2]).to.equal(
            ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32)
          ); // version 1
          expect(event?.args?.[3][0]).to.equal(config.accounts.user.address);
        });
      }

      it("increments version number on subsequent sound updates", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");
        const soundData1 = ethers.utils.toUtf8Bytes("first sound");
        const soundData2 = ethers.utils.toUtf8Bytes("second sound");

        // Add image first
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // First sound update - version 1
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: false,
            imageDataCompressed: ethers.utils.toUtf8Bytes(""),
            updateSound: true,
            soundDataCompressed: soundData1,
          });

        // Second sound update - version 2
        const tx = await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: false,
            imageDataCompressed: ethers.utils.toUtf8Bytes(""),
            updateSound: true,
            soundDataCompressed: soundData2,
          });

        const receipt = await tx.wait();
        const event = receipt.events?.find(
          (e) => e.event === "TokenParamsConfigured"
        );

        expect(event?.args?.[2][0][0]).to.equal("SoundVersionSlot0");
        expect(event?.args?.[2][0][2]).to.equal(
          ethers.utils.hexZeroPad(ethers.utils.hexlify(2), 32)
        ); // version 2
      });
    });

    describe("Active slot updates", function () {
      it("emits correct event when changing active slot", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");
        const tokenId = config.projectThree * 1000000;

        // Add image at slot 0 (makes slot 0 active)
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Add image at slot 1 (makes slot 1 active)
        await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 1, {
            updateImage: true,
            imageDataCompressed: imageData,
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        // Change active slot back to 0 (this will emit the event we're testing)
        const tx = await config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(0, false, 0, [], false, 0, [], true, 0, {
            updateImage: false,
            imageDataCompressed: ethers.utils.toUtf8Bytes(""),
            updateSound: false,
            soundDataCompressed: ethers.utils.toUtf8Bytes(""),
          });

        const receipt = await tx.wait();
        const event = receipt.events?.find(
          (e) => e.event === "TokenParamsConfigured"
        );

        expect(event).to.not.be.undefined;
        expect(event?.args?.[0]).to.equal(config.genArt721Core.address);
        expect(event?.args?.[1]).to.equal(tokenId);
        expect(event?.args?.[2][0][0]).to.equal("ActiveSlot"); // key
        expect(event?.args?.[2][0][1]).to.equal(3); // ParamType.Uint256Range
        expect(event?.args?.[2][0][2]).to.equal(
          ethers.utils.hexZeroPad(ethers.utils.hexlify(0), 32)
        ); // activeSlot = 0 (changed back from 1)
        expect(event?.args?.[3][0]).to.equal(config.accounts.user.address);
      });
    });

    describe("Send state updates", function () {
      it("emits correct event for SendGeneral state", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");
        const tokenId = config.projectThree * 1000000;

        const tx = await config.srHooksProxy
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

        const receipt = await tx.wait();
        const events = receipt.events?.filter(
          (e) => e.event === "TokenParamsConfigured"
        );

        // Find the send state event (should be the second one)
        const sendStateEvent = events?.find(
          (e) => e.args?.[2][0][0] === "SendState"
        );

        expect(sendStateEvent).to.not.be.undefined;
        expect(sendStateEvent?.args?.[0]).to.equal(
          config.genArt721Core.address
        );
        expect(sendStateEvent?.args?.[1]).to.equal(tokenId);
        expect(sendStateEvent?.args?.[2][0][0]).to.equal("SendState"); // key
        expect(sendStateEvent?.args?.[2][0][1]).to.equal(1); // ParamType.Select
        expect(sendStateEvent?.args?.[2][0][2]).to.equal(
          ethers.utils.hexZeroPad(
            ethers.utils.hexlify(SEND_STATES.SEND_GENERAL),
            32
          )
        ); // SendGeneral = 1
        expect(sendStateEvent?.args?.[3][0]).to.equal(
          config.accounts.user.address
        );
      });

      it("emits correct event for SendTo state", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");

        const tx = await config.srHooksProxy
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
              imageDataCompressed: imageData,
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        const receipt = await tx.wait();
        const events = receipt.events?.filter(
          (e) => e.event === "TokenParamsConfigured"
        );

        const sendStateEvent = events?.find(
          (e) => e.args?.[2][0][0] === "SendState"
        );

        expect(sendStateEvent?.args?.[2][0][2]).to.equal(
          ethers.utils.hexZeroPad(ethers.utils.hexlify(SEND_STATES.SEND_TO), 32)
        ); // SendTo = 2
      });

      it("emits correct event for Neutral send state", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");

        // First set to SendGeneral
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

        // Then set to Neutral
        const tx = await config.srHooksProxy
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

        const receipt = await tx.wait();
        const event = receipt.events?.find(
          (e) => e.event === "TokenParamsConfigured"
        );

        expect(event?.args?.[2][0][0]).to.equal("SendState");
        expect(event?.args?.[2][0][2]).to.equal(
          ethers.utils.hexZeroPad(ethers.utils.hexlify(SEND_STATES.NEUTRAL), 32)
        ); // Neutral = 0
      });
    });

    describe("Receive state updates", function () {
      it("emits correct event for ReceiveGeneral state", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");
        const tokenId = config.projectThree * 1000000;

        const tx = await config.srHooksProxy
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
              imageDataCompressed: imageData,
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        const receipt = await tx.wait();
        const events = receipt.events?.filter(
          (e) => e.event === "TokenParamsConfigured"
        );

        const receiveStateEvent = events?.find(
          (e) => e.args?.[2][0][0] === "ReceiveState"
        );

        expect(receiveStateEvent).to.not.be.undefined;
        expect(receiveStateEvent?.args?.[0]).to.equal(
          config.genArt721Core.address
        );
        expect(receiveStateEvent?.args?.[1]).to.equal(tokenId);
        expect(receiveStateEvent?.args?.[2][0][0]).to.equal("ReceiveState"); // key
        expect(receiveStateEvent?.args?.[2][0][1]).to.equal(1); // ParamType.Select
        expect(receiveStateEvent?.args?.[2][0][2]).to.equal(
          ethers.utils.hexZeroPad(
            ethers.utils.hexlify(RECEIVE_STATES.RECEIVE_GENERAL),
            32
          )
        ); // ReceiveGeneral = 1
        expect(receiveStateEvent?.args?.[3][0]).to.equal(
          config.accounts.user.address
        );
      });

      it("emits correct event for ReceiveFrom state", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");

        const tx = await config.srHooksProxy
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

        const receipt = await tx.wait();
        const events = receipt.events?.filter(
          (e) => e.event === "TokenParamsConfigured"
        );

        const receiveStateEvent = events?.find(
          (e) => e.args?.[2][0][0] === "ReceiveState"
        );

        expect(receiveStateEvent?.args?.[2][0][2]).to.equal(
          ethers.utils.hexZeroPad(
            ethers.utils.hexlify(RECEIVE_STATES.RECEIVE_FROM),
            32
          )
        ); // ReceiveFrom = 2
      });

      it("emits correct event for ReceiveTo state", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");

        const tx = await config.srHooksProxy
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

        const receipt = await tx.wait();
        const events = receipt.events?.filter(
          (e) => e.event === "TokenParamsConfigured"
        );

        const receiveStateEvent = events?.find(
          (e) => e.args?.[2][0][0] === "ReceiveState"
        );

        expect(receiveStateEvent?.args?.[2][0][2]).to.equal(
          ethers.utils.hexZeroPad(
            ethers.utils.hexlify(RECEIVE_STATES.RECEIVE_TO),
            32
          )
        ); // ReceiveTo = 3
      });

      it("emits correct event for Neutral receive state", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");

        // First set to ReceiveGeneral
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
              imageDataCompressed: imageData,
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          );

        // Then set to Neutral
        const tx = await config.srHooksProxy
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

        const receipt = await tx.wait();
        const event = receipt.events?.find(
          (e) => e.event === "TokenParamsConfigured"
        );

        expect(event?.args?.[2][0][0]).to.equal("ReceiveState");
        expect(event?.args?.[2][0][2]).to.equal(
          ethers.utils.hexZeroPad(
            ethers.utils.hexlify(RECEIVE_STATES.NEUTRAL),
            32
          )
        ); // Neutral = 0
      });
    });

    describe("Multiple updates in one call", function () {
      it("emits multiple TokenParamsConfigured events for combined updates", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");
        const soundData = ethers.utils.toUtf8Bytes("test sound");

        const tx = await config.srHooksProxy
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

        const receipt = await tx.wait();
        const events = receipt.events?.filter(
          (e) => e.event === "TokenParamsConfigured"
        );

        // Should emit 4 events: image, sound, send state, receive state
        expect(events?.length).to.equal(4);

        // Verify each event type is present
        const imageEvent = events?.find(
          (e) => e.args?.[2][0][0] === "ImageVersionSlot0"
        );
        const soundEvent = events?.find(
          (e) => e.args?.[2][0][0] === "SoundVersionSlot0"
        );
        const sendStateEvent = events?.find(
          (e) => e.args?.[2][0][0] === "SendState"
        );
        const receiveStateEvent = events?.find(
          (e) => e.args?.[2][0][0] === "ReceiveState"
        );

        expect(imageEvent).to.not.be.undefined;
        expect(soundEvent).to.not.be.undefined;
        expect(sendStateEvent).to.not.be.undefined;
        expect(receiveStateEvent).to.not.be.undefined;
      });
    });
  });

  describe("Event edge cases", function () {
    it("emits both SendTo and ReceiveFrom events when both states change", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tokenId = config.projectThreeTokenZero.toNumber();

      await expect(
        config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            true,
            SEND_STATES.SEND_TO,
            [1],
            true,
            RECEIVE_STATES.RECEIVE_FROM,
            [2],
            true,
            0,
            {
              updateImage: true,
              imageDataCompressed: imageData,
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          )
      )
        .to.emit(config.srHooksProxy, "TokenSendingToUpdated")
        .withArgs(config.genArt721Core.address, tokenId, [1])
        .and.to.emit(config.srHooksProxy, "TokenReceivingFromUpdated")
        .withArgs(config.genArt721Core.address, tokenId, [2]);
    });

    it("handles large arrays in SendTo event emission", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tokenId = config.projectThreeTokenZero.toNumber();

      // Create an array of 25 targets (MAX_SENDING_TO_LENGTH)
      const largeArray = Array.from({ length: 25 }, (_, i) => i + 1);

      await expect(
        config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            true,
            SEND_STATES.SEND_TO,
            largeArray,
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
          )
      )
        .to.emit(config.srHooksProxy, "TokenSendingToUpdated")
        .withArgs(config.genArt721Core.address, tokenId, largeArray);
    });

    it("handles large arrays in ReceiveFrom event emission", async function () {
      const config = await loadFixture(_beforeEach);
      const imageData = ethers.utils.toUtf8Bytes("test image");

      const tokenId = config.projectThreeTokenZero.toNumber();

      // Create an array of 50 tokens
      const largeArray = Array.from({ length: 50 }, (_, i) => i + 1);

      await expect(
        config.srHooksProxy
          .connect(config.accounts.user)
          .updateTokenStateAndMetadata(
            0,
            false,
            0,
            [],
            true,
            RECEIVE_STATES.RECEIVE_FROM,
            largeArray,
            true,
            0,
            {
              updateImage: true,
              imageDataCompressed: imageData,
              updateSound: false,
              soundDataCompressed: ethers.utils.toUtf8Bytes(""),
            }
          )
      )
        .to.emit(config.srHooksProxy, "TokenReceivingFromUpdated")
        .withArgs(config.genArt721Core.address, tokenId, largeArray);
    });
  });
});
