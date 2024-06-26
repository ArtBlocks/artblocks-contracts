import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfig } from "../util/fixtures";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import { T_Config, deployAndGet } from "../util/common";
import { OwnedCreate2FactoryV0 } from "../../scripts/contracts";
import { OwnedCreate2FactoryV0__factory } from "../../scripts/contracts/factories/contracts/OwnedCreate2FactoryV0.sol";

const TARGET_TYPE = "OwnedCreate2FactoryV0";

interface T_Create2FactoryTestConfig extends T_Config {
  ownedCreate2Factory: OwnedCreate2FactoryV0;
}

describe(`OwnedCreate2FactoryV0 Integration`, async function () {
  async function _beforeEach() {
    const config = await loadFixture(setupConfig);
    // deploy new owned create2 factory
    const ownedCreate2FactoryFactory = new OwnedCreate2FactoryV0__factory(
      config.accounts.deployer
    );
    config.ownedCreate2Factory = await ownedCreate2FactoryFactory.deploy(
      config.accounts.deployer.address // owner
    );

    return config as T_Create2FactoryTestConfig;
  }

  describe("deployCreate2", async function () {
    it("reverts when not called by owner", async function () {
      const config = await loadFixture(_beforeEach);
      const salt = ethers.utils.hexZeroPad(ethers.utils.hexlify(0), 32);
      const initcode = "0x00";
      await expect(
        config.ownedCreate2Factory
          .connect(config.accounts.user)
          .deployCreate2(salt, initcode)
      )
        .to.be.revertedWithCustomError(
          config.ownedCreate2Factory,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(config.accounts.user.address);
    });

    it("deploys a contract using create2", async function () {
      // #dev this test also serves as a test for the predictDeterministicAddress function
      const config = await loadFixture(_beforeEach);
      // have the factory deploy a copy of itself for testing purposes
      const salt = ethers.utils.hexZeroPad(ethers.utils.hexlify(0), 32);

      const ownedCreate2FactoryFactory = new OwnedCreate2FactoryV0__factory(
        config.accounts.deployer
      );
      const initcode = ownedCreate2FactoryFactory.getDeployTransaction(
        config.accounts.deployer.address
      ).data as string;
      // deploy from deployer for source of truth of expected deployed bytecode
      const expectedDeployedFactory = await ownedCreate2FactoryFactory.deploy(
        config.accounts.deployer.address
      );
      // predict the address of the contract
      const create2Address =
        await config.ownedCreate2Factory.predictDeterministicAddress(
          salt,
          initcode
        );
      // deploy the contract via function call
      await config.ownedCreate2Factory.deployCreate2(salt, initcode);
      // validate the contract is deployed with expected bytecode
      const deployedCodeViaCreate2 =
        await ethers.provider.getCode(create2Address);
      expect(deployedCodeViaCreate2.length).to.be.gt(2);
      expect(deployedCodeViaCreate2).to.equal(
        await ethers.provider.getCode(expectedDeployedFactory.address)
      );
    });
  });

  describe("drainETH", async function () {
    it("reverts if not called by owner", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.ownedCreate2Factory
          .connect(config.accounts.user)
          .drainETH(config.accounts.user.address)
      )
        .to.be.revertedWithCustomError(
          config.ownedCreate2Factory,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(config.accounts.user.address);
    });
    it("drains ETH balance to recipient address", async function () {
      const config = await loadFixture(_beforeEach);
      const sendAmount = ethers.utils.parseEther("1.0");
      await config.accounts.deployer.sendTransaction({
        to: config.ownedCreate2Factory.address,
        value: sendAmount,
      });
      const initialDeployerBalance = await ethers.provider.getBalance(
        config.accounts.deployer.address
      );
      // check initial balance
      expect(
        await ethers.provider.getBalance(config.ownedCreate2Factory.address)
      ).to.equal(sendAmount);
      // deployer drains balance
      const drainTx = await config.ownedCreate2Factory
        .connect(config.accounts.deployer)
        .drainETH(config.accounts.deployer.address);
      const txReceipt = await drainTx.wait();
      const gasUsed = txReceipt.gasUsed;
      const effectiveGasPrice = txReceipt.effectiveGasPrice;
      const gasCost = gasUsed.mul(effectiveGasPrice);
      // check deployers balance
      const finalDeployerBalance = await ethers.provider.getBalance(
        config.accounts.deployer.address
      );
      const expectedBalance = initialDeployerBalance
        .sub(gasCost)
        .add(sendAmount);
      expect(finalDeployerBalance).to.equal(expectedBalance);
      // validate contract balance is 0
      expect(
        await ethers.provider.getBalance(config.ownedCreate2Factory.address)
      ).to.equal(0);
    });

    it("handles balance of zero", async function () {
      const config = await loadFixture(_beforeEach);
      const initialDeployerBalance = await ethers.provider.getBalance(
        config.accounts.deployer.address
      );
      // check initial balance
      expect(
        await ethers.provider.getBalance(config.ownedCreate2Factory.address)
      ).to.equal(0);
      // deployer drains balance
      const drainTx = await config.ownedCreate2Factory
        .connect(config.accounts.deployer)
        .drainETH(config.accounts.deployer.address);
      const txReceipt = await drainTx.wait();
      const gasUsed = txReceipt.gasUsed;
      const effectiveGasPrice = txReceipt.effectiveGasPrice;
      const gasCost = gasUsed.mul(effectiveGasPrice);
      // check deployers balance
      const finalDeployerBalance = await ethers.provider.getBalance(
        config.accounts.deployer.address
      );
      const expectedBalance = initialDeployerBalance.sub(gasCost);
      expect(finalDeployerBalance).to.equal(expectedBalance);
      // validate contract balance is 0
      expect(
        await ethers.provider.getBalance(config.ownedCreate2Factory.address)
      ).to.equal(0);
    });
  });

  describe("drainERC20", async function () {
    it("reverts if not called by owner", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy ERC20 token
      const erc20 = await deployAndGet(config, "ERC20Mock", [
        ethers.utils.parseEther("100"),
      ]);
      await expect(
        config.ownedCreate2Factory
          .connect(config.accounts.user)
          .drainERC20(erc20.address, config.accounts.user.address)
      )
        .to.be.revertedWithCustomError(
          config.ownedCreate2Factory,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(config.accounts.user.address);
    });
    it("drains ERC20 balance to recipient address", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy ERC20 token
      const erc20 = await deployAndGet(config, "ERC20Mock", [
        ethers.utils.parseEther("100"),
      ]);
      // transfer some tokens
      await erc20
        .connect(config.accounts.deployer)
        .transfer(
          config.ownedCreate2Factory.address,
          ethers.utils.parseEther("1")
        );

      const initialDeployerBalance = await erc20.balanceOf(
        config.accounts.deployer.address
      );
      // check initial balance
      expect(
        await erc20.balanceOf(config.ownedCreate2Factory.address)
      ).to.equal(ethers.utils.parseEther("1"));
      // deployer drains balance
      await config.ownedCreate2Factory
        .connect(config.accounts.deployer)
        .drainERC20(erc20.address, config.accounts.deployer.address);
      const finalDeployerBalance = await erc20.balanceOf(
        config.accounts.deployer.address
      );
      const expectedBalance = initialDeployerBalance.add(
        ethers.utils.parseEther("1")
      );
      expect(finalDeployerBalance).to.equal(expectedBalance);
      // validate contract balance is 0
      expect(
        await erc20.balanceOf(config.ownedCreate2Factory.address)
      ).to.equal(0);
    });
  });
  describe("execCalls", async function () {
    it("reverts if not called by owner", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy mock ERC20 token
      const erc20 = await deployAndGet(config, "ERC20Mock", [
        ethers.utils.parseEther("100"),
      ]);
      const calls = [
        {
          to: erc20.address,
          data: erc20.interface.encodeFunctionData("transfer", [
            config.accounts.deployer.address,
            ethers.utils.parseEther("100"),
          ]),
        },
      ];
      await expect(
        config.ownedCreate2Factory
          .connect(config.accounts.user)
          .execCalls(calls)
      )
        .to.be.revertedWithCustomError(
          config.ownedCreate2Factory,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(config.accounts.user.address);
    });
    it("able to execute transactions on mocked contract", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy ERC20 token
      const erc20 = await deployAndGet(config, "ERC20Mock", [
        ethers.utils.parseEther("100"),
      ]);
      // Initial balance of the deployer
      const initialDeployerBalance = await erc20.balanceOf(
        config.accounts.deployer.address
      );
      // transfer some tokens
      await erc20
        .connect(config.accounts.deployer)
        .transfer(
          config.ownedCreate2Factory.address,
          ethers.utils.parseEther("1")
        );
      const calls = [
        {
          to: erc20.address,
          data: erc20.interface.encodeFunctionData("transfer", [
            config.accounts.deployer.address,
            ethers.utils.parseEther("1"),
          ]),
        },
      ];
      // execute batch of calls
      await expect(
        config.ownedCreate2Factory
          .connect(config.accounts.deployer)
          .execCalls(calls)
      )
        .to.emit(erc20, "Transfer")
        .withArgs(
          config.ownedCreate2Factory.address,
          config.accounts.deployer.address,
          ethers.utils.parseEther("1")
        );
      const expectedFinalBalance = initialDeployerBalance;
      const finalDeployerBalance = await erc20.balanceOf(
        config.accounts.deployer.address
      );
      expect(finalDeployerBalance).to.equal(expectedFinalBalance);
      expect(
        await erc20.balanceOf(config.ownedCreate2Factory.address)
      ).to.equal(ethers.utils.parseEther("0"));
    });
  });
});
