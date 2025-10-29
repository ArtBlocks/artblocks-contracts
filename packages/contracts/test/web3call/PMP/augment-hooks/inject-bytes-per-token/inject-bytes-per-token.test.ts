import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { constants } from "ethers";
import { PMPFixtureConfig, setupPMPFixture } from "../../pmpFixtures";
import { InjectBytesPerToken__factory } from "../../../../../scripts/contracts/factories/contracts/web3call/augment-hooks/InjectBytesPerToken.sol/InjectBytesPerToken__factory";
import { InjectBytesPerToken } from "../../../../../scripts/contracts/contracts/web3call/augment-hooks/InjectBytesPerToken.sol/InjectBytesPerToken";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

interface T_ConfigWithHook extends PMPFixtureConfig {
  hook: InjectBytesPerToken;
}

/**
 * Test suite for InjectBytesPerToken
 */
describe("InjectBytesPerToken", function () {
  // Test fixture with projects, tokens, and PMP contract setup
  async function _beforeEach() {
    const config = await loadFixture(setupPMPFixture);
    // deploy the hook with deployer as owner
    const hookFactory = new InjectBytesPerToken__factory(
      config.accounts.deployer
    );
    const hook = await hookFactory.deploy(config.accounts.deployer.address);
    // configure the hook
    await config.pmp.connect(config.accounts.artist).configureProjectHooks(
      config.genArt721Core.address,
      config.projectZero,
      constants.AddressZero, // tokenPMPPostConfigHook
      hook.address // tokenPMPReadAugmentationHook
    );
    // return the config with the typed hook
    return {
      ...config,
      hook: hook,
    } as T_ConfigWithHook;
  }

  describe("constructor", function () {
    it("sets the owner correctly", async function () {
      const config = await loadFixture(_beforeEach);
      const owner = await config.hook.owner();
      expect(owner).to.equal(config.accounts.deployer.address);
    });
  });

  describe("uploadTokenDataAtIndex", function () {
    it("reverts when non-owner calls", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const chunkIndex = 0;
      const data = ethers.utils.toUtf8Bytes("test data");

      // OpenZeppelin 5.0 uses custom errors, so we expect the transaction to be reverted
      await expect(
        config.hook
          .connect(config.accounts.artist)
          .uploadTokenDataAtIndex(tokenNumber, chunkIndex, data)
      ).to.be.revertedWithCustomError(
        config.hook,
        "OwnableUnauthorizedAccount"
      );
    });

    it("allows owner to upload chunk at index 0", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const chunkIndex = 0;
      const data = ethers.utils.toUtf8Bytes("test data");

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, chunkIndex, data);

      const numChunks = await config.hook.numChunksOfToken(tokenNumber);
      expect(numChunks).to.equal(1);
    });

    it("allows owner to upload multiple chunks sequentially", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data1 = ethers.utils.toUtf8Bytes("chunk 1");
      const data2 = ethers.utils.toUtf8Bytes("chunk 2");
      const data3 = ethers.utils.toUtf8Bytes("chunk 3");

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data1);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 1, data2);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 2, data3);

      const numChunks = await config.hook.numChunksOfToken(tokenNumber);
      expect(numChunks).to.equal(3);
    });

    it("allows owner to overwrite existing chunk", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data1 = ethers.utils.toUtf8Bytes("original");
      const data2 = ethers.utils.toUtf8Bytes("updated");

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data1);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data2);

      const numChunks = await config.hook.numChunksOfToken(tokenNumber);
      expect(numChunks).to.equal(1);

      const retrievedData = await config.hook.getTokenDataAtIndex(
        tokenNumber,
        0
      );
      expect(ethers.utils.toUtf8String(retrievedData)).to.equal("updated");
    });

    it("reverts when trying to upload non-sequential chunk", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data = ethers.utils.toUtf8Bytes("test data");

      await expectRevert(
        config.hook
          .connect(config.accounts.deployer)
          .uploadTokenDataAtIndex(tokenNumber, 1, data),
        "Must append to end of current array of chunks"
      );
    });

    it("emits TokenDataUploadedAtIndex event", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const chunkIndex = 0;
      const data = ethers.utils.toUtf8Bytes("test data");

      const tx = await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, chunkIndex, data);

      const receipt = await tx.wait();
      const event = receipt.events?.find(
        (e) => e.event === "TokenDataUploadedAtIndex"
      );
      expect(event).to.not.be.undefined;
      expect(event?.args?.tokenNumber).to.equal(tokenNumber);
      expect(event?.args?.chunkIndex).to.equal(chunkIndex);
    });
  });

  describe("clearTokenDataAtIndex", function () {
    it("reverts when non-owner calls", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data = ethers.utils.toUtf8Bytes("test data");

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data);

      // OpenZeppelin 5.0 uses custom errors, so we expect the transaction to be reverted
      await expect(
        config.hook
          .connect(config.accounts.artist)
          .clearTokenDataAtIndex(tokenNumber, 0)
      ).to.be.revertedWithCustomError(
        config.hook,
        "OwnableUnauthorizedAccount"
      );
    });

    it("reverts when clearing non-existent chunk", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;

      await expectRevert(
        config.hook
          .connect(config.accounts.deployer)
          .clearTokenDataAtIndex(tokenNumber, 0),
        "Must clear an existing chunk"
      );
    });

    it("clears chunk and updates numChunks when clearing the only chunk", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data = ethers.utils.toUtf8Bytes("test data");

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data);

      await config.hook
        .connect(config.accounts.deployer)
        .clearTokenDataAtIndex(tokenNumber, 0);

      const numChunks = await config.hook.numChunksOfToken(tokenNumber);
      expect(numChunks).to.equal(0);
    });

    it("clears chunk at end of 2-length array", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data1 = ethers.utils.toUtf8Bytes("chunk 1");
      const data2 = ethers.utils.toUtf8Bytes("chunk 2");

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data1);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 1, data2);

      await config.hook
        .connect(config.accounts.deployer)
        .clearTokenDataAtIndex(tokenNumber, 1);

      const numChunks = await config.hook.numChunksOfToken(tokenNumber);
      expect(numChunks).to.equal(1);

      const pointer = await config.hook.tokenDataPointers(tokenNumber, 1);
      expect(pointer).to.equal(constants.AddressZero);
    });

    it("clears chunk in the middle without updating numChunks", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data1 = ethers.utils.toUtf8Bytes("chunk 1");
      const data2 = ethers.utils.toUtf8Bytes("chunk 2");
      const data3 = ethers.utils.toUtf8Bytes("chunk 3");

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data1);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 1, data2);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 2, data3);

      await config.hook
        .connect(config.accounts.deployer)
        .clearTokenDataAtIndex(tokenNumber, 1);

      const numChunks = await config.hook.numChunksOfToken(tokenNumber);
      expect(numChunks).to.equal(3);

      const pointer = await config.hook.tokenDataPointers(tokenNumber, 1);
      expect(pointer).to.equal(constants.AddressZero);
    });

    it("clears second-to-last chunk, then last chunk, iterating to new end", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data1 = ethers.utils.toUtf8Bytes("chunk 1");
      const data2 = ethers.utils.toUtf8Bytes("chunk 2");
      const data3 = ethers.utils.toUtf8Bytes("chunk 3");

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data1);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 1, data2);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 2, data3);

      // Clear second-to-last chunk (index 1)
      await config.hook
        .connect(config.accounts.deployer)
        .clearTokenDataAtIndex(tokenNumber, 1);

      let numChunks = await config.hook.numChunksOfToken(tokenNumber);
      expect(numChunks).to.equal(3);

      // Clear last chunk (index 2)
      await config.hook
        .connect(config.accounts.deployer)
        .clearTokenDataAtIndex(tokenNumber, 2);

      numChunks = await config.hook.numChunksOfToken(tokenNumber);
      expect(numChunks).to.equal(1);
    });

    it("clears all chunks except last, then iterates to zero-chunk setup", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data1 = ethers.utils.toUtf8Bytes("chunk 1");
      const data2 = ethers.utils.toUtf8Bytes("chunk 2");
      const data3 = ethers.utils.toUtf8Bytes("chunk 3");

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data1);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 1, data2);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 2, data3);

      // Clear first two chunks
      await config.hook
        .connect(config.accounts.deployer)
        .clearTokenDataAtIndex(tokenNumber, 0);
      await config.hook
        .connect(config.accounts.deployer)
        .clearTokenDataAtIndex(tokenNumber, 1);

      let numChunks = await config.hook.numChunksOfToken(tokenNumber);
      expect(numChunks).to.equal(3);

      // Clear last chunk
      await config.hook
        .connect(config.accounts.deployer)
        .clearTokenDataAtIndex(tokenNumber, 2);

      numChunks = await config.hook.numChunksOfToken(tokenNumber);
      expect(numChunks).to.equal(0);

      // Verify hex string is clean
      const hexString =
        await config.hook.getAllTokenDataAsHexString(tokenNumber);
      expect(hexString).to.equal("0x");
    });

    it("emits TokenDataClearedAtIndex event", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const chunkIndex = 0;
      const data = ethers.utils.toUtf8Bytes("test data");

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, chunkIndex, data);

      const tx = await config.hook
        .connect(config.accounts.deployer)
        .clearTokenDataAtIndex(tokenNumber, chunkIndex);

      const receipt = await tx.wait();
      const event = receipt.events?.find(
        (e) => e.event === "TokenDataClearedAtIndex"
      );
      expect(event).to.not.be.undefined;
      expect(event?.args?.tokenNumber).to.equal(tokenNumber);
      expect(event?.args?.chunkIndex).to.equal(chunkIndex);
    });
  });

  describe("getTokenDataAtIndex", function () {
    it("reverts when getting non-existent chunk", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;

      await expectRevert(
        config.hook.getTokenDataAtIndex(tokenNumber, 0),
        "Must get an existing chunk"
      );
    });

    it("returns correct data for uploaded chunk", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const expectedData = "test data";
      const data = ethers.utils.toUtf8Bytes(expectedData);

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data);

      const retrievedData = await config.hook.getTokenDataAtIndex(
        tokenNumber,
        0
      );
      expect(ethers.utils.toUtf8String(retrievedData)).to.equal(expectedData);
    });

    it("returns empty bytes for cleared chunk", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data1 = ethers.utils.toUtf8Bytes("chunk 1");
      const data2 = ethers.utils.toUtf8Bytes("chunk 2");

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data1);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 1, data2);

      await config.hook
        .connect(config.accounts.deployer)
        .clearTokenDataAtIndex(tokenNumber, 0);

      const retrievedData = await config.hook.getTokenDataAtIndex(
        tokenNumber,
        0
      );
      expect(retrievedData).to.equal("0x");
    });
  });

  describe("getAllTokenData", function () {
    it("returns empty bytes for token with no chunks", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;

      const allData = await config.hook.getAllTokenData(tokenNumber);
      expect(allData).to.equal("0x");
    });

    it("returns correct data for single chunk", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const expectedData = "test data";
      const data = ethers.utils.toUtf8Bytes(expectedData);

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data);

      const allData = await config.hook.getAllTokenData(tokenNumber);
      expect(ethers.utils.toUtf8String(allData)).to.equal(expectedData);
    });

    it("returns concatenated data for multiple chunks", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data1 = ethers.utils.toUtf8Bytes("chunk 1");
      const data2 = ethers.utils.toUtf8Bytes("chunk 2");
      const data3 = ethers.utils.toUtf8Bytes("chunk 3");

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data1);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 1, data2);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 2, data3);

      const allData = await config.hook.getAllTokenData(tokenNumber);
      expect(ethers.utils.toUtf8String(allData)).to.equal(
        "chunk 1chunk 2chunk 3"
      );
    });

    it("skips cleared chunks in the middle", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data1 = ethers.utils.toUtf8Bytes("chunk 1");
      const data2 = ethers.utils.toUtf8Bytes("chunk 2");
      const data3 = ethers.utils.toUtf8Bytes("chunk 3");

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data1);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 1, data2);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 2, data3);

      // Clear middle chunk
      await config.hook
        .connect(config.accounts.deployer)
        .clearTokenDataAtIndex(tokenNumber, 1);

      const allData = await config.hook.getAllTokenData(tokenNumber);
      expect(ethers.utils.toUtf8String(allData)).to.equal("chunk 1chunk 3");
    });
  });

  describe("getAllTokenDataAsHexString", function () {
    it("returns '0x' for token with no chunks", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;

      const hexString =
        await config.hook.getAllTokenDataAsHexString(tokenNumber);
      expect(hexString).to.equal("0x");
    });

    it("returns correct hex string for uploaded data", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data = ethers.utils.toUtf8Bytes("test");

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data);

      const hexString =
        await config.hook.getAllTokenDataAsHexString(tokenNumber);
      // "test" in hex is 74657374
      expect(hexString).to.include("74657374");
      expect(hexString.startsWith("0x")).to.be.true;
    });

    it("returns correct hex string for multiple chunks concatenated", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data1 = ethers.utils.toUtf8Bytes("ABC");
      const data2 = ethers.utils.toUtf8Bytes("DEF");
      const data3 = ethers.utils.toUtf8Bytes("GHI");

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data1);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 1, data2);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 2, data3);

      const hexString =
        await config.hook.getAllTokenDataAsHexString(tokenNumber);

      // "ABC" = 414243, "DEF" = 444546, "GHI" = 474849
      // Combined: ABCDEFGHI should be 414243444546474849
      expect(hexString).to.equal("0x414243444546474849");
    });

    it("returns correct hex string with cleared chunk in middle", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data1 = ethers.utils.toUtf8Bytes("AAA");
      const data2 = ethers.utils.toUtf8Bytes("BBB");
      const data3 = ethers.utils.toUtf8Bytes("CCC");

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data1);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 1, data2);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 2, data3);

      // Clear middle chunk
      await config.hook
        .connect(config.accounts.deployer)
        .clearTokenDataAtIndex(tokenNumber, 1);

      const hexString =
        await config.hook.getAllTokenDataAsHexString(tokenNumber);

      // "AAA" = 414141, "CCC" = 434343
      // Should skip BBB and give us AAACCC = 414141434343
      expect(hexString).to.equal("0x414141434343");
    });

    it("handles empty bytes (zero-length) uploaded to a chunk", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const emptyData = new Uint8Array(0);

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, emptyData);

      const hexString =
        await config.hook.getAllTokenDataAsHexString(tokenNumber);

      // Empty bytes should return "0x"
      expect(hexString).to.equal("0x");
    });

    it("handles chunks with zero bytes (0x00) in the data", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      // Create data with actual zero bytes in it
      const dataWithZeros = new Uint8Array([0x01, 0x00, 0x02, 0x00, 0x03]);

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, dataWithZeros);

      const hexString =
        await config.hook.getAllTokenDataAsHexString(tokenNumber);

      // Should be 0x0100020003
      expect(hexString).to.equal("0x0100020003");
    });

    it("handles multiple chunks where some contain zero bytes", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data1 = new Uint8Array([0xaa, 0x00, 0xbb]);
      const data2 = new Uint8Array([0xcc, 0xdd]);
      const data3 = new Uint8Array([0x00, 0xee, 0x00]);

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data1);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 1, data2);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 2, data3);

      const hexString =
        await config.hook.getAllTokenDataAsHexString(tokenNumber);

      // data1: aa00bb, data2: ccdd, data3: 00ee00
      // Combined: aa00bbccdd00ee00
      expect(hexString).to.equal("0xaa00bbccdd00ee00");
    });
  });

  describe("onTokenPMPReadAugmentation", function () {
    it("appends tokenData parameter to existing params", async function () {
      const config = await loadFixture(_beforeEach);

      const augmentedParams = await config.hook.onTokenPMPReadAugmentation(
        config.genArt721Core.address,
        config.projectZeroTokenZero,
        [
          { key: "param1", value: "value1" },
          { key: "param2", value: "value2" },
        ]
      );

      expect(augmentedParams.length).to.equal(3);
      expect(augmentedParams[0].key).to.equal("param1");
      expect(augmentedParams[0].value).to.equal("value1");
      expect(augmentedParams[1].key).to.equal("param2");
      expect(augmentedParams[1].value).to.equal("value2");
      expect(augmentedParams[2].key).to.equal("tokenData");
      expect(augmentedParams[2].value).to.equal("0x");
    });

    it("returns tokenData with uploaded bytes", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data = ethers.utils.toUtf8Bytes("test");

      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data);

      const augmentedParams = await config.hook.onTokenPMPReadAugmentation(
        config.genArt721Core.address,
        config.projectZeroTokenZero,
        []
      );

      expect(augmentedParams.length).to.equal(1);
      expect(augmentedParams[0].key).to.equal("tokenData");
      expect(augmentedParams[0].value).to.include("74657374");
    });
  });

  describe("Integration with PMP system", function () {
    it("uploads chunk, verifies via PMP, deletes, confirms empty", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data = ethers.utils.toUtf8Bytes("test data");

      // Upload chunk at index 0
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data);

      // Get token params through PMP system
      let params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );

      // Verify tokenData is present and correct
      const tokenDataParam = params.find((p) => p.key === "tokenData");
      expect(tokenDataParam).to.not.be.undefined;
      expect(tokenDataParam?.value).to.not.equal("0x");
      expect(tokenDataParam?.value).to.include("7465737420646174");

      // Delete the chunk
      await config.hook
        .connect(config.accounts.deployer)
        .clearTokenDataAtIndex(tokenNumber, 0);

      // Get token params again
      params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );

      // Verify tokenData is now empty
      const emptyTokenDataParam = params.find((p) => p.key === "tokenData");
      expect(emptyTokenDataParam).to.not.be.undefined;
      expect(emptyTokenDataParam?.value).to.equal("0x");
    });

    it("handles getting data with gap (cleared chunk) in the middle", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const data1 = ethers.utils.toUtf8Bytes("AAA");
      const data2 = ethers.utils.toUtf8Bytes("BBB");
      const data3 = ethers.utils.toUtf8Bytes("CCC");

      // Upload three chunks
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, data1);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 1, data2);
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 2, data3);

      // Clear middle chunk
      await config.hook
        .connect(config.accounts.deployer)
        .clearTokenDataAtIndex(tokenNumber, 1);

      // Get token params through PMP system
      const params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );

      // Verify tokenData skips the cleared chunk and matches exactly
      const tokenDataParam = params.find((p) => p.key === "tokenData");
      expect(tokenDataParam).to.not.be.undefined;

      // AAA = 414141, BBB = 424242 (cleared), CCC = 434343
      // Result should be AAACCC = 0x414141434343
      expect(tokenDataParam?.value).to.equal("0x414141434343");
    });

    it("supports multiple tokens with independent data", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber0 = 0;
      const tokenNumber1 = 1;
      const data0 = ethers.utils.toUtf8Bytes("token 0 data");
      const data1 = ethers.utils.toUtf8Bytes("token 1 data");

      // Upload data for token 0
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber0, 0, data0);

      // Upload data for token 1
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber1, 0, data1);

      // Get params for token 0
      const params0 = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );
      const tokenData0 = params0.find((p) => p.key === "tokenData");

      // Get params for token 1
      const params1 = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenOne
      );
      const tokenData1 = params1.find((p) => p.key === "tokenData");

      // Verify different data
      expect(tokenData0?.value).to.not.equal(tokenData1?.value);
      expect(tokenData0?.value).to.include("746f6b656e203020646174"); // "token 0 dat"
      expect(tokenData1?.value).to.include("746f6b656e203120646174"); // "token 1 dat"
    });
  });

  describe("Large data and gas consumption tests", function () {
    it("handles large chunk upload near 24KB limit", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;

      // Create 20KB of data (safely under 24KB SSTORE2 limit)
      const largeData = new Uint8Array(20000);
      // Fill with pattern for verification
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = i % 256;
      }

      // Upload the large chunk
      await config.hook
        .connect(config.accounts.deployer)
        .uploadTokenDataAtIndex(tokenNumber, 0, largeData);

      // Verify numChunks
      const numChunks = await config.hook.numChunksOfToken(tokenNumber);
      expect(numChunks).to.equal(1);

      // Retrieve and verify data
      const retrievedData = await config.hook.getTokenDataAtIndex(
        tokenNumber,
        0
      );
      // Note: Retrieved data includes length prefix and may have different encoding
      expect(retrievedData.length).to.be.at.least(20000);

      // Verify hex string length is correct (2 chars per byte + "0x" prefix)
      const hexString =
        await config.hook.getAllTokenDataAsHexString(tokenNumber);
      expect(hexString.startsWith("0x")).to.be.true;
      expect(hexString.length).to.equal(2 + 20000 * 2); // "0x" + 2 hex chars per byte
    });

    it("handles 25 chunks with large data and measures gas on view function", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const numChunks = 25;
      const chunkSize = 1000; // 1KB per chunk = 25KB total

      // Upload 25 chunks of 1KB each
      for (let i = 0; i < numChunks; i++) {
        const chunkData = new Uint8Array(chunkSize);
        // Fill with unique pattern for each chunk
        for (let j = 0; j < chunkSize; j++) {
          chunkData[j] = (i * 10 + j) % 256;
        }

        await config.hook
          .connect(config.accounts.deployer)
          .uploadTokenDataAtIndex(tokenNumber, i, chunkData);
      }

      // Verify all chunks were uploaded
      const finalNumChunks = await config.hook.numChunksOfToken(tokenNumber);
      expect(finalNumChunks).to.equal(numChunks);

      // Measure gas for getAllTokenData view function
      const gasEstimate =
        await config.hook.estimateGas.getAllTokenData(tokenNumber);
      console.log(
        `Gas used for getAllTokenData with ${numChunks} chunks (${chunkSize}B each):`,
        gasEstimate.toString()
      );

      // Verify the function still works and returns expected data size via hex string
      const hexString =
        await config.hook.getAllTokenDataAsHexString(tokenNumber);
      expect(hexString.startsWith("0x")).to.be.true;
      // Should be "0x" + (25 chunks * 1000 bytes/chunk * 2 hex chars/byte)
      expect(hexString.length).to.equal(2 + numChunks * chunkSize * 2);
    });

    it("measures gas for getAllTokenDataAsHexString with 25 chunks", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const numChunks = 25;
      const chunkSize = 500; // 500 bytes per chunk = 12.5KB total

      // Upload 25 chunks
      for (let i = 0; i < numChunks; i++) {
        const chunkData = new Uint8Array(chunkSize);
        // Fill with pattern
        for (let j = 0; j < chunkSize; j++) {
          chunkData[j] = (i + j) % 256;
        }

        await config.hook
          .connect(config.accounts.deployer)
          .uploadTokenDataAtIndex(tokenNumber, i, chunkData);
      }

      // Measure gas for getAllTokenDataAsHexString view function
      const gasEstimate =
        await config.hook.estimateGas.getAllTokenDataAsHexString(tokenNumber);
      console.log(
        `Gas used for getAllTokenDataAsHexString with ${numChunks} chunks (${chunkSize}B each):`,
        gasEstimate.toString()
      );

      // Verify the function still works and returns proper hex
      const hexString =
        await config.hook.getAllTokenDataAsHexString(tokenNumber);

      // Should have "0x" prefix + 2 hex chars per byte
      expect(hexString.startsWith("0x")).to.be.true;
      expect(hexString.length).to.equal(2 + numChunks * chunkSize * 2);
    });

    it("measures gas for onTokenPMPReadAugmentation with 25 chunks via PMP", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const numChunks = 25;
      const chunkSize = 400; // 400 bytes per chunk = 10KB total

      // Upload 25 chunks
      for (let i = 0; i < numChunks; i++) {
        const chunkData = new Uint8Array(chunkSize);
        for (let j = 0; j < chunkSize; j++) {
          chunkData[j] = (i * j) % 256;
        }

        await config.hook
          .connect(config.accounts.deployer)
          .uploadTokenDataAtIndex(tokenNumber, i, chunkData);
      }

      // Measure gas for getTokenParams (which calls onTokenPMPReadAugmentation)
      const gasEstimate = await config.pmp.estimateGas.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );
      console.log(
        `Gas used for PMP getTokenParams with ${numChunks} chunks (${chunkSize}B each):`,
        gasEstimate.toString()
      );

      // Verify it still works
      const params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero
      );

      const tokenDataParam = params.find((p) => p.key === "tokenData");
      expect(tokenDataParam).to.not.be.undefined;
      expect(tokenDataParam?.value.startsWith("0x")).to.be.true;
    });

    it("handles cleared chunks in large dataset without gas issues", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenNumber = 0;
      const numChunks = 20;
      const chunkSize = 800;

      // Upload 20 chunks
      for (let i = 0; i < numChunks; i++) {
        const chunkData = new Uint8Array(chunkSize);
        for (let j = 0; j < chunkSize; j++) {
          chunkData[j] = i % 256;
        }

        await config.hook
          .connect(config.accounts.deployer)
          .uploadTokenDataAtIndex(tokenNumber, i, chunkData);
      }

      // Clear every other chunk (creating gaps)
      for (let i = 1; i < numChunks; i += 2) {
        await config.hook
          .connect(config.accounts.deployer)
          .clearTokenDataAtIndex(tokenNumber, i);
      }

      // Measure gas with gaps
      const gasEstimate =
        await config.hook.estimateGas.getAllTokenData(tokenNumber);
      console.log(
        `Gas used for getAllTokenData with ${numChunks} chunks (${
          numChunks / 2
        } cleared):`,
        gasEstimate.toString()
      );

      // Verify data only contains non-cleared chunks via hex string
      const hexString =
        await config.hook.getAllTokenDataAsHexString(tokenNumber);
      expect(hexString.startsWith("0x")).to.be.true;
      // Should be "0x" + (10 non-cleared chunks * 800 bytes/chunk * 2 hex chars/byte)
      expect(hexString.length).to.equal(2 + (numChunks / 2) * chunkSize * 2);
    });
  });
});
