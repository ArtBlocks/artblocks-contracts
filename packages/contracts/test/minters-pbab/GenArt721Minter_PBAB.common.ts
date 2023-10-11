import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { T_Config } from "../util/common";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

/**
 * These tests ensure PBAB minters integrates properly with the PBAB core
 * contract. Some minters may need additional tests beyond these common tests.
 */
export const GenArt721Minter_PBAB_Common = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("updateProjectPricePerTokenInWei", async function () {
    it("only allows artist to update price", async function () {
      const config = await loadFixture(_beforeEach);
      const onlyArtistErrorMessage = "Only artist";
      // doesn't allow user
      await expectRevert(
        config.genArt721Core
          .connect(config.accounts.user)
          .updateProjectPricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow deployer
      await expectRevert(
        config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProjectPricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        config.genArt721Core
          .connect(config.accounts.additional)
          .updateProjectPricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectPricePerTokenInWei(
          config.projectZero,
          config.higherPricePerTokenInWei
        );
    });

    it("enforces price update", async function () {
      const config = await loadFixture(_beforeEach);
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist increases price
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectPricePerTokenInWei(
          config.projectZero,
          config.higherPricePerTokenInWei
        );
      // cannot purchase token at lower price
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          }),
        needMoreValueErrorMessage
      );
      // can purchase token at higher price
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero, {
          value: config.higherPricePerTokenInWei,
        });
    });

    it("enforces price update only on desired project", async function () {
      const config = await loadFixture(_beforeEach);
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist increases price of project zero
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectPricePerTokenInWei(
          config.projectZero,
          config.higherPricePerTokenInWei
        );
      // cannot purchase project zero token at lower price
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          }),
        needMoreValueErrorMessage
      );
      // can purchase project one token at lower price
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectOne, {
          value: config.pricePerTokenInWei,
        });
    });
  });

  describe("updateProjectCurrencyInfo", async function () {
    it("only allows artist to update currency info", async function () {
      const config = await loadFixture(_beforeEach);
      const onlyArtistErrorMessage = "Only artist";
      // doesn't allow user
      await expectRevert(
        config.genArt721Core
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
        config.genArt721Core
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
        config.genArt721Core
          .connect(config.accounts.additional)
          .updateProjectCurrencyInfo(
            config.projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectCurrencyInfo(
          config.projectZero,
          "ETH",
          constants.ZERO_ADDRESS
        );
    });

    it("enforces currency info update and allows purchases", async function () {
      const config = await loadFixture(_beforeEach);
      // artist changes to Mock ERC20 token
      await config.genArt721Core
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
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          }),
        "this project accepts a different currency and cannot accept ETH"
      );
      // approve contract and able to mint with Mock token
      await config.ERC20Mock.connect(config.accounts.user).approve(
        config.minter.address,
        ethers.utils.parseEther("100")
      );
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero);
      // cannot purchase token with ERC20 token when insufficient balance
      await config.ERC20Mock.connect(config.accounts.user).transfer(
        config.accounts.artist.address,
        ethers.utils.parseEther("100").sub(config.pricePerTokenInWei)
      );
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero),
        "Insufficient balance"
      );
      // artist changes back to ETH
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectCurrencyInfo(
          config.projectZero,
          "ETH",
          constants.ZERO_ADDRESS
        );
      // able to mint with ETH
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero, {
          value: config.pricePerTokenInWei,
        });
    });

    it("enforces currency update only on desired project", async function () {
      const config = await loadFixture(_beforeEach);
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist changes currency info for project zero
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectCurrencyInfo(
          config.projectZero,
          "MOCK",
          config.ERC20Mock.address
        );
      // can purchase project one token with ETH
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectOne, {
          value: config.pricePerTokenInWei,
        });
    });
  });

  describe("purchase", async function () {
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

  describe("purchaseTo", async function () {
    it("allows `purchaseTo` by default", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.user)
        .purchaseTo(config.accounts.additional.address, config.projectOne, {
          value: config.pricePerTokenInWei,
        });
    });
  });

  describe("setProjectMaxInvocations", async function () {
    it("handles getting tokenInfo invocation info with core", async function () {
      const config = await loadFixture(_beforeEach);
      // minter should update storage with accurate projectMaxInvocations
      await config.minter
        .connect(config.accounts.deployer)
        .setProjectMaxInvocations(config.projectOne);
      let maxInvocations = await config.minter
        .connect(config.accounts.deployer)
        .projectMaxInvocations(config.projectOne);
      expect(maxInvocations).to.be.equal(config.maxInvocations);
      // ensure hasMaxBeenReached did not unexpectedly get set as true
      let hasMaxBeenInvoked = await config.minter
        .connect(config.accounts.deployer)
        .projectMaxHasBeenInvoked(config.projectOne);
      expect(hasMaxBeenInvoked).to.be.false;
    });
  });

  describe("reentrancy attack", async function () {
    it("does not allow reentrant purchaseTo", async function () {
      const config = await loadFixture(_beforeEach);
      // attacker deploys reentrancy contract
      const reentrancyMockFactory =
        await ethers.getContractFactory("ReentrancyMock");
      const reentrancyMock = await reentrancyMockFactory
        .connect(config.accounts.deployer)
        .deploy();
      // attacker should see revert when performing reentrancy attack
      const totalTokensToMint = 2;
      let numTokensToMint = BigNumber.from(totalTokensToMint.toString());
      let totalValue = config.higherPricePerTokenInWei.mul(numTokensToMint);
      await expectRevert(
        reentrancyMock
          .connect(config.accounts.deployer)
          .attack(
            numTokensToMint,
            config.minter.address,
            config.projectOne,
            config.higherPricePerTokenInWei,
            {
              value: totalValue,
            }
          ),
        // failure message occurs during refund, where attack reentrency occurs
        "Refund failed"
      );
      // attacker should be able to purchase ONE token at a time w/refunds
      numTokensToMint = BigNumber.from("1");
      totalValue = config.higherPricePerTokenInWei.mul(numTokensToMint);
      for (let i = 0; i < totalTokensToMint; i++) {
        await reentrancyMock
          .connect(config.accounts.deployer)
          .attack(
            numTokensToMint,
            config.minter.address,
            config.projectOne,
            config.higherPricePerTokenInWei,
            {
              value: config.higherPricePerTokenInWei,
            }
          );
      }
    });
  });
};
