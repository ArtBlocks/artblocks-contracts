import helpers = require("@nomicfoundation/hardhat-network-helpers");
import { expect } from "chai";
import { ethers } from "hardhat";

const FORK_URL = process.env.MAINNET_JSON_RPC_PROVIDER_URL;
const FORK_BLOCK_NUMBER = 21024119;

describe("test forking mainnet", async function () {
  async function _beforeEach() {
    // fork mainnet
    await helpers.reset(FORK_URL, FORK_BLOCK_NUMBER);
  }

  async function _afterEach() {
    // reset fork to not use a fork
    await helpers.reset();
  }

  // public variable Views
  describe("coreType", async function () {
    it("should return expected core type during fork", async function () {
      await _beforeEach();

      // call core contract to verify fork is working
      const coreAddress = "0xAB0000000000aa06f89B268D604a9c1C41524Ac6";
      const core = await ethers.getContractAt(
        "GenArt721CoreV3_Engine",
        coreAddress
      );
      const coreType = await core.coreType();
      expect(coreType).to.equal("GenArt721CoreV3_Engine");

      await _afterEach();
    });
  });
});
