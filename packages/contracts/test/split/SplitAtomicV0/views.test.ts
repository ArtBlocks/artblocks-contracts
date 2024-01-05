import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupSplits } from "../../util/fixtures";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_TYPE = "SplitAtomicV0";

describe(`SplitAtomicFactoryV0 Views`, async function () {
  async function _beforeEach() {
    // deploy new splitter system
    const config = await loadFixture(setupSplits);
    return config;
  }

  describe("type_", async function () {
    it("returns expected value", async function () {
      const config = await loadFixture(_beforeEach);
      const contractType = ethers.utils.parseBytes32String(
        await config.splitter.type_()
      );
      expect(contractType).to.be.equal(TARGET_TYPE);
    });
  });

  describe("getSplits", async function () {
    it("returns expected value", async function () {
      const config = await loadFixture(_beforeEach);
      // The created splitter factory should return the valid split values
      const splits = await config.splitter.getSplits();
      expect(splits).to.be.deep.equal([
        [config.validSplit[0].recipient, config.validSplit[0].basisPoints],
        [config.validSplit[1].recipient, config.validSplit[1].basisPoints],
        [config.validSplit[2].recipient, config.validSplit[2].basisPoints],
      ]);
    });
  });
});
