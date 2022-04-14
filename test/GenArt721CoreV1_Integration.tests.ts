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

/**
 * These tests are intended to check integration of the MinterFilter suite
 * with the V1 core contract.
 * Some basic core tests, and basic functional tests to ensure purchase
 * does in fact mint tokens to purchaser.
 */
describe("GenArt721CoreV1", async function () {
  const name = "Non Fungible Token";
  const symbol = "NFT";

  const firstTokenId = new BN("30000000");
  const secondTokenId = new BN("3000001");

  const pricePerTokenInWei = ethers.utils.parseEther("1");
  const projectZero = 3; // V1 core starts at project 3

  const maxInvocations = 15;

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
    // deploy and configure minter filter and minter
    const minterFilterFactory = await ethers.getContractFactory(
      "MinterFilterV0"
    );
    this.minterFilter = await minterFilterFactory.deploy(this.token.address);
    const minterFactory = await ethers.getContractFactory("MinterSetPriceV0");
    this.minter = await minterFactory.deploy(
      this.token.address,
      this.minterFilter.address
    );
    await this.minterFilter
      .connect(snowfro)
      .addApprovedMinter(this.minter.address);
    await this.token
      .connect(snowfro)
      .addMintWhitelisted(this.minterFilter.address);
    // add project
    await this.token
      .connect(snowfro)
      .addProject("name", artist.address, 0, false);
    await this.token.connect(snowfro).toggleProjectIsActive(projectZero);
    await this.token
      .connect(artist)
      .updateProjectMaxInvocations(projectZero, maxInvocations);
    // set project's minter and price
    await this.minter
      .connect(artist)
      .updatePricePerTokenInWei(projectZero, pricePerTokenInWei);
    await this.minterFilter
      .connect(artist)
      .setMinterForProject(projectZero, this.minter.address);
    // get project's info
    this.projectZeroInfo = await this.token.projectTokenInfo(projectZero);
  });

  describe("has whitelisted owner", function () {
    it("has an admin", async function () {
      expect(await this.token.artblocksAddress()).to.be.equal(
        this.accounts.snowfro.address
      );
    });

    it("has an admin", async function () {
      expect(await this.token.admin()).to.be.equal(
        this.accounts.snowfro.address
      );
    });

    describe("has whitelisted owner", function () {
      it("has an admin", async function () {
        expect(await this.token.artblocksAddress()).to.be.equal(
          this.accounts.snowfro.address
        );
      });

      it("has an admin", async function () {
        expect(await this.token.admin()).to.be.equal(
          this.accounts.snowfro.address
        );
      });

      it("has a whitelisted account", async function () {
        expect(
          await this.token.isWhitelisted(this.accounts.snowfro.address)
        ).to.be.equal(true);
      });
    });

    describe("reverts on project locked", async function () {
      it("reverts if try to modify script", async function () {
        await this.token
          .connect(this.accounts.snowfro)
          .toggleProjectIsLocked(projectZero);
        await expectRevert(
          this.token
            .connect(this.accounts.artist)
            .updateProjectScriptJSON(projectZero, "lorem ipsum"),
          "Only if unlocked"
        );
      });
    });

    describe("purchase", async function () {
      it("reverts if below min amount", async function () {
        await expectRevert(
          this.minter.connect(this.accounts.artist).purchase(projectZero, {
            value: 0,
          }),
          "Must send minimum value to mint!"
        );
      });

      it("reverts if project not active", async function () {
        await expectRevert(
          this.minter.connect(this.accounts.snowfro).purchase(projectZero, {
            value: pricePerTokenInWei,
          }),
          "Purchases are paused."
        );
      });

      it("can create a token then funds distributed (no additional payee)", async function () {
        const artistBalance = await this.accounts.artist.getBalance();
        const ownerBalance = await this.accounts.owner.getBalance();
        const snowfroBalance = await this.accounts.snowfro.getBalance();

        this.token
          .connect(this.accounts.artist)
          .toggleProjectIsPaused(projectZero);

        // pricePerTokenInWei setup above to be 1 ETH
        await expect(
          this.minter.connect(this.accounts.owner).purchase(projectZero, {
            value: pricePerTokenInWei,
          })
        )
          .to.emit(this.token, "Transfer")
          .withArgs(
            constants.ZERO_ADDRESS,
            this.accounts.owner.address,
            firstTokenId
          );

        this.projectZeroInfo = await this.token.projectTokenInfo(projectZero);
        expect(this.projectZeroInfo.invocations).to.equal("1");
        expect(
          (await this.accounts.snowfro.getBalance()).sub(snowfroBalance)
        ).to.equal(ethers.utils.parseEther("0.1"));
        expect(
          (await this.accounts.artist.getBalance()).sub(artistBalance)
        ).to.equal(ethers.utils.parseEther("0.8971167"));
        expect(
          (await this.accounts.owner.getBalance()).sub(ownerBalance)
        ).to.equal(ethers.utils.parseEther("1.0368459").mul("-1")); // spent 1 ETH
      });

      it("can create a token then funds distributed (with additional payee)", async function () {
        const additionalBalance = await this.accounts.additional.getBalance();
        const artistBalance = await this.accounts.artist.getBalance();
        const ownerBalance = await this.accounts.owner.getBalance();
        const snowfroBalance = await this.accounts.snowfro.getBalance();

        const additionalPayeePercentage = 10;
        this.token
          .connect(this.accounts.artist)
          .updateProjectAdditionalPayeeInfo(
            projectZero,
            this.accounts.additional.address,
            additionalPayeePercentage
          );
        this.token
          .connect(this.accounts.artist)
          .toggleProjectIsPaused(projectZero);

        // pricePerTokenInWei setup above to be 1 ETH
        await expect(
          this.minter.connect(this.accounts.owner).purchase(projectZero, {
            value: pricePerTokenInWei,
          })
        )
          .to.emit(this.token, "Transfer")
          .withArgs(
            constants.ZERO_ADDRESS,
            this.accounts.owner.address,
            firstTokenId
          );

        this.projectZeroInfo = await this.token.projectTokenInfo(projectZero);
        expect(this.projectZeroInfo.invocations).to.equal("1");

        expect(
          (await this.accounts.snowfro.getBalance()).sub(snowfroBalance)
        ).to.equal(ethers.utils.parseEther("0.1"));
        expect(
          (await this.accounts.additional.getBalance()).sub(additionalBalance)
        ).to.equal(ethers.utils.parseEther("0.09"));
        expect(
          (await this.accounts.owner.getBalance()).sub(ownerBalance)
        ).to.equal(ethers.utils.parseEther("1.0382189").mul("-1")); // spent 1 ETH
        expect(
          (await this.accounts.artist.getBalance()).sub(artistBalance)
        ).to.equal(ethers.utils.parseEther("0.8002491"));
      });

      it("can create a token then funds distributed (with additional payee getting 100%)", async function () {
        const additionalBalance = await this.accounts.additional.getBalance();
        const artistBalance = await this.accounts.artist.getBalance();
        const ownerBalance = await this.accounts.owner.getBalance();
        const snowfroBalance = await this.accounts.snowfro.getBalance();

        const additionalPayeePercentage = 100;
        this.token
          .connect(this.accounts.artist)
          .updateProjectAdditionalPayeeInfo(
            projectZero,
            this.accounts.additional.address,
            additionalPayeePercentage
          );
        this.token
          .connect(this.accounts.artist)
          .toggleProjectIsPaused(projectZero);

        // pricePerTokenInWei setup above to be 1 ETH
        await expect(
          this.minter.connect(this.accounts.owner).purchase(projectZero, {
            value: pricePerTokenInWei,
          })
        )
          .to.emit(this.token, "Transfer")
          .withArgs(
            constants.ZERO_ADDRESS,
            this.accounts.owner.address,
            firstTokenId
          );

        this.projectZeroInfo = await this.token.projectTokenInfo(projectZero);
        expect(this.projectZeroInfo.invocations).to.equal("1");

        expect(
          (await this.accounts.snowfro.getBalance()).sub(snowfroBalance)
        ).to.equal(ethers.utils.parseEther("0.1"));
        expect(
          (await this.accounts.additional.getBalance()).sub(additionalBalance)
        ).to.equal(ethers.utils.parseEther("0.9"));
        expect(
          (await this.accounts.owner.getBalance()).sub(ownerBalance)
        ).to.equal(ethers.utils.parseEther("1.0369584").mul("-1")); // spent 1 ETH
        expect(
          (await this.accounts.artist.getBalance()).sub(artistBalance)
        ).to.equal("-9750900000000000");
      });
    });
  });

  describe("handles updating minter", async function () {
    it("only allows admin/whitelisted to update minter", async function () {
      // allows admin to update minter
      await this.token
        .connect(this.accounts.snowfro)
        .addMintWhitelisted(this.minter.address);
      // does not allow random to update minter
      await expectRevert(
        this.token
          .connect(this.accounts.artist)
          .addMintWhitelisted(this.minter.address),
        "Only admin"
      );
    });
  });

  describe("projectTokenInfo", function () {
    it("returns expected values", async function () {
      const tokenInfo = await this.token
        .connect(this.accounts.snowfro)
        .projectTokenInfo(projectZero);
      expect(tokenInfo.invocations).to.be.equal(0);
      expect(tokenInfo.maxInvocations).to.be.equal(maxInvocations);
      // The following are not used by MinterFilter, but should exist on V1
      expect(tokenInfo.pricePerTokenInWei).to.be.equal(0);
      expect(tokenInfo.currency).to.be.equal("ETH");
      expect(tokenInfo.currencyAddress).to.be.equal(constants.ZERO_ADDRESS);
    });
  });
});
