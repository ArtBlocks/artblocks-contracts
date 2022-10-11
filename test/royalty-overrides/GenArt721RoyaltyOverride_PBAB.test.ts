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

describe("GenArt721RoyaltyOverride_PBAB", async function () {
  const name = "Non Fungible Token PBAB";
  const symbol = "NFT_PBAB";

  const tokenIdProject0 = "0000000";
  const tokenIdProject1 = "1000000";

  const pricePerTokenInWei = ethers.utils.parseEther("1");
  const projectZero = 0;
  const projectOne = 1;

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
      renderProviderRoyaltyAddr1,
      renderProviderRoyaltyAddr2,
      platformRoyaltyAddr1,
      platformRoyaltyAddr2,
    ] = await ethers.getSigners();
    // use something other than this.accounts to bypass typical naming convention
    this.royaltyAccounts = {
      adminA: adminA,
      adminB: adminB,
      artist0: artist0,
      additional0: additional0,
      artist1: artist1,
      additional1: additional1,
      anyone: anyone,
      renderProviderRoyaltyAddr1,
      renderProviderRoyaltyAddr2,
      platformRoyaltyAddr1,
      platformRoyaltyAddr2,
    };
    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();
    const artblocksFactory_PBAB = await ethers.getContractFactory(
      "GenArt721CoreV2_PBAB"
    );
    this.tokenA = await artblocksFactory_PBAB
      .connect(adminA)
      .deploy(name, symbol, this.randomizer.address, 0);

    // set renderProviderAddress for tokenA
    await this.tokenA
      .connect(adminA)
      .updateRenderProviderAddress(
        this.royaltyAccounts.renderProviderRoyaltyAddr1.address
      );

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
    // use current PBAB minter (legacy)
    const minterFactory_PBAB = await ethers.getContractFactory(
      "GenArt721Minter_PBAB"
    );
    this.minterA = await minterFactory_PBAB.deploy(this.tokenA.address);

    await this.tokenA.connect(adminA).toggleProjectIsActive(projectZero);
    await this.tokenA.connect(adminA).toggleProjectIsActive(projectOne);

    await this.tokenA.connect(adminA).addMintWhitelisted(this.minterA.address);

    await this.tokenA
      .connect(artist0)
      .updateProjectMaxInvocations(projectZero, 15);
    await this.tokenA
      .connect(artist1)
      .updateProjectMaxInvocations(projectOne, 15);

    this.tokenA
      .connect(this.royaltyAccounts.artist0)
      .toggleProjectIsPaused(projectZero);
    this.tokenA
      .connect(this.royaltyAccounts.artist1)
      .toggleProjectIsPaused(projectOne);

    await this.minterA
      .connect(this.royaltyAccounts.anyone)
      .purchase(projectZero, { value: pricePerTokenInWei });

    await this.minterA
      .connect(this.royaltyAccounts.anyone)
      .purchase(projectOne, { value: pricePerTokenInWei });

    // deploy second core contract with two more projects
    this.tokenB = await artblocksFactory_PBAB
      .connect(adminB)
      .deploy(name, symbol, this.randomizer.address, 0);

    // set renderProviderAddress for tokenB
    await this.tokenB
      .connect(adminB)
      .updateRenderProviderAddress(
        this.royaltyAccounts.renderProviderRoyaltyAddr1.address
      );

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
    // up for existing (core returns royalties for tokenId=0 on non-existent tokens)
    this.minterB = await minterFactory_PBAB.deploy(this.tokenB.address);

    await this.tokenB.connect(adminB).toggleProjectIsActive(projectZero);
    await this.tokenB.connect(adminB).toggleProjectIsActive(projectOne);

    await this.tokenB.connect(adminB).addMintWhitelisted(this.minterB.address);

    await this.tokenB
      .connect(artist0)
      .updateProjectMaxInvocations(projectZero, 15);
    await this.tokenB
      .connect(artist1)
      .updateProjectMaxInvocations(projectOne, 15);

    this.tokenB
      .connect(this.royaltyAccounts.artist0)
      .toggleProjectIsPaused(projectZero);
    this.tokenB
      .connect(this.royaltyAccounts.artist1)
      .toggleProjectIsPaused(projectOne);

    await this.minterB
      .connect(this.royaltyAccounts.anyone)
      .purchase(projectZero, { value: pricePerTokenInWei });

    await this.minterB
      .connect(this.royaltyAccounts.anyone)
      .purchase(projectOne, { value: pricePerTokenInWei });

    // deploy PBAB royalty override
    const royaltyOverrideFactory_PBAB = await ethers.getContractFactory(
      "GenArt721RoyaltyOverride_PBAB"
    );
    this.royaltyOverride = await royaltyOverrideFactory_PBAB
      .connect(anyone)
      .deploy();
    // set platform royalty addr on token A
    await this.royaltyOverride
      .connect(this.royaltyAccounts.adminA)
      .updatePlatformRoyaltyAddressForContract(
        this.tokenA.address,
        platformRoyaltyAddr1.address
      );
  });

  describe("supports ERC165 interface", async function () {
    it("supports getRoyalties(address,uint256) interface", async function () {
      expect(
        await this.royaltyOverride
          .connect(this.royaltyAccounts.anyone)
          .supportsInterface("0x9ca7dc7a")
      ).to.be.true;
    });

    it("does not support invalid interface", async function () {
      expect(
        await this.royaltyOverride
          .connect(this.royaltyAccounts.anyone)
          .supportsInterface("0xffffffff")
      ).to.be.false;
    });
  });

  describe("initializes correctly", async function () {
    it("returns correct initial royalties", async function () {
      // tokenA, project 0
      let response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist0.address,
          this.royaltyAccounts.additional0.address,
          this.royaltyAccounts.platformRoyaltyAddr1.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(defaultBps), new BN(defaultBps)]
      );
      // tokenA, project 1
      response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject1);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist1.address,
          addressZero,
          this.royaltyAccounts.platformRoyaltyAddr1.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(500), new BN(0), new BN(defaultBps), new BN(defaultBps)]
      );
      // tokenB - no contract override set, expect revert
      await expectRevert(
        this.royaltyOverride
          .connect(this.royaltyAccounts.anyone)
          .getRoyalties(this.tokenB.address, tokenIdProject0),
        "Platform royalty address must be defined for contract"
      );
      // set royalty override for B and ensure project defaults initialized
      await this.royaltyOverride
        .connect(this.royaltyAccounts.adminB)
        .updatePlatformRoyaltyAddressForContract(
          this.tokenB.address,
          this.royaltyAccounts.platformRoyaltyAddr1.address
        );
      // tokenB, project0
      response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenB.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist0.address,
          this.royaltyAccounts.additional0.address,
          this.royaltyAccounts.platformRoyaltyAddr1.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(600), new BN(defaultBps), new BN(defaultBps)]
      );
      // tokenB, project 1
      response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenB.address, tokenIdProject1);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist1.address,
          addressZero,
          this.royaltyAccounts.platformRoyaltyAddr1.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(1000), new BN(0), new BN(defaultBps), new BN(defaultBps)]
      );
    });
  });

  describe("reflects artist's updated royalties", async function () {
    it("reflects artist setting their royalties to zero and back", async function () {
      // artist set royalties to zero
      await this.tokenA
        .connect(this.royaltyAccounts.artist0)
        .updateProjectSecondaryMarketRoyaltyPercentage(projectZero, 0);
      // check royalties response tokenA, project 0
      let response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist0.address,
          this.royaltyAccounts.additional0.address,
          this.royaltyAccounts.platformRoyaltyAddr1.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(0), new BN(0), new BN(defaultBps), new BN(defaultBps)]
      );
      // artist set royalties to non-zero (10 percent)
      await this.tokenA
        .connect(this.royaltyAccounts.artist0)
        .updateProjectSecondaryMarketRoyaltyPercentage(projectZero, 10);
      // check royalties response tokenA, project 0
      response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist0.address,
          this.royaltyAccounts.additional0.address,
          this.royaltyAccounts.platformRoyaltyAddr1.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(800), new BN(200), new BN(defaultBps), new BN(defaultBps)]
      );
    });

    it("reflects artist changing their secondary payee amount", async function () {
      // artist set different secondary payee to 100 percent
      await this.tokenA
        .connect(this.royaltyAccounts.artist0)
        .updateProjectAdditionalPayeeInfo(
          projectZero,
          this.royaltyAccounts.additional1.address,
          100
        );
      // check royalties response tokenA, project 0
      let response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist0.address,
          this.royaltyAccounts.additional1.address,
          this.royaltyAccounts.platformRoyaltyAddr1.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(0), new BN(500), new BN(defaultBps), new BN(defaultBps)]
      );
      // artist set different secondary payee to 0 percent
      await this.tokenA
        .connect(this.royaltyAccounts.artist0)
        .updateProjectAdditionalPayeeInfo(
          projectZero,
          this.royaltyAccounts.additional1.address,
          0
        );
      // check royalties response tokenA, project 0
      response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist0.address,
          this.royaltyAccounts.additional1.address,
          this.royaltyAccounts.platformRoyaltyAddr1.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(500), new BN(0), new BN(defaultBps), new BN(defaultBps)]
      );
    });
  });

  describe("core PBAB contract enforces limits on artist's updated royalties", async function () {
    it("enforces limits when artist changes their royalty percentage", async function () {
      // does not revert when setting secondary market royalty to 100%
      await this.tokenA
        .connect(this.royaltyAccounts.artist0)
        .updateProjectSecondaryMarketRoyaltyPercentage(projectZero, 0);
      // reverts when setting secondary market royalty to >100%
      await expectRevert(
        this.tokenA
          .connect(this.royaltyAccounts.artist0)
          .updateProjectSecondaryMarketRoyaltyPercentage(projectZero, 101),
        "Max of 100%"
      );
    });

    it("enforces limits when artist changes additional payee percentage", async function () {
      // does not revert when setting additional payee percentage to 100%
      await this.tokenA
        .connect(this.royaltyAccounts.artist0)
        .updateProjectAdditionalPayeeInfo(
          projectZero,
          this.royaltyAccounts.additional1.address,
          100
        );
      // reverts when setting additional payee market royalty to >100%
      await expectRevert(
        this.tokenA
          .connect(this.royaltyAccounts.artist0)
          .updateProjectAdditionalPayeeInfo(
            projectZero,
            this.royaltyAccounts.additional1.address,
            101
          ),
        "Max of 100%"
      );
    });
  });

  describe("handles changes to platform royalty address", async function () {
    it("allows only contract admin to update platform royalty address for contract", async function () {
      // reverts when non-admin tries to update payment addr for contract
      await expectRevert(
        this.royaltyOverride
          .connect(this.royaltyAccounts.adminA)
          .updatePlatformRoyaltyAddressForContract(
            this.tokenB.address,
            this.royaltyAccounts.platformRoyaltyAddr2.address
          ),
        "Only core admin for specified token contract"
      );
      // emits event when admin updates platform payment addr for contract
      await expect(
        this.royaltyOverride
          .connect(this.royaltyAccounts.adminB)
          .updatePlatformRoyaltyAddressForContract(
            this.tokenB.address,
            this.royaltyAccounts.platformRoyaltyAddr2.address
          )
      )
        .to.emit(
          this.royaltyOverride,
          "PlatformRoyaltyAddressForContractUpdated"
        )
        .withArgs(
          this.tokenB.address,
          this.royaltyAccounts.platformRoyaltyAddr2.address
        );
    });

    it("reflects updated platform royalty address for contract", async function () {
      // initialize payment address for tokenB
      await this.royaltyOverride
        .connect(this.royaltyAccounts.adminB)
        .updatePlatformRoyaltyAddressForContract(
          this.tokenB.address,
          this.royaltyAccounts.platformRoyaltyAddr1.address
        );
      // update contract's payment address
      await this.royaltyOverride
        .connect(this.royaltyAccounts.adminB)
        .updatePlatformRoyaltyAddressForContract(
          this.tokenB.address,
          this.royaltyAccounts.platformRoyaltyAddr2.address
        );
      // ensure update is reflected in getRoyalties call
      let response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenB.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist0.address,
          this.royaltyAccounts.additional0.address,
          this.royaltyAccounts.platformRoyaltyAddr2.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(600), new BN(defaultBps), new BN(defaultBps)]
      );
    });
  });

  describe("handles changes to core render provider payment address", async function () {
    it("core allows only current core admin to update render provider address", async function () {
      // reverts when non-admin tries to update render provider addr
      await expectRevert(
        this.tokenA
          .connect(this.royaltyAccounts.anyone)
          .updateRenderProviderAddress(
            this.royaltyAccounts.renderProviderRoyaltyAddr2.address
          ),
        "Only admin"
      );
      // core allows admin to update render provider addr
      await this.tokenA
        .connect(this.royaltyAccounts.adminA)
        .updateRenderProviderAddress(
          this.royaltyAccounts.renderProviderRoyaltyAddr2.address
        );
    });

    it("reflects updated core render provider address", async function () {
      // core allows admin to update render provider addr
      await this.tokenA
        .connect(this.royaltyAccounts.adminA)
        .updateRenderProviderAddress(
          this.royaltyAccounts.renderProviderRoyaltyAddr2.address
        );
      // ensure update is reflected in getRoyalties call
      let response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist0.address,
          this.royaltyAccounts.additional0.address,
          this.royaltyAccounts.platformRoyaltyAddr1.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr2.address,
        ],
        [new BN(400), new BN(100), new BN(defaultBps), new BN(defaultBps)]
      );
    });
  });

  describe("handles changes to render provider bps for contract", async function () {
    const legalBps = 200;
    const illegalBps = 10001;
    const zeroBps = 0;
    const maxLegalBps = 10000;
    it("allows only contract admin to update render provider bps for contract", async function () {
      // reverts when non-admin tries to update bps for contract
      await expectRevert(
        this.royaltyOverride
          .connect(this.royaltyAccounts.adminA)
          .updateRenderProviderBpsForContract(this.tokenB.address, legalBps),
        "Only core admin for specified token contract"
      );
      // emits event when admin updates bps for contract
      await expect(
        this.royaltyOverride
          .connect(this.royaltyAccounts.adminB)
          .updateRenderProviderBpsForContract(this.tokenB.address, legalBps)
      )
        .to.emit(this.royaltyOverride, "RenderProviderBpsForContractUpdated")
        .withArgs(this.tokenB.address, true, legalBps);
      // reverts when non-admin tries to clear bps for contract
      await expectRevert(
        this.royaltyOverride
          .connect(this.royaltyAccounts.adminA)
          .clearRenderProviderBpsForContract(this.tokenB.address),
        "Only core admin for specified token contract"
      );
      // emits event when admin clears bps for contract
      await expect(
        this.royaltyOverride
          .connect(this.royaltyAccounts.adminB)
          .clearRenderProviderBpsForContract(this.tokenB.address)
      )
        .to.emit(this.royaltyOverride, "RenderProviderBpsForContractUpdated")
        .withArgs(this.tokenB.address, false, addressZero);
    });

    it("reflects updated render provider bps for contract", async function () {
      // update contract's bps
      await this.royaltyOverride
        .connect(this.royaltyAccounts.adminA)
        .updateRenderProviderBpsForContract(this.tokenA.address, legalBps);
      // ensure update is reflected in getRoyalties call
      let response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist0.address,
          this.royaltyAccounts.additional0.address,
          this.royaltyAccounts.platformRoyaltyAddr1.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(defaultBps), new BN(legalBps)]
      );
      // clear contract's bps
      await this.royaltyOverride
        .connect(this.royaltyAccounts.adminA)
        .clearRenderProviderBpsForContract(this.tokenA.address);
      // ensure update is reflected in getRoyalties call
      response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist0.address,
          this.royaltyAccounts.additional0.address,
          this.royaltyAccounts.platformRoyaltyAddr1.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(defaultBps), new BN(defaultBps)]
      );
    });

    it("enforces constraints when updating render provider bps for contract", async function () {
      // update contract's bps to minimum value
      await this.royaltyOverride
        .connect(this.royaltyAccounts.adminA)
        .updateRenderProviderBpsForContract(this.tokenA.address, zeroBps);
      // ensure update is reflected in getRoyalties call
      let response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist0.address,
          this.royaltyAccounts.additional0.address,
          this.royaltyAccounts.platformRoyaltyAddr1.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(defaultBps), new BN(zeroBps)]
      );
      // update contract's bps to max legal value
      await this.royaltyOverride
        .connect(this.royaltyAccounts.adminA)
        .updateRenderProviderBpsForContract(this.tokenA.address, maxLegalBps);
      // ensure update is reflected in getRoyalties call
      response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist0.address,
          this.royaltyAccounts.additional0.address,
          this.royaltyAccounts.platformRoyaltyAddr1.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(defaultBps), new BN(maxLegalBps)]
      );
      // expect revert when contract's bps is updated to illegal value
      await expectRevert(
        this.royaltyOverride
          .connect(this.royaltyAccounts.adminA)
          .updateRenderProviderBpsForContract(this.tokenA.address, illegalBps),
        "invalid bps"
      );
    });
  });
  describe("handles changes to platform provider bps for contract", async function () {
    const legalBps = 200;
    const illegalBps = 10001;
    const zeroBps = 0;
    const maxLegalBps = 10000;
    it("allows only contract admin to update platform provider bps for contract", async function () {
      // reverts when non-admin tries to update bps for contract
      await expectRevert(
        this.royaltyOverride
          .connect(this.royaltyAccounts.adminA)
          .updatePlatformBpsForContract(this.tokenB.address, legalBps),
        "Only core admin for specified token contract"
      );
      // emits event when admin updates bps for contract
      await expect(
        this.royaltyOverride
          .connect(this.royaltyAccounts.adminB)
          .updatePlatformBpsForContract(this.tokenB.address, legalBps)
      )
        .to.emit(this.royaltyOverride, "PlatformBpsForContractUpdated")
        .withArgs(this.tokenB.address, true, legalBps);
      // reverts when non-admin tries to clear bps for contract
      await expectRevert(
        this.royaltyOverride
          .connect(this.royaltyAccounts.adminA)
          .clearPlatformBpsForContract(this.tokenB.address),
        "Only core admin for specified token contract"
      );
      // emits event when admin clears bps for contract
      await expect(
        this.royaltyOverride
          .connect(this.royaltyAccounts.adminB)
          .clearPlatformBpsForContract(this.tokenB.address)
      )
        .to.emit(this.royaltyOverride, "PlatformBpsForContractUpdated")
        .withArgs(this.tokenB.address, false, addressZero);
    });

    it("reflects updated platform provider bps for contract", async function () {
      // update contract's bps
      await this.royaltyOverride
        .connect(this.royaltyAccounts.adminA)
        .updatePlatformBpsForContract(this.tokenA.address, legalBps);
      // ensure update is reflected in getRoyalties call
      let response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist0.address,
          this.royaltyAccounts.additional0.address,
          this.royaltyAccounts.platformRoyaltyAddr1.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(legalBps), new BN(defaultBps)]
      );
      // clear contract's bps
      await this.royaltyOverride
        .connect(this.royaltyAccounts.adminA)
        .clearPlatformBpsForContract(this.tokenA.address);
      // ensure update is reflected in getRoyalties call
      response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist0.address,
          this.royaltyAccounts.additional0.address,
          this.royaltyAccounts.platformRoyaltyAddr1.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(defaultBps), new BN(defaultBps)]
      );
    });

    it("enforces constraints when updating platform bps for contract", async function () {
      // update contract's bps to minimum value
      await this.royaltyOverride
        .connect(this.royaltyAccounts.adminA)
        .updatePlatformBpsForContract(this.tokenA.address, zeroBps);
      // ensure update is reflected in getRoyalties call
      let response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist0.address,
          this.royaltyAccounts.additional0.address,
          this.royaltyAccounts.platformRoyaltyAddr1.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(zeroBps), new BN(defaultBps)]
      );
      // update contract's bps to max legal value
      await this.royaltyOverride
        .connect(this.royaltyAccounts.adminA)
        .updatePlatformBpsForContract(this.tokenA.address, maxLegalBps);
      // ensure update is reflected in getRoyalties call
      response = await this.royaltyOverride
        .connect(this.royaltyAccounts.anyone)
        .getRoyalties(this.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          this.royaltyAccounts.artist0.address,
          this.royaltyAccounts.additional0.address,
          this.royaltyAccounts.platformRoyaltyAddr1.address,
          this.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(maxLegalBps), new BN(defaultBps)]
      );
      // expect revert when contract's bps is updated to illegal value
      await expectRevert(
        this.royaltyOverride
          .connect(this.royaltyAccounts.adminA)
          .updatePlatformBpsForContract(this.tokenA.address, illegalBps),
        "invalid bps"
      );
    });
  });
});
