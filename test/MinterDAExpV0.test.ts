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

describe("MinterDAExpV0", async function () {
  const name = "Non Fungible Token";
  const symbol = "NFT";

  const firstTokenId = new BN("30000000");
  const secondTokenId = new BN("3000001");

  const startingPrice = ethers.utils.parseEther("10");
  const higherPricePerTokenInWei = startingPrice.add(
    ethers.utils.parseEther("0.1")
  );
  // purposefully different price per token on core contract (tracked separately)
  const basePrice = ethers.utils.parseEther("0.05");

  const projectOne = 3; // V1 core starts at project 3

  const ONE_MINUTE = 60;
  const ONE_HOUR = ONE_MINUTE * 60;
  const ONE_DAY = ONE_HOUR * 24;

  const defaultHalfLife = ONE_HOUR / 2;
  const auctionStartTimeOffset = ONE_HOUR;

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

    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV1");
    this.token = await artblocksFactory
      .connect(deployer)
      .deploy(name, symbol, this.randomizer.address);

    const minterFilterFactory = await ethers.getContractFactory(
      "MinterFilterV0"
    );
    this.minterFilter = await minterFilterFactory.deploy(this.token.address);

    const minterFactory = await ethers.getContractFactory("MinterDAExpV0");
    this.minter = await minterFactory.deploy(
      this.token.address,
      this.minterFilter.address
    );

    await this.token
      .connect(deployer)
      .addProject("project1", this.accounts.artist.address, 0, false);

    await this.token.connect(deployer).toggleProjectIsActive(projectOne);

    await this.token
      .connect(deployer)
      .addMintWhitelisted(this.minterFilter.address);

    await this.token
      .connect(artist)
      .updateProjectMaxInvocations(projectOne, 15);

    await this.token
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(projectOne);

    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minter.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(projectOne, this.minter.address);

    if (!this.startTime) {
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      this.startTime = block.timestamp;
    }
    this.startTime = this.startTime + ONE_DAY;

    await ethers.provider.send("evm_mine", [this.startTime - ONE_MINUTE]);
    await this.minter
      .connect(this.accounts.deployer)
      .resetAuctionDetails(projectOne);
    await this.minter
      .connect(this.accounts.artist)
      .setAuctionDetails(
        projectOne,
        this.startTime + auctionStartTimeOffset,
        defaultHalfLife,
        startingPrice,
        basePrice
      );
    await ethers.provider.send("evm_mine", [this.startTime]);
  });

  describe("constructor", async function () {
    it("reverts when given incorrect minter filter and core addresses", async function () {
      const artblocksFactory = await ethers.getContractFactory(
        "GenArt721CoreV3"
      );
      const token2 = await artblocksFactory
        .connect(this.accounts.deployer)
        .deploy(name, symbol, this.randomizer.address);

      const minterFilterFactory = await ethers.getContractFactory(
        "MinterFilterV0"
      );
      const minterFilter = await minterFilterFactory.deploy(token2.address);

      const minterFactory = await ethers.getContractFactory(
        "MinterSetPriceERC20V0"
      );
      // fails when combine new minterFilter with the old token in constructor
      await expectRevert(
        minterFactory.deploy(this.token.address, minterFilter.address),
        "Illegal contract pairing"
      );
    });
  });

  describe("purchase", async function () {
    it("disallows purchase before auction begins", async function () {
      await ethers.provider.send("evm_mine", [this.startTime + ONE_HOUR / 2]);
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectOne, {
          value: startingPrice.toString(),
          gasPrice: 0,
        }),
        "Auction not yet started"
      );
    });

    it("calculates the price correctly", async function () {
      for (let i = 1; i <= 5; i++) {
        let ownerBalance = await this.accounts.owner.getBalance();
        let price = startingPrice;
        for (let j = 0; j < i; j++) {
          price = price.div(2);
        }

        await ethers.provider.send("evm_setNextBlockTimestamp", [
          this.startTime + auctionStartTimeOffset + i * defaultHalfLife,
        ]);
        await this.minter.connect(this.accounts.owner).purchase(projectOne, {
          value: price.toString(),
          gasPrice: 0,
        });
        // Test that price isn't too low

        await expectRevert(
          this.minter.connect(this.accounts.owner).purchase(projectOne, {
            value: ((price.toBigInt() * BigInt(100)) / BigInt(101)).toString(),
            gasPrice: 0,
          }),
          "Must send minimum value to mint!"
        );
        let ownerDelta = (await this.accounts.owner.getBalance()).sub(
          ownerBalance
        );
        expect(ownerDelta.mul("-1").lte(price)).to.be.true;
      }
    });

    it("calculates the price before correctly", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(projectOne);
      await this.minter
        .connect(this.accounts.artist)
        .setAuctionDetails(
          projectOne,
          this.startTime + auctionStartTimeOffset,
          defaultHalfLife,
          startingPrice,
          basePrice
        );

      let contractPriceInfo = await this.minter
        .connect(this.accounts.owner)
        .getPriceInfo(projectOne);
      expect(contractPriceInfo.tokenPriceInWei).to.be.equal(startingPrice);
    });

    it("calculates the price after correctly ", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(projectOne);
      await this.minter
        .connect(this.accounts.artist)
        .setAuctionDetails(
          projectOne,
          this.startTime + auctionStartTimeOffset,
          defaultHalfLife,
          startingPrice,
          basePrice
        );

      await ethers.provider.send("evm_mine", [this.startTime + 5 * ONE_HOUR]);

      let contractPriceInfo = await this.minter
        .connect(this.accounts.owner)
        .getPriceInfo(projectOne);
      expect(contractPriceInfo.tokenPriceInWei).to.be.equal(basePrice);
    });
  });

  describe("calculate gas", async function () {
    it("mints and calculates gas values", async function () {
      await ethers.provider.send("evm_mine", [
        this.startTime + auctionStartTimeOffset,
      ]);

      const tx = await this.minter
        .connect(this.accounts.owner)
        .purchase(projectOne, {
          value: startingPrice,
        });

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed).toString();
      console.log(
        "Gas cost for a successful Exponential DA mint: ",
        ethers.utils.parseUnits(txCost, "wei")
      );

      expect(txCost.toString()).to.equal(ethers.utils.parseEther("0.0380107")); // assuming a cost of 100 GWEI
    });
  });

  describe("purchaseTo", async function () {
    it("allows `purchaseTo` by default", async function () {
      await ethers.provider.send("evm_mine", [
        this.startTime + auctionStartTimeOffset,
      ]);
      await this.minter
        .connect(this.accounts.owner)
        .purchaseTo(this.accounts.additional.address, projectOne, {
          value: startingPrice,
        });
    });

    it("disallows `purchaseTo` if disallowed explicitly", async function () {
      await ethers.provider.send("evm_mine", [
        this.startTime + auctionStartTimeOffset,
      ]);
      await this.minter
        .connect(this.accounts.deployer)
        .togglePurchaseToDisabled(projectOne);
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          .purchaseTo(this.accounts.additional.address, projectOne, {
            value: startingPrice,
          }),
        "No `purchaseTo` Allowed"
      );
      // still allows `purchaseTo` if destination matches sender.
      await this.minter
        .connect(this.accounts.owner)
        .purchaseTo(this.accounts.owner.address, projectOne, {
          value: startingPrice,
        });
    });

    it("emits event when `purchaseTo` is toggled", async function () {
      // emits true when changed from initial value of false
      await expect(
        this.minter
          .connect(this.accounts.deployer)
          .togglePurchaseToDisabled(projectOne)
      )
        .to.emit(this.minter, "PurchaseToDisabledUpdated")
        .withArgs(projectOne, true);
      // emits false when changed from initial value of true
      await expect(
        this.minter
          .connect(this.accounts.deployer)
          .togglePurchaseToDisabled(projectOne)
      )
        .to.emit(this.minter, "PurchaseToDisabledUpdated")
        .withArgs(projectOne, false);
    });
  });

  describe("setAuctionDetails", async function () {
    it("cannot be modified mid-auction", async function () {
      await ethers.provider.send("evm_mine", [
        this.startTime + 2 * auctionStartTimeOffset,
      ]);
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .setAuctionDetails(
            projectOne,
            this.startTime + auctionStartTimeOffset,
            defaultHalfLife,
            startingPrice,
            basePrice
          ),
        "No modifications mid-auction"
      );
    });

    it("allows artist to set auction details", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(projectOne);
      await this.minter
        .connect(this.accounts.artist)
        .setAuctionDetails(
          projectOne,
          this.startTime + auctionStartTimeOffset,
          defaultHalfLife,
          startingPrice,
          basePrice
        );
    });

    it("disallows whitelisted and non-artist to set auction details", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(projectOne);
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .setAuctionDetails(
            projectOne,
            this.startTime + auctionStartTimeOffset,
            defaultHalfLife,
            startingPrice,
            basePrice
          ),
        "Only Artist"
      );

      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(projectOne);
      await expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .setAuctionDetails(
            projectOne,
            this.startTime + auctionStartTimeOffset,
            defaultHalfLife,
            startingPrice,
            basePrice
          ),
        "Only Artist"
      );
    });

    it("disallows higher resting price than starting price", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(projectOne);
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .setAuctionDetails(
            projectOne,
            this.startTime + auctionStartTimeOffset,
            defaultHalfLife,
            basePrice,
            startingPrice
          ),
        "Auction start price must be greater than auction end price"
      );
    });
  });

  describe("resetAuctionDetails", async function () {
    it("allows whitelisted to reset auction details", async function () {
      await expect(
        this.minter
          .connect(this.accounts.deployer)
          .resetAuctionDetails(projectOne)
      )
        .to.emit(this.minter, "ResetAuctionDetails")
        .withArgs(projectOne);
    });

    it("disallows artist to reset auction details", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .resetAuctionDetails(projectOne),
        "Only Core whitelisted"
      );
    });

    it("disallows non-whitelisted non-artist to reset auction details", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .resetAuctionDetails(projectOne),
        "Only Core whitelisted"
      );
    });

    it("invalidates unpaused, ongoing auction (prevents price of zero)", async function () {
      // prove projectOne is mintable
      await ethers.provider.send("evm_mine", [
        this.startTime + auctionStartTimeOffset,
      ]);
      await this.minter.connect(this.accounts.owner).purchase(projectOne, {
        value: startingPrice,
      });
      // resetAuctionDetails for projectOne
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(projectOne);
      // prove projectOne is no longer mintable
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectOne, {
          value: startingPrice,
        }),
        "Only configured auctions"
      );
      // prove projectOne is no longer mintable with zero value
      // (always true given prior check, but paranoid so adding test)
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectOne),
        "Only configured auctions"
      );
    });
  });

  describe("enforce and broadcasts auction half-life", async function () {
    it("enforces half-life min/max constraint", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(projectOne);
      // expect revert when creating a new project with
      const invalidHalfLifeSecondsMin = ONE_MINUTE;
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .setAuctionDetails(
            projectOne,
            this.startTime + auctionStartTimeOffset,
            invalidHalfLifeSecondsMin,
            startingPrice,
            basePrice
          ),
        "Price decay half life must fall between min and max allowable values"
      );

      // expect revert when creating a new project with
      const invalidHalfLifeSecondsMax = ONE_DAY;
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .setAuctionDetails(
            projectOne,
            this.startTime + auctionStartTimeOffset,
            invalidHalfLifeSecondsMax,
            startingPrice,
            basePrice
          ),
        "Price decay half life must fall between min and max allowable values"
      );
    });

    it("emits event when allowable half life range is updated", async function () {
      const newMinSeconds = 60;
      const newMaxSeconds = 6000;
      // emits event when allowable half life range is updated
      await expect(
        this.minter
          .connect(this.accounts.deployer)
          .setAllowablePriceDecayHalfLifeRangeSeconds(
            newMinSeconds,
            newMaxSeconds
          )
      )
        .to.emit(this.minter, "AuctionHalfLifeRangeSecondsUpdated")
        .withArgs(newMinSeconds, newMaxSeconds);
    });

    it("validate setAllowablePriceDecayHalfLifeRangeSeconds guards", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .setAllowablePriceDecayHalfLifeRangeSeconds(600, 60),
        "Maximum half life must be greater than minimum"
      );
      await expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .setAllowablePriceDecayHalfLifeRangeSeconds(0, 600),
        "Half life of zero not allowed"
      );
    });

    it("validate setAllowablePriceDecayHalfLifeRangeSeconds ACL", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .setAllowablePriceDecayHalfLifeRangeSeconds(60, 600),
        "Only Core whitelisted"
      );
    });
  });

  describe("currency info hooks", async function () {
    const unconfiguredProjectNumber = 99;

    it("reports expected price per token", async function () {
      // returns zero for unconfigured project price
      const currencyInfo = await this.minter
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

    it("reports currency as ETH", async function () {
      const priceInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(priceInfo.currencySymbol).to.be.equal("ETH");
    });

    it("reports currency address as null address", async function () {
      const priceInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(priceInfo.currencyAddress).to.be.equal(constants.ZERO_ADDRESS);
    });
  });

  describe("reentrancy attack", async function () {
    it("does not allow reentrant purchaseTo", async function () {
      // admin allows contract buys
      await this.minter
        .connect(this.accounts.deployer)
        .toggleContractMintable(projectOne);
      // advance to time when auction is active
      await ethers.provider.send("evm_mine", [
        this.startTime + auctionStartTimeOffset,
      ]);
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
