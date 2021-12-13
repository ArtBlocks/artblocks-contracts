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

interface RoyaltiesResponse {
  recipients_: Array<String>;
  bps: Array<BN>;
}

const assertRoyaltiesResponse = async (
  response: RoyaltiesResponse,
  recipients_: Array<String>,
  bps: Array<BN>
) => {
  // check recipients
  expect(response.recipients_).to.be.deep.equal(recipients_);
  // check bps
  expect(response.bps.toString())
    .to.be.deep.equal(bps.toString())
    .to.not.equal("");
};

describe("GenArt721RoyaltyOverride", async function () {
  const name = "Non Fungible Token";
  const symbol = "NFT";

  const tokenIdProject0 = "0000000";
  const tokenIdProject1 = "1000000";

  const pricePerTokenInWei = ethers.utils.parseEther("1");
  const projectZero = 0;
  const projectOne = 1;

  const addressZero = "0x0000000000000000000000000000000000000000"

  beforeEach(async function () {
    const [
      adminA,
      adminB,
      artist0,
      additional0,
      artist1,
      additional1,
      anyone,
      renderProviderPaymentAddr1,
      renderProviderPaymentAddr2,
    ] = await ethers.getSigners();
    this.accounts = {
      adminA: adminA,
      adminB: adminB,
      artist0: artist0,
      additional0: additional0,
      artist1: artist1,
      additional1: additional1,
      anyone: anyone,
      renderProviderPaymentAddr1,
      renderProviderPaymentAddr2,
    };
    const randomizerFactory = await ethers.getContractFactory("Randomizer");
    this.randomizer = await randomizerFactory.deploy();
    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV2");
    this.tokenA = await artblocksFactory
      .connect(adminA)
      .deploy(name, symbol, this.randomizer.address);

    // add projects for artists 0 and 1
    await this.tokenA
      .connect(adminA)
      .addProject("project0_a", artist0.address, pricePerTokenInWei);

    await this.tokenA
      .connect(adminA)
      .addProject("project1_a", artist1.address, pricePerTokenInWei);

    // artist0 set royalty info (with additional payee)
    await this.tokenA
      .connect(artist0)
      .updateProjectSecondaryMarketRoyaltyPercentage(projectZero, 5);
    await this.tokenA
      .connect(artist0)
      .updateProjectAdditionalPayeeInfo(projectZero, additional0.address, 20);

    // artist1 set royalty info (no additional payee)
    await this.tokenA
      .connect(artist1)
      .updateProjectSecondaryMarketRoyaltyPercentage(projectOne, 5);

    // mint a token on each project because accurate royalties may only be looked
    // up for existing (core returns royalties for tokenId=0 on non-existant tokens)
    const minterFilterFactory = await ethers.getContractFactory("MinterFilter");
    this.minterFilterA = await minterFilterFactory.deploy(this.tokenA.address);
    const minterFactory = await ethers.getContractFactory(
      "GenArt721FilteredMinter"
    );
    this.minterA = await minterFactory.deploy(
      this.tokenA.address,
      this.minterFilterA.address
    );

    await this.tokenA.connect(adminA).toggleProjectIsActive(projectZero);
    await this.tokenA.connect(adminA).toggleProjectIsActive(projectOne);

    await this.tokenA
      .connect(adminA)
      .addMintWhitelisted(this.minterFilterA.address);

    await this.tokenA
      .connect(artist0)
      .updateProjectMaxInvocations(projectZero, 15);
    await this.tokenA
      .connect(artist1)
      .updateProjectMaxInvocations(projectOne, 15);

    this.tokenA
      .connect(this.accounts.artist0)
      .toggleProjectIsPaused(projectZero);
    this.tokenA
      .connect(this.accounts.artist1)
      .toggleProjectIsPaused(projectOne);

    await this.minterFilterA
      .connect(this.accounts.adminA)
      .addApprovedMinter(this.minterA.address);
    await this.minterFilterA
      .connect(this.accounts.adminA)
      .setMinterForProject(projectZero, this.minterA.address);
    await this.minterFilterA
      .connect(this.accounts.adminA)
      .setMinterForProject(projectOne, this.minterA.address);

    await this.minterA
      .connect(this.accounts.anyone)
      .purchase(projectZero, { value: pricePerTokenInWei });

    await this.minterA
      .connect(this.accounts.anyone)
      .purchase(projectOne, { value: pricePerTokenInWei });

    // deploy second core contract with two more projects
    this.tokenB = await artblocksFactory
      .connect(adminB)
      .deploy(name, symbol, this.randomizer.address);

    // add projects for artists 0 and 1
    await this.tokenB
      .connect(adminB)
      .addProject("project0_b", artist0.address, pricePerTokenInWei);

    await this.tokenB
      .connect(adminB)
      .addProject("project1_b", artist1.address, pricePerTokenInWei);

    // artist0 set royalty info (with additional payee)
    await this.tokenB
      .connect(artist0)
      .updateProjectSecondaryMarketRoyaltyPercentage(projectZero, 10);
    await this.tokenB
      .connect(artist0)
      .updateProjectAdditionalPayeeInfo(projectZero, additional0.address, 60);

    // artist1 set royalty info (no additional payee)
    await this.tokenB
      .connect(artist1)
      .updateProjectSecondaryMarketRoyaltyPercentage(projectOne, 10);

      // mint a token on each project because accurate royalties may only be looked
      // up for existing (core returns royalties for tokenId=0 on non-existant tokens)
      this.minterFilterB = await minterFilterFactory.deploy(this.tokenB.address);
      this.minterB = await minterFactory.deploy(
        this.tokenB.address,
        this.minterFilterB.address
      );
  
      await this.tokenB.connect(adminB).toggleProjectIsActive(projectZero);
      await this.tokenB.connect(adminB).toggleProjectIsActive(projectOne);
  
      await this.tokenB
        .connect(adminB)
        .addMintWhitelisted(this.minterFilterB.address);
  
      await this.tokenB
        .connect(artist0)
        .updateProjectMaxInvocations(projectZero, 15);
      await this.tokenB
        .connect(artist1)
        .updateProjectMaxInvocations(projectOne, 15);
  
      this.tokenB
        .connect(this.accounts.artist0)
        .toggleProjectIsPaused(projectZero);
      this.tokenB
        .connect(this.accounts.artist1)
        .toggleProjectIsPaused(projectOne);
  
      await this.minterFilterB
        .connect(this.accounts.adminB)
        .addApprovedMinter(this.minterB.address);
      await this.minterFilterB
        .connect(this.accounts.adminB)
        .setMinterForProject(projectZero, this.minterB.address);
      await this.minterFilterB
        .connect(this.accounts.adminB)
        .setMinterForProject(projectOne, this.minterB.address);
  
      await this.minterB
        .connect(this.accounts.anyone)
        .purchase(projectZero, { value: pricePerTokenInWei });
  
      await this.minterB
        .connect(this.accounts.anyone)
        .purchase(projectOne, { value: pricePerTokenInWei });

    // deploy minter override, tokenA set as admin core contract
    const royaltyOverrideFactory = await ethers.getContractFactory(
      "GenArt721RoyaltyOverride"
    );
    this.royaltyOverride = await royaltyOverrideFactory
      .connect(anyone)
      .deploy(this.tokenA.address, renderProviderPaymentAddr1.address);
  });

  describe("supports ERC165 interface", async function () {
    it("supports getRoyalties(address,uint256) interface", async function () {
      expect(
        await this.royaltyOverride
          .connect(this.accounts.anyone)
          .supportsInterface("0x9ca7dc7a")
      ).to.be.true;
    });

    it("does not support 0xffffffff interface", async function () {
      expect(
        await this.royaltyOverride
          .connect(this.accounts.anyone)
          .supportsInterface("0xffffffff")
      ).to.be.false;
    });
  });

  describe("initializes correctly", async function () {
    it("initializes proper core admin contract", async function () {
      expect(
        await this.royaltyOverride
          .connect(this.accounts.anyone)
          .adminCoreContract()
      ).to.be.equal(this.tokenA.address);
    });

    it("initializes proper (delegated) admin address", async function () {
      expect(
        await this.royaltyOverride.connect(this.accounts.anyone).getAdmin()
      ).to.be.equal(this.accounts.adminA.address);
    });

    it("returns correct initial royalties", async function () {
      // tokenA, project 0
      let response = await this.royaltyOverride
        .connect(this.accounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      // check response
      assertRoyaltiesResponse(
        response,
        [
          this.accounts.artist0.address,
          this.accounts.additional0.address,
          this.accounts.renderProviderPaymentAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(250)]
      );
      // tokenA, project 1
      response = await this.royaltyOverride
        .connect(this.accounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject1);
      // check response
      assertRoyaltiesResponse(
        response,
        [
          this.accounts.artist1.address,
          addressZero,
          this.accounts.renderProviderPaymentAddr1.address,
        ],
        [new BN(500), new BN(0), new BN(250)]
      );
      // tokenB, project 0
      response = await this.royaltyOverride
        .connect(this.accounts.anyone)
        .getRoyalties(this.tokenB.address, tokenIdProject0);
      // check response
      assertRoyaltiesResponse(
        response,
        [
          this.accounts.artist0.address,
          this.accounts.additional0.address,
          this.accounts.renderProviderPaymentAddr1.address,
        ],
        [new BN(400), new BN(600), new BN(250)]
      );
      // tokenB, project 1
      response = await this.royaltyOverride
        .connect(this.accounts.anyone)
        .getRoyalties(this.tokenB.address, tokenIdProject1);
      // check response
      assertRoyaltiesResponse(
        response,
        [
          this.accounts.artist1.address,
          addressZero,
          this.accounts.renderProviderPaymentAddr1.address,
        ],
        [new BN(1000), new BN(0), new BN(250)]
      );
    });
  });
});
