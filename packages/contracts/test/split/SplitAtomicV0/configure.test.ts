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
      await expectRevert(
        config.splitter
          .connect(config.accounts.deployer)
          .initialize(config.validSplit),
        revertMessages.alreadyInitialized
      );
    });

    it("reverts if invalid split, invalid total bps", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.splitterFactory.connect(config.accounts.user).createSplit([
          { recipient: config.accounts.deployer.address, basisPoints: 2222 },
          { recipient: config.accounts.artist.address, basisPoints: 2778 },
          { recipient: config.accounts.additional.address, basisPoints: 4999 }, // invalid total bps of < 10_000
        ]),
        revertMessages.invalidTotalBasisPoints
      );
    });

    it("reverts if invalid split, invalid single bps of 0", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.splitterFactory.connect(config.accounts.user).createSplit([
          { recipient: config.accounts.deployer.address, basisPoints: 2222 },
          { recipient: config.accounts.artist.address, basisPoints: 0 }, // invalid single bps of zero
          { recipient: config.accounts.additional.address, basisPoints: 7778 },
        ]),
        revertMessages.invalidBasisPoints
      );
    });

    it("reverts if invalid split, invalid single bps of >10_000", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.splitterFactory.connect(config.accounts.user).createSplit([
          { recipient: config.accounts.deployer.address, basisPoints: 2222 },
          { recipient: config.accounts.artist.address, basisPoints: 10_001 }, // invalid single bps of > 10_000
          { recipient: config.accounts.additional.address, basisPoints: 7778 },
        ]),
        revertMessages.invalidBasisPoints
      );
    });
  });
});
