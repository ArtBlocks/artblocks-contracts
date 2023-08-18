import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../util/common";

describe("GenArt721Minter", async function () {
  async function _beforeEach() {
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config, 3);

    const randomizerFactory =
      await ethers.getContractFactory("BasicRandomizer");
    config.randomizer = await randomizerFactory.deploy();
    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV1");
    config.genArt721Core = await artblocksFactory
      .connect(config.accounts.deployer)
      .deploy(config.name, config.symbol, config.randomizer.address);
    // deploy minter
    const minterFactory = await ethers.getContractFactory(
      "GenArt721LegacyMinter"
    );
    config.minter = await minterFactory.deploy(config.genArt721Core.address);

    // add projects
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .addProject(
        "project1",
        config.accounts.artist.address,
        config.pricePerTokenInWei,
        false
      );
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .addProject(
        "project2",
        config.accounts.artist.address,
        config.pricePerTokenInWei,
        false
      );

    await config.genArt721Core
      .connect(config.accounts.deployer)
      .toggleProjectIsActive(config.projectZero);
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .toggleProjectIsActive(config.projectOne);

    await config.genArt721Core
      .connect(config.accounts.deployer)
      .addMintWhitelisted(config.minter.address);

    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectMaxInvocations(config.projectZero, 15);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectMaxInvocations(config.projectOne, 15);

    await config.genArt721Core
      .connect(config.accounts.artist)
      .toggleProjectIsPaused(config.projectZero);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .toggleProjectIsPaused(config.projectOne);
    return config;
  }

  describe("(LEGACY MINTER) purchase method", async function () {
    it("mints and calculates gas values [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero, {
          value: config.pricePerTokenInWei,
        });

      const tx = await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectOne, {
          value: config.pricePerTokenInWei,
        });

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed).toString();
      console.log(
        "Gas cost for a successful (LEGACY) Ether mint: ",
        ethers.utils.formatUnits(txCost, "ether").toString(),
        "ETH"
      );

      expect(txCost.toString()).to.equal(ethers.utils.parseEther("0.0356173")); // assuming a cost of 100 GWEI
    });

    it("does nothing if setProjectMaxInvocations is not called (fails correctly)", async function () {
      const config = await loadFixture(_beforeEach);
      for (let i = 0; i < 15; i++) {
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          });
      }

      const userBalance = await config.accounts.user.getBalance();
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          }),
        "Must not exceed max invocations"
      );
    });

    it("doesnt add too much gas if setProjectMaxInvocations is set", async function () {
      const config = await loadFixture(_beforeEach);
      // Try without setProjectMaxInvocations, store gas cost
      const tx = await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero, {
          value: config.pricePerTokenInWei,
        });

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      let gasCostNoMaxInvocations: any = receipt.effectiveGasPrice
        .mul(receipt.gasUsed)
        .toString();
      gasCostNoMaxInvocations = parseFloat(
        ethers.utils.formatUnits(gasCostNoMaxInvocations, "ether")
      );

      // Try with setProjectMaxInvocations, store gas cost
      await config.minter
        .connect(config.accounts.deployer)
        .setProjectMaxInvocations(config.projectOne);
      const maxSetTx = await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectOne, {
          value: config.pricePerTokenInWei,
        });
      const receipt2 = await ethers.provider.getTransactionReceipt(
        maxSetTx.hash
      );
      let gasCostMaxInvocations: any = receipt2.effectiveGasPrice
        .mul(receipt2.gasUsed)
        .toString();
      gasCostMaxInvocations = parseFloat(
        ethers.utils.formatUnits(gasCostMaxInvocations, "ether")
      );

      console.log(
        "Gas cost for successful mint with setProjectMaxInvocations: ",
        gasCostMaxInvocations.toString(),
        "ETH"
      );
      console.log(
        "Gas cost for successful mint without setProjectMaxInvocations: ",
        gasCostNoMaxInvocations.toString(),
        "ETH"
      );

      // Check that with setProjectMaxInvocations it's cheaper or not too much more expensive
      expect(gasCostMaxInvocations < (gasCostNoMaxInvocations * 110) / 100).to
        .be.true;
    });

    it("fails more cheaply if setProjectMaxInvocations is set", async function () {
      const config = await loadFixture(_beforeEach);
      // Try without setProjectMaxInvocations, store gas cost
      for (let i = 0; i < 15; i++) {
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          });
      }
      const userBalanceNoMaxSet = await config.accounts.user.getBalance();
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          }),
        "Must not exceed max invocations"
      );
      const userDeltaNoMaxSet = userBalanceNoMaxSet.sub(
        BigNumber.from(await config.accounts.user.getBalance())
      );

      // Try with setProjectMaxInvocations, store gas cost
      await config.minter
        .connect(config.accounts.deployer)
        .setProjectMaxInvocations(config.projectOne);
      for (let i = 0; i < 15; i++) {
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectOne, {
            value: config.pricePerTokenInWei,
          });
      }
      const userBalanceMaxSet = BigNumber.from(
        await config.accounts.user.getBalance()
      );
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .purchase(config.projectOne, {
            value: config.pricePerTokenInWei,
          }),
        "Maximum number of invocations reached"
      );
      const userDeltaMaxSet = userBalanceMaxSet.sub(
        BigNumber.from(await config.accounts.user.getBalance())
      );

      console.log(
        "Gas cost with setProjectMaxInvocations: ",
        ethers.utils.formatUnits(userDeltaMaxSet, "ether").toString(),
        "ETH"
      );
      console.log(
        "Gas cost without setProjectMaxInvocations: ",
        ethers.utils.formatUnits(userDeltaNoMaxSet, "ether").toString(),
        "ETH"
      );

      expect(userDeltaMaxSet.lt(userDeltaNoMaxSet)).to.be.true;
    });
  });
});
