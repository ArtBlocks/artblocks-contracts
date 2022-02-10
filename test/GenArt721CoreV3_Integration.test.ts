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

describe("GenArt721CoreV3", async function () {
  const name = "Non Fungible Token";
  const symbol = "NFT";

  const firstTokenId = new BN("30000000");
  const secondTokenId = new BN("3000001");

  const pricePerTokenInWei = ethers.utils.parseEther("1");
  const projectZero = 0;

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
    // deploy and configure minter filter and minter
    const minterFilterFactory = await ethers.getContractFactory("MinterFilter");
    this.minterFilter = await minterFilterFactory.deploy(this.token.address);
    const minterFactory = await ethers.getContractFactory(
      "GenArt721FilteredMinterETH"
    );
    this.minter = await minterFactory.deploy(
      this.token.address,
      this.minterFilter.address
    );
    await this.minterFilter
      .connect(snowfro)
      .addApprovedMinter(this.minter.address);
    await this.token
      .connect(snowfro)
      .updateMinterContract(this.minterFilter.address);
    // add project
    await this.token.connect(snowfro).addProject("name", artist.address);
    await this.token.connect(snowfro).toggleProjectIsActive(projectZero);
    await this.token
      .connect(artist)
      .updateProjectMaxInvocations(projectZero, 15);
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
        const tx = await this.minter
          .connect(this.accounts.owner)
          .purchase(projectZero, {
            value: pricePerTokenInWei,
          });
        //expectEvent(tx, 'Transfer', {from: constants.ZERO_ADDRESS, to: owner, tokenId: firstTokenId});

        this.projectZeroInfo = await this.token.projectTokenInfo(projectZero);
        expect(this.projectZeroInfo.invocations).to.equal("1");
        expect(
          (await this.accounts.snowfro.getBalance()).sub(snowfroBalance)
        ).to.equal(ethers.utils.parseEther("0.1"));
        expect(
          (await this.accounts.artist.getBalance()).sub(artistBalance)
        ).to.equal(ethers.utils.parseEther("0.9"));
        expect(
          (await this.accounts.owner.getBalance()).sub(ownerBalance)
        ).to.equal(ethers.utils.parseEther("1").mul("-1")); // spent 1 ETH
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
        const tx = await this.minter
          .connect(this.accounts.owner)
          .purchase(projectZero, {
            value: pricePerTokenInWei,
          });
        //expectEvent(tx, 'Transfer', {from: constants.ZERO_ADDRESS, to: owner, tokenId: firstTokenId});

        this.projectZeroInfo = await this.token.projectTokenInfo(projectZero);
        // expect(this.projectZeroInfo.invocations).to.equal('1');

        expect(
          (await this.accounts.snowfro.getBalance()).sub(snowfroBalance)
        ).to.equal(ethers.utils.parseEther("0.1"));
        expect(
          (await this.accounts.additional.getBalance()).sub(additionalBalance)
        ).to.equal(ethers.utils.parseEther("0.09"));
        expect(
          (await this.accounts.owner.getBalance()).sub(ownerBalance)
        ).to.equal(ethers.utils.parseEther("1").mul("-1")); // spent 1 ETH
        expect(
          (await this.accounts.artist.getBalance()).sub(artistBalance)
        ).to.equal(
          ethers.utils.parseEther("0.9").sub(ethers.utils.parseEther("0.09"))
        );
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
        const tx = await this.minter
          .connect(this.accounts.owner)
          .purchase(projectZero, {
            value: pricePerTokenInWei,
          });
        //expectEvent(tx, 'Transfer', {from: constants.ZERO_ADDRESS, to: owner, tokenId: firstTokenId});

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
        ).to.equal(ethers.utils.parseEther("1").mul("-1")); // spent 1 ETH
        expect(
          (await this.accounts.artist.getBalance()).sub(artistBalance)
        ).to.equal(ethers.utils.parseEther("0"));
      });
    });

    describe("handles updating minter", async function () {
      it("emits event when updating minter", async function () {
        await expect(
          this.token
            .connect(this.accounts.snowfro)
            .updateMinterContract(this.minter.address)
        )
          .to.emit(this.token, "MinterUpdated")
          .withArgs(this.minter.address);
      });

      it("only allows admin/whitelisted to update minter", async function () {
        // allows admin to update minter
        await this.token
          .connect(this.accounts.snowfro)
          .updateMinterContract(this.minter.address);
        // does not allow random to update minter
        await expectRevert(
          this.token
            .connect(this.accounts.artist)
            .updateMinterContract(this.minter.address),
          "Only admin"
        );
      });
    });
  });

  describe("projectTokenInfo", function () {
    it("returns expected deprecated values", async function () {
      const tokenInfo = await this.token
        .connect(this.accounts.snowfro)
        .projectTokenInfo(0);
      expect(tokenInfo.pricePerTokenInWei.toString()).to.be.equal(
        new BN(
          "115792089237316195423570985008687907853269984665640564039457584007913129639935"
        ).toString()
      );
      expect(tokenInfo.currency).to.be.equal("");
      expect(tokenInfo.currencyAddress).to.be.equal(constants.ZERO_ADDRESS);
    });
  });
});
