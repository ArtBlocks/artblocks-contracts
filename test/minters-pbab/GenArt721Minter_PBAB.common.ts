import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

/**
 * These tests ensure PBAB minters integrates properly with the PBAB core
 * contract. Some minters may need additional tests beyond these common tests.
 */
export const GenArt721Minter_PBAB_Common = async () => {
  describe("updateProjectPricePerTokenInWei", async function () {
    it("only allows artist to update price", async function () {
      const onlyArtistErrorMessage = "Only artist";
      // doesn't allow user
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.user)
          .updateProjectPricePerTokenInWei(
            this.projectZero,
            this.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow deployer
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProjectPricePerTokenInWei(
            this.projectZero,
            this.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.additional)
          .updateProjectPricePerTokenInWei(
            this.projectZero,
            this.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectPricePerTokenInWei(
          this.projectZero,
          this.higherPricePerTokenInWei
        );
    });

    it("enforces price update", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist increases price
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectPricePerTokenInWei(
          this.projectZero,
          this.higherPricePerTokenInWei
        );
      // cannot purchase token at lower price
      await expectRevert(
        this.minter.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        }),
        needMoreValueErrorMessage
      );
      // can purchase token at higher price
      await this.minter.connect(this.accounts.user).purchase(this.projectZero, {
        value: this.higherPricePerTokenInWei,
      });
    });

    it("enforces price update only on desired project", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist increases price of project zero
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectPricePerTokenInWei(
          this.projectZero,
          this.higherPricePerTokenInWei
        );
      // cannot purchase project zero token at lower price
      await expectRevert(
        this.minter.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        }),
        needMoreValueErrorMessage
      );
      // can purchase project one token at lower price
      await this.minter.connect(this.accounts.user).purchase(this.projectOne, {
        value: this.pricePerTokenInWei,
      });
    });
  });

  describe("updateProjectCurrencyInfo", async function () {
    it("only allows artist to update currency info", async function () {
      const onlyArtistErrorMessage = "Only artist";
      // doesn't allow user
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.user)
          .updateProjectCurrencyInfo(
            this.projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow deployer
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProjectCurrencyInfo(
            this.projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.additional)
          .updateProjectCurrencyInfo(
            this.projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          this.projectZero,
          "ETH",
          constants.ZERO_ADDRESS
        );
    });

    it("enforces currency info update and allows purchases", async function () {
      // artist changes to Mock ERC20 token
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          this.projectZero,
          "MOCK",
          this.ERC20Mock.address
        );
      // cannot purchase token with ETH
      await expectRevert(
        this.minter.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        }),
        "this project accepts a different currency and cannot accept ETH"
      );
      // approve contract and able to mint with Mock token
      await this.ERC20Mock.connect(this.accounts.user).approve(
        this.minter.address,
        ethers.utils.parseEther("100")
      );
      await this.minter.connect(this.accounts.user).purchase(this.projectZero);
      // cannot purchase token with ERC20 token when insufficient balance
      await this.ERC20Mock.connect(this.accounts.user).transfer(
        this.accounts.artist.address,
        ethers.utils.parseEther("100").sub(this.pricePerTokenInWei)
      );
      await expectRevert(
        this.minter.connect(this.accounts.user).purchase(this.projectZero),
        "Insufficient balance"
      );
      // artist changes back to ETH
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          this.projectZero,
          "ETH",
          constants.ZERO_ADDRESS
        );
      // able to mint with ETH
      await this.minter.connect(this.accounts.user).purchase(this.projectZero, {
        value: this.pricePerTokenInWei,
      });
    });

    it("enforces currency update only on desired project", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist changes currency info for project zero
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          this.projectZero,
          "MOCK",
          this.ERC20Mock.address
        );
      // can purchase project one token with ETH
      await this.minter.connect(this.accounts.user).purchase(this.projectOne, {
        value: this.pricePerTokenInWei,
      });
    });
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
        "Gas cost for a successful mint with setProjectMaxInvocations: ",
        gasCostMaxInvocations.toString(),
        "ETH"
      );
      console.log(
        "Gas cost for a successful mint without setProjectMaxInvocations: ",
        gasCostNoMaxInvocations.toString(),
        "ETH"
      );

      // Check that with setProjectMaxInvocations it's not too much more expensive
      expect(gasCostMaxInvocations < (gasCostNoMaxInvocations * 140) / 100).to
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

  describe("purchaseTo", async function () {
    it("allows `purchaseTo` by default", async function () {
      await this.minter
        .connect(this.accounts.user)
        .purchaseTo(this.accounts.additional.address, this.projectOne, {
          value: this.pricePerTokenInWei,
        });
    });
  });

  describe("setProjectMaxInvocations", async function () {
    it("handles getting tokenInfo invocation info with core", async function () {
      // minter should update storage with accurate projectMaxInvocations
      await this.minter
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(this.projectOne);
      let maxInvocations = await this.minter
        .connect(this.accounts.deployer)
        .projectMaxInvocations(this.projectOne);
      expect(maxInvocations).to.be.equal(this.maxInvocations);
      // ensure hasMaxBeenReached did not unexpectedly get set as true
      let hasMaxBeenInvoked = await this.minter
        .connect(this.accounts.deployer)
        .projectMaxHasBeenInvoked(this.projectOne);
      expect(hasMaxBeenInvoked).to.be.false;
    });
  });

  describe("reentrancy attack", async function () {
    it("does not allow reentrant purchaseTo", async function () {
      // attacker deploys reentrancy contract
      const reentrancyMockFactory = await ethers.getContractFactory(
        "ReentrancyMock"
      );
      const reentrancyMock = await reentrancyMockFactory
        .connect(this.accounts.deployer)
        .deploy();
      // attacker should see revert when performing reentrancy attack
      const totalTokensToMint = 2;
      let numTokensToMint = BigNumber.from(totalTokensToMint.toString());
      let totalValue = this.higherPricePerTokenInWei.mul(numTokensToMint);
      await expectRevert(
        reentrancyMock
          .connect(this.accounts.deployer)
          .attack(
            numTokensToMint,
            this.minter.address,
            this.projectOne,
            this.higherPricePerTokenInWei,
            {
              value: totalValue,
            }
          ),
        // failure message occurs during refund, where attack reentrency occurs
        "Refund failed"
      );
      // attacker should be able to purchase ONE token at a time w/refunds
      numTokensToMint = BigNumber.from("1");
      totalValue = this.higherPricePerTokenInWei.mul(numTokensToMint);
      for (let i = 0; i < totalTokensToMint; i++) {
        await reentrancyMock
          .connect(this.accounts.deployer)
          .attack(
            numTokensToMint,
            this.minter.address,
            this.projectOne,
            this.higherPricePerTokenInWei,
            {
              value: this.higherPricePerTokenInWei,
            }
          );
      }
    });
  });
};
