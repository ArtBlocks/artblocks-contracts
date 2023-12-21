import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { Minter_Common } from "../../Minter.common";
import { T_Config } from "../../../../util/common";

/**
 * These tests are intended to check common MinterSetPriceERC20 functionality.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterSetPriceERC20_Common = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("common minter tests", async () => {
    await Minter_Common(_beforeEach);
  });

  describe("updatePricePerTokenInWei", async function () {
    it("only allows artist to update price", async function () {
      const config = await loadFixture(_beforeEach);
      const onlyArtistErrorMessage = "Only Artist";
      // doesn't allow user
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow deployer
      await expectRevert(
        config.minter
          .connect(config.accounts.deployer)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.higherPricePerTokenInWei
        );
    });

    it("enforces price update", async function () {
      const config = await loadFixture(_beforeEach);
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist increases price
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.higherPricePerTokenInWei
        );
      // cannot purchase token at lower price
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          ["purchase(uint256)"](config.projectZero, {
            value: config.pricePerTokenInWei,
          }),
        needMoreValueErrorMessage
      );
      // can purchase token at higher price
      await config.minter
        .connect(config.accounts.user)
        ["purchase(uint256)"](config.projectZero, {
          value: config.higherPricePerTokenInWei,
        });
    });

    it("enforces price update only on desired project", async function () {
      const config = await loadFixture(_beforeEach);
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist increases price of project zero
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.higherPricePerTokenInWei
        );
      // cannot purchase project zero token at lower price
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          ["purchase(uint256)"](config.projectZero, {
            value: config.pricePerTokenInWei,
          }),
        needMoreValueErrorMessage
      );
      // can purchase project one token at lower price
      await config.minter
        .connect(config.accounts.user)
        ["purchase(uint256)"](config.projectOne, {
          value: config.pricePerTokenInWei,
        });
    });

    it("emits event upon price update", async function () {
      const config = await loadFixture(_beforeEach);
      // artist increases price
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          )
      )
        .to.emit(config.minter, "PricePerTokenInWeiUpdated")
        .withArgs(config.projectZero, config.higherPricePerTokenInWei);
    });
  });

  describe("updateProjectCurrencyInfo", async function () {
    it("only allows artist to update currency info", async function () {
      const config = await loadFixture(_beforeEach);
      const onlyArtistErrorMessage = "Only Artist";
      // doesn't allow user
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .updateProjectCurrencyInfo(
            config.projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow deployer
      await expectRevert(
        config.minter
          .connect(config.accounts.deployer)
          .updateProjectCurrencyInfo(
            config.projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .updateProjectCurrencyInfo(
            config.projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await config.minter
        .connect(config.accounts.artist)
        .updateProjectCurrencyInfo(
          config.projectZero,
          "ETH",
          constants.ZERO_ADDRESS
        );
    });

    it("does not allow non-ETH to use zero address", async function () {
      const config = await loadFixture(_beforeEach);
      // doesn't allow user
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .updateProjectCurrencyInfo(
            config.projectZero,
            "NOT_ETH",
            constants.ZERO_ADDRESS
          ),
        "ETH is only null address"
      );
    });

    it("enforces currency info update and allows purchases", async function () {
      const config = await loadFixture(_beforeEach);
      // artist changes to Mock ERC20 token
      await config.minter
        .connect(config.accounts.artist)
        .updateProjectCurrencyInfo(
          config.projectZero,
          "MOCK",
          config.ERC20Mock.address
        );
      // cannot purchase token with ETH
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          ["purchase(uint256)"](config.projectZero, {
            value: config.pricePerTokenInWei,
          }),
        "Currency addresses must match"
      );
      // approve contract and able to mint with Mock token
      await config.ERC20Mock.connect(config.accounts.user).approve(
        config.minter.address,
        ethers.utils.parseEther("100")
      );
      await config.minter
        .connect(config.accounts.user)
        ["purchase(uint256,uint256,address)"](
          config.projectZero,
          config.pricePerTokenInWei,
          config.ERC20Mock.address
        );
      // cannot purchase token with ERC20 token when insufficient balance
      await config.ERC20Mock.connect(config.accounts.user).transfer(
        config.accounts.artist.address,
        ethers.utils.parseEther("100").sub(config.pricePerTokenInWei)
      );
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          ["purchase(uint256,uint256,address)"](
            config.projectZero,
            config.pricePerTokenInWei,
            config.ERC20Mock.address
          ),
        "Insufficient balance"
      );
      // artist changes back to ETH
      await config.minter
        .connect(config.accounts.artist)
        .updateProjectCurrencyInfo(
          config.projectZero,
          "ETH",
          constants.ZERO_ADDRESS
        );
      // able to mint with ETH
      await config.minter
        .connect(config.accounts.user)
        ["purchase(uint256)"](config.projectZero, {
          value: config.pricePerTokenInWei,
        });
    });

    it("enforces currency update only on desired project", async function () {
      const config = await loadFixture(_beforeEach);
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist changes currency info for project zero
      await config.minter
        .connect(config.accounts.artist)
        .updateProjectCurrencyInfo(
          config.projectZero,
          "MOCK",
          config.ERC20Mock.address
        );
      // can purchase project one token with ETH
      await config.minter
        .connect(config.accounts.user)
        ["purchase(uint256)"](config.projectOne, {
          value: config.pricePerTokenInWei,
        });
    });

    it("emits event upon currency update", async function () {
      const config = await loadFixture(_beforeEach);
      // artist changes currency info
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .updateProjectCurrencyInfo(
            config.projectZero,
            "MOCK",
            config.ERC20Mock.address
          )
      )
        .to.emit(config.minter, "ProjectCurrencyInfoUpdated")
        .withArgs(config.projectZero, config.ERC20Mock.address, "MOCK");
    });
  });

  describe("purchase", async function () {
    it("does not allow purchase prior to configuring price", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          ["purchase(uint256)"](config.projectTwo, {
            value: config.pricePerTokenInWei,
          }),
        "Price not configured"
      );
    });

    it("auto-configures if setProjectMaxInvocations is not called (fails correctly)", async function () {
      const config = await loadFixture(_beforeEach);
      for (let i = 0; i < 15; i++) {
        await config.minter
          .connect(config.accounts.user)
          ["purchase(uint256)"](config.projectZero, {
            value: config.pricePerTokenInWei,
          });
      }

      const userBalance = await config.accounts.user.getBalance();
      // since auto-configured, we should see the minter's revert message
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          ["purchase(uint256)"](config.projectZero, {
            value: config.pricePerTokenInWei,
          }),
        "Maximum number of invocations reached"
      );
    });

    it("doesnt add too much gas if setProjectMaxInvocations is set", async function () {
      const config = await loadFixture(_beforeEach);
      const minterType = await config.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? config.accounts.deployer
          : config.accounts.artist;

      const tx = await config.minter
        .connect(config.accounts.user)
        ["purchase(uint256)"](config.projectZero, {
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
        .connect(accountToTestWith)
        .setProjectMaxInvocations(config.projectOne);

      const maxSetTx = await config.minter
        .connect(config.accounts.user)
        ["purchase(uint256)"](config.projectOne, {
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
      expect(gasCostMaxInvocations < (gasCostNoMaxInvocations * 150) / 100).to
        .be.true;
    });
  });

  describe("purchaseTo", async function () {
    it("does not allow purchase prior to configuring price", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          ["purchaseTo(address,uint256)"](
            config.accounts.additional.address,
            config.projectTwo,
            {
              value: config.pricePerTokenInWei,
            }
          ),
        "Price not configured"
      );
    });

    it("allows `purchaseTo` by default", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.user)
        ["purchaseTo(address,uint256)"](
          config.accounts.additional.address,
          config.projectOne,
          {
            value: config.pricePerTokenInWei,
          }
        );
    });
  });

  describe("setProjectMaxInvocations", async function () {
    it("handles getting tokenInfo invocation info with V1 core", async function () {
      const config = await loadFixture(_beforeEach);
      const minterType = await config.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? config.accounts.deployer
          : config.accounts.artist;
      await config.minter
        .connect(accountToTestWith)
        .setProjectMaxInvocations(config.projectOne);
      // minter should update storage with accurate projectMaxInvocations
      let maxInvocations = await config.minter
        .connect(accountToTestWith)
        .projectMaxInvocations(config.projectOne);
      expect(maxInvocations).to.be.equal(config.maxInvocations);
      // ensure hasMaxBeenReached did not unexpectedly get set as true
      let hasMaxBeenInvoked = await config.minter
        .connect(config.accounts.deployer)
        .projectMaxHasBeenInvoked(config.projectOne);
      expect(hasMaxBeenInvoked).to.be.false;
    });

    it("reverts for unconfigured/non-existent project", async function () {
      const config = await loadFixture(_beforeEach);
      // trying to set config on unconfigured project (e.g. 99) should cause
      // revert on the underlying CoreContract.
      const minterType = await config.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? config.accounts.deployer
          : config.accounts.artist;
      expectRevert(
        config.minter.connect(accountToTestWith).setProjectMaxInvocations(99),
        "Project ID does not exist"
      );
    });
  });

  describe("currency info hooks", async function () {
    const unconfiguredProjectNumber = 99;
    it("reports ERC20 token symbol and address if set", async function () {
      const config = await loadFixture(_beforeEach);
      // artist changes to Mock ERC20 token
      await config.minter
        .connect(config.accounts.artist)
        .updateProjectCurrencyInfo(
          config.projectZero,
          "MOCK",
          config.ERC20Mock.address
        );
      // reports ERC20 updated price information
      const currencyInfo = await config.minter
        .connect(config.accounts.artist)
        .getPriceInfo(config.projectZero);
      expect(currencyInfo.currencySymbol).to.be.equal("MOCK");
      expect(currencyInfo.currencyAddress).to.be.equal(
        config.ERC20Mock.address
      );
    });
  });

  describe("getYourBalanceOfProjectERC20", async function () {
    it("returns expected value", async function () {
      const config = await loadFixture(_beforeEach);
      // artist changes to Mock ERC20 token
      await config.minter
        .connect(config.accounts.artist)
        .updateProjectCurrencyInfo(
          config.projectZero,
          "MOCK",
          config.ERC20Mock.address
        );
      // reports expected value
      expect(
        await config.minter
          .connect(config.accounts.user)
          .getYourBalanceOfProjectERC20(config.projectZero)
      ).to.be.equal(ethers.utils.parseEther("100"));
      expect(
        await config.minter
          .connect(config.accounts.artist)
          .getYourBalanceOfProjectERC20(config.projectZero)
      ).to.be.equal(0);
    });
  });

  describe("checkYourAllowanceOfProjectERC20", async function () {
    it("returns expected value", async function () {
      const config = await loadFixture(_beforeEach);
      // artist changes to Mock ERC20 token
      await config.minter
        .connect(config.accounts.artist)
        .updateProjectCurrencyInfo(
          config.projectZero,
          "MOCK",
          config.ERC20Mock.address
        );
      // reports expected value
      expect(
        await config.minter
          .connect(config.accounts.user)
          .checkYourAllowanceOfProjectERC20(config.projectZero)
      ).to.be.equal(0);
      // user approve contract and able to spend Mock token
      await config.ERC20Mock.connect(config.accounts.user).approve(
        config.minter.address,
        ethers.utils.parseEther("50")
      );
      // reports expected value
      expect(
        await config.minter
          .connect(config.accounts.user)
          .checkYourAllowanceOfProjectERC20(config.projectZero)
      ).to.be.equal(ethers.utils.parseEther("50"));
    });
  });
};
