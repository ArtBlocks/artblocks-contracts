import { ethers } from "hardhat";
import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupSplits } from "../../util/fixtures";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import { revertMessages } from "./constants";
import { deployAndGet } from "../../util/common";

describe(`SplitAtomicFactoryV0 Integration`, async function () {
  async function _beforeEach() {
    // deploy new splitter system
    const config = await loadFixture(setupSplits);
    return config;
  }

  describe("receive", async function () {
    it("should split as expected upon receipt of ETH", async function () {
      const config = await loadFixture(_beforeEach);
      // record balances before split
      const deployerBalance = await config.accounts.deployer.getBalance();
      const artistBalance = await config.accounts.artist.getBalance();
      const additionalBalance = await config.accounts.additional.getBalance();
      // send ETH and verify split was successful
      const txInputs = {
        to: config.splitter.address,
        value: ethers.utils.parseEther("1"),
      };
      const tx = await config.accounts.user.sendTransaction(txInputs);
      const receipt = await tx.wait();
      // record balances after split
      const deployerBalanceAfter = await config.accounts.deployer.getBalance();
      const artistBalanceAfter = await config.accounts.artist.getBalance();
      const additionalBalanceAfter =
        await config.accounts.additional.getBalance();
      // expect balances to be updated as expected
      expect(deployerBalanceAfter).to.equal(
        deployerBalance.add(ethers.utils.parseEther("0.2222"))
      );
      expect(artistBalanceAfter).to.equal(
        artistBalance.add(ethers.utils.parseEther("0.2778"))
      );
      expect(additionalBalanceAfter).to.equal(
        additionalBalance.add(ethers.utils.parseEther("0.5000"))
      );
    });
  });

  describe("drainETH", async function () {
    it("should drain ETH as expected", async function () {
      const config = await loadFixture(_beforeEach);
      // force-send some ETH to the splitter via SENDALL (SELFDESTRUCT)
      // @dev this intentionally avoids the receive hook
      const forceSendMock = await deployAndGet(config, "ForceSendMock", []);
      await forceSendMock
        .connect(config.accounts.user)
        .forceSendETH(config.splitter.address, {
          value: ethers.utils.parseEther("1"),
          gasLimit: 1000000,
        });
      // ensure splitter has the force-sent ETH as its balance
      const splitterBalance = await ethers.provider.getBalance(
        config.splitter.address
      );
      expect(splitterBalance).to.equal(ethers.utils.parseEther("1"));
      // record balances before drain
      const deployerBalance = await config.accounts.deployer.getBalance();
      const artistBalance = await config.accounts.artist.getBalance();
      const additionalBalance = await config.accounts.additional.getBalance();
      // drain ETH and verify split was successful
      await config.splitter.connect(config.accounts.user).drainETH();
      // record balances after drain
      const deployerBalanceAfter = await config.accounts.deployer.getBalance();
      const artistBalanceAfter = await config.accounts.artist.getBalance();
      const additionalBalanceAfter =
        await config.accounts.additional.getBalance();
      // expect balances to be updated as expected
      expect(deployerBalanceAfter).to.equal(
        deployerBalance.add(ethers.utils.parseEther("0.2222"))
      );
      expect(artistBalanceAfter).to.equal(
        artistBalance.add(ethers.utils.parseEther("0.2778"))
      );
      expect(additionalBalanceAfter).to.equal(
        additionalBalance.add(ethers.utils.parseEther("0.5000"))
      );
      // ensure splitter now has a zero balance
      const splitterBalanceAfter = await ethers.provider.getBalance(
        config.splitter.address
      );
      expect(splitterBalanceAfter).to.equal(ethers.utils.parseEther("0"));
    });
  });

  describe("drainERC20", async function () {
    it("should drain ERC20 as expected", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy ERC20 token
      const erc20 = await deployAndGet(config, "ERC20Mock", [
        ethers.utils.parseEther("100"),
      ]);
      // transfer some tokens to the splitter
      await erc20
        .connect(config.accounts.deployer)
        .transfer(config.splitter.address, ethers.utils.parseEther("1"));

      // ensure splitter has the ERC20 as its balance
      const splitterBalance = await erc20.balanceOf(config.splitter.address);
      expect(splitterBalance).to.equal(ethers.utils.parseEther("1"));
      // record balances before drain
      const deployerBalance = await erc20.balanceOf(
        config.accounts.deployer.address
      );
      const artistBalance = await erc20.balanceOf(
        config.accounts.artist.address
      );
      const additionalBalance = await erc20.balanceOf(
        config.accounts.additional.address
      );
      // drain ERC20 and verify split was successful
      await config.splitter
        .connect(config.accounts.user)
        .drainERC20(erc20.address);
      // record balances after drain
      const deployerBalanceAfter = await erc20.balanceOf(
        config.accounts.deployer.address
      );
      const artistBalanceAfter = await erc20.balanceOf(
        config.accounts.artist.address
      );
      const additionalBalanceAfter = await erc20.balanceOf(
        config.accounts.additional.address
      );
      // expect balances to be updated as expected
      expect(deployerBalanceAfter).to.equal(
        deployerBalance.add(ethers.utils.parseEther("0.2222"))
      );
      expect(artistBalanceAfter).to.equal(
        artistBalance.add(ethers.utils.parseEther("0.2778"))
      );
      expect(additionalBalanceAfter).to.equal(
        additionalBalance.add(ethers.utils.parseEther("0.5000"))
      );
    });
  });

  describe("NonReentrant - receive", async function () {
    it("reverts if re-entered via receive function", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy reentrancy that attacks via receive function
      const reentrancy = await deployAndGet(
        config,
        "ReentrancySplitterSendETHMock",
        []
      );
      // deploy a splitter with the reentrancy as the recipient
      const tx = await config.splitterFactory.createSplit([
        { recipient: config.accounts.deployer.address, basisPoints: 2222 },
        { recipient: reentrancy.address, basisPoints: 7778 },
      ]);
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      // get splitter address from logs
      const splitterCreationLog = receipt.logs[receipt.logs.length - 1];
      const splitterAddress = ethers.utils.defaultAbiCoder.decode(
        ["address"],
        splitterCreationLog.topics[1]
      )[0];
      // send ETH to the splitter and expect reversion due to reentrancy
      await expectRevert(
        reentrancy
          .connect(config.accounts.user)
          .attack(splitterAddress, { value: ethers.utils.parseEther("1") }),
        revertMessages.attackFailed
      );
    });
  });

  describe("NonReentrant - drainETH", async function () {
    it("reverts if re-entered via drainETH function", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy reentrancy that attacks via receive function
      const reentrancy = await deployAndGet(
        config,
        "ReentrancySplitterDrainETHMock",
        []
      );
      // deploy a splitter with the reentrancy as the recipient
      const tx = await config.splitterFactory.createSplit([
        { recipient: config.accounts.deployer.address, basisPoints: 2222 },
        { recipient: reentrancy.address, basisPoints: 7778 },
      ]);
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      // get splitter address from logs
      const splitterCreationLog = receipt.logs[receipt.logs.length - 1];
      const splitterAddress = ethers.utils.defaultAbiCoder.decode(
        ["address"],
        splitterCreationLog.topics[1]
      )[0];
      // send ETH to the splitter and expect reversion due to reentrancy
      await expectRevert(
        reentrancy
          .connect(config.accounts.user)
          .attack(splitterAddress, { value: ethers.utils.parseEther("1") }),
        revertMessages.attackFailed
      );
    });
  });

  // @dev acknowledge that ERC20 non-reentrancy is not tested at this time,
  // however current implementation has dual checks for reentrancy for fault
  // tolerance
});
