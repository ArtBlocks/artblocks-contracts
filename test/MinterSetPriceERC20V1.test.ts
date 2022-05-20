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
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { SafeTransactionDataPartial } from "@gnosis.pm/safe-core-sdk-types";
import { getGnosisSafe } from "./util/GnosisSafeNetwork";

/**
 * These tests intended to ensure this Filtered Minter integrates properly with
 * V1 core contract.
 */
describe("MinterSetPriceERC20V1_V1Core", async function () {
  const name = "Non Fungible Token";
  const symbol = "NFT";

  const firstTokenId = new BN("30000000");
  const secondTokenId = new BN("3000001");

  const pricePerTokenInWei = ethers.utils.parseEther("1");
  const higherPricePerTokenInWei = pricePerTokenInWei.add(
    ethers.utils.parseEther("0.1")
  );
  const projectZero = 3; // V1 core starts at project 3
  const projectOne = 4;
  const projectTwo = 5;

  const projectMaxInvocations = 15;

  beforeEach(async function () {
    const [owner, newOwner, artist, additional, snowfro] =
      await ethers.getSigners();
    this.accounts = {
      owner: owner,
      newOwner: newOwner,
      artist: artist,
      additional: additional,
      snowfro: snowfro,
    };
    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();

    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV1");
    this.token = await artblocksFactory
      .connect(snowfro)
      .deploy(name, symbol, this.randomizer.address);

    const minterFilterFactory = await ethers.getContractFactory(
      "MinterFilterV0"
    );
    this.minterFilter = await minterFilterFactory.deploy(this.token.address);

    const minterFactory = await ethers.getContractFactory(
      "MinterSetPriceERC20V1"
    );
    this.minter = await minterFactory.deploy(
      this.token.address,
      this.minterFilter.address
    );
    this.minter3 = await minterFactory.deploy(
      this.token.address,
      this.minterFilter.address
    );

    await this.token
      .connect(snowfro)
      .addProject("project0", artist.address, 0, false);

    await this.token
      .connect(snowfro)
      .addProject("project1", artist.address, 0, false);

    await this.token
      .connect(snowfro)
      .addProject("project2", artist.address, 0, false);

    await this.token.connect(snowfro).toggleProjectIsActive(projectZero);
    await this.token.connect(snowfro).toggleProjectIsActive(projectOne);
    await this.token.connect(snowfro).toggleProjectIsActive(projectTwo);

    await this.token
      .connect(snowfro)
      .addMintWhitelisted(this.minterFilter.address);

    await this.token
      .connect(artist)
      .updateProjectMaxInvocations(projectZero, projectMaxInvocations);
    await this.token
      .connect(artist)
      .updateProjectMaxInvocations(projectOne, projectMaxInvocations);
    await this.token
      .connect(artist)
      .updateProjectMaxInvocations(projectTwo, projectMaxInvocations);

    this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectZero);
    this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectOne);
    this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectTwo);

    await this.minterFilter
      .connect(this.accounts.snowfro)
      .addApprovedMinter(this.minter.address);
    await this.minterFilter
      .connect(this.accounts.snowfro)
      .setMinterForProject(projectZero, this.minter.address);
    await this.minterFilter
      .connect(this.accounts.snowfro)
      .setMinterForProject(projectOne, this.minter.address);
    await this.minterFilter
      .connect(this.accounts.snowfro)
      .setMinterForProject(projectTwo, this.minter.address);

    // set token price for projects zero and one on minter
    await this.minter
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(projectZero, pricePerTokenInWei);
    await this.minter
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(projectOne, pricePerTokenInWei);

    // mock ERC20 token
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    this.ERC20Mock = await ERC20Factory.deploy(ethers.utils.parseEther("100"));
  });

  describe("constructor", async function () {
    it("reverts when given incorrect minter filter and core addresses", async function () {
      const artblocksFactory = await ethers.getContractFactory(
        "GenArt721CoreV1"
      );
      const token2 = await artblocksFactory
        .connect(this.accounts.snowfro)
        .deploy(name, symbol, this.randomizer.address);

      const minterFilterFactory = await ethers.getContractFactory(
        "MinterFilterV0"
      );
      const minterFilter = await minterFilterFactory.deploy(token2.address);

      const minterFactory = await ethers.getContractFactory(
        "MinterSetPriceERC20V1"
      );
      // fails when combine new minterFilter with the old token in constructor
      await expectRevert(
        minterFactory.deploy(this.token.address, minterFilter.address),
        "Illegal contract pairing"
      );
    });
  });

  describe("updatePricePerTokenInWei", async function () {
    it("only allows artist to update price", async function () {
      const onlyArtistErrorMessage = "Only Artist";
      // doesn't allow owner
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei),
        onlyArtistErrorMessage
      );
      // doesn't allow snowfro
      await expectRevert(
        this.minter
          .connect(this.accounts.snowfro)
          .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei),
        onlyArtistErrorMessage
      );
      // does allow artist
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei);
    });

    it("enforces price update", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist increases price
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei);
      // cannot purchase token at lower price
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
        }),
        needMoreValueErrorMessage
      );
      // can purchase token at higher price
      await this.minter.connect(this.accounts.owner).purchase(projectZero, {
        value: higherPricePerTokenInWei,
      });
    });

    it("enforces price update only on desired project", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist increases price of project zero
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei);
      // cannot purchase project zero token at lower price
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
        }),
        needMoreValueErrorMessage
      );
      // can purchase project one token at lower price
      await this.minter.connect(this.accounts.owner).purchase(projectOne, {
        value: pricePerTokenInWei,
      });
    });

    it("emits event upon price update", async function () {
      // artist increases price
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei)
      )
        .to.emit(this.minter, "PricePerTokenInWeiUpdated")
        .withArgs(projectZero, higherPricePerTokenInWei);
    });
  });

  describe("updateProjectCurrencyInfo", async function () {
    it("only allows artist to update currency info", async function () {
      const onlyArtistErrorMessage = "Only Artist";
      // doesn't allow owner
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          .updateProjectCurrencyInfo(
            projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow snowfro
      await expectRevert(
        this.minter
          .connect(this.accounts.snowfro)
          .updateProjectCurrencyInfo(
            projectZero,
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
            projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectZero, "ETH", constants.ZERO_ADDRESS);
    });

    it("enforces currency info update and allows purchases", async function () {
      // artist changes to Mock ERC20 token
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectZero, "MOCK", this.ERC20Mock.address);
      // cannot purchase token with ETH
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
        }),
        "this project accepts a different currency and cannot accept ETH"
      );
      // approve contract and able to mint with Mock token
      await this.ERC20Mock.connect(this.accounts.owner).approve(
        this.minter.address,
        ethers.utils.parseEther("100")
      );
      await this.minter.connect(this.accounts.owner).purchase(projectZero);
      // cannot purchase token with ERC20 token when insufficient balance
      await this.ERC20Mock.connect(this.accounts.owner).transfer(
        this.accounts.artist.address,
        ethers.utils.parseEther("100").sub(pricePerTokenInWei)
      );
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectZero),
        "Insufficient balance"
      );
      // artist changes back to ETH
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectZero, "ETH", constants.ZERO_ADDRESS);
      // able to mint with ETH
      await this.minter.connect(this.accounts.owner).purchase(projectZero, {
        value: pricePerTokenInWei,
      });
    });

    it("enforces currency update only on desired project", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist changes currency info for project zero
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectZero, "MOCK", this.ERC20Mock.address);
      // can purchase project one token with ETH
      await this.minter.connect(this.accounts.owner).purchase(projectOne, {
        value: pricePerTokenInWei,
      });
    });

    it("emits event upon currency update", async function () {
      // artist changes currency info
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .updateProjectCurrencyInfo(
            projectZero,
            "MOCK",
            this.ERC20Mock.address
          )
      )
        .to.emit(this.minter, "ProjectCurrencyInfoUpdated")
        .withArgs(projectZero, this.ERC20Mock.address, "MOCK");
    });
  });

  describe("purchase", async function () {
    it("does not allow purchase prior to configuring price", async function () {
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectTwo, {
          value: pricePerTokenInWei,
        }),
        "Price not configured"
      );
    });

    it("does nothing if setProjectMaxInvocations is not called (fails correctly)", async function () {
      for (let i = 0; i < 15; i++) {
        await this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
        });
      }

      const ownerBalance = await this.accounts.owner.getBalance();
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
        }),
        "Must not exceed max invocations"
      );
    });

    it("doesnt add too much gas if setProjectMaxInvocations is set", async function () {
      const tx = await this.minter
        .connect(this.accounts.owner)
        .purchase(projectZero, {
          value: pricePerTokenInWei,
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
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(projectOne);

      const maxSetTx = await this.minter
        .connect(this.accounts.owner)
        .purchase(projectOne, {
          value: pricePerTokenInWei,
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
      expect(gasCostMaxInvocations < (gasCostNoMaxInvocations * 110) / 100).to
        .be.true;
    });

    it("fails more cheaply if setProjectMaxInvocations is set", async function () {
      // Try without setProjectMaxInvocations, store gas cost
      for (let i = 0; i < 15; i++) {
        await this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
        });
      }
      const ownerBalanceNoMaxSet = BigNumber.from(
        await this.accounts.owner.getBalance()
      );
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
        }),
        "Must not exceed max invocations"
      );
      const ownerDeltaNoMaxSet = ownerBalanceNoMaxSet.sub(
        BigNumber.from(await this.accounts.owner.getBalance())
      );

      // Try with setProjectMaxInvocations, store gas cost
      await this.minter
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(projectOne);
      for (let i = 0; i < 15; i++) {
        await this.minter.connect(this.accounts.owner).purchase(projectOne, {
          value: pricePerTokenInWei,
        });
      }
      const ownerBalanceMaxSet = BigNumber.from(
        await this.accounts.owner.getBalance()
      );
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectOne, {
          value: pricePerTokenInWei,
        }),
        "Maximum number of invocations reached"
      );
      const ownerDeltaMaxSet = ownerBalanceMaxSet.sub(
        BigNumber.from(await this.accounts.owner.getBalance())
      );

      console.log(
        "Gas cost with setProjectMaxInvocations: ",
        ethers.utils.formatUnits(ownerDeltaMaxSet, "ether").toString(),
        "ETH"
      );
      console.log(
        "Gas cost without setProjectMaxInvocations: ",
        ethers.utils.formatUnits(ownerDeltaNoMaxSet, "ether").toString(),
        "ETH"
      );

      expect(ownerDeltaMaxSet.lt(ownerDeltaNoMaxSet)).to.be.true;
    });
  });

  describe("calculates gas", async function () {
    it("mints and calculates gas values", async function () {
      const tx = await this.minter
        .connect(this.accounts.owner)
        .purchase(projectOne, {
          value: pricePerTokenInWei,
        });

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed).toString();

      console.log(
        "Gas cost for a successful ERC20 mint: ",
        ethers.utils.formatUnits(txCost, "ether").toString(),
        "ETH"
      );
      expect(txCost.toString()).to.equal(ethers.utils.parseEther("0.036402"));
    });
  });

  describe("purchaseTo", async function () {
    it("does not allow purchase prior to configuring price", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          .purchaseTo(this.accounts.additional.address, projectTwo, {
            value: pricePerTokenInWei,
          }),
        "Price not configured"
      );
    });

    it("allows `purchaseTo` by default", async function () {
      await this.minter
        .connect(this.accounts.owner)
        .purchaseTo(this.accounts.additional.address, projectOne, {
          value: pricePerTokenInWei,
        });
    });

    it("does not support toggling of `purchaseToDisabled`", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .togglePurchaseToDisabled(projectOne),
        "Action not supported"
      );
      // still allows `purchaseTo`.
      await this.minter
        .connect(this.accounts.owner)
        .purchaseTo(this.accounts.artist.address, projectOne, {
          value: pricePerTokenInWei,
        });
    });

    it("doesn't support `purchaseTo` toggling", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .togglePurchaseToDisabled(projectOne),
        "Action not supported"
      );
    });
  });

  describe("setProjectMaxInvocations", async function () {
    it("handles getting tokenInfo invocation info with V1 core", async function () {
      await this.minter
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(projectOne);
      // minter should update storage with accurate projectMaxInvocations
      await this.minter
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(projectOne);
      let maxInvocations = await this.minter
        .connect(this.accounts.snowfro)
        .projectMaxInvocations(projectOne);
      expect(maxInvocations).to.be.equal(projectMaxInvocations);
      // ensure hasMaxBeenReached did not unexpectedly get set as true
      let hasMaxBeenInvoked = await this.minter
        .connect(this.accounts.snowfro)
        .projectMaxHasBeenInvoked(projectOne);
      expect(hasMaxBeenInvoked).to.be.false;
      // should also support unconfigured project projectMaxInvocations
      // e.g. project 99, which does not yet exist
      await this.minter
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(99);
      maxInvocations = await this.minter3
        .connect(this.accounts.snowfro)
        .projectMaxInvocations(99);
      expect(maxInvocations).to.be.equal(0);
    });
  });

  describe("currency info hooks", async function () {
    const unconfiguredProjectNumber = 99;

    it("reports expected price per token", async function () {
      let currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(currencyInfo.tokenPriceInWei).to.be.equal(pricePerTokenInWei);
      // returns zero for unconfigured project price
      currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.tokenPriceInWei).to.be.equal(0);
    });

    it("reports expected isConfigured", async function () {
      let currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(currencyInfo.isConfigured).to.be.equal(true);
      // false for unconfigured project
      currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.isConfigured).to.be.equal(false);
    });

    it("reports default currency as ETH", async function () {
      let currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(currencyInfo.currencySymbol).to.be.equal("ETH");
      // should also report ETH for unconfigured project
      currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.currencySymbol).to.be.equal("ETH");
    });

    it("reports default currency address as null address", async function () {
      let currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(currencyInfo.currencyAddress).to.be.equal(constants.ZERO_ADDRESS);
      // should also report ETH for unconfigured project
      currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.currencyAddress).to.be.equal(constants.ZERO_ADDRESS);
    });
  });

  it("reports ERC20 token symbol and address if set", async function () {
    // artist changes to Mock ERC20 token
    await this.minter
      .connect(this.accounts.artist)
      .updateProjectCurrencyInfo(projectZero, "MOCK", this.ERC20Mock.address);
    // reports ERC20 updated price information
    const currencyInfo = await this.minter
      .connect(this.accounts.artist)
      .getPriceInfo(projectZero);
    expect(currencyInfo.currencySymbol).to.be.equal("MOCK");
    expect(currencyInfo.currencyAddress).to.be.equal(this.ERC20Mock.address);
  });

  describe("reentrancy attack", async function () {
    it("does not allow reentrant purchaseTo", async function () {
      // attacker deploys reentrancy contract
      const reentrancyMockFactory = await ethers.getContractFactory(
        "ReentrancyMock"
      );
      const reentrancyMock = await reentrancyMockFactory
        .connect(this.accounts.snowfro)
        .deploy();
      // attacker should see revert when performing reentrancy attack
      const totalTokensToMint = 2;
      let numTokensToMint = BigNumber.from(totalTokensToMint.toString());
      let totalValue = higherPricePerTokenInWei.mul(numTokensToMint);
      await expectRevert(
        reentrancyMock
          .connect(this.accounts.snowfro)
          .attack(
            numTokensToMint,
            this.minter.address,
            projectOne,
            higherPricePerTokenInWei,
            {
              value: totalValue,
            }
          ),
        // failure message occurs during refund, where attack reentrency occurs
        "Refund failed"
      );
      // attacker should be able to purchase ONE token at a time w/refunds
      numTokensToMint = BigNumber.from("1");
      totalValue = higherPricePerTokenInWei.mul(numTokensToMint);
      for (let i = 0; i < totalTokensToMint; i++) {
        await reentrancyMock
          .connect(this.accounts.snowfro)
          .attack(
            numTokensToMint,
            this.minter.address,
            projectOne,
            higherPricePerTokenInWei,
            {
              value: higherPricePerTokenInWei,
            }
          );
      }
    });
  });

  describe("gnosis safe", async function () {
    it("allows gnosis safe to purchase in ETH", async function () {
      // deploy new Gnosis Safe
      const safeSdk: Safe = await getGnosisSafe(
        this.accounts.artist,
        this.accounts.additional,
        this.accounts.owner
      );
      const safeAddress = safeSdk.getAddress();

      // create a transaction
      const unsignedTx = await this.minter.populateTransaction.purchase(
        projectOne
      );
      const transaction: SafeTransactionDataPartial = {
        to: this.minter.address,
        data: unsignedTx.data,
        value: pricePerTokenInWei.toHexString(),
      };
      const safeTransaction = await safeSdk.createTransaction(transaction);

      // signers sign and execute the transaction
      // artist signs
      await safeSdk.signTransaction(safeTransaction);
      // additional signs
      const ethAdapterOwner2 = new EthersAdapter({
        ethers,
        signer: this.accounts.additional,
      });
      const safeSdk2 = await safeSdk.connect({
        ethAdapter: ethAdapterOwner2,
        safeAddress,
      });
      const txHash = await safeSdk2.getTransactionHash(safeTransaction);
      const approveTxResponse = await safeSdk2.approveTransactionHash(txHash);
      await approveTxResponse.transactionResponse?.wait();

      // fund the safe and execute transaction
      await this.accounts.artist.sendTransaction({
        to: safeAddress,
        value: pricePerTokenInWei,
      });
      const projectTokenInfoBefore = await this.token.projectTokenInfo(
        projectOne
      );
      const executeTxResponse = await safeSdk2.executeTransaction(
        safeTransaction
      );
      await executeTxResponse.transactionResponse?.wait();
      const projectTokenInfoAfter = await this.token.projectTokenInfo(
        projectOne
      );
      expect(projectTokenInfoAfter.invocations).to.be.equal(
        projectTokenInfoBefore.invocations.add(1)
      );
    });

    it("allows gnosis safe to purchase in ERC20", async function () {
      // artist changes to Mock ERC20 token
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectOne, "MOCK", this.ERC20Mock.address);
      // deploy new Gnosis Safe
      const safeSdk: Safe = await getGnosisSafe(
        this.accounts.artist,
        this.accounts.additional,
        this.accounts.owner
      );
      const safeAddress = safeSdk.getAddress();
      // create a transaction to approve contract to spend ERC20
      const unsignedApprovalTx =
        await this.ERC20Mock.populateTransaction.approve(
          this.minter.address,
          ethers.utils.parseEther("100")
        );
      const approvalTransaction: SafeTransactionDataPartial = {
        to: this.ERC20Mock.address,
        data: unsignedApprovalTx.data,
        value: "0x0",
      };
      const safeApprovalTransaction = await safeSdk.createTransaction(
        approvalTransaction
      );
      // signers sign and execute the approval transaction
      // artist signs
      await safeSdk.signTransaction(safeApprovalTransaction);
      // additional signs
      const ethAdapterOwner2 = new EthersAdapter({
        ethers,
        signer: this.accounts.additional,
      });
      const safeSdk2 = await safeSdk.connect({
        ethAdapter: ethAdapterOwner2,
        safeAddress,
      });
      const txHashApprove = await safeSdk2.getTransactionHash(
        safeApprovalTransaction
      );
      const approveTxApproveResponse = await safeSdk2.approveTransactionHash(
        txHashApprove
      );
      await approveTxApproveResponse.transactionResponse?.wait();
      // fund the safe and execute transaction
      await this.ERC20Mock.connect(this.accounts.owner).transfer(
        safeAddress,
        pricePerTokenInWei
      );
      const executeTxApproveResponse = await safeSdk2.executeTransaction(
        safeApprovalTransaction
      );
      await executeTxApproveResponse.transactionResponse?.wait();

      // create a purchase transaction
      const unsignedTx = await this.minter.populateTransaction.purchase(
        projectOne
      );
      const transaction: SafeTransactionDataPartial = {
        to: this.minter.address,
        data: unsignedTx.data,
        value: "0x0",
      };
      const safeTransaction = await safeSdk.createTransaction(transaction);

      // signers sign and execute the purchase transaction
      // artist signs
      await safeSdk.signTransaction(safeTransaction);
      // additional signs
      const txHash = await safeSdk2.getTransactionHash(safeTransaction);
      const approveTxResponse = await safeSdk2.approveTransactionHash(txHash);
      await approveTxResponse.transactionResponse?.wait();

      // execute purchase transaction
      const projectTokenInfoBefore = await this.token.projectTokenInfo(
        projectOne
      );
      const executeTxResponse = await safeSdk2.executeTransaction(
        safeTransaction
      );
      await executeTxResponse.transactionResponse?.wait();
      const projectTokenInfoAfter = await this.token.projectTokenInfo(
        projectOne
      );
      expect(projectTokenInfoAfter.invocations).to.be.equal(
        projectTokenInfoBefore.invocations.add(1)
      );
    });
  });
});
