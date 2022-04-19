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
 * These tests intended to ensure Filtered Minter integrates properly with V1
 * core contract.
 */
describe("GenArt721Minter_PBAB", async function () {
  const name = "Non Fungible Token";
  const symbol = "NFT";

  const firstTokenId = new BN("0");
  const secondTokenId = new BN("1");

  const pricePerTokenInWei = ethers.utils.parseEther("1");
  const higherPricePerTokenInWei = ethers.utils.parseEther("1.1");
  const projectZero = 0;
  const projectOne = 1;
  const projectTwo = 2;

  const projectMaxInvocations = 15;

  beforeEach(async function () {
    const [owner, newOwner, artist, additional, deployer] =
      await ethers.getSigners();
    this.accounts = {
      owner: owner,
      newOwner: newOwner,
      artist: artist,
      additional: additional,
      deployer: deployer,
    };
    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();

    const PBABFactory = await ethers.getContractFactory("GenArt721CoreV2_PBAB");
    this.token = await PBABFactory.connect(deployer).deploy(
      name,
      symbol,
      this.randomizer.address
    );

    const minterFactory = await ethers.getContractFactory(
      "GenArt721Minter_PBAB"
    );
    this.minter = await minterFactory.deploy(this.token.address);

    await this.token
      .connect(deployer)
      .addProject("project0", artist.address, pricePerTokenInWei);

    await this.token
      .connect(deployer)
      .addProject("project1", artist.address, pricePerTokenInWei);

    await this.token
      .connect(deployer)
      .addProject("project2", artist.address, pricePerTokenInWei);

    await this.token.connect(deployer).toggleProjectIsActive(projectZero);
    await this.token.connect(deployer).toggleProjectIsActive(projectOne);
    await this.token.connect(deployer).toggleProjectIsActive(projectTwo);

    await this.token.connect(deployer).addMintWhitelisted(this.minter.address);

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

    // set token price for projects zero and one on minter
    await this.token
      .connect(this.accounts.artist)
      .updateProjectPricePerTokenInWei(projectZero, pricePerTokenInWei);
    await this.token
      .connect(this.accounts.artist)
      .updateProjectPricePerTokenInWei(projectOne, pricePerTokenInWei);

    // mock ERC20 token
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    this.ERC20Mock = await ERC20Factory.deploy(ethers.utils.parseEther("100"));
  });

  describe("updateProjectPricePerTokenInWei", async function () {
    it("only allows artist to update price", async function () {
      const onlyArtistErrorMessage = "Only artist";
      // doesn't allow owner
      await expectRevert(
        this.token
          .connect(this.accounts.owner)
          .updateProjectPricePerTokenInWei(
            projectZero,
            higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow deployer
      await expectRevert(
        this.token
          .connect(this.accounts.deployer)
          .updateProjectPricePerTokenInWei(
            projectZero,
            higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        this.token
          .connect(this.accounts.additional)
          .updateProjectPricePerTokenInWei(
            projectZero,
            higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await this.token
        .connect(this.accounts.artist)
        .updateProjectPricePerTokenInWei(projectZero, higherPricePerTokenInWei);
    });

    it("enforces price update", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist increases price
      await this.token
        .connect(this.accounts.artist)
        .updateProjectPricePerTokenInWei(projectZero, higherPricePerTokenInWei);
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
      await this.token
        .connect(this.accounts.artist)
        .updateProjectPricePerTokenInWei(projectZero, higherPricePerTokenInWei);
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
  });

  describe("updateProjectCurrencyInfo", async function () {
    it("only allows artist to update currency info", async function () {
      const onlyArtistErrorMessage = "Only artist";
      // doesn't allow owner
      await expectRevert(
        this.token
          .connect(this.accounts.owner)
          .updateProjectCurrencyInfo(
            projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow deployer
      await expectRevert(
        this.token
          .connect(this.accounts.deployer)
          .updateProjectCurrencyInfo(
            projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        this.token
          .connect(this.accounts.additional)
          .updateProjectCurrencyInfo(
            projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await this.token
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectZero, "ETH", constants.ZERO_ADDRESS);
    });

    it("enforces currency info update and allows purchases", async function () {
      // artist changes to Mock ERC20 token
      await this.token
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
      await this.token
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
      await this.token
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectZero, "MOCK", this.ERC20Mock.address);
      // can purchase project one token with ETH
      await this.minter.connect(this.accounts.owner).purchase(projectOne, {
        value: pricePerTokenInWei,
      });
    });
  });

  describe("purchase", async function () {
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
      // Try without setProjectMaxInvocations, store gas cost
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
        .connect(this.accounts.deployer)
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

      // Check that with setProjectMaxInvocations it's not too much more expensive
      expect(gasCostMaxInvocations < (gasCostNoMaxInvocations * 140) / 100).to
        .be.true;
    });

    it("fails more cheaply if setProjectMaxInvocations is set", async function () {
      // Try without setProjectMaxInvocations, store gas cost
      for (let i = 0; i < 15; i++) {
        await this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
        });
      }
      const ownerBalanceNoMaxSet = await this.accounts.owner.getBalance();
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
        .connect(this.accounts.deployer)
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

  describe("purchaseTo", async function () {
    it("allows `purchaseTo` by default", async function () {
      await this.minter
        .connect(this.accounts.owner)
        .purchaseTo(this.accounts.additional.address, projectOne, {
          value: pricePerTokenInWei,
        });
    });
  });

  describe("setProjectMaxInvocations", async function () {
    it("handles getting tokenInfo invocation info with core", async function () {
      // minter should update storage with accurate projectMaxInvocations
      await this.minter
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(projectOne);
      let maxInvocations = await this.minter
        .connect(this.accounts.deployer)
        .projectMaxInvocations(projectOne);
      expect(maxInvocations).to.be.equal(projectMaxInvocations);
      // ensure hasMaxBeenReached did not unexpectedly get set as true
      let hasMaxBeenInvoked = await this.minter
        .connect(this.accounts.deployer)
        .projectMaxHasBeenInvoked(projectOne);
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
      let totalValue = higherPricePerTokenInWei.mul(numTokensToMint);
      await expectRevert(
        reentrancyMock
          .connect(this.accounts.deployer)
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
          .connect(this.accounts.deployer)
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
});
