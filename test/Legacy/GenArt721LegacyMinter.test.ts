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

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../util/common";

describe("GenArt721Minter", async function () {
  beforeEach(async function () {
    this.accounts = await getAccounts.call(this);
    await assignDefaultConstants.call(this, 3);
    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();
    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV1");
    this.genArt721Core = await artblocksFactory
      .connect(this.accounts.deployer)
      .deploy(this.name, this.symbol, this.randomizer.address);
    // deploy minter
    const minterFactory = await ethers.getContractFactory(
      "GenArt721LegacyMinter"
    );
    this.minter = await minterFactory.deploy(this.genArt721Core.address);

    // add projects
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject(
        "project1",
        this.accounts.artist.address,
        this.pricePerTokenInWei,
        false
      );
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject(
        "project2",
        this.accounts.artist.address,
        this.pricePerTokenInWei,
        false
      );

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectOne);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addMintWhitelisted(this.minter.address);

    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, 15);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectOne, 15);

    this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectZero);
    this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectOne);
  });

  describe("(LEGACY MINTER) purchase method", async function () {
    it("mints and calculates gas values", async function () {
      await this.minter.connect(this.accounts.user).purchase(this.projectZero, {
        value: this.pricePerTokenInWei,
      });

      const tx = await this.minter
        .connect(this.accounts.user)
        .purchase(this.projectOne, {
          value: this.pricePerTokenInWei,
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
      for (let i = 0; i < 15; i++) {
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero, {
            value: this.pricePerTokenInWei,
          });
      }

      const userBalance = await this.accounts.user.getBalance();
      await expectRevert(
        this.minter.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        }),
        "Must not exceed max invocations"
      );
    });

    it("doesnt add too much gas if setProjectMaxInvocations is set", async function () {
      // Try without setProjectMaxInvocations, store gas cost
      const tx = await this.minter
        .connect(this.accounts.user)
        .purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        });

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      let gasCostNoMaxInvocations: any = receipt.effectiveGasPrice
        .mul(receipt.gasUsed)
        .toString();
      gasCostNoMaxInvocations = parseFloat(
        ethers.utils.formatUnits(gasCostNoMaxInvocations, "ether")
      );

      // Try with setProjectMaxInvocations, store gas cost
      await this.minter
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(this.projectOne);
      const maxSetTx = await this.minter
        .connect(this.accounts.user)
        .purchase(this.projectOne, {
          value: this.pricePerTokenInWei,
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
      // Try without setProjectMaxInvocations, store gas cost
      for (let i = 0; i < 15; i++) {
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero, {
            value: this.pricePerTokenInWei,
          });
      }
      const userBalanceNoMaxSet = await this.accounts.user.getBalance();
      await expectRevert(
        this.minter.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        }),
        "Must not exceed max invocations"
      );
      const userDeltaNoMaxSet = userBalanceNoMaxSet.sub(
        BigNumber.from(await this.accounts.user.getBalance())
      );

      // Try with setProjectMaxInvocations, store gas cost
      await this.minter
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(this.projectOne);
      for (let i = 0; i < 15; i++) {
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectOne, {
            value: this.pricePerTokenInWei,
          });
      }
      const userBalanceMaxSet = BigNumber.from(
        await this.accounts.user.getBalance()
      );
      await expectRevert(
        this.minter.connect(this.accounts.user).purchase(this.projectOne, {
          value: this.pricePerTokenInWei,
        }),
        "Maximum number of invocations reached"
      );
      const userDeltaMaxSet = userBalanceMaxSet.sub(
        BigNumber.from(await this.accounts.user.getBalance())
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
