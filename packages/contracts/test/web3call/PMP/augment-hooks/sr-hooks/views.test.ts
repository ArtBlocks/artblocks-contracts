import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture, mine } from "@nomicfoundation/hardhat-network-helpers";
import helpers = require("@nomicfoundation/hardhat-network-helpers");
import { ethers } from "hardhat";
import { SRHooksFixtureConfig, setupSRHooksFixture } from "./srHooksFixtures";
import {
  srHooksRevertMessages,
  SR_CONSTANTS,
  SEND_STATES,
  RECEIVE_STATES,
} from "./constants";
import {
  bytes,
  updateImage,
  updateImageAndSound,
  updateSendState,
  updateReceiveState,
  updateImageAndSendState,
  updateImageAndReceiveState,
  updateImageSoundAndStates,
} from "./testHelpers";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

// we fork test in hardhat to avoid low-level call reverts in hardhat when ens universal resolver is not deployed
const FORK_URL = process.env.MAINNET_JSON_RPC_PROVIDER_URL;
const FORK_BLOCK_NUMBER = 23086000; // Block after universal resolver deployment

/**
 * Test suite for SRHooks view functions
 *
 * NOTE: The FeistelWalk library has been thoroughly tested with tens of thousands of items
 * in separate unit tests. These tests focus on hundreds of tokens to explore limits and
 * interactions while keeping test execution time reasonable.
 *
 * Token ownership from fixture:
 * - Token 0: user
 * - Token 1: user2
 * - Token 2: additional
 * - Token 3: additional2
 */
