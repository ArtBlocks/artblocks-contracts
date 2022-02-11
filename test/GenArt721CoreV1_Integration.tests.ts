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
    const randomizerFactory = await ethers.getContractFactory("Randomizer");
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
    const minterFactory = await ethers.getContractFactory(
      "GenArt721FilteredMinterETHV0"
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
