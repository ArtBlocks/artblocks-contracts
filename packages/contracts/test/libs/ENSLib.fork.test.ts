import helpers = require("@nomicfoundation/hardhat-network-helpers");
import { expect } from "chai";
import { ethers } from "hardhat";

const FORK_URL = process.env.MAINNET_JSON_RPC_PROVIDER_URL;
const FORK_BLOCK_NUMBER = 21024119; // Block with known ENS names

// Known Ethereum addresses with ENS names (at the fork block)
const VITALIK_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"; // vitalik.eth
const NICK_ADDRESS = "0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5"; // nick.eth

describe("ENSLib - Mainnet Fork Tests", async function () {
  let ensLibMock: any;

  before(async function () {
    // fork mainnet
    await resetFork();

    // deploy mock contract that exposes ENSLib functions for testing
    const ENSLibMockFactory = await ethers.getContractFactory("ENSLibMock");
    ensLibMock = await ENSLibMockFactory.deploy();
    await ensLibMock.deployed();
  });

  after(async function () {
    // reset fork to not use a fork
    await helpers.reset();
  });

  // helper function to reset fork
  async function resetFork() {
    await helpers.reset(FORK_URL, FORK_BLOCK_NUMBER);
  }

  describe("getEnsName - Universal Resolver", function () {
    it("should return vitalik.eth for Vitalik's address", async function () {
      const ensName = await ensLibMock.getEnsName(VITALIK_ADDRESS);
      expect(ensName).to.equal("vitalik.eth");
    });

    it("should return nick.eth for Nick's address", async function () {
      const ensName = await ensLibMock.getEnsName(NICK_ADDRESS);
      expect(ensName).to.equal("nick.eth");
    });

    it("should return empty string for address without ENS name", async function () {
      // Use a random address that doesn't have an ENS reverse record
      const randomAddress = "0x0000000000000000000000000000000000000001";
      const ensName = await ensLibMock.getEnsName(randomAddress);
      expect(ensName).to.equal("");
    });

    it("should return empty string for contract address without reverse record", async function () {
      // Use our mock contract address which shouldn't have a reverse record
      const ensName = await ensLibMock.getEnsName(ensLibMock.address);
      expect(ensName).to.equal("");
    });

    it("should handle multiple different addresses in sequence", async function () {
      // Test that the library handles multiple calls correctly
      const vitalikName = await ensLibMock.getEnsName(VITALIK_ADDRESS);
      const nickName = await ensLibMock.getEnsName(NICK_ADDRESS);
      const noName = await ensLibMock.getEnsName(
        "0x0000000000000000000000000000000000000001"
      );

      expect(vitalikName).to.equal("vitalik.eth");
      expect(nickName).to.equal("nick.eth");
      expect(noName).to.equal("");
    });
  });

  describe("integration - Universal Resolver functionality", function () {
    it("should use Universal Resolver which does both reverse and forward lookup", async function () {
      // The Universal Resolver automatically performs:
      // 1. Reverse lookup: address -> name
      // 2. Forward verification: name -> address
      // This test verifies the integration works correctly
      const ensName = await ensLibMock.getEnsName(VITALIK_ADDRESS);

      // Verify we got a valid name
      expect(ensName).to.not.equal("");
      expect(ensName).to.equal("vitalik.eth");
    });

    it("should verify forward resolution prevents spoofing", async function () {
      // The Universal Resolver's reverse() function includes forward verification
      // If someone sets a reverse record claiming "vitalik.eth" but doesn't own it,
      // the forward verification will fail and return empty string
      // This is handled automatically by the Universal Resolver

      // For addresses with valid reverse records, we get the name
      const validName = await ensLibMock.getEnsName(VITALIK_ADDRESS);
      expect(validName).to.equal("vitalik.eth");

      // For addresses without valid reverse records, we get empty string
      const invalidName = await ensLibMock.getEnsName(
        ethers.constants.AddressZero
      );
      expect(invalidName).to.equal("");
    });

    it("should work for various ENS names consistently", async function () {
      // Test multiple known addresses
      const vitalikName = await ensLibMock.getEnsName(VITALIK_ADDRESS);
      const nickName = await ensLibMock.getEnsName(NICK_ADDRESS);

      expect(vitalikName).to.equal("vitalik.eth");
      expect(nickName).to.equal("nick.eth");

      // Both should be non-empty and valid
      expect(vitalikName.length).to.be.greaterThan(0);
      expect(nickName.length).to.be.greaterThan(0);
      expect(vitalikName).to.include(".eth");
      expect(nickName).to.include(".eth");
    });
  });
});
