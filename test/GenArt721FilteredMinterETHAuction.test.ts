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

  const pricePerTokenInWei = ethers.utils.parseEther("0.1");
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

    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV2");
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

    await this.token
      .connect(snowfro)
      .addProject("project1", artist.address, pricePerTokenInWei);

    await this.token.connect(snowfro).toggleProjectIsActive(projectOne);

    await this.token
      .connect(snowfro)
      .addMintWhitelisted(this.minterFilter.address);

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
        ethers.utils.parseEther("1")
      );
  });

  describe("purchase", async function () {
    it("calculates the price correctly", async function () {
      await ethers.provider.send("evm_setNextBlockTimestamp", [this.startTime]);
      const duration = ONE_HOUR * 2; // 2 hours
      const step = ONE_MINUTE * 8; // 480 seconds
      const startingPrice = ethers.utils.parseEther("1");
      const endingPrice = ethers.utils.parseEther("0.1");

      for (let i = 0; i < 15; i++) {
        let ownerBalance = await this.accounts.owner.getBalance();
        let a = ethers.BigNumber.from(i * step).mul(
          ethers.utils.parseEther("0.9")
        );
        let t = ethers.BigNumber.from(a.toString());
        let price = startingPrice.sub(t.div(7200000));
        let contractPrice = await this.minter
          .connect(this.accounts.owner)
          .getPrice(projectOne);
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
        expect(ownerDelta.mul("-1").lte(contractPrice)).to.be.true;
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
          ethers.utils.parseEther("1")
        );

      const startingPrice = ethers.utils.parseEther("1");
      const endingPrice = ethers.utils.parseEther("0.1");
      let contractPrice = await this.minter
        .connect(this.accounts.owner)
        .getPrice(projectOne);
      expect(contractPrice).to.be.equal(startingPrice);
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
          ethers.utils.parseEther("1")
        );

      const startingPrice = ethers.utils.parseEther("1");
      const endingPrice = ethers.utils.parseEther("0.1");
      let contractPrice = await this.minter
        .connect(this.accounts.owner)
        .getPrice(projectOne);
      expect(contractPrice).to.be.equal(endingPrice);
    });
  });

  describe("purchaseTo", async function () {
    const maxPrice = ethers.utils.parseEther("1");

    it("allows `purchaseTo` by default", async function () {
      await this.minter
        .connect(this.accounts.owner)
        .purchaseTo(this.accounts.additional.address, projectOne, {
          value: maxPrice,
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
            value: maxPrice,
          }),
        "No `purchaseTo` Allowed"
      );
      // still allows `purchaseTo` if destination matches sender.
      await this.minter
        .connect(this.accounts.owner)
        .purchaseTo(this.accounts.owner.address, projectOne, {
          value: maxPrice,
        });
    });
  });

  describe("setAuctionDetails", async function () {
    const maxPrice = ethers.utils.parseEther("1");

    it("allows whitelisted to set auction details", async function () {
      await this.minter
        .connect(this.accounts.snowfro)
        .setAuctionDetails(
          projectOne,
          this.startTime + 60000,
          this.startTime + 2 * ONE_HOUR,
          maxPrice
        );
    });

    it("allows artist to set auction details", async function () {
      await this.minter
        .connect(this.accounts.artist)
        .setAuctionDetails(
          projectOne,
          this.startTime + 60000,
          this.startTime + 2 * ONE_HOUR,
          maxPrice
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
            maxPrice
          ),
        "Only Core whitelisted or Artist"
      );
    });
  });

  describe("only allow ETH", async function () {
    const maxPrice = ethers.utils.parseEther("1");

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
            value: maxPrice,
          }),
        "Project currency must be ETH"
      );
    });
  });
});
