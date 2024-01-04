import { ethers } from "hardhat";
import { Contract } from "ethers";
import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupSplits } from "../../util/fixtures";
import { SplitAtomicV0__factory } from "../../../scripts/contracts";

import { Logger } from "@ethersproject/logger";
import { deployAndGet } from "../../util/common";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_TYPE = "SplitAtomicV0";

describe(`SplitAtomicFactoryV0 Events`, async function () {
  async function _beforeEach() {
    // deploy new splitter system
    const config = await loadFixture(setupSplits);
    return config;
  }

  describe("Initialized", async function () {
    it("emits during new splits initialization", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy new splitter
      const tx = await config.splitterFactory
        .connect(config.accounts.deployer)
        .createSplit(config.validSplit);
      const receipt = await tx.wait();
      // get initialized log
      // @dev second to last log is the initialized event, since factory emits last log
      const initializedLog = receipt.logs[receipt.logs.length - 2];
      // expect "Initialized" event as log 0
      expect(initializedLog.topics[0]).to.be.equal(
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Initialized(bytes32)"))
      );
      // expect type to be SplitAtomicV0
      expect(ethers.utils.parseBytes32String(initializedLog.data)).to.be.equal(
        TARGET_TYPE
      );
    });
  });

  describe("DrainedETH", async function () {
    it("emits during ETH drain", async function () {
      const config = await loadFixture(_beforeEach);
      // should emit during drainETH call
      await expect(config.splitter.connect(config.accounts.user).drainETH())
        .to.emit(config.splitter, "DrainedETH")
        .withArgs();
    });
  });

  describe("DrainedERC20", async function () {
    it("emits during ERC20 drain", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy ERC20 token
      const erc20 = await deployAndGet(config, "ERC20Mock", [
        ethers.utils.parseEther("100"),
      ]);
      // should emit during drainETH call
      await expect(
        config.splitter.connect(config.accounts.user).drainERC20(erc20.address)
      )
        .to.emit(config.splitter, "DrainedERC20")
        .withArgs(erc20.address);
    });
  });
});
