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

describe("GenArt721MinterEthAuction", async function () {
  const name = "Non Fungible Token";
  const symbol = "NFT";

  const firstTokenId = new BN("30000000");
  const secondTokenId = new BN("3000001");

  const startingPrice = ethers.utils.parseEther("1");
  const pricePerTokenInWei = ethers.utils.parseEther("0.1");
  // purposefully different price per token on core contract (tracked separately)
  const pricePerTokenInWeiAuctionResting = ethers.utils.parseEther("0.05");

  const projectOne = 0;

  const ONE_MINUTE = 60000;
  const ONE_HOUR = ONE_MINUTE * 60;
  const ONE_DAY = ONE_HOUR * 24;

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

    const randomizerFactory = await ethers.getContractFactory("Randomizer");
    this.randomizer = await randomizerFactory.deploy();

    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV3");
    this.token = await artblocksFactory
      .connect(snowfro)
      .deploy(name, symbol, this.randomizer.address);

    const minterFilterFactory = await ethers.getContractFactory("MinterFilter");
    this.minterFilter = await minterFilterFactory.deploy(this.token.address);

    const minterFactory = await ethers.getContractFactory(
      "GenArt721FilteredMinterETHAuction"
    );
    this.minter = await minterFactory.deploy(
      this.token.address,
      this.minterFilter.address
    );

    await this.token.connect(snowfro).addProject("project1", artist.address);

    await this.token.connect(snowfro).toggleProjectIsActive(projectOne);

    await this.token
      .connect(snowfro)
      .updateMinterContract(this.minterFilter.address);

    await this.token
      .connect(artist)
      .updateProjectMaxInvocations(projectOne, 15);

    await this.token
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(projectOne);

    await this.minterFilter
      .connect(this.accounts.snowfro)
      .addApprovedMinter(this.minter.address);
    await this.minterFilter
      .connect(this.accounts.snowfro)
      .setMinterForProject(projectOne, this.minter.address);

    if (this.hasOwnProperty("startTime") && this.startTime) {
      this.startTime = this.startTime + ONE_DAY;
    } else {
      this.startTime = Date.now();
    }

    const startTimePlusMinuteAndTwoHours = this.startTime + ONE_HOUR * 2;
    await this.minter
      .connect(this.accounts.snowfro)
      .setAuctionDetails(
        projectOne,
        this.startTime,
        startTimePlusMinuteAndTwoHours,
        startingPrice,
        pricePerTokenInWeiAuctionResting
      );
  });

  describe("purchase", async function () {
    it("calculates the price correctly", async function () {
      await ethers.provider.send("evm_setNextBlockTimestamp", [this.startTime]);
      const duration = ONE_HOUR * 2; // 2 hours
      const step = ONE_MINUTE * 8; // 480 seconds

      for (let i = 0; i < 15; i++) {
        let ownerBalance = await this.accounts.owner.getBalance();
        let a = ethers.BigNumber.from(i * step).mul(
          startingPrice.sub(pricePerTokenInWeiAuctionResting).toString()
        );
        let t = ethers.BigNumber.from(a.toString());
        let price = startingPrice.sub(t.div(7200000));
        let contractPriceInfo = await this.minter
          .connect(this.accounts.owner)
          .getPriceInfo(projectOne);
        await ethers.provider.send("evm_setNextBlockTimestamp", [
          this.startTime + i * 480000,
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
        expect(ownerDelta.mul("-1").lte(contractPriceInfo.tokenPriceInWei)).to
          .be.true;
      }
    });

    it("calculates the price before correctly", async function () {
      await ethers.provider.send("evm_setNextBlockTimestamp", [this.startTime]);

      await this.minter
        .connect(this.accounts.snowfro)
        .setAuctionDetails(
          projectOne,
          this.startTime + 60000,
          this.startTime + 2 * ONE_HOUR,
          startingPrice,
          pricePerTokenInWeiAuctionResting
        );

      let contractPriceInfo = await this.minter
        .connect(this.accounts.owner)
        .getPriceInfo(projectOne);
      expect(contractPriceInfo.tokenPriceInWei).to.be.equal(startingPrice);
    });

    it("calculates the price after correctly ", async function () {
      await ethers.provider.send("evm_setNextBlockTimestamp", [
        this.startTime + 5 * ONE_HOUR,
      ]);

      await this.minter
        .connect(this.accounts.snowfro)
        .setAuctionDetails(
          projectOne,
          this.startTime + 60000,
          this.startTime + 2 * ONE_HOUR,
          startingPrice,
          pricePerTokenInWeiAuctionResting
        );

      let contractPriceInfo = await this.minter
        .connect(this.accounts.owner)
        .getPriceInfo(projectOne);
      expect(contractPriceInfo.tokenPriceInWei).to.be.equal(
        pricePerTokenInWeiAuctionResting
      );
    });
  });

  describe("purchaseTo", async function () {
    it("allows `purchaseTo` by default", async function () {
      await this.minter
        .connect(this.accounts.owner)
        .purchaseTo(this.accounts.additional.address, projectOne, {
          value: startingPrice,
        });
    });

    it("disallows `purchaseTo` if disallowed explicitly", async function () {
      await this.minter
        .connect(this.accounts.snowfro)
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
          .connect(this.accounts.snowfro)
          .togglePurchaseToDisabled(projectOne)
      )
        .to.emit(this.minter, "PurchaseToDisabledUpdated")
        .withArgs(projectOne, true);
      // emits false when changed from initial value of true
      await expect(
        this.minter
          .connect(this.accounts.snowfro)
          .togglePurchaseToDisabled(projectOne)
      )
        .to.emit(this.minter, "PurchaseToDisabledUpdated")
        .withArgs(projectOne, false);
    });
  });

  describe("setAuctionDetails", async function () {
    it("allows whitelisted to set auction details", async function () {
      await this.minter
        .connect(this.accounts.snowfro)
        .setAuctionDetails(
          projectOne,
          this.startTime + 60000,
          this.startTime + 2 * ONE_HOUR,
          startingPrice,
          pricePerTokenInWeiAuctionResting
        );
    });

    it("allows artist to set auction details", async function () {
      await this.minter
        .connect(this.accounts.artist)
        .setAuctionDetails(
          projectOne,
          this.startTime + 60000,
          this.startTime + 2 * ONE_HOUR,
          startingPrice,
          pricePerTokenInWeiAuctionResting
        );
    });

    it("disallows non-whitelisted non-artist to set auction details", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .setAuctionDetails(
            projectOne,
            this.startTime + 60000,
            this.startTime + 2 * ONE_HOUR,
            startingPrice,
            pricePerTokenInWeiAuctionResting
          ),
        "Only Core whitelisted or Artist"
      );
    });

    it("disallows higher resting price than starting price", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.snowfro)
          .setAuctionDetails(
            projectOne,
            this.startTime + 60000,
            this.startTime + 2 * ONE_HOUR,
            pricePerTokenInWeiAuctionResting,
            startingPrice
          ),
        "Auction start price must be greater than auction end price"
      );
    });
  });

  describe("enforce and broadcasts min auction length", async function () {
    it("enforces min auction length constraint", async function () {
      const invalidLengthSeconds = 60;
      // expect revert when creating a new project with
      await expectRevert(
        this.minter
          .connect(this.accounts.snowfro)
          .setAuctionDetails(
            0,
            0,
            60,
            startingPrice,
            pricePerTokenInWeiAuctionResting
          ),
        "Auction length must be at least minimumAuctionLengthSeconds"
      );
    });

    it("emits event when min auction length is updated", async function () {
      const newLengthSeconds = 3601;
      // emits event when minimum auction length is updated
      await expect(
        this.minter
          .connect(this.accounts.snowfro)
          .setMinimumAuctionLengthSeconds(newLengthSeconds)
      )
        .to.emit(this.minter, "MinimumAuctionLengthSecondsUpdated")
        .withArgs(newLengthSeconds);
    });
  });

  describe("only allow ETH", async function () {
    it("disallows non-ETH projects", async function () {
      await this.token
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          projectOne,
          "USDC",
          "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        );

      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          .purchaseTo(this.accounts.additional.address, projectOne, {
            value: startingPrice,
          }),
        "Project currency must be ETH"
      );
    });
  });
});
