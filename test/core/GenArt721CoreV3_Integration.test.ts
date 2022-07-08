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
 * NOTE: V3 core does not currently have a compatible minter.
 * Tests/operations involving minter currently commented out in this file -
 * to be updated when developing a minter for V3 core.
 */
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
    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();
    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV3");
    this.genArt721Core = await artblocksFactory
      .connect(snowfro)
      .deploy(name, symbol, this.randomizer.address);

    // TBD - V3 DOES NOT CURRENTLY HAVE A WORKING MINTER

    // add project
    await this.genArt721Core
      .connect(snowfro)
      .addProject("name", artist.address);
    await this.genArt721Core
      .connect(snowfro)
      .toggleProjectIsActive(projectZero);
    await this.genArt721Core
      .connect(artist)
      .updateProjectMaxInvocations(projectZero, 15);
  });

  describe("has whitelisted owner", function () {
    it("has an admin", async function () {
      expect(await this.genArt721Core.artblocksAddress()).to.be.equal(
        this.accounts.snowfro.address
      );
    });

    it("has an admin", async function () {
      expect(await this.genArt721Core.admin()).to.be.equal(
        this.accounts.snowfro.address
      );
    });

    describe("has whitelisted owner", function () {
      it("has an admin", async function () {
        expect(await this.genArt721Core.artblocksAddress()).to.be.equal(
          this.accounts.snowfro.address
        );
      });

      it("has an admin", async function () {
        expect(await this.genArt721Core.admin()).to.be.equal(
          this.accounts.snowfro.address
        );
      });

      it("has a whitelisted account", async function () {
        expect(
          await this.genArt721Core.isWhitelisted(this.accounts.snowfro.address)
        ).to.be.equal(true);
      });
    });

    describe("reverts on project locked", async function () {
      it("reverts if try to modify script", async function () {
        await this.genArt721Core
          .connect(this.accounts.snowfro)
          .toggleProjectIsLocked(projectZero);
        await expectRevert(
          this.genArt721Core
            .connect(this.accounts.artist)
            .updateProjectScriptJSON(projectZero, "lorem ipsum"),
          "Only if unlocked"
        );
      });
    });
  });

  describe("projectInfo", function () {
    it("returns expected deprecated values", async function () {
      const tokenInfo = await this.genArt721Core
        .connect(this.accounts.snowfro)
        .projectInfo(0);
      expect(tokenInfo.invocations).to.be.equal(0);
      expect(tokenInfo.maxInvocations).to.be.equal(15);
    });
  });
});
