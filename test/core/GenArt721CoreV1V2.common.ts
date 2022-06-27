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
 * These tests are intended to check integration of the MinterFilter suite
 * with the V1 or V2_PRTNR core contract.
 * Some basic core tests, and basic functional tests to ensure purchase
 * does in fact mint tokens to purchaser.
 */
export const GenArt721MinterV1V2_Common = async (
  coreContract: string,
  minterFilterContract: string,
  minterContract: string,
  projectZero: number
) => {
  describe(`GenArt721CoreV1V2 Common Integration | ${coreContract} | ${minterFilterContract}-${minterContract}`, async function () {
    const name = "Non Fungible Token";
    const symbol = "NFT";

    const firstTokenId = new BN(projectZero.toString()).mul(new BN("1000000"));
    const secondTokenId = firstTokenId.add(new BN("1"));

    const pricePerTokenInWei = ethers.utils.parseEther("1");

    const maxInvocations = 15;

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
      const coreFactory = await ethers.getContractFactory(coreContract);
      this.token = await coreFactory
        .connect(deployer)
        .deploy(name, symbol, this.randomizer.address);
      // deploy and configure minter filter and minter
      const minterFilterFactory = await ethers.getContractFactory(
        minterFilterContract
      );
      this.minterFilter = await minterFilterFactory.deploy(this.token.address);
      const minterFactory = await ethers.getContractFactory(minterContract);
      this.minter = await minterFactory.deploy(
        this.token.address,
        this.minterFilter.address
      );
      await this.minterFilter
        .connect(deployer)
        .addApprovedMinter(this.minter.address);
      await this.token
        .connect(deployer)
        .addMintWhitelisted(this.minterFilter.address);
      // add project (different interface for flagship & core)
      try {
        await this.token
          .connect(deployer)
          .addProject("name", artist.address, 0);
      } catch (error) {
        await this.token
          .connect(deployer)
          .addProject("name", artist.address, 0, false);
      }
      await this.token.connect(deployer).toggleProjectIsActive(projectZero);
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
          this.accounts.deployer.address
        );
      });

      it("has an admin", async function () {
        expect(await this.token.admin()).to.be.equal(
          this.accounts.deployer.address
        );
      });

      it("has a whitelisted account", async function () {
        expect(
          await this.token.isWhitelisted(this.accounts.deployer.address)
        ).to.be.equal(true);
      });
    });

    describe("reverts on project locked", async function () {
      it("reverts if try to modify script", async function () {
        await this.token
          .connect(this.accounts.deployer)
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
          this.minter.connect(this.accounts.deployer).purchase(projectZero, {
            value: pricePerTokenInWei,
          }),
          "Purchases are paused."
        );
      });
    });

    describe("handles updating minter", async function () {
      it("only allows admin/whitelisted to update minter", async function () {
        // allows admin to update minter
        await this.token
          .connect(this.accounts.deployer)
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
          .connect(this.accounts.deployer)
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
};
