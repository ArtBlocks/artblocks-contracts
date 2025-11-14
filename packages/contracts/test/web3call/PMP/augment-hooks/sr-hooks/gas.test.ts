import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import { setupSRHooksFixture, SRHooksFixtureConfig } from "./srHooksFixtures";
import { SEND_STATES, RECEIVE_STATES } from "./constants";
import {
  updateImage,
  updateSendState,
  updateReceiveState,
  updateBothStates,
} from "./testHelpers";

/**
 * Gas usage tests for SRHooks contract
 * These tests measure and log gas consumption for various operations
 * No assertions - purely for performance comprehension and optimization
 */
describe("SRHooks Gas Usage Tests", function () {
  async function _beforeEach(): Promise<SRHooksFixtureConfig> {
    return await setupSRHooksFixture();
  }

  describe("Image Metadata Gas Costs", function () {
    it("logs gas used to set image metadata with 300-byte data chunk [@skip-on-coverage]", async function () {
      const config = await loadFixture(_beforeEach);

      // Create 300-byte data chunk
      const imageData = ethers.utils.randomBytes(300);

      const tx = await updateImage(
        config.srHooksProxy,
        0,
        imageData,
        0,
        config.accounts.user
      );

      const receipt = await tx.wait();
      console.log(
        `\n📊 Gas used to set 300-byte image metadata: ${receipt.gasUsed.toString()} gas`
      );
    });

    it("logs gas used to set image metadata with 4KB data chunk [@skip-on-coverage]", async function () {
      const config = await loadFixture(_beforeEach);

      // Create 4KB (4096 bytes) data chunk
      const imageData = ethers.utils.randomBytes(4096);

      const tx = await updateImage(
        config.srHooksProxy,
        0,
        imageData,
        0,
        config.accounts.user
      );

      const receipt = await tx.wait();
      console.log(
        `\n📊 Gas used to set 4KB image metadata: ${receipt.gasUsed.toString()} gas`
      );
    });
  });

  describe("SendGeneral + ReceiveGeneral State Transition Gas Costs", function () {
    it("logs gas used to change from neutral/neutral to sendGeneral + receiveGeneral [@skip-on-coverage]", async function () {
      const config = await loadFixture(_beforeEach);

      // First set image metadata (required for participation)
      await updateImage(
        config.srHooksProxy,
        0,
        "test image",
        0,
        config.accounts.user
      );

      // Transition to SendGeneral + ReceiveGeneral
      const tx = await updateBothStates(
        config.srHooksProxy,
        0,
        SEND_STATES.SEND_GENERAL,
        [],
        RECEIVE_STATES.RECEIVE_GENERAL,
        [],
        config.accounts.user
      );

      const receipt = await tx.wait();
      console.log(
        `\n📊 Gas used to change neutral/neutral → sendGeneral/receiveGeneral: ${receipt.gasUsed.toString()} gas`
      );
    });

    it("logs gas used to change from sendGeneral + receiveGeneral to neutral/neutral [@skip-on-coverage]", async function () {
      const config = await loadFixture(_beforeEach);

      // Setup: Set image and transition to SendGeneral + ReceiveGeneral
      await updateImage(
        config.srHooksProxy,
        0,
        "test image",
        0,
        config.accounts.user
      );
      await updateBothStates(
        config.srHooksProxy,
        0,
        SEND_STATES.SEND_GENERAL,
        [],
        RECEIVE_STATES.RECEIVE_GENERAL,
        [],
        config.accounts.user
      );

      // Transition back to Neutral/Neutral
      const tx = await updateBothStates(
        config.srHooksProxy,
        0,
        SEND_STATES.NEUTRAL,
        [],
        RECEIVE_STATES.NEUTRAL,
        [],
        config.accounts.user
      );

      const receipt = await tx.wait();
      console.log(
        `\n📊 Gas used to change sendGeneral/receiveGeneral → neutral/neutral: ${receipt.gasUsed.toString()} gas`
      );
    });
  });

  describe("SendTo State Transition Gas Costs", function () {
    it("logs gas used to change to sendTo with 5 distinct tokens [@skip-on-coverage]", async function () {
      const config = await loadFixture(_beforeEach);

      // Setup: Set image metadata
      await updateImage(
        config.srHooksProxy,
        0,
        "test image",
        0,
        config.accounts.user
      );

      // Create array of 5 distinct token targets
      const tokenTargets = [1, 2, 3, 4, 5];

      // Transition to SendTo with 5 tokens
      const tx = await updateSendState(
        config.srHooksProxy,
        0,
        SEND_STATES.SEND_TO,
        tokenTargets,
        config.accounts.user
      );

      const receipt = await tx.wait();
      console.log(
        `\n📊 Gas used to change neutral → sendTo [5 tokens]: ${receipt.gasUsed.toString()} gas`
      );
    });

    it("logs gas used to clear sendTo with 5 distinct tokens back to neutral [@skip-on-coverage]", async function () {
      const config = await loadFixture(_beforeEach);

      // Setup: Set image and transition to SendTo with 5 tokens
      await updateImage(
        config.srHooksProxy,
        0,
        "test image",
        0,
        config.accounts.user
      );
      const tokenTargets = [1, 2, 3, 4, 5];
      await updateSendState(
        config.srHooksProxy,
        0,
        SEND_STATES.SEND_TO,
        tokenTargets,
        config.accounts.user
      );

      // Clear back to Neutral
      const tx = await updateSendState(
        config.srHooksProxy,
        0,
        SEND_STATES.NEUTRAL,
        [],
        config.accounts.user
      );

      const receipt = await tx.wait();
      console.log(
        `\n📊 Gas used to clear sendTo [5 tokens] → neutral: ${receipt.gasUsed.toString()} gas`
      );
    });

    it("logs gas used to change to sendTo with 20 distinct tokens [@skip-on-coverage]", async function () {
      const config = await loadFixture(_beforeEach);

      // Setup: Set image metadata
      await updateImage(
        config.srHooksProxy,
        0,
        "test image",
        0,
        config.accounts.user
      );

      // Create array of 20 distinct token targets
      const tokenTargets = Array.from({ length: 20 }, (_, i) => i + 1);

      // Transition to SendTo with 20 tokens
      const tx = await updateSendState(
        config.srHooksProxy,
        0,
        SEND_STATES.SEND_TO,
        tokenTargets,
        config.accounts.user
      );

      const receipt = await tx.wait();
      console.log(
        `\n📊 Gas used to change neutral → sendTo [20 tokens]: ${receipt.gasUsed.toString()} gas`
      );
    });

    it("logs gas used to clear sendTo with 20 distinct tokens back to neutral [@skip-on-coverage]", async function () {
      const config = await loadFixture(_beforeEach);

      // Setup: Set image and transition to SendTo with 20 tokens
      await updateImage(
        config.srHooksProxy,
        0,
        "test image",
        0,
        config.accounts.user
      );
      const tokenTargets = Array.from({ length: 20 }, (_, i) => i + 1);
      await updateSendState(
        config.srHooksProxy,
        0,
        SEND_STATES.SEND_TO,
        tokenTargets,
        config.accounts.user
      );

      // Clear back to Neutral
      const tx = await updateSendState(
        config.srHooksProxy,
        0,
        SEND_STATES.NEUTRAL,
        [],
        config.accounts.user
      );

      const receipt = await tx.wait();
      console.log(
        `\n📊 Gas used to clear sendTo [20 tokens] → neutral: ${receipt.gasUsed.toString()} gas`
      );
    });
  });

  describe("Packing Efficiency - Multiple Senders to Same Target", function () {
    it("logs gas used when token 2 and token 3 both send to token 1 (demonstrates packing) [@skip-on-coverage]", async function () {
      const config = await loadFixture(_beforeEach);

      // Setup: Set image metadata for tokens 1, 2, and 3
      // Token 1 owned by user2, Token 2 owned by additional, Token 3 owned by additional2
      await updateImage(
        config.srHooksProxy,
        1,
        "test image",
        0,
        config.accounts.user2
      );
      await updateImage(
        config.srHooksProxy,
        2,
        "test image",
        0,
        config.accounts.additional
      );
      await updateImage(
        config.srHooksProxy,
        3,
        "test image",
        0,
        config.accounts.additional2
      );

      // Token 2 sends to token 1 - first write to the set
      const tx1 = await updateSendState(
        config.srHooksProxy,
        2,
        SEND_STATES.SEND_TO,
        [1],
        config.accounts.additional
      );
      const receipt1 = await tx1.wait();
      const gasUsed1 = receipt1.gasUsed.toNumber();

      // Token 3 sends to token 1 - should pack into same slot
      const tx2 = await updateSendState(
        config.srHooksProxy,
        3,
        SEND_STATES.SEND_TO,
        [1],
        config.accounts.additional2
      );
      const receipt2 = await tx2.wait();
      const gasUsed2 = receipt2.gasUsed.toNumber();

      console.log(
        `\n📊 Token 2 sends to token 1 (first sender): ${gasUsed1} gas`
      );
      console.log(
        `📊 Token 3 sends to token 1 (second sender, packs into same slot): ${gasUsed2} gas`
      );
      console.log(
        `💰 Gas savings from packing: ${gasUsed1 - gasUsed2} gas (${(((gasUsed1 - gasUsed2) / gasUsed1) * 100).toFixed(1)}%)`
      );
    });

    it("logs gas used when token 0 and token 1 join general pool (demonstrates index packing) [@skip-on-coverage]", async function () {
      const config = await loadFixture(_beforeEach);

      // Setup: Set image metadata for tokens 0 and 1
      // Token 0 owned by user, Token 1 owned by user2
      await updateImage(
        config.srHooksProxy,
        0,
        "test image",
        0,
        config.accounts.user
      );
      await updateImage(
        config.srHooksProxy,
        1,
        "test image",
        0,
        config.accounts.user2
      );

      // Token 0 joins general pool - first write to index bucket 0
      const tx1 = await updateBothStates(
        config.srHooksProxy,
        0,
        SEND_STATES.SEND_GENERAL,
        [],
        RECEIVE_STATES.RECEIVE_GENERAL,
        [],
        config.accounts.user
      );
      const receipt1 = await tx1.wait();
      const gasUsed1 = receipt1.gasUsed.toNumber();

      // Token 1 joins general pool - should pack into same index bucket (bucket 0)
      const tx2 = await updateBothStates(
        config.srHooksProxy,
        1,
        SEND_STATES.SEND_GENERAL,
        [],
        RECEIVE_STATES.RECEIVE_GENERAL,
        [],
        config.accounts.user2
      );
      const receipt2 = await tx2.wait();
      const gasUsed2 = receipt2.gasUsed.toNumber();

      console.log(
        `\n📊 Token 0 joins general pool (first in index bucket 0): ${gasUsed1} gas`
      );
      console.log(
        `📊 Token 1 joins general pool (packs into index bucket 0): ${gasUsed2} gas`
      );
      console.log(
        `💰 Gas savings from index packing: ${gasUsed1 - gasUsed2} gas (${(((gasUsed1 - gasUsed2) / gasUsed1) * 100).toFixed(1)}%)`
      );
    });
  });

  describe("ReceiveFrom State Transition Gas Costs", function () {
    it("logs gas used to change to receiveFrom with 10 tokens [@skip-on-coverage]", async function () {
      const config = await loadFixture(_beforeEach);

      // Setup: Set image metadata
      await updateImage(
        config.srHooksProxy,
        0,
        "test image",
        0,
        config.accounts.user
      );

      // Create array of 10 distinct token sources
      const tokenSources = Array.from({ length: 10 }, (_, i) => i + 1);

      // Transition to ReceiveFrom with 10 tokens
      const tx = await updateReceiveState(
        config.srHooksProxy,
        0,
        RECEIVE_STATES.RECEIVE_FROM,
        tokenSources,
        config.accounts.user
      );

      const receipt = await tx.wait();
      console.log(
        `\n📊 Gas used to change neutral → receiveFrom [10 tokens]: ${receipt.gasUsed.toString()} gas`
      );
    });

    it("logs gas used to clear receiveFrom with 10 tokens back to neutral [@skip-on-coverage]", async function () {
      const config = await loadFixture(_beforeEach);

      // Setup: Set image and transition to ReceiveFrom with 10 tokens
      await updateImage(
        config.srHooksProxy,
        0,
        "test image",
        0,
        config.accounts.user
      );
      const tokenSources = Array.from({ length: 10 }, (_, i) => i + 1);
      await updateReceiveState(
        config.srHooksProxy,
        0,
        RECEIVE_STATES.RECEIVE_FROM,
        tokenSources,
        config.accounts.user
      );

      // Clear back to Neutral
      const tx = await updateReceiveState(
        config.srHooksProxy,
        0,
        RECEIVE_STATES.NEUTRAL,
        [],
        config.accounts.user
      );

      const receipt = await tx.wait();
      console.log(
        `\n📊 Gas used to clear receiveFrom [10 tokens] → neutral: ${receipt.gasUsed.toString()} gas`
      );
    });

    it("logs gas used to change to receiveFrom with 50 tokens [@skip-on-coverage]", async function () {
      const config = await loadFixture(_beforeEach);

      // Setup: Set image metadata
      await updateImage(
        config.srHooksProxy,
        0,
        "test image",
        0,
        config.accounts.user
      );

      // Create array of 50 distinct token sources
      const tokenSources = Array.from({ length: 50 }, (_, i) => i + 1);

      // Transition to ReceiveFrom with 50 tokens
      const tx = await updateReceiveState(
        config.srHooksProxy,
        0,
        RECEIVE_STATES.RECEIVE_FROM,
        tokenSources,
        config.accounts.user
      );

      const receipt = await tx.wait();
      console.log(
        `\n📊 Gas used to change neutral → receiveFrom [50 tokens]: ${receipt.gasUsed.toString()} gas`
      );
    });

    it("logs gas used to clear receiveFrom with 50 tokens back to neutral [@skip-on-coverage]", async function () {
      const config = await loadFixture(_beforeEach);

      // Setup: Set image and transition to ReceiveFrom with 50 tokens
      await updateImage(
        config.srHooksProxy,
        0,
        "test image",
        0,
        config.accounts.user
      );
      const tokenSources = Array.from({ length: 50 }, (_, i) => i + 1);
      await updateReceiveState(
        config.srHooksProxy,
        0,
        RECEIVE_STATES.RECEIVE_FROM,
        tokenSources,
        config.accounts.user
      );

      // Clear back to Neutral
      const tx = await updateReceiveState(
        config.srHooksProxy,
        0,
        RECEIVE_STATES.NEUTRAL,
        [],
        config.accounts.user
      );

      const receipt = await tx.wait();
      console.log(
        `\n📊 Gas used to clear receiveFrom [50 tokens] → neutral: ${receipt.gasUsed.toString()} gas`
      );
    });
  });

  describe("Gas Summary", function () {
    it("logs comprehensive gas usage summary [@skip-on-coverage]", async function () {
      const config = await loadFixture(_beforeEach);

      // Collect all gas measurements in one test for easy comparison
      const gasResults: { operation: string; gas: string }[] = [];

      // 1. Image metadata operations
      const imageData300 = ethers.utils.randomBytes(300);
      let tx = await updateImage(
        config.srHooksProxy,
        0,
        imageData300,
        0,
        config.accounts.user
      );
      let receipt = await tx.wait();
      gasResults.push({
        operation: "Set 300-byte image metadata",
        gas: receipt.gasUsed.toString(),
      });

      const imageData4KB = ethers.utils.randomBytes(4096);
      tx = await updateImage(
        config.srHooksProxy,
        1,
        imageData4KB,
        0,
        config.accounts.user2
      );
      receipt = await tx.wait();
      gasResults.push({
        operation: "Set 4KB image metadata",
        gas: receipt.gasUsed.toString(),
      });

      // 2. SendGeneral + ReceiveGeneral transitions
      await updateImage(
        config.srHooksProxy,
        2,
        "test image",
        0,
        config.accounts.additional
      );
      tx = await updateBothStates(
        config.srHooksProxy,
        2,
        SEND_STATES.SEND_GENERAL,
        [],
        RECEIVE_STATES.RECEIVE_GENERAL,
        [],
        config.accounts.additional
      );
      receipt = await tx.wait();
      gasResults.push({
        operation: "Neutral/Neutral → SendGeneral/ReceiveGeneral",
        gas: receipt.gasUsed.toString(),
      });

      tx = await updateBothStates(
        config.srHooksProxy,
        2,
        SEND_STATES.NEUTRAL,
        [],
        RECEIVE_STATES.NEUTRAL,
        [],
        config.accounts.additional
      );
      receipt = await tx.wait();
      gasResults.push({
        operation: "SendGeneral/ReceiveGeneral → Neutral/Neutral",
        gas: receipt.gasUsed.toString(),
      });

      // 3. SendTo with 5 tokens
      const targets5 = [1, 2, 3, 4, 5];
      tx = await updateSendState(
        config.srHooksProxy,
        2,
        SEND_STATES.SEND_TO,
        targets5,
        config.accounts.additional
      );
      receipt = await tx.wait();
      gasResults.push({
        operation: "Neutral → SendTo [5 tokens]",
        gas: receipt.gasUsed.toString(),
      });

      tx = await updateSendState(
        config.srHooksProxy,
        2,
        SEND_STATES.NEUTRAL,
        [],
        config.accounts.additional
      );
      receipt = await tx.wait();
      gasResults.push({
        operation: "SendTo [5 tokens] → Neutral",
        gas: receipt.gasUsed.toString(),
      });

      // 4. SendTo with 20 tokens
      const targets20 = Array.from({ length: 20 }, (_, i) => i + 1);
      tx = await updateSendState(
        config.srHooksProxy,
        2,
        SEND_STATES.SEND_TO,
        targets20,
        config.accounts.additional
      );
      receipt = await tx.wait();
      gasResults.push({
        operation: "Neutral → SendTo [20 tokens]",
        gas: receipt.gasUsed.toString(),
      });

      tx = await updateSendState(
        config.srHooksProxy,
        2,
        SEND_STATES.NEUTRAL,
        [],
        config.accounts.additional
      );
      receipt = await tx.wait();
      gasResults.push({
        operation: "SendTo [20 tokens] → Neutral",
        gas: receipt.gasUsed.toString(),
      });

      // 5. ReceiveFrom with 10 tokens
      const sources10 = Array.from({ length: 10 }, (_, i) => i + 1);
      tx = await updateReceiveState(
        config.srHooksProxy,
        2,
        RECEIVE_STATES.RECEIVE_FROM,
        sources10,
        config.accounts.additional
      );
      receipt = await tx.wait();
      gasResults.push({
        operation: "Neutral → ReceiveFrom [10 tokens]",
        gas: receipt.gasUsed.toString(),
      });

      tx = await updateReceiveState(
        config.srHooksProxy,
        2,
        RECEIVE_STATES.NEUTRAL,
        [],
        config.accounts.additional
      );
      receipt = await tx.wait();
      gasResults.push({
        operation: "ReceiveFrom [10 tokens] → Neutral",
        gas: receipt.gasUsed.toString(),
      });

      // 6. ReceiveFrom with 50 tokens
      const sources50 = Array.from({ length: 50 }, (_, i) => i + 1);
      tx = await updateReceiveState(
        config.srHooksProxy,
        2,
        RECEIVE_STATES.RECEIVE_FROM,
        sources50,
        config.accounts.additional
      );
      receipt = await tx.wait();
      gasResults.push({
        operation: "Neutral → ReceiveFrom [50 tokens]",
        gas: receipt.gasUsed.toString(),
      });

      tx = await updateReceiveState(
        config.srHooksProxy,
        2,
        RECEIVE_STATES.NEUTRAL,
        [],
        config.accounts.additional
      );
      receipt = await tx.wait();
      gasResults.push({
        operation: "ReceiveFrom [50 tokens] → Neutral",
        gas: receipt.gasUsed.toString(),
      });

      // 7. Packing Efficiency - Sequential tokens to general pool (using tokens 0 and 1)
      // Reset token 2 first to avoid conflicts
      await updateBothStates(
        config.srHooksProxy,
        2,
        SEND_STATES.NEUTRAL,
        [],
        RECEIVE_STATES.NEUTRAL,
        [],
        config.accounts.additional
      );

      tx = await updateBothStates(
        config.srHooksProxy,
        0,
        SEND_STATES.SEND_GENERAL,
        [],
        RECEIVE_STATES.RECEIVE_GENERAL,
        [],
        config.accounts.user
      );
      receipt = await tx.wait();
      const token0Gas = receipt.gasUsed.toNumber();
      gasResults.push({
        operation: "Token 0 → General Pool (first in bucket)",
        gas: receipt.gasUsed.toString(),
      });

      tx = await updateBothStates(
        config.srHooksProxy,
        1,
        SEND_STATES.SEND_GENERAL,
        [],
        RECEIVE_STATES.RECEIVE_GENERAL,
        [],
        config.accounts.user2
      );
      receipt = await tx.wait();
      const token1Gas = receipt.gasUsed.toNumber();
      gasResults.push({
        operation: "Token 1 → General Pool (packs in bucket)",
        gas: receipt.gasUsed.toString(),
      });

      // 8. Packing Efficiency - Multiple senders to same target (using tokens 2, 3 → 1)
      // Token 1 is already setup, need to set image metadata for tokens 2 and 3
      await updateImage(
        config.srHooksProxy,
        2,
        "test image",
        0,
        config.accounts.additional
      );
      await updateImage(
        config.srHooksProxy,
        3,
        "test image",
        0,
        config.accounts.additional2
      );

      tx = await updateSendState(
        config.srHooksProxy,
        2,
        SEND_STATES.SEND_TO,
        [1],
        config.accounts.additional
      );
      receipt = await tx.wait();
      const token2Gas = receipt.gasUsed.toNumber();
      gasResults.push({
        operation: "Token 2 → Token 1 (first sender)",
        gas: receipt.gasUsed.toString(),
      });

      tx = await updateSendState(
        config.srHooksProxy,
        3,
        SEND_STATES.SEND_TO,
        [1],
        config.accounts.additional2
      );
      receipt = await tx.wait();
      const token3Gas = receipt.gasUsed.toNumber();
      gasResults.push({
        operation: "Token 3 → Token 1 (second sender, packs)",
        gas: receipt.gasUsed.toString(),
      });

      // Log comprehensive summary
      console.log("\n");
      console.log(
        "═══════════════════════════════════════════════════════════"
      );
      console.log("              SRHOOKS GAS USAGE SUMMARY");
      console.log(
        "═══════════════════════════════════════════════════════════"
      );
      console.log("");

      let maxOperationLength = 0;
      gasResults.forEach((result) => {
        if (result.operation.length > maxOperationLength) {
          maxOperationLength = result.operation.length;
        }
      });

      gasResults.forEach((result) => {
        const padding = " ".repeat(
          maxOperationLength - result.operation.length
        );
        console.log(`  ${result.operation}${padding}  │  ${result.gas} gas`);
      });

      console.log("");
      console.log(
        "═══════════════════════════════════════════════════════════"
      );
      console.log("");

      // Log packing efficiency gains
      console.log("PACKING EFFICIENCY GAINS:");
      console.log("");
      console.log(
        `  General Pool Index Packing: ${token0Gas - token1Gas} gas saved (${(((token0Gas - token1Gas) / token0Gas) * 100).toFixed(1)}%)`
      );
      console.log(
        `  SendTo Target Packing: ${token2Gas - token3Gas} gas saved (${(((token2Gas - token3Gas) / token2Gas) * 100).toFixed(1)}%)`
      );
      console.log("");
      console.log(
        "═══════════════════════════════════════════════════════════"
      );
      console.log("");

      // No assertions - just logging for performance comprehension
      expect(gasResults.length).to.equal(16);
    });
  });
});
