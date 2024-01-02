import { ethers } from "hardhat";
import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupSplits } from "../../util/fixtures";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import { revertMessages } from "./constants";
import { revertMessages as splitterRevertMessages } from "../SplitAtomicV0/constants";

describe(`SplitAtomicFactoryV0 Configure`, async function () {
  async function _beforeEach() {
    // deploy new splitter factory
    const config = await loadFixture(setupSplits);
    return config;
  }

  describe("createSplit", async function () {
    it("reverts if abandoned", async function () {
      const config = await loadFixture(_beforeEach);
      // abandon the factory
      await config.splitterFactory.connect(config.accounts.deployer).abandon();
      // expect revert on createSplit
      await expectRevert(
        config.splitterFactory.connect(config.accounts.user).createSplit([
          { recipient: config.accounts.deployer.address, basisPoints: 2222 },
          { recipient: config.accounts.artist.address, basisPoints: 2778 },
          { recipient: config.accounts.additional.address, basisPoints: 5000 },
        ]),
        revertMessages.factoryAbandoned
      );
    });

    it("reverts if invalid split, missing required split", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.splitterFactory.connect(config.accounts.user).createSplit([
          { recipient: config.accounts.user.address, basisPoints: 2222 }, // missing required split
          { recipient: config.accounts.artist.address, basisPoints: 2778 },
          { recipient: config.accounts.additional.address, basisPoints: 5000 },
        ]),
        revertMessages.missingRequiredSplit
      );
    });

    // note: the following revert comes from the splitter contract, but is tested here
    // to ensure the factory transaction does revert
    it("reverts if invalid split, invalid total bps", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.splitterFactory.connect(config.accounts.user).createSplit([
          { recipient: config.accounts.deployer.address, basisPoints: 2222 },
          { recipient: config.accounts.artist.address, basisPoints: 2778 },
          { recipient: config.accounts.additional.address, basisPoints: 4999 }, // invalid total bps of < 10_000
        ]),
        splitterRevertMessages.invalidTotalBasisPoints
      );
    });

    it("creates a new splitter contract", async function () {
      const config = await loadFixture(_beforeEach);
      // get tx receipt
      const tx = await config.splitterFactory
        .connect(config.accounts.user)
        .createSplit([
          { recipient: config.accounts.deployer.address, basisPoints: 2222 },
          { recipient: config.accounts.artist.address, basisPoints: 2778 },
          { recipient: config.accounts.additional.address, basisPoints: 5000 },
        ]);
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      // get splitter address from logs
      const splitterCreationLog = receipt.logs[receipt.logs.length - 1];
      const splitterAddress = ethers.utils.getAddress(
        "0x" + splitterCreationLog.topics[1].slice(-40)
      );
      // get splitter contract
      const splitter = await ethers.getContractAt(
        "SplitAtomicV0",
        splitterAddress
      );
      // get splitter splits via view function
      const splits = await splitter.getSplits();
      // expect splits to match
      expect(splits).to.deep.equal([
        [config.accounts.deployer.address, 2222],
        [config.accounts.artist.address, 2778],
        [config.accounts.additional.address, 5000],
      ]);
    });
  });
});
