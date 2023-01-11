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
  safeAddProject,
} from "../util/common";

const runForEach = [
  {
    core: "GenArt721CoreV1",
    coreFirstProjectNumber: 3,
    minterFilter: "MinterFilterV0",
    minter: "MinterSetPriceV0",
  },
  {
    core: "GenArt721CoreV3",
    coreFirstProjectNumber: 0,
    minterFilter: "MinterFilterV1",
    minter: "MinterSetPriceV2",
  },
];

runForEach.forEach((params) => {
  describe(`Minter Suite Integration - Core: ${params.core}`, async function () {
    beforeEach(async function () {
      // standard accounts and constants
      this.accounts = await getAccounts();
      await assignDefaultConstants.call(this, params.coreFirstProjectNumber); // this.this.projectZero = 3 on V1 core
      this.higherPricePerTokenInWei = this.pricePerTokenInWei.add(
        ethers.utils.parseEther("0.1")
      );
      // deploy and configure minter filter and minter
      ({
        genArt721Core: this.genArt721Core,
        minterFilter: this.minterFilter,
        randomizer: this.randomizer,
      } = await deployCoreWithMinterFilter.call(
        this,
        params.core,
        params.minterFilter
      ));

      this.minter = await deployAndGet.call(this, params.minter, [
        this.genArt721Core.address,
        this.minterFilter.address,
      ]);

      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      // add projects this.projectZero and this.projectOne
      await safeAddProject(
        this.genArt721Core,
        this.accounts.deployer,
        this.accounts.artist.address
      );
      await safeAddProject(
        this.genArt721Core,
        this.accounts.deployer,
        this.accounts.artist.address
      );

      await this.genArt721Core
        .connect(this.accounts.deployer)
        .toggleProjectIsActive(this.projectZero);
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .toggleProjectIsActive(this.projectOne);

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

      // set project minters and prices
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectZero, this.pricePerTokenInWei);
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectOne, this.pricePerTokenInWei);
      await this.minterFilter
        .connect(this.accounts.artist)
        .setMinterForProject(this.projectZero, this.minter.address);
      await this.minterFilter
        .connect(this.accounts.artist)
        .setMinterForProject(this.projectOne, this.minter.address);
    });

    describe("purchase", async function () {
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
          "Gas cost for a mint with setProjectMaxInvocations: ",
          gasCostMaxInvocations.toString(),
          "ETH"
        );
        console.log(
          "Gas cost for a mint without setProjectMaxInvocations: ",
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
        const userBalanceNoMaxSet = BigNumber.from(
          await this.accounts.user.getBalance()
        );
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
});
