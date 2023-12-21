import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

import { Minter_Common } from "../../Minter.common";

/**
 * These tests are intended to check common MinterSetPriceERC20 functionality.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterSetPriceERC20_Common = async () => {
  describe("common minter tests", async () => {
    await Minter_Common();
  });

  describe("updatePricePerTokenInWei", async function () {
    it("only allows artist to update price", async function () {
      const onlyArtistErrorMessage = "Only Artist";
      // doesn't allow user
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          .updatePricePerTokenInWei(
            this.projectZero,
            this.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow deployer
      await expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .updatePricePerTokenInWei(
            this.projectZero,
            this.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .updatePricePerTokenInWei(
            this.projectZero,
            this.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(
          this.projectZero,
          this.higherPricePerTokenInWei
        );
    });

    it("enforces price update", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist increases price
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(
          this.projectZero,
          this.higherPricePerTokenInWei
        );
      // cannot purchase token at lower price
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchase(uint256)"](this.projectZero, {
            value: this.pricePerTokenInWei,
          }),
        needMoreValueErrorMessage
      );
      // can purchase token at higher price
      await this.minter
        .connect(this.accounts.user)
        ["purchase(uint256)"](this.projectZero, {
          value: this.higherPricePerTokenInWei,
        });
    });

    it("enforces price update only on desired project", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist increases price of project zero
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(
          this.projectZero,
          this.higherPricePerTokenInWei
        );
      // cannot purchase project zero token at lower price
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchase(uint256)"](this.projectZero, {
            value: this.pricePerTokenInWei,
          }),
        needMoreValueErrorMessage
      );
      // can purchase project one token at lower price
      await this.minter
        .connect(this.accounts.user)
        ["purchase(uint256)"](this.projectOne, {
          value: this.pricePerTokenInWei,
        });
    });

    it("emits event upon price update", async function () {
      // artist increases price
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .updatePricePerTokenInWei(
            this.projectZero,
            this.higherPricePerTokenInWei
          )
      )
        .to.emit(this.minter, "PricePerTokenInWeiUpdated")
        .withArgs(this.projectZero, this.higherPricePerTokenInWei);
    });
  });

  describe("updateProjectCurrencyInfo", async function () {
    it("only allows artist to update currency info", async function () {
      const onlyArtistErrorMessage = "Only Artist";
      // doesn't allow user
      await expectRevert(
        this.minter
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
        this.minter
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
        this.minter
          .connect(this.accounts.additional)
          .updateProjectCurrencyInfo(
            this.projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          this.projectZero,
          "ETH",
          constants.ZERO_ADDRESS
        );
    });

    it("does not allow non-ETH to use zero address", async function () {
      // doesn't allow user
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .updateProjectCurrencyInfo(
            this.projectZero,
            "NOT_ETH",
            constants.ZERO_ADDRESS
          ),
        "ETH is only null address"
      );
    });

    it("enforces currency info update and allows purchases", async function () {
      // artist changes to Mock ERC20 token
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          this.projectZero,
          "MOCK",
          this.ERC20Mock.address
        );
      // cannot purchase token with ETH
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchase(uint256)"](this.projectZero, {
            value: this.pricePerTokenInWei,
          }),
        "Currency addresses must match"
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
        this.minter
          .connect(this.accounts.user)
          ["purchase(uint256,uint256,address)"](
            this.projectZero,
            this.pricePerTokenInWei,
            this.ERC20Mock.address
          ),
        "Insufficient balance"
      );
      // artist changes back to ETH
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          this.projectZero,
          "ETH",
          constants.ZERO_ADDRESS
        );
      // able to mint with ETH
      await this.minter
        .connect(this.accounts.user)
        ["purchase(uint256)"](this.projectZero, {
          value: this.pricePerTokenInWei,
        });
    });

    it("enforces currency update only on desired project", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist changes currency info for project zero
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          this.projectZero,
          "MOCK",
          this.ERC20Mock.address
        );
      // can purchase project one token with ETH
      await this.minter
        .connect(this.accounts.user)
        ["purchase(uint256)"](this.projectOne, {
          value: this.pricePerTokenInWei,
        });
    });

    it("emits event upon currency update", async function () {
      // artist changes currency info
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .updateProjectCurrencyInfo(
            this.projectZero,
            "MOCK",
            this.ERC20Mock.address
          )
      )
        .to.emit(this.minter, "ProjectCurrencyInfoUpdated")
        .withArgs(this.projectZero, this.ERC20Mock.address, "MOCK");
    });
  });

  describe("purchase", async function () {
    it("does not allow purchase prior to configuring price", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchase(uint256)"](this.projectTwo, {
            value: this.pricePerTokenInWei,
          }),
        "Price not configured"
      );
    });

    it("does nothing if setProjectMaxInvocations is not called (fails correctly)", async function () {
      for (let i = 0; i < 15; i++) {
        await this.minter
          .connect(this.accounts.user)
          ["purchase(uint256)"](this.projectZero, {
            value: this.pricePerTokenInWei,
          });
      }

      const userBalance = await this.accounts.user.getBalance();
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchase(uint256)"](this.projectZero, {
            value: this.pricePerTokenInWei,
          }),
        "Must not exceed max invocations"
      );
    });

    it("doesnt add too much gas if setProjectMaxInvocations is set", async function () {
      const tx = await this.minter
        .connect(this.accounts.user)
        ["purchase(uint256)"](this.projectZero, {
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
        ["purchase(uint256)"](this.projectOne, {
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
      // Check that with setProjectMaxInvocations it's not too much moer expensive
      // TODO - determine why prtnr is increased so much - probably because token zero is usually much cheaper storage
      expect(gasCostMaxInvocations < (gasCostNoMaxInvocations * 150) / 100).to
        .be.true;
    });

    it("fails more cheaply if setProjectMaxInvocations is set", async function () {
      // Try without setProjectMaxInvocations, store gas cost
      for (let i = 0; i < 15; i++) {
        await this.minter
          .connect(this.accounts.user)
          ["purchase(uint256)"](this.projectZero, {
            value: this.pricePerTokenInWei,
          });
      }
      const userBalanceNoMaxSet = BigNumber.from(
        await this.accounts.user.getBalance()
      );
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchase(uint256)"](this.projectZero, {
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
          ["purchase(uint256)"](this.projectOne, {
            value: this.pricePerTokenInWei,
          });
      }
      const userBalanceMaxSet = BigNumber.from(
        await this.accounts.user.getBalance()
      );
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchase(uint256)"](this.projectOne, {
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
    it("does not allow purchase prior to configuring price", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchaseTo(address,uint256)"](
            this.accounts.additional.address,
            this.projectTwo,
            {
              value: this.pricePerTokenInWei,
            }
          ),
        "Price not configured"
      );
    });

    it("allows `purchaseTo` by default", async function () {
      await this.minter
        .connect(this.accounts.user)
        ["purchaseTo(address,uint256)"](
          this.accounts.additional.address,
          this.projectOne,
          {
            value: this.pricePerTokenInWei,
          }
        );
    });
  });

  describe("setProjectMaxInvocations", async function () {
    it("handles getting tokenInfo invocation info with V1 core", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(this.projectOne);
      // minter should update storage with accurate projectMaxInvocations
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

    it("reverts for unconfigured/non-existent project", async function () {
      // trying to set this on unconfigured project (e.g. 99) should cause
      // revert on the underlying CoreContract.
      expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .setProjectMaxInvocations(99),
        "Project ID does not exist"
      );
    });
  });

  describe("currency info hooks", async function () {
    const unconfiguredProjectNumber = 99;
    it("reports ERC20 token symbol and address if set", async function () {
      // artist changes to Mock ERC20 token
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          this.projectZero,
          "MOCK",
          this.ERC20Mock.address
        );
      // reports ERC20 updated price information
      const currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(this.projectZero);
      expect(currencyInfo.currencySymbol).to.be.equal("MOCK");
      expect(currencyInfo.currencyAddress).to.be.equal(this.ERC20Mock.address);
    });
  });

  describe("getYourBalanceOfProjectERC20", async function () {
    it("returns expected value", async function () {
      // artist changes to Mock ERC20 token
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          this.projectZero,
          "MOCK",
          this.ERC20Mock.address
        );
      // reports expected value
      expect(
        await this.minter
          .connect(this.accounts.user)
          .getYourBalanceOfProjectERC20(this.projectZero)
      ).to.be.equal(ethers.utils.parseEther("100"));
      expect(
        await this.minter
          .connect(this.accounts.artist)
          .getYourBalanceOfProjectERC20(this.projectZero)
      ).to.be.equal(0);
    });
  });

  describe("checkYourAllowanceOfProjectERC20", async function () {
    it("returns expected value", async function () {
      // artist changes to Mock ERC20 token
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          this.projectZero,
          "MOCK",
          this.ERC20Mock.address
        );
      // reports expected value
      expect(
        await this.minter
          .connect(this.accounts.user)
          .checkYourAllowanceOfProjectERC20(this.projectZero)
      ).to.be.equal(0);
      // user approve contract and able to spend Mock token
      await this.ERC20Mock.connect(this.accounts.user).approve(
        this.minter.address,
        ethers.utils.parseEther("50")
      );
      // reports expected value
      expect(
        await this.minter
          .connect(this.accounts.user)
          .checkYourAllowanceOfProjectERC20(this.projectZero)
      ).to.be.equal(ethers.utils.parseEther("50"));
    });
  });
};
