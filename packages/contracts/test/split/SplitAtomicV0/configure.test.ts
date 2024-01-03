import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupSplits } from "../../util/fixtures";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import { revertMessages } from "./constants";

describe(`SplitAtomicFactoryV0 Configure`, async function () {
  async function _beforeEach() {
    // deploy new splitter system
    const config = await loadFixture(setupSplits);
    return config;
  }

  describe("Initialize", async function () {
    it("should be initialized", async function () {
      const config = await loadFixture(_beforeEach);
      // The created splitter factory should be initialized with the valid splits
      const splits = await config.splitter.getSplits();
      expect(splits).to.be.deep.equal([
        [config.validSplit[0].recipient, config.validSplit[0].basisPoints],
        [config.validSplit[1].recipient, config.validSplit[1].basisPoints],
        [config.validSplit[2].recipient, config.validSplit[2].basisPoints],
      ]);
    });

    it("is not re-initializable", async function () {
      const config = await loadFixture(_beforeEach);
      // The created splitter factory should be initialized with the valid splits
      expectRevert(
        await config.splitter.getSplits(),
        revertMessages.alreadyInitialized
      );
    });
  });
});