describe("SRHooks_Views", function () {
  before(async function () {
    // Fork mainnet to enable ENS Universal Resolver
    await helpers.reset(FORK_URL, FORK_BLOCK_NUMBER);
  });

  after(async function () {
    // Reset fork to not use a fork
    await helpers.reset();
  });

  // Test fixture with projects, tokens, and SRHooks contract setup
  async function _beforeEach() {
    const config = await loadFixture(setupSRHooksFixture);
    return config;
  }

  /**
   * Helper function to mint additional tokens for a specific account
   * @param config The test configuration
   * @param account The account to mint for
   * @param count Number of tokens to mint
   * @returns Array of token numbers minted
   */
  async function mintAdditionalTokens(
    config: SRHooksFixtureConfig,
    account: any,
    count: number
  ): Promise<number[]> {
    const minter = await ethers.getContractAt(
      "MinterSetPriceV2",
      await config.minterFilter.getMinterForProject(config.projectThree)
    );
    const pricePerTokenInWei = ethers.utils.parseEther("0.1");

    const startTokenNumber = (
      await config.genArt721Core.projectStateData(config.projectThree)
    ).invocations;

    const tokenNumbers: number[] = [];
    for (let i = 0; i < count; i++) {
      await minter
        .connect(account)
        .purchase(config.projectThree, { value: pricePerTokenInWei });
      tokenNumbers.push(startTokenNumber.add(i).toNumber());
    }

    return tokenNumbers;
  }

  describe("getGeneralPoolState", function () {
    it("returns zero lengths when pools are empty", async function () {
      const config = await loadFixture(_beforeEach);

      const [sendLength, receiveLength] =
        await config.srHooksProxy.getGeneralPoolState();

      expect(sendLength).to.equal(0);
      expect(receiveLength).to.equal(0);
    });

    it("tracks send general pool additions", async function () {
      const config = await loadFixture(_beforeEach);

      // Add token 0 to send general pool (token 0 is already minted and owned by user)
      await updateImageAndSendState(
        config.srHooksProxy,
        0,
        "test image",
        0,
        SEND_STATES.SEND_GENERAL,
        [],
        config.accounts.user
      );

      let [sendLength, receiveLength] =
        await config.srHooksProxy.getGeneralPoolState();
      expect(sendLength).to.equal(1);
      expect(receiveLength).to.equal(0);

      // Add token 1 to send general pool (token 1 is owned by user2)
      await updateImageAndSendState(
        config.srHooksProxy,
        1,
        "test image",
        0,
        SEND_STATES.SEND_GENERAL,
        [],
        config.accounts.user2
      );

      [sendLength, receiveLength] =
        await config.srHooksProxy.getGeneralPoolState();
      expect(sendLength).to.equal(2);
      expect(receiveLength).to.equal(0);
    });

    it("tracks receive general pool additions", async function () {
      const config = await loadFixture(_beforeEach);

      // Add token 0 to receive general pool
      await updateImageAndReceiveState(
        config.srHooksProxy,
        0,
        "test image",
        0,
        RECEIVE_STATES.RECEIVE_GENERAL,
        [],
        config.accounts.user
      );

      let [sendLength, receiveLength] =
        await config.srHooksProxy.getGeneralPoolState();
      expect(sendLength).to.equal(0);
      expect(receiveLength).to.equal(1);

      // Add token 1 to receive general pool (token 1 is owned by user2)
      await updateImageAndReceiveState(
        config.srHooksProxy,
        1,
        "test image",
        0,
        RECEIVE_STATES.RECEIVE_GENERAL,
        [],
        config.accounts.user2
      );

      [sendLength, receiveLength] =
        await config.srHooksProxy.getGeneralPoolState();
      expect(sendLength).to.equal(0);
      expect(receiveLength).to.equal(2);
    });

    it("tracks both pools growing simultaneously", async function () {
      const config = await loadFixture(_beforeEach);

      // Token 0: send general
      await updateImageAndSendState(
        config.srHooksProxy,
        0,
        "test image",
        0,
        SEND_STATES.SEND_GENERAL,
        [],
        config.accounts.user
      );

      // Token 1: receive general (token 1 is owned by user2)
      await updateImageAndReceiveState(
        config.srHooksProxy,
        1,
        "test image",
        0,
        RECEIVE_STATES.RECEIVE_GENERAL,
        [],
        config.accounts.user2
      );

      const [sendLength, receiveLength] =
        await config.srHooksProxy.getGeneralPoolState();
      expect(sendLength).to.equal(1);
      expect(receiveLength).to.equal(1);
    });

    it("tracks pool removals when tokens leave", async function () {
      const config = await loadFixture(_beforeEach);

      // Add token 0 to send general pool
      await updateImageAndSendState(
        config.srHooksProxy,
        0,
        "test image",
        0,
        SEND_STATES.SEND_GENERAL,
        [],
        config.accounts.user
      );

      let [sendLength, receiveLength] =
        await config.srHooksProxy.getGeneralPoolState();
      expect(sendLength).to.equal(1);

      // Remove from pool by switching to Neutral
      await updateSendState(
        config.srHooksProxy,
        0,
        SEND_STATES.NEUTRAL,
        [],
        config.accounts.user
      );

      [sendLength, receiveLength] =
        await config.srHooksProxy.getGeneralPoolState();
      expect(sendLength).to.equal(0);
    });
  });

  describe("getTokenMetadataAtSlot", function () {
    it("reverts when token number is invalid", async function () {
      const config = await loadFixture(_beforeEach);
      const invalidTokenNumber = 65536; // > uint16.max

      await expect(
        config.srHooksProxy.getTokenMetadataAtSlot(invalidTokenNumber, 0)
      ).to.be.reverted;
    });

    it("reverts when slot is invalid", async function () {
      const config = await loadFixture(_beforeEach);

      await expectRevert(
        config.srHooksProxy.getTokenMetadataAtSlot(
          0,
          SR_CONSTANTS.NUM_METADATA_SLOTS
        ),
        srHooksRevertMessages.invalidSlot
      );
    });

    it("returns empty metadata for uninitialized slot", async function () {
      const config = await loadFixture(_beforeEach);

      const metadata = await config.srHooksProxy.getTokenMetadataAtSlot(0, 0);

      expect(metadata.imageDataCompressed).to.equal("0x");
      expect(metadata.imageVersion).to.equal(0);
      expect(metadata.soundDataCompressed).to.equal("0x");
      expect(metadata.soundVersion).to.equal(0);
    });

    it("returns correct metadata for populated slot", async function () {
      const config = await loadFixture(_beforeEach);

      // Populate slot 0
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

    it("returns independent metadata for different slots", async function () {
      const config = await loadFixture(_beforeEach);

      // Populate slot 0
      await updateImage(
        config.srHooksProxy,
        0,
        "image slot 0",
        0,
        config.accounts.user
      );

      // Populate slot 1
      await updateImage(
        config.srHooksProxy,
        0,
        "image slot 1",
        1,
        config.accounts.user
      );

      const metadata0 = await config.srHooksProxy.getTokenMetadataAtSlot(0, 0);
      const metadata1 = await config.srHooksProxy.getTokenMetadataAtSlot(0, 1);

      expect(metadata0.imageDataCompressed).to.equal(
        ethers.utils.hexlify(bytes("image slot 0"))
      );
      expect(metadata1.imageDataCompressed).to.equal(
        ethers.utils.hexlify(bytes("image slot 1"))
      );
      expect(metadata0.imageVersion).to.equal(1);
      expect(metadata1.imageVersion).to.equal(1);
    });
  });

  describe("getTokensSendingToToken", function () {
    it("reverts when token number is invalid", async function () {
      const config = await loadFixture(_beforeEach);
      const invalidTokenNumber = 65536; // > uint16.max

      await expect(
        config.srHooksProxy.getTokensSendingToToken(invalidTokenNumber)
      ).to.be.reverted;
    });

    it("returns empty array when no tokens sending to it", async function () {
      const config = await loadFixture(_beforeEach);

      const sendingTo = await config.srHooksProxy.getTokensSendingToToken(0);

      expect(sendingTo.length).to.equal(0);
    });

    it("returns tokens sending to the target token", async function () {
      const config = await loadFixture(_beforeEach);

      // Token 0 sends to token 2
      await updateImageAndSendState(
        config.srHooksProxy,
        0,
        "test image",
        0,
        SEND_STATES.SEND_TO,
        [2],
        config.accounts.user
      );

      const sendingToToken2 =
        await config.srHooksProxy.getTokensSendingToToken(2);

      expect(sendingToToken2.length).to.equal(1);
      expect(sendingToToken2[0]).to.equal(0);
    });

    it("returns multiple tokens sending to the target", async function () {
      const config = await loadFixture(_beforeEach);

      // Token 0 sends to token 3
      await updateImageAndSendState(
        config.srHooksProxy,
        0,
        "test image",
        0,
        SEND_STATES.SEND_TO,
        [3],
        config.accounts.user
      );

      // Token 1 sends to token 3 (token 1 is owned by user2)
      await updateImageAndSendState(
        config.srHooksProxy,
        1,
        "test image",
        0,
        SEND_STATES.SEND_TO,
        [3],
        config.accounts.user2
      );

      const sendingToToken3 =
        await config.srHooksProxy.getTokensSendingToToken(3);

      expect(sendingToToken3.length).to.equal(2);
      // Convert BigNumbers to numbers for comparison
      const tokenNumbers = sendingToToken3.map((bn) => bn.toNumber());
      expect(tokenNumbers).to.have.members([0, 1]);
    });

    it("updates when token stops sending to target", async function () {
      const config = await loadFixture(_beforeEach);

      // Token 0 sends to token 2
      await updateImageAndSendState(
        config.srHooksProxy,
        0,
        "test image",
        0,
        SEND_STATES.SEND_TO,
        [2],
        config.accounts.user
      );

      let sendingToToken2 =
        await config.srHooksProxy.getTokensSendingToToken(2);
      expect(sendingToToken2.length).to.equal(1);

      // Token 0 stops sending to token 2
      await updateSendState(
        config.srHooksProxy,
        0,
        SEND_STATES.NEUTRAL,
        [],
        config.accounts.user
      );

      sendingToToken2 = await config.srHooksProxy.getTokensSendingToToken(2);
      expect(sendingToToken2.length).to.equal(0);
    });
  });

  describe("getLiveData", function () {
    describe("input validation", function () {
      it("reverts when token number is invalid", async function () {
        const config = await loadFixture(_beforeEach);
        const invalidTokenNumber = 65536; // > uint16.max

        await expect(config.srHooksProxy.getLiveData(invalidTokenNumber, 0, 10))
          .to.be.reverted;
      });

      it("reverts when maxReceive is too large", async function () {
        const config = await loadFixture(_beforeEach);
        const tooLargeMaxReceive = SR_CONSTANTS.MAX_RECEIVE_RATE_PER_BLOCK + 1;

        await expectRevert(
          config.srHooksProxy.getLiveData(0, 0, tooLargeMaxReceive),
          srHooksRevertMessages.maxReceiveTooLarge
        );
      });

      it("reverts when block number is in the future", async function () {
        const config = await loadFixture(_beforeEach);
        const futureBlock = (await ethers.provider.getBlockNumber()) + 10;

        await expectRevert(
          config.srHooksProxy.getLiveData(0, futureBlock, 10),
          srHooksRevertMessages.blockNumberInFuture
        );
      });

      it("reverts when block is too old (> 256 blocks)", async function () {
        const config = await loadFixture(_beforeEach);

        // Mine 257 blocks to make initial block too old
        await mine(257);

        const oldBlock = 1; // Very old block

        await expectRevert(
          config.srHooksProxy.getLiveData(0, oldBlock, 10),
          srHooksRevertMessages.blockHashNotAvailable
        );
      });

      it("accepts block number 0 as latest completed block", async function () {
        const config = await loadFixture(_beforeEach);
        const imageData = ethers.utils.toUtf8Bytes("test image");

        // Setup token with image
        await updateImage(
          config.srHooksProxy,
          0,
          "test image",
          0,
          config.accounts.user
        );

        // Should not revert and should return usedBlockNumber
        const [, , , , , , , usedBlockNumber] =
          await config.srHooksProxy.getLiveData(0, 0, 10);
        const expectedBlock = (await ethers.provider.getBlockNumber()) - 1;
        expect(usedBlockNumber).to.equal(expectedBlock);
      });

      it("accepts maxReceive = MAX_RECEIVE_RATE_PER_BLOCK", async function () {
        const config = await loadFixture(_beforeEach);

        // Setup token with image
        await updateImage(
          config.srHooksProxy,
          0,
          "test image",
          0,
          config.accounts.user
        );

        // Should not revert
        await expect(
          config.srHooksProxy.getLiveData(
            0,
            0,
            SR_CONSTANTS.MAX_RECEIVE_RATE_PER_BLOCK
          )
        ).to.not.be.reverted;
      });

      it("handles maxReceive = 0 correctly", async function () {
        const config = await loadFixture(_beforeEach);

        // Setup tokens: Token 0 SendGeneral, Token 1 ReceiveGeneral
        await updateImageAndSendState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          config.accounts.user
        );

        await updateImageAndReceiveState(
          config.srHooksProxy,
          1,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user2
        );

        // Call with maxReceive = 0
        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(1, 0, 0);

        // Should return empty arrays even though senders exist
        expect(receivedGeneral.length).to.equal(0);
        expect(receivedTo.length).to.equal(0);
      });
    });

    describe("Neutral receive state", function () {
      it("returns empty arrays when in Neutral receive state", async function () {
        const config = await loadFixture(_beforeEach);

        // Setup token with Neutral receive state
        await updateImage(
          config.srHooksProxy,
          0,
          "test image",
          0,
          config.accounts.user
        );

        const [
          sendState,
          receiveState,
          receivedGeneral,
          receivedTo,
          numSendGeneral,
          numReceiveGeneral,
          numSendingToMe,
          usedBlockNumber,
        ] = await config.srHooksProxy.getLiveData(0, 0, 10);

        expect(sendState).to.equal(SEND_STATES.NEUTRAL);
        expect(receiveState).to.equal(RECEIVE_STATES.NEUTRAL);
        expect(receivedGeneral.length).to.equal(0);
        expect(receivedTo.length).to.equal(0);
        expect(numSendGeneral).to.equal(0);
        expect(numReceiveGeneral).to.equal(0);
        expect(numSendingToMe).to.equal(0);
        expect(usedBlockNumber).to.exist;
      });

      it("returns correct send state even with Neutral receive state", async function () {
        const config = await loadFixture(_beforeEach);

        // Setup token with SendGeneral and Neutral receive
        await updateImageAndSendState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          config.accounts.user
        );

        const [
          sendState,
          receiveState,
          receivedGeneral,
          receivedTo,
          numSendGeneral,
          numReceiveGeneral,
          numSendingToMe,
          usedBlockNumber,
        ] = await config.srHooksProxy.getLiveData(0, 0, 10);

        expect(sendState).to.equal(SEND_STATES.SEND_GENERAL);
        expect(receiveState).to.equal(RECEIVE_STATES.NEUTRAL);
        expect(receivedGeneral.length).to.equal(0);
        expect(receivedTo.length).to.equal(0);
        expect(numSendGeneral).to.equal(1); // Token 0 is in SendGeneral
        expect(numReceiveGeneral).to.equal(0);
        expect(numSendingToMe).to.equal(0);
        expect(usedBlockNumber).to.exist;
      });
    });

    describe("ReceiveGeneral state - general pool sampling", function () {
      it("returns empty arrays when no senders in general pool", async function () {
        const config = await loadFixture(_beforeEach);

        // Setup token as ReceiveGeneral but no senders
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user
        );

        const [
          sendState,
          receiveState,
          receivedGeneral,
          receivedTo,
          numSendGeneral,
          numReceiveGeneral,
          numSendingToMe,
          usedBlockNumber,
        ] = await config.srHooksProxy.getLiveData(0, 0, 10);

        expect(receiveState).to.equal(RECEIVE_STATES.RECEIVE_GENERAL);
        expect(receivedGeneral.length).to.equal(0);
        expect(receivedTo.length).to.equal(0);
        expect(numSendGeneral).to.equal(0);
        expect(numReceiveGeneral).to.equal(1); // Token 0 is in ReceiveGeneral
        expect(numSendingToMe).to.equal(0);
        expect(usedBlockNumber).to.exist;
      });

      it("samples from general pool when equal send/receive ratios", async function () {
        const config = await loadFixture(_beforeEach);

        // Create 1 sender and 1 receiver (1:1 ratio)
        // Token 0: SendGeneral
        await updateImageAndSendState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          config.accounts.user
        );

        // Token 1: ReceiveGeneral (token 1 is owned by user2)
        await updateImageAndReceiveState(
          config.srHooksProxy,
          1,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user2
        );

        const [
          sendState,
          receiveState,
          receivedGeneral,
          receivedTo,
          numSendGeneral,
          numReceiveGeneral,
          numSendingToMe,
          usedBlockNumber,
        ] = await config.srHooksProxy.getLiveData(1, 0, 12);

        expect(receiveState).to.equal(RECEIVE_STATES.RECEIVE_GENERAL);
        // With maxReceive=12 and n=1 (only token 0 available in general pool),
        // we get all available tokens since k > n
        expect(receivedGeneral.length).to.equal(1);
        expect(receivedTo.length).to.equal(0); // No SendTo tokens

        // Verify it's token 0
        expect(receivedGeneral[0].tokenNumber).to.equal(0);
        expect(numSendGeneral).to.equal(1); // Token 0 is in SendGeneral
        expect(numReceiveGeneral).to.equal(1); // Token 1 is in ReceiveGeneral
        expect(numSendingToMe).to.equal(0);
        expect(usedBlockNumber).to.exist;
      });

      it("respects MAX_RECEIVE_RATE_PER_BLOCK cap", async function () {
        const config = await loadFixture(_beforeEach);

        // Mint 101 additional tokens for deployer (need 100 senders + 1 receiver)
        const newTokens = await mintAdditionalTokens(
          config,
          config.accounts.deployer,
          101
        );

        // Create many senders and few receivers (high ratio)
        // Create 100 senders
        for (let i = 0; i < 100; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            newTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_GENERAL,
            [],
            config.accounts.deployer
          );
        }

        // Create 1 receiver (use the 101st token)
        const receiverToken = newTokens[100];
        await updateImageAndReceiveState(
          config.srHooksProxy,
          receiverToken,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.deployer
        );

        // Request MAX_RECEIVE_RATE_PER_BLOCK samples
        const [
          sendState,
          receiveState,
          receivedGeneral,
          receivedTo,
          numSendGeneral,
          numReceiveGeneral,
          numSendingToMe,
          usedBlockNumber,
        ] = await config.srHooksProxy.getLiveData(
          receiverToken,
          0,
          SR_CONSTANTS.MAX_RECEIVE_RATE_PER_BLOCK
        );

        expect(receiveState).to.equal(RECEIVE_STATES.RECEIVE_GENERAL);
        // With maxReceive=36 and 100 available senders, we expect 36 samples
        expect(receivedGeneral.length).to.equal(
          SR_CONSTANTS.MAX_RECEIVE_RATE_PER_BLOCK
        );
        expect(receivedTo.length).to.equal(0); // No SendTo tokens
        expect(numSendGeneral).to.equal(100);
        expect(numReceiveGeneral).to.equal(1);
        expect(numSendingToMe).to.equal(0);
        expect(usedBlockNumber).to.exist;
      });

      it("returns different samples across different blocks", async function () {
        const config = await loadFixture(_beforeEach);

        // Mint 11 tokens for deployer (10 senders + 1 receiver)
        const newTokens = await mintAdditionalTokens(
          config,
          config.accounts.deployer,
          11
        );

        // Create 10 senders
        for (let i = 0; i < 10; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            newTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_GENERAL,
            [],
            config.accounts.deployer
          );
        }

        // Create receiver
        const receiverToken = newTokens[10];
        await updateImageAndReceiveState(
          config.srHooksProxy,
          receiverToken,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.deployer
        );

        // Query two different historical blocks to ensure different block hashes
        // Don't rely on mining - explicitly use different blocks
        const currentBlock = await ethers.provider.getBlockNumber();
        const blockNumber1 = currentBlock - 1; // Most recent completed block
        const blockNumber2 = currentBlock - 10; // Earlier block (10 blocks back)

        // Get live data at both blocks with maxReceive=10
        const [, , receivedGeneral1] = await config.srHooksProxy.getLiveData(
          receiverToken,
          blockNumber1,
          10
        );
        const [, , receivedGeneral2] = await config.srHooksProxy.getLiveData(
          receiverToken,
          blockNumber2,
          10
        );

        // Verify we used different blocks
        expect(blockNumber1).to.not.equal(blockNumber2);

        // With 10 senders and maxReceive=10, we expect all 10 tokens in both samples
        expect(receivedGeneral1.length).to.equal(10);
        expect(receivedGeneral2.length).to.equal(10);

        // Extract token numbers
        const tokens1 = receivedGeneral1.map((t) => t.tokenNumber.toNumber());
        const tokens2 = receivedGeneral2.map((t) => t.tokenNumber.toNumber());

        // With different block hashes, we should get different orderings
        // This is deterministic - different seeds = different permutations
        const hasDifference = !tokens1.every((t, i) => t === tokens2[i]);
        expect(hasDifference).to.be.true;
      });

      it("handles low send/receive ratios correctly", async function () {
        const config = await loadFixture(_beforeEach);

        // Mint 11 tokens for deployer (1 sender + 10 receivers)
        const newTokens = await mintAdditionalTokens(
          config,
          config.accounts.deployer,
          11
        );

        // Create 1 sender
        await updateImageAndSendState(
          config.srHooksProxy,
          newTokens[0],
          "test image",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          config.accounts.deployer
        );

        // Create 10 receivers
        for (let i = 1; i <= 10; i++) {
          await updateImageAndReceiveState(
            config.srHooksProxy,
            newTokens[i],
            "test image",
            0,
            RECEIVE_STATES.RECEIVE_GENERAL,
            [],
            config.accounts.deployer
          );
        }

        // Request 5 samples, but only 1 sender available
        const [, receiveState, receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(newTokens[1], 0, 5);

        expect(receiveState).to.equal(RECEIVE_STATES.RECEIVE_GENERAL);
        // With maxReceive=5 but only 1 sender available, we get just 1 token
        expect(receivedGeneral.length).to.equal(1);
        expect(receivedTo.length).to.equal(0);
        expect(receivedGeneral[0].tokenNumber).to.equal(newTokens[0]);
      });
    });

    describe("ReceiveGeneral state - SendTo sampling", function () {
      it("includes tokens sending directly to the receiver", async function () {
        const config = await loadFixture(_beforeEach);

        // Use existing tokens 0 (owned by user) and 1 (owned by user2)
        // Token 0: SendTo token 1
        await updateImageAndSendState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          SEND_STATES.SEND_TO,
          [1],
          config.accounts.user
        );

        // Token 1: ReceiveGeneral
        await updateImageAndReceiveState(
          config.srHooksProxy,
          1,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user2
        );

        // With maxReceive=10 and only 1 token in the SendTo pool, we get that 1 token
        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(1, 0, 10);

        expect(receivedGeneral.length).to.equal(0); // No general pool senders
        // Token 0 is SendTo token 1, so it WILL be included (deterministic, k >= n)
        expect(receivedTo.length).to.equal(1);
        expect(receivedTo[0].tokenNumber).to.equal(0);
      });

      it("includes SendTo tokens that send to multiple targets", async function () {
        const config = await loadFixture(_beforeEach);

        // Mint 11 tokens for deployer (1 sender + 10 targets)
        const newTokens = await mintAdditionalTokens(
          config,
          config.accounts.deployer,
          11
        );

        // Token 0 (newTokens[0]): SendTo 10 different tokens
        const sendToTargets = newTokens.slice(1, 11);
        await updateImageAndSendState(
          config.srHooksProxy,
          newTokens[0],
          "test image",
          0,
          SEND_STATES.SEND_TO,
          sendToTargets,
          config.accounts.deployer
        );

        // First target: ReceiveGeneral
        await updateImageAndReceiveState(
          config.srHooksProxy,
          newTokens[1],
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.deployer
        );

        // Token 0 sends to multiple targets including newTokens[1]
        // With maxReceive=10, token 0 should be included in receivedTo
        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(newTokens[1], 0, 10);

        expect(receivedGeneral.length).to.equal(0); // No general pool senders
        // Token 0 is SendTo newTokens[1], so it should appear in receivedTo
        expect(receivedTo.length).to.equal(1);
        expect(receivedTo[0].tokenNumber).to.equal(newTokens[0]);
      });

      it("verifies SendTo tokens are included across multiple samples", async function () {
        const config = await loadFixture(_beforeEach);

        // Mint 10 tokens for deployer to act as senders
        const senderTokens = await mintAdditionalTokens(
          config,
          config.accounts.deployer,
          10
        );

        // Set all 10 tokens to SendTo token 0
        for (let i = 0; i < 10; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            senderTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_TO,
            [0],
            config.accounts.deployer
          );
        }

        // Token 0: ReceiveGeneral
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user
        );

        // With maxReceive=10, we should get up to 10 tokens from the SendTo pool
        // 10 tokens are SendTo token 0, so they're all in the pool
        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 10);

        expect(receivedGeneral.length).to.equal(0); // No general pool senders
        // With maxReceive=10 and 10 senders in the SendTo pool, we should get all 10
        expect(receivedTo.length).to.equal(10);

        // Verify all senders are present
        const receivedTokenNumbers = receivedTo.map((t) =>
          t.tokenNumber.toNumber()
        );
        senderTokens.forEach((tokenNum) => {
          expect(receivedTokenNumbers).to.include(tokenNum);
        });
      });

      it("respects maxReceive cap when sampling SendTo tokens", async function () {
        const config = await loadFixture(_beforeEach);

        // Mint 19 tokens for deployer (10 senders + 9 additional targets)
        const mintedTokens = await mintAdditionalTokens(
          config,
          config.accounts.deployer,
          19
        );

        const senderTokens = mintedTokens.slice(0, 10);
        // Target tokens = token 0 (from fixture) + 9 minted tokens
        // This gives us 10 targets total
        const targetTokens = [0, ...mintedTokens.slice(10, 19)];

        // Set all 10 senders to SendTo all 10 targets (including token 0)
        // This means all 10 senders will be in token 0's SendTo pool
        for (let i = 0; i < 10; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            senderTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_TO,
            targetTokens,
            config.accounts.deployer
          );
        }

        // Token 0: ReceiveGeneral (will receive from SendTo pool, capped by maxReceive)
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user
        );

        // With maxReceive=5 and 10 senders in the SendTo pool, we get exactly 5 tokens
        // This tests that maxReceive properly caps the result
        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 5);

        expect(receivedGeneral.length).to.equal(0); // No general pool senders
        // With maxReceive=5 and 10 senders available, we get exactly 5 samples
        expect(receivedTo.length).to.equal(5);

        // Verify all returned tokens are from the sender pool
        const receivedTokenNumbers = receivedTo.map((t) =>
          t.tokenNumber.toNumber()
        );
        receivedTokenNumbers.forEach((tokenNum) => {
          expect(senderTokens).to.include(tokenNum);
        });
      });
    });

    describe("ReceiveGeneral state - combined pools", function () {
      it("returns tokens from BOTH general and SendTo pools simultaneously", async function () {
        const config = await loadFixture(_beforeEach);

        // Mint 4 additional tokens (2 for SendGeneral, 2 for SendTo)
        const newTokens = await mintAdditionalTokens(
          config,
          config.accounts.deployer,
          4
        );

        // Tokens 0,1 (newTokens[0-1]): SendGeneral
        for (let i = 0; i < 2; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            newTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_GENERAL,
            [],
            config.accounts.deployer
          );
        }

        // Tokens 2,3 (newTokens[2-3]): SendTo token 0 (from fixture)
        for (let i = 2; i < 4; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            newTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_TO,
            [0],
            config.accounts.deployer
          );
        }

        // Token 0: ReceiveGeneral
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user
        );

        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 10);

        // Should have 2 tokens from general pool and 2 from SendTo pool
        expect(receivedGeneral.length).to.equal(2);
        expect(receivedTo.length).to.equal(2);

        // Verify token numbers
        const generalTokenNums = receivedGeneral
          .map((t) => t.tokenNumber.toNumber())
          .sort((a, b) => a - b);
        const sendToTokenNums = receivedTo
          .map((t) => t.tokenNumber.toNumber())
          .sort((a, b) => a - b);

        expect(generalTokenNums).to.deep.equal([newTokens[0], newTokens[1]]);
        expect(sendToTokenNums).to.deep.equal([newTokens[2], newTokens[3]]);
      });

      it("independently caps general and SendTo arrays with same maxReceive", async function () {
        const config = await loadFixture(_beforeEach);

        // Mint 20 tokens (10 for SendGeneral, 10 for SendTo)
        const newTokens = await mintAdditionalTokens(
          config,
          config.accounts.deployer,
          20
        );

        // Tokens 0-9: SendGeneral
        for (let i = 0; i < 10; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            newTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_GENERAL,
            [],
            config.accounts.deployer
          );
        }

        // Tokens 10-19: SendTo token 0
        for (let i = 10; i < 20; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            newTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_TO,
            [0],
            config.accounts.deployer
          );
        }

        // Token 0: ReceiveGeneral
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user
        );

        // With maxReceive=5, each array should be capped at 5
        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 5);

        // Each array capped independently at maxReceive=5
        expect(receivedGeneral.length).to.equal(5);
        expect(receivedTo.length).to.equal(5);
        // Combined length is 10, which exceeds maxReceive (intentional design)
        expect(receivedGeneral.length + receivedTo.length).to.equal(10);
      });

      it("handles empty general pool with non-empty SendTo pool", async function () {
        const config = await loadFixture(_beforeEach);

        // Mint 3 tokens for SendTo only (no SendGeneral tokens)
        const newTokens = await mintAdditionalTokens(
          config,
          config.accounts.deployer,
          3
        );

        // All 3 tokens: SendTo token 0
        for (let i = 0; i < 3; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            newTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_TO,
            [0],
            config.accounts.deployer
          );
        }

        // Token 0: ReceiveGeneral
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user
        );

        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 10);

        // General pool is empty, SendTo pool has 3 tokens
        expect(receivedGeneral.length).to.equal(0);
        expect(receivedTo.length).to.equal(3);
      });
    });

    describe("ReceiveFrom state", function () {
      it("returns empty arrays when receivingFrom array is empty", async function () {
        const config = await loadFixture(_beforeEach);

        // This should revert during updateTokenStateAndMetadata
        // ReceiveFrom requires non-empty tokensReceivingFrom array
        // Token 0 is owned by user
        await expectRevert(
          updateImageAndReceiveState(
            config.srHooksProxy,
            0,
            "test image",
            0,
            RECEIVE_STATES.RECEIVE_FROM,
            [],
            config.accounts.user
          ),
          srHooksRevertMessages.tokensReceivingFromMustBeNonEmpty
        );
      });

      it("receives only from specified tokens in SendGeneral state", async function () {
        const config = await loadFixture(_beforeEach);

        // Use existing tokens 0, 1, 2 (owned by user, user2, additional)
        // Tokens 0, 1, 2: SendGeneral
        await updateImageAndSendState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          config.accounts.user
        );
        await updateImageAndSendState(
          config.srHooksProxy,
          1,
          "test image",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          config.accounts.user2
        );
        await updateImageAndSendState(
          config.srHooksProxy,
          2,
          "test image",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          config.accounts.additional
        );

        // Token 3: ReceiveFrom [0, 1] (not 2)
        await updateImageAndReceiveState(
          config.srHooksProxy,
          3,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          [0, 1],
          config.accounts.additional2
        );

        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(3, 0, 10);

        // Should receive from tokens 0 and 1 (both in SendGeneral and receivingFrom list)
        // With maxReceive=10 and 2 tokens available, we get both
        expect(receivedGeneral.length).to.equal(2);

        // Verify tokens are from the receivingFrom list
        const receivedTokenNumbers = receivedGeneral.map((t) =>
          t.tokenNumber.toNumber()
        );
        expect(receivedTokenNumbers).to.have.members([0, 1]);
        expect(receivedTo.length).to.equal(0); // No SendTo tokens in receivingFrom
      });

      it("receives from tokens in SendTo state when in ReceiveFrom list", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 0: SendTo token 1
        await updateImageAndSendState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          SEND_STATES.SEND_TO,
          [1],
          config.accounts.user
        );

        // Token 1: ReceiveFrom [0]
        await updateImageAndReceiveState(
          config.srHooksProxy,
          1,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          [0],
          config.accounts.user2
        );

        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(1, 0, 10);

        // Token 0 is SendTo token 1, so should appear in receivedTo
        expect(receivedGeneral.length).to.equal(0); // Token 0 is not SendGeneral
        // Token 0 is in the receivingFrom list and is SendTo token 1
        expect(receivedTo.length).to.equal(1);
        expect(receivedTo[0].tokenNumber).to.equal(0);
      });

      it("filters out self-referential tokens", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 0: SendGeneral AND ReceiveFrom itself
        await updateImageSoundAndStates(
          config.srHooksProxy,
          0,
          "test image",
          "",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          RECEIVE_STATES.RECEIVE_FROM,
          [0],
          config.accounts.user
        );

        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 10);

        // Should not receive from itself (filtered out)
        expect(receivedGeneral.length).to.equal(0);
        expect(receivedTo.length).to.equal(0);
      });

      it("handles duplicates in receivingFrom array", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 1: SendGeneral
        await updateImageAndSendState(
          config.srHooksProxy,
          1,
          "test image",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          config.accounts.user2
        );

        // Token 0: ReceiveFrom [1, 1, 1] (duplicates)
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          [1, 1, 1],
          config.accounts.user
        );

        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 10);

        // Contract processes receivingFrom array; duplicates don't cause issues
        // Token 1 is the only sender, so we should get it
        expect(receivedGeneral.length).to.equal(1);
        expect(receivedGeneral[0].tokenNumber).to.equal(1);
        expect(receivedTo.length).to.equal(0);
      });

      it("samples different results across blocks for ReceiveFrom", async function () {
        const config = await loadFixture(_beforeEach);

        // Mint 11 tokens for deployer (10 senders + 1 receiver)
        const newTokens = await mintAdditionalTokens(
          config,
          config.accounts.deployer,
          11
        );

        // Create 10 SendGeneral tokens
        for (let i = 0; i < 10; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            newTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_GENERAL,
            [],
            config.accounts.deployer
          );
        }

        // Last token: ReceiveFrom the 10 senders
        const receiverToken = newTokens[10];
        await updateImageAndReceiveState(
          config.srHooksProxy,
          receiverToken,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          newTokens.slice(0, 10),
          config.accounts.deployer
        );

        // Query two different historical blocks to ensure different block hashes
        // Don't rely on mining - explicitly use different blocks
        const currentBlock = await ethers.provider.getBlockNumber();
        const blockNumber1 = currentBlock - 1; // Most recent completed block
        const blockNumber2 = currentBlock - 10; // Earlier block (10 blocks back)

        // Get live data at both blocks with maxReceive=10
        const [, , receivedGeneral1] = await config.srHooksProxy.getLiveData(
          receiverToken,
          blockNumber1,
          10
        );
        const [, , receivedGeneral2] = await config.srHooksProxy.getLiveData(
          receiverToken,
          blockNumber2,
          10
        );

        // Verify we used different blocks
        expect(blockNumber1).to.not.equal(blockNumber2);

        // With 10 senders and maxReceive=10, we get all 10 tokens
        expect(receivedGeneral1.length).to.equal(10);
        expect(receivedGeneral2.length).to.equal(10);

        // Extract token numbers
        const tokens1 = receivedGeneral1.map((t) => t.tokenNumber.toNumber());
        const tokens2 = receivedGeneral2.map((t) => t.tokenNumber.toNumber());

        // With different block hashes, we should get different Feistel walk results
        // This is deterministic - different seeds = different permutations
        const hasDifference = !tokens1.every((t, i) => t === tokens2[i]);
        expect(hasDifference).to.be.true;
      });

      it("filters out tokens in receivingFrom that are in Neutral state", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 1: SendGeneral
        await updateImageAndSendState(
          config.srHooksProxy,
          1,
          "test image",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          config.accounts.user2
        );

        // Token 2: Neutral (has image but not participating in send/receive)
        await updateImage(
          config.srHooksProxy,
          2,
          "test image",
          0,
          config.accounts.additional
        );

        // Token 0: ReceiveFrom [1, 2]
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          [1, 2],
          config.accounts.user
        );

        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 10);

        // Only token 1 should be included (SendGeneral), token 2 filtered (Neutral)
        expect(receivedGeneral.length).to.equal(1);
        expect(receivedGeneral[0].tokenNumber).to.equal(1);
        expect(receivedTo.length).to.equal(0);
      });

      it("filters out SendTo tokens that aren't sending to this token", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 1: SendTo token 3 (not sending to token 0)
        await updateImageAndSendState(
          config.srHooksProxy,
          1,
          "test image",
          0,
          SEND_STATES.SEND_TO,
          [3],
          config.accounts.user2
        );

        // Token 2: SendGeneral
        await updateImageAndSendState(
          config.srHooksProxy,
          2,
          "test image",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          config.accounts.additional
        );

        // Token 0: ReceiveFrom [1, 2]
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          [1, 2],
          config.accounts.user
        );

        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 10);

        // Only token 2 should be included (SendGeneral)
        // Token 1 is SendTo but not sending to token 0, so filtered
        expect(receivedGeneral.length).to.equal(1);
        expect(receivedGeneral[0].tokenNumber).to.equal(2);
        expect(receivedTo.length).to.equal(0);
      });

      it("returns both general and SendTo from receivingFrom list", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 1: SendGeneral
        await updateImageAndSendState(
          config.srHooksProxy,
          1,
          "test image",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          config.accounts.user2
        );

        // Token 2: SendTo token 0
        await updateImageAndSendState(
          config.srHooksProxy,
          2,
          "test image",
          0,
          SEND_STATES.SEND_TO,
          [0],
          config.accounts.additional
        );

        // Token 3: Neutral (should be filtered)
        await updateImage(
          config.srHooksProxy,
          3,
          "test image",
          0,
          config.accounts.additional2
        );

        // Token 0: ReceiveFrom [1, 2, 3]
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          [1, 2, 3],
          config.accounts.user
        );

        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 10);

        // Token 1 in receivedGeneral (SendGeneral), Token 2 in receivedTo (SendTo)
        expect(receivedGeneral.length).to.equal(1);
        expect(receivedGeneral[0].tokenNumber).to.equal(1);
        expect(receivedTo.length).to.equal(1);
        expect(receivedTo[0].tokenNumber).to.equal(2);
      });

      it("handles receivingFrom where all tokens are filtered out", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 1: SendTo token 3 (not sending to token 0)
        await updateImageAndSendState(
          config.srHooksProxy,
          1,
          "test image",
          0,
          SEND_STATES.SEND_TO,
          [3],
          config.accounts.user2
        );

        // Token 2: Neutral
        await updateImage(
          config.srHooksProxy,
          2,
          "test image",
          0,
          config.accounts.additional
        );

        // Token 0: ReceiveFrom [1, 2] (but both should be filtered)
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          [1, 2],
          config.accounts.user
        );

        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 10);

        // All tokens in receivingFrom are filtered out
        expect(receivedGeneral.length).to.equal(0);
        expect(receivedTo.length).to.equal(0);
      });

      it("respects maxReceive when many receivingFrom tokens are valid", async function () {
        const config = await loadFixture(_beforeEach);

        // Mint 10 tokens, all SendGeneral
        const newTokens = await mintAdditionalTokens(
          config,
          config.accounts.deployer,
          10
        );

        for (let i = 0; i < 10; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            newTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_GENERAL,
            [],
            config.accounts.deployer
          );
        }

        // Token 0: ReceiveFrom all 10 tokens
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          newTokens,
          config.accounts.user
        );

        // With maxReceive=3, should only get 3 tokens despite 10 being valid
        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 3);

        expect(receivedGeneral.length).to.equal(3);
        expect(receivedTo.length).to.equal(0);

        // Verify all returned tokens are from the newTokens list
        const receivedTokenNums = receivedGeneral.map((t) =>
          t.tokenNumber.toNumber()
        );
        receivedTokenNums.forEach((tokenNum) => {
          expect(newTokens).to.include(tokenNum);
        });
      });

      it("correctly handles duplicates in receivingFrom array for SendTo tokens", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 1: SendTo token 0
        await updateImageAndSendState(
          config.srHooksProxy,
          1,
          "test image",
          0,
          SEND_STATES.SEND_TO,
          [0],
          config.accounts.user2
        );

        // Token 2: SendTo token 0
        await updateImageAndSendState(
          config.srHooksProxy,
          2,
          "test image",
          0,
          SEND_STATES.SEND_TO,
          [0],
          config.accounts.additional
        );

        // Token 0: ReceiveFrom [1, 2, 1, 2] (duplicates!)
        // This tests the deduplication logic in _sampleTokensReceivedFromSendToPool
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          [1, 2, 1, 2],
          config.accounts.user
        );

        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 10);

        // Should only include tokens 1 and 2 once each (deduplicated)
        expect(receivedGeneral.length).to.equal(0);
        expect(receivedTo.length).to.equal(2);

        const receivedTokenNumbers = receivedTo
          .map((t) => t.tokenNumber.toNumber())
          .sort((a, b) => a - b);
        expect(receivedTokenNumbers).to.deep.equal([1, 2]);
      });

      it("breaks early when maxReceive is reached in ReceiveFrom with SendTo tokens", async function () {
        const config = await loadFixture(_beforeEach);

        // Mint 10 tokens, all SendTo token 0
        const newTokens = await mintAdditionalTokens(
          config,
          config.accounts.deployer,
          10
        );

        for (let i = 0; i < 10; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            newTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_TO,
            [0],
            config.accounts.deployer
          );
        }

        // Token 0: ReceiveFrom all 10 tokens
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_FROM,
          newTokens,
          config.accounts.user
        );

        // With maxReceive=3, should break early after collecting 3 SendTo tokens
        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 3);

        expect(receivedGeneral.length).to.equal(0);
        expect(receivedTo.length).to.equal(3); // Break triggered at maxReceive

        // Verify all returned tokens are from the newTokens list
        const receivedTokenNums = receivedTo.map((t) =>
          t.tokenNumber.toNumber()
        );
        receivedTokenNums.forEach((tokenNum) => {
          expect(newTokens).to.include(tokenNum);
        });
      });
    });

    describe("TokenLiveData structure", function () {
      it("returns correct token metadata in live data", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 0: SendGeneral with image and sound
        await updateImageSoundAndStates(
          config.srHooksProxy,
          0,
          "token 0 image",
          "token 0 sound",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          RECEIVE_STATES.NEUTRAL,
          [],
          config.accounts.user
        );

        // Token 1: ReceiveGeneral with image only
        await updateImageAndReceiveState(
          config.srHooksProxy,
          1,
          "token 1 image",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user2
        );

        const [, , receivedGeneral] = await config.srHooksProxy.getLiveData(
          1,
          0,
          10
        );

        // With maxReceive=10 and 1 sender available, we should get 1 token
        expect(receivedGeneral.length).to.equal(1);

        // Verify structure of TokenLiveData
        const token = receivedGeneral[0];
        expect(token.tokenNumber).to.equal(0);
        expect(token.ownerAddress).to.equal(config.accounts.user.address);
        expect(token.imageDataCompressed).to.not.be.empty;
        expect(token.soundDataCompressed).to.not.be.empty;
        expect(token.ownerEnsName).to.equal(""); // No ENS in non-fork tests
      });

      it("includes correct activeSlot in live data", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 0: SendGeneral, create image at slot 1 (not 0)
        await updateImageAndSendState(
          config.srHooksProxy,
          0,
          "test image",
          1,
          SEND_STATES.SEND_GENERAL,
          [],
          config.accounts.user
        );

        // Token 1: ReceiveGeneral
        await updateImageAndReceiveState(
          config.srHooksProxy,
          1,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user2
        );

        const [, , receivedGeneral] = await config.srHooksProxy.getLiveData(
          1,
          0,
          10
        );

        // With maxReceive=10 and 1 sender available, we should get 1 token
        expect(receivedGeneral.length).to.equal(1);

        // Verify activeSlot is included in the returned data
        // Note: activeSlot is part of the TokenState, not TokenLiveData
        // This test just verifies we can successfully call getLiveData
        // and get properly structured TokenLiveData
        expect(receivedGeneral[0].tokenNumber).to.equal(0);
      });
    });

    describe("ReceiveTo state", function () {
      it("returns only SendTo tokens for ReceiveTo state", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 0: SendTo token 1
        await updateImageAndSendState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          SEND_STATES.SEND_TO,
          [1],
          config.accounts.user
        );

        // Token 2: SendGeneral (should not be included)
        await updateImageAndSendState(
          config.srHooksProxy,
          2,
          "test image",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          config.accounts.additional
        );

        // Token 1: ReceiveTo
        await updateImageAndReceiveState(
          config.srHooksProxy,
          1,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_TO,
          [],
          config.accounts.user2
        );

        const [sendState, receiveState, receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(1, 0, 10);

        expect(receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);
        expect(receivedGeneral.length).to.equal(0); // No general pool in ReceiveTo
        expect(receivedTo.length).to.equal(1); // Only token 0 (SendTo token 1)
        expect(receivedTo[0].tokenNumber).to.equal(0);
      });

      it("handles multiple SendTo tokens in ReceiveTo state", async function () {
        const config = await loadFixture(_beforeEach);

        // Mint 5 tokens for deployer to act as senders
        const senderTokens = await mintAdditionalTokens(
          config,
          config.accounts.deployer,
          5
        );

        // Set all 5 tokens to SendTo token 0
        for (let i = 0; i < 5; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            senderTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_TO,
            [0],
            config.accounts.deployer
          );
        }

        // Token 0: ReceiveTo
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_TO,
          [],
          config.accounts.user
        );

        const [, receiveState, receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 10);

        expect(receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);
        expect(receivedGeneral.length).to.equal(0); // No general pool
        expect(receivedTo.length).to.equal(5); // All 5 senders

        // Verify all senders are present
        const receivedTokenNumbers = receivedTo.map((t) =>
          t.tokenNumber.toNumber()
        );
        senderTokens.forEach((tokenNum) => {
          expect(receivedTokenNumbers).to.include(tokenNum);
        });
      });

      it("respects maxReceive cap in ReceiveTo state", async function () {
        const config = await loadFixture(_beforeEach);

        // Mint 10 tokens for deployer to act as senders
        const senderTokens = await mintAdditionalTokens(
          config,
          config.accounts.deployer,
          10
        );

        // Set all 10 tokens to SendTo token 0
        for (let i = 0; i < 10; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            senderTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_TO,
            [0],
            config.accounts.deployer
          );
        }

        // Token 0: ReceiveTo
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_TO,
          [],
          config.accounts.user
        );

        // Request only 5 samples despite 10 available
        const [, receiveState, receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 5);

        expect(receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);
        expect(receivedGeneral.length).to.equal(0); // No general pool
        expect(receivedTo.length).to.equal(5); // Capped at maxReceive

        // Verify all returned tokens are from the sender pool
        const receivedTokenNumbers = receivedTo.map((t) =>
          t.tokenNumber.toNumber()
        );
        receivedTokenNumbers.forEach((tokenNum) => {
          expect(senderTokens).to.include(tokenNum);
        });
      });

      it("returns only SendTo tokens even when general pool has senders", async function () {
        const config = await loadFixture(_beforeEach);

        // Mint 8 tokens (5 SendGeneral, 3 SendTo token 0)
        const newTokens = await mintAdditionalTokens(
          config,
          config.accounts.deployer,
          8
        );

        // Tokens 0-4: SendGeneral
        for (let i = 0; i < 5; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            newTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_GENERAL,
            [],
            config.accounts.deployer
          );
        }

        // Tokens 5-7: SendTo token 0
        for (let i = 5; i < 8; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            newTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_TO,
            [0],
            config.accounts.deployer
          );
        }

        // Token 0: ReceiveTo
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_TO,
          [],
          config.accounts.user
        );

        const [, receiveState, receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 10);

        expect(receiveState).to.equal(RECEIVE_STATES.RECEIVE_TO);
        // ReceiveTo IGNORES general pool entirely
        expect(receivedGeneral.length).to.equal(0);
        // Only the 3 SendTo tokens are included
        expect(receivedTo.length).to.equal(3);

        // Verify only SendTo tokens (5-7) are present
        const receivedTokenNumbers = receivedTo
          .map((t) => t.tokenNumber.toNumber())
          .sort((a, b) => a - b);
        expect(receivedTokenNumbers).to.deep.equal([
          newTokens[5],
          newTokens[6],
          newTokens[7],
        ]);
      });
    });

    describe("Send state combinations", function () {
      it("returns SendGeneral state for token in SendGeneral", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 0: SendGeneral
        await updateImageAndSendState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          config.accounts.user
        );

        const [sendState] = await config.srHooksProxy.getLiveData(0, 0, 10);

        expect(sendState).to.equal(SEND_STATES.SEND_GENERAL);
      });

      it("returns SendTo state for token in SendTo", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 0: SendTo token 1
        await updateImageAndSendState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          SEND_STATES.SEND_TO,
          [1],
          config.accounts.user
        );

        const [sendState] = await config.srHooksProxy.getLiveData(0, 0, 10);

        expect(sendState).to.equal(SEND_STATES.SEND_TO);
      });

      it("returns Neutral send state for token not sending", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 0: Has image but not participating in send
        await updateImage(
          config.srHooksProxy,
          0,
          "test image",
          0,
          config.accounts.user
        );

        const [sendState] = await config.srHooksProxy.getLiveData(0, 0, 10);

        expect(sendState).to.equal(SEND_STATES.NEUTRAL);
      });
    });

    describe("Edge cases and quirks", function () {
      it("allows token to send generally and appear in its own getLiveData", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 0: Both SendGeneral AND ReceiveGeneral (self-referential quirk)
        await updateImageSoundAndStates(
          config.srHooksProxy,
          0,
          "test image",
          "",
          0,
          SEND_STATES.SEND_GENERAL,
          [],
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user
        );

        const [sendState, receiveState, receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 10);

        expect(sendState).to.equal(SEND_STATES.SEND_GENERAL);
        expect(receiveState).to.equal(RECEIVE_STATES.RECEIVE_GENERAL);
        // Token 0 should appear in its own receivedGeneral array (quirk - not filtered)
        expect(receivedGeneral.length).to.equal(1);
        expect(receivedGeneral[0].tokenNumber).to.equal(0);
      });

      it("allows token to SendTo itself", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 0: SendTo itself
        await updateImageAndSendState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          SEND_STATES.SEND_TO,
          [0],
          config.accounts.user
        );

        // Token 0: ReceiveGeneral (to check if it receives from itself)
        await updateReceiveState(
          config.srHooksProxy,
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user
        );

        const [sendState, receiveState, receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(0, 0, 10);

        expect(sendState).to.equal(SEND_STATES.SEND_TO);
        expect(receiveState).to.equal(RECEIVE_STATES.RECEIVE_GENERAL);
        // Token 0 sends to itself, so it should appear in receivedTo
        expect(receivedGeneral.length).to.equal(0);
        expect(receivedTo.length).to.equal(1);
        expect(receivedTo[0].tokenNumber).to.equal(0);
      });

      it("deduplicates SendTo array when token has duplicate targets", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 0: SendTo token 1 with duplicates [1, 1, 1]
        await updateImageAndSendState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          SEND_STATES.SEND_TO,
          [1, 1, 1],
          config.accounts.user
        );

        // Token 1: ReceiveGeneral
        await updateImageAndReceiveState(
          config.srHooksProxy,
          1,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user2
        );

        const [, , receivedGeneral, receivedTo] =
          await config.srHooksProxy.getLiveData(1, 0, 10);

        // Despite duplicates in SendTo array, token 0 should only appear once
        expect(receivedGeneral.length).to.equal(0);
        expect(receivedTo.length).to.equal(1);
        expect(receivedTo[0].tokenNumber).to.equal(0);

        // Also verify getTokensSendingToToken only returns it once
        const sendingTokens =
          await config.srHooksProxy.getTokensSendingToToken(1);
        expect(sendingTokens.length).to.equal(1);
        expect(sendingTokens[0].toNumber()).to.equal(0);
      });
    });

    describe("Pool state values", function () {
      it("returns accurate numSendGeneral, numReceiveGeneral, numSendingToMe", async function () {
        const config = await loadFixture(_beforeEach);

        // Mint 10 tokens (5 SendGeneral, 3 ReceiveGeneral, 2 SendTo token 0)
        const newTokens = await mintAdditionalTokens(
          config,
          config.accounts.deployer,
          10
        );

        // Tokens 0-4: SendGeneral
        for (let i = 0; i < 5; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            newTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_GENERAL,
            [],
            config.accounts.deployer
          );
        }

        // Tokens 5-7: ReceiveGeneral
        for (let i = 5; i < 8; i++) {
          await updateImageAndReceiveState(
            config.srHooksProxy,
            newTokens[i],
            "test image",
            0,
            RECEIVE_STATES.RECEIVE_GENERAL,
            [],
            config.accounts.deployer
          );
        }

        // Tokens 8-9: SendTo token 0
        for (let i = 8; i < 10; i++) {
          await updateImageAndSendState(
            config.srHooksProxy,
            newTokens[i],
            "test image",
            0,
            SEND_STATES.SEND_TO,
            [0],
            config.accounts.deployer
          );
        }

        // Token 0: ReceiveGeneral (to query pool states)
        await updateImageAndReceiveState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          RECEIVE_STATES.RECEIVE_GENERAL,
          [],
          config.accounts.user
        );

        const [, , , , numSendGeneral, numReceiveGeneral, numSendingToMe] =
          await config.srHooksProxy.getLiveData(0, 0, 10);

        expect(numSendGeneral).to.equal(5); // 5 tokens in SendGeneral
        expect(numReceiveGeneral).to.equal(4); // 3 + token 0 in ReceiveGeneral
        expect(numSendingToMe).to.equal(2); // 2 tokens SendTo token 0
      });

      it("updates numSendingToMe when tokens change SendTo targets", async function () {
        const config = await loadFixture(_beforeEach);

        // Token 0: SendTo token 1
        await updateImageAndSendState(
          config.srHooksProxy,
          0,
          "test image",
          0,
          SEND_STATES.SEND_TO,
          [1],
          config.accounts.user
        );

        // Token 1: Set up to query numSendingToMe
        await updateImage(
          config.srHooksProxy,
          1,
          "test image",
          0,
          config.accounts.user2
        );

        // First query: token 0 is SendTo token 1
        const [, , , , , , numSendingToMe1] =
          await config.srHooksProxy.getLiveData(1, 0, 10);
        expect(numSendingToMe1).to.equal(1);

        // Token 0 changes to SendTo token 2 instead
        await updateSendState(
          config.srHooksProxy,
          0,
          SEND_STATES.SEND_TO,
          [2],
          config.accounts.user
        );

        // Second query: token 0 no longer SendTo token 1
        const [, , , , , , numSendingToMe2] =
          await config.srHooksProxy.getLiveData(1, 0, 10);
        expect(numSendingToMe2).to.equal(0);
      });
    });
  });
});
