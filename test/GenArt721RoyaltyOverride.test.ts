import { BN, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

interface RoyaltiesResponse {
  recipients_: Array<String>;
  bps: Array<BN>;
}

// helper function to compare getRoyalties response
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

  const tokenIdProject0 = "3000000";
  const tokenIdProject1 = "4000000";

  const pricePerTokenInWei = ethers.utils.parseEther("1");
  const projectZero = 3; // V1 core starts at project 3
  const projectOne = 4;

  const addressZero = "0x0000000000000000000000000000000000000000";
  const defaultBps = 250;

  beforeEach(async function () {
    const [
      adminA,
      adminB,
      artist0,
      additional0,
      artist1,
      additional1,
      anyone,
      artblocksRoyaltyAddr1,
      artblocksRoyaltyAddr2,
    ] = await ethers.getSigners();
    this.accounts = {
      adminA: adminA,
      adminB: adminB,
      artist0: artist0,
      additional0: additional0,
      artist1: artist1,
      additional1: additional1,
      anyone: anyone,
      artblocksRoyaltyAddr1,
      artblocksRoyaltyAddr2,
    };
    const randomizerFactory = await ethers.getContractFactory("Randomizer");
    this.randomizer = await randomizerFactory.deploy();
    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV1");
    this.tokenA = await artblocksFactory
      .connect(adminA)
      .deploy(name, symbol, this.randomizer.address);

    // add projects for artists 0 and 1
    await this.tokenA
      .connect(adminA)
      .addProject("project0_a", artist0.address, 0, false);

    await this.tokenA
      .connect(adminA)
      .addProject("project1_a", artist1.address, 0, false);

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
    const minterFilterFactory = await ethers.getContractFactory(
      "MinterFilterV0"
    );
    this.minterFilterA = await minterFilterFactory.deploy(this.tokenA.address);
    const minterFactory = await ethers.getContractFactory(
      "MinterSetPriceERC20V0"
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
      .connect(this.accounts.artist0)
      .updatePricePerTokenInWei(projectZero, pricePerTokenInWei);
    await this.minterA
      .connect(this.accounts.artist1)
      .updatePricePerTokenInWei(projectOne, pricePerTokenInWei);

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
      .addProject("project0_b", artist0.address, 0, false);

    await this.tokenB
      .connect(adminB)
      .addProject("project1_b", artist1.address, 0, false);

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
    // up for existing (core returns royalties for tokenId=0 on non-existent tokens)
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
      .connect(this.accounts.artist0)
      .updatePricePerTokenInWei(projectZero, pricePerTokenInWei);
    await this.minterB
      .connect(this.accounts.artist1)
      .updatePricePerTokenInWei(projectOne, pricePerTokenInWei);

    await this.minterB
      .connect(this.accounts.anyone)
      .purchase(projectZero, { value: pricePerTokenInWei });

    await this.minterB
      .connect(this.accounts.anyone)
      .purchase(projectOne, { value: pricePerTokenInWei });

    // deploy royalty override
    const royaltyOverrideFactory = await ethers.getContractFactory(
      "GenArt721RoyaltyOverride"
    );
    this.royaltyOverride = await royaltyOverrideFactory
      .connect(anyone)
      .deploy();
    // set AB royalty address for tokenA
    await this.royaltyOverride
      .connect(this.accounts.adminA)
      .updateArtblocksRoyaltyAddressForContract(
        this.tokenA.address,
        this.accounts.artblocksRoyaltyAddr1.address
      );
  });

  describe("supports ERC165 interface", async function () {
    it("supports getRoyalties(address,uint256) interface", async function () {
      expect(
        await this.royaltyOverride
          .connect(this.accounts.anyone)
          .supportsInterface("0x9ca7dc7a")
      ).to.be.true;
    });

    it("does not support invalid interface", async function () {
      expect(
        await this.royaltyOverride
          .connect(this.accounts.anyone)
          .supportsInterface("0xffffffff")
      ).to.be.false;
    });
  });

  describe("initializes correctly", async function () {
    it("returns correct initial royalties", async function () {
      // tokenA, project 0
      let response = await this.royaltyOverride
        .connect(this.accounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      assertRoyaltiesResponse(
        response,
        [
          this.accounts.artist0.address,
          this.accounts.additional0.address,
          this.accounts.artblocksRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(defaultBps)]
      );
      // tokenA, project 1
      response = await this.royaltyOverride
        .connect(this.accounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject1);
      assertRoyaltiesResponse(
        response,
        [
          this.accounts.artist1.address,
          addressZero,
          this.accounts.artblocksRoyaltyAddr1.address,
        ],
        [new BN(500), new BN(0), new BN(defaultBps)]
      );
      // tokenB - no contract override set, expect revert
      await expectRevert(
        this.royaltyOverride
          .connect(this.accounts.anyone)
          .getRoyalties(this.tokenB.address, tokenIdProject0),
        "Art Blocks royalty address must be defined for contract"
      );
      // set royalty override for B and ensure project defaults initialized
      await this.royaltyOverride
        .connect(this.accounts.adminB)
        .updateArtblocksRoyaltyAddressForContract(
          this.tokenB.address,
          this.accounts.artblocksRoyaltyAddr1.address
        );
      // tokenB, project0
      response = await this.royaltyOverride
        .connect(this.accounts.anyone)
        .getRoyalties(this.tokenB.address, tokenIdProject0);
      assertRoyaltiesResponse(
        response,
        [
          this.accounts.artist0.address,
          this.accounts.additional0.address,
          this.accounts.artblocksRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(600), new BN(defaultBps)]
      );
      // tokenB, project 1
      response = await this.royaltyOverride
        .connect(this.accounts.anyone)
        .getRoyalties(this.tokenB.address, tokenIdProject1);
      assertRoyaltiesResponse(
        response,
        [
          this.accounts.artist1.address,
          addressZero,
          this.accounts.artblocksRoyaltyAddr1.address,
        ],
        [new BN(1000), new BN(0), new BN(defaultBps)]
      );
    });
  });

  describe("reflects artist's updated royalties", async function () {
    it("reflects artist setting their royalties to zero and back", async function () {
      // artist set royalties to zero
      await this.tokenA
        .connect(this.accounts.artist0)
        .updateProjectSecondaryMarketRoyaltyPercentage(projectZero, 0);
      // check royalties response tokenA, project 0
      let response = await this.royaltyOverride
        .connect(this.accounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      assertRoyaltiesResponse(
        response,
        [
          this.accounts.artist0.address,
          this.accounts.additional0.address,
          this.accounts.artblocksRoyaltyAddr1.address,
        ],
        [new BN(0), new BN(0), new BN(defaultBps)]
      );
      // artist set royalties to non-zero (10 percent)
      await this.tokenA
        .connect(this.accounts.artist0)
        .updateProjectSecondaryMarketRoyaltyPercentage(projectZero, 10);
      // check royalties response tokenA, project 0
      response = await this.royaltyOverride
        .connect(this.accounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      assertRoyaltiesResponse(
        response,
        [
          this.accounts.artist0.address,
          this.accounts.additional0.address,
          this.accounts.artblocksRoyaltyAddr1.address,
        ],
        [new BN(800), new BN(200), new BN(defaultBps)]
      );
    });

    it("reflects artist changing their secondary payee amount", async function () {
      // artist set different secondary payee to 100 percent
      await this.tokenA
        .connect(this.accounts.artist0)
        .updateProjectAdditionalPayeeInfo(
          projectZero,
          this.accounts.additional1.address,
          100
        );
      // check royalties response tokenA, project 0
      let response = await this.royaltyOverride
        .connect(this.accounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      assertRoyaltiesResponse(
        response,
        [
          this.accounts.artist0.address,
          this.accounts.additional1.address,
          this.accounts.artblocksRoyaltyAddr1.address,
        ],
        [new BN(0), new BN(500), new BN(defaultBps)]
      );
      // artist set different secondary payee to 0 percent
      await this.tokenA
        .connect(this.accounts.artist0)
        .updateProjectAdditionalPayeeInfo(
          projectZero,
          this.accounts.additional1.address,
          0
        );
      // check royalties response tokenA, project 0
      response = await this.royaltyOverride
        .connect(this.accounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      assertRoyaltiesResponse(
        response,
        [
          this.accounts.artist0.address,
          this.accounts.additional1.address,
          this.accounts.artblocksRoyaltyAddr1.address,
        ],
        [new BN(500), new BN(0), new BN(defaultBps)]
      );
    });
  });

  describe("core contract enforces limits on artist's updated royalties", async function () {
    it("enforces limits when artist changes their royalty percentage", async function () {
      // does not revert when setting secondary market royalty to 100%
      await this.tokenA
        .connect(this.accounts.artist0)
        .updateProjectSecondaryMarketRoyaltyPercentage(projectZero, 0);
      // reverts when setting secondary market royalty to >100%
      await expectRevert(
        this.tokenA
          .connect(this.accounts.artist0)
          .updateProjectSecondaryMarketRoyaltyPercentage(projectZero, 101),
        "Max of 100%"
      );
    });

    it("enforces limits when artist changes additional payee percentage", async function () {
      // does not revert when setting additional payee percentage to 100%
      await this.tokenA
        .connect(this.accounts.artist0)
        .updateProjectAdditionalPayeeInfo(
          projectZero,
          this.accounts.additional1.address,
          100
        );
      // reverts when setting additional payee market royalty to >100%
      await expectRevert(
        this.tokenA
          .connect(this.accounts.artist0)
          .updateProjectAdditionalPayeeInfo(
            projectZero,
            this.accounts.additional1.address,
            101
          ),
        "Max of 100%"
      );
    });
  });

  describe("handles changes to art blocks royalty address", async function () {
    it("allows only contract admin to update art blocks royalty address for contract", async function () {
      // reverts when non-admin tries to update payment addr for contract
      await expectRevert(
        this.royaltyOverride
          .connect(this.accounts.adminA)
          .updateArtblocksRoyaltyAddressForContract(
            this.tokenB.address,
            this.accounts.artblocksRoyaltyAddr2.address
          ),
        "Only core admin for specified token contract"
      );
      // emits event when admin updates payment addr for contract
      await expect(
        this.royaltyOverride
          .connect(this.accounts.adminB)
          .updateArtblocksRoyaltyAddressForContract(
            this.tokenB.address,
            this.accounts.artblocksRoyaltyAddr2.address
          )
      )
        .to.emit(
          this.royaltyOverride,
          "ArtblocksRoyaltyAddressForContractUpdated"
        )
        .withArgs(
          this.tokenB.address,
          this.accounts.artblocksRoyaltyAddr2.address
        );
    });

    it("reflects updated art blocks royalty address for contract", async function () {
      // initialize payment address for tokenB
      await this.royaltyOverride
        .connect(this.accounts.adminB)
        .updateArtblocksRoyaltyAddressForContract(
          this.tokenB.address,
          this.accounts.artblocksRoyaltyAddr1.address
        );
      // update contract's payment address
      await this.royaltyOverride
        .connect(this.accounts.adminB)
        .updateArtblocksRoyaltyAddressForContract(
          this.tokenB.address,
          this.accounts.artblocksRoyaltyAddr2.address
        );
      // ensure update is reflected in getRoyalties call
      let response = await this.royaltyOverride
        .connect(this.accounts.anyone)
        .getRoyalties(this.tokenB.address, tokenIdProject0);
      assertRoyaltiesResponse(
        response,
        [
          this.accounts.artist0.address,
          this.accounts.additional0.address,
          this.accounts.artblocksRoyaltyAddr2.address,
        ],
        [new BN(400), new BN(600), new BN(defaultBps)]
      );
    });
  });

  describe("handles changes to art blocks bps for contract", async function () {
    const legalBps = 200;
    const illegalBps = defaultBps + 1; // override must be <= default
    const zeroBps = 0;
    const maxLegalBps = defaultBps;
    it("allows only contract admin to update art blocks bps for contract", async function () {
      // reverts when non-admin tries to update bps for contract
      await expectRevert(
        this.royaltyOverride
          .connect(this.accounts.adminA)
          .updateArtblocksBpsForContract(this.tokenB.address, legalBps),
        "Only core admin for specified token contract"
      );
      // emits event when admin updates bps for contract
      await expect(
        this.royaltyOverride
          .connect(this.accounts.adminB)
          .updateArtblocksBpsForContract(this.tokenB.address, legalBps)
      )
        .to.emit(this.royaltyOverride, "ArtblocksBpsForContractUpdated")
        .withArgs(this.tokenB.address, true, legalBps);
      // reverts when non-admin tries to clear bps for contract
      await expectRevert(
        this.royaltyOverride
          .connect(this.accounts.adminA)
          .clearArtblocksBpsForContract(this.tokenB.address),
        "Only core admin for specified token contract"
      );
      // emits event when admin clears bps for contract
      await expect(
        this.royaltyOverride
          .connect(this.accounts.adminB)
          .clearArtblocksBpsForContract(this.tokenB.address)
      )
        .to.emit(this.royaltyOverride, "ArtblocksBpsForContractUpdated")
        .withArgs(this.tokenB.address, false, addressZero);
    });

    it("reflects updated art blocks bps for contract", async function () {
      // update contract's bps
      await this.royaltyOverride
        .connect(this.accounts.adminA)
        .updateArtblocksBpsForContract(this.tokenA.address, legalBps);
      // ensure update is reflected in getRoyalties call
      let response = await this.royaltyOverride
        .connect(this.accounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      assertRoyaltiesResponse(
        response,
        [
          this.accounts.artist0.address,
          this.accounts.additional0.address,
          this.accounts.artblocksRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(legalBps)]
      );
      // clear contract's bps
      await this.royaltyOverride
        .connect(this.accounts.adminA)
        .clearArtblocksBpsForContract(this.tokenA.address);
      // ensure update is reflected in getRoyalties call
      response = await this.royaltyOverride
        .connect(this.accounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      assertRoyaltiesResponse(
        response,
        [
          this.accounts.artist0.address,
          this.accounts.additional0.address,
          this.accounts.artblocksRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(defaultBps)]
      );
    });

    it("enforces constraints when updating art blocks bps for contract", async function () {
      // update contract's bps to minimum value
      await this.royaltyOverride
        .connect(this.accounts.adminA)
        .updateArtblocksBpsForContract(this.tokenA.address, zeroBps);
      // ensure update is reflected in getRoyalties call
      let response = await this.royaltyOverride
        .connect(this.accounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      assertRoyaltiesResponse(
        response,
        [
          this.accounts.artist0.address,
          this.accounts.additional0.address,
          this.accounts.artblocksRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(zeroBps)]
      );
      // update contract's bps to max legal value
      await this.royaltyOverride
        .connect(this.accounts.adminA)
        .updateArtblocksBpsForContract(this.tokenA.address, maxLegalBps);
      // ensure update is reflected in getRoyalties call
      response = await this.royaltyOverride
        .connect(this.accounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      assertRoyaltiesResponse(
        response,
        [
          this.accounts.artist0.address,
          this.accounts.additional0.address,
          this.accounts.artblocksRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(maxLegalBps)]
      );
      // expect revert when contract's bps is updated > default bps
      await expectRevert(
        this.royaltyOverride
          .connect(this.accounts.adminA)
          .updateArtblocksBpsForContract(this.tokenA.address, illegalBps),
        "override bps for contract must be less than or equal to default"
      );
    });
  });
});
