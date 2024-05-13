import { BN, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

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

  async function _beforeEach() {
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
    // use something other than config.accounts to bypass typical naming convention
    config.royaltyAccounts = {
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
    const randomizerFactory =
      await ethers.getContractFactory("BasicRandomizer");
    config.randomizer = await randomizerFactory.deploy();
    const artblocksFactory_PBAB = await ethers.getContractFactory(
      "GenArt721CoreV2_PBAB"
    );
    config.tokenA = await artblocksFactory_PBAB
      .connect(adminA)
      .deploy(name, symbol, config.randomizer.address, 0);

    // set renderProviderAddress for tokenA
    await config.tokenA
      .connect(adminA)
      .updateRenderProviderAddress(
        config.royaltyAccounts.renderProviderRoyaltyAddr1.address
      );

    // add projects for artists 0 and 1
    await config.tokenA
      .connect(adminA)
      .addProject("project0_a", artist0.address, pricePerTokenInWei);

    await config.tokenA
      .connect(adminA)
      .addProject("project1_a", artist1.address, pricePerTokenInWei);

    // artist0 set royalty info (with additional payee)
    await config.tokenA
      .connect(artist0)
      .updateProjectSecondaryMarketRoyaltyPercentage(projectZero, 5);
    await config.tokenA
      .connect(artist0)
      .updateProjectAdditionalPayeeInfo(projectZero, additional0.address, 20);

    // artist1 set royalty info (no additional payee)
    await config.tokenA
      .connect(artist1)
      .updateProjectSecondaryMarketRoyaltyPercentage(projectOne, 5);

    // mint a token on each project because accurate royalties may only be looked
    // up for existing (core returns royalties for tokenId=0 on non-existant tokens)
    // use current PBAB minter (legacy)
    const minterFactory_PBAB = await ethers.getContractFactory(
      "GenArt721Minter_PBAB"
    );
    config.minterA = await minterFactory_PBAB.deploy(config.tokenA.address);

    await config.tokenA.connect(adminA).toggleProjectIsActive(projectZero);
    await config.tokenA.connect(adminA).toggleProjectIsActive(projectOne);

    await config.tokenA
      .connect(adminA)
      .addMintWhitelisted(config.minterA.address);

    await config.tokenA
      .connect(artist0)
      .updateProjectMaxInvocations(projectZero, 15);
    await config.tokenA
      .connect(artist1)
      .updateProjectMaxInvocations(projectOne, 15);

    await config.tokenA
      .connect(config.royaltyAccounts.artist0)
      .toggleProjectIsPaused(projectZero);
    await config.tokenA
      .connect(config.royaltyAccounts.artist1)
      .toggleProjectIsPaused(projectOne);

    await config.minterA
      .connect(config.royaltyAccounts.anyone)
      ["purchase(uint256)"](projectZero, {
        value: pricePerTokenInWei,
      });

    await config.minterA
      .connect(config.royaltyAccounts.anyone)
      ["purchase(uint256)"](projectOne, {
        value: pricePerTokenInWei,
      });

    // deploy second core contract with two more projects
    config.tokenB = await artblocksFactory_PBAB
      .connect(adminB)
      .deploy(name, symbol, config.randomizer.address, 0);

    // set renderProviderAddress for tokenB
    await config.tokenB
      .connect(adminB)
      .updateRenderProviderAddress(
        config.royaltyAccounts.renderProviderRoyaltyAddr1.address
      );

    // add projects for artists 0 and 1
    await config.tokenB
      .connect(adminB)
      .addProject("project0_b", artist0.address, pricePerTokenInWei);

    await config.tokenB
      .connect(adminB)
      .addProject("project1_b", artist1.address, pricePerTokenInWei);

    // artist0 set royalty info (with additional payee)
    await config.tokenB
      .connect(artist0)
      .updateProjectSecondaryMarketRoyaltyPercentage(projectZero, 10);
    await config.tokenB
      .connect(artist0)
      .updateProjectAdditionalPayeeInfo(projectZero, additional0.address, 60);

    // artist1 set royalty info (no additional payee)
    await config.tokenB
      .connect(artist1)
      .updateProjectSecondaryMarketRoyaltyPercentage(projectOne, 10);

    // mint a token on each project because accurate royalties may only be looked
    // up for existing (core returns royalties for tokenId=0 on non-existent tokens)
    config.minterB = await minterFactory_PBAB.deploy(config.tokenB.address);

    await config.tokenB.connect(adminB).toggleProjectIsActive(projectZero);
    await config.tokenB.connect(adminB).toggleProjectIsActive(projectOne);

    await config.tokenB
      .connect(adminB)
      .addMintWhitelisted(config.minterB.address);

    await config.tokenB
      .connect(artist0)
      .updateProjectMaxInvocations(projectZero, 15);
    await config.tokenB
      .connect(artist1)
      .updateProjectMaxInvocations(projectOne, 15);

    await config.tokenB
      .connect(config.royaltyAccounts.artist0)
      .toggleProjectIsPaused(projectZero);
    await config.tokenB
      .connect(config.royaltyAccounts.artist1)
      .toggleProjectIsPaused(projectOne);

    await config.minterB
      .connect(config.royaltyAccounts.anyone)
      ["purchase(uint256)"](projectZero, {
        value: pricePerTokenInWei,
      });

    await config.minterB
      .connect(config.royaltyAccounts.anyone)
      ["purchase(uint256)"](projectOne, {
        value: pricePerTokenInWei,
      });

    // deploy PBAB royalty override
    const royaltyOverrideFactory_PBAB = await ethers.getContractFactory(
      "GenArt721RoyaltyOverride_PBAB"
    );
    config.royaltyOverride = await royaltyOverrideFactory_PBAB
      .connect(anyone)
      .deploy();
    // set platform royalty addr on token A
    await config.royaltyOverride
      .connect(config.royaltyAccounts.adminA)
      .updatePlatformRoyaltyAddressForContract(
        config.tokenA.address,
        platformRoyaltyAddr1.address
      );
    return config;
  }

  describe("supports ERC165 interface", async function () {
    it("supports getRoyalties(address,uint256) interface", async function () {
      const config = await loadFixture(_beforeEach);
      expect(
        await config.royaltyOverride
          .connect(config.royaltyAccounts.anyone)
          .supportsInterface("0x9ca7dc7a")
      ).to.be.true;
    });

    it("does not support invalid interface", async function () {
      const config = await loadFixture(_beforeEach);
      expect(
        await config.royaltyOverride
          .connect(config.royaltyAccounts.anyone)
          .supportsInterface("0xffffffff")
      ).to.be.false;
    });
  });

  describe("initializes correctly", async function () {
    it("returns correct initial royalties", async function () {
      const config = await loadFixture(_beforeEach);
      // tokenA, project 0
      let response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist0.address,
          config.royaltyAccounts.additional0.address,
          config.royaltyAccounts.platformRoyaltyAddr1.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(defaultBps), new BN(defaultBps)]
      );
      // tokenA, project 1
      response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenA.address, tokenIdProject1);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist1.address,
          addressZero,
          config.royaltyAccounts.platformRoyaltyAddr1.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(500), new BN(0), new BN(defaultBps), new BN(defaultBps)]
      );
      // tokenB - no contract override set, expect revert
      await expectRevert(
        config.royaltyOverride
          .connect(config.royaltyAccounts.anyone)
          .getRoyalties(config.tokenB.address, tokenIdProject0),
        "Platform royalty address must be defined for contract"
      );
      // set royalty override for B and ensure project defaults initialized
      await config.royaltyOverride
        .connect(config.royaltyAccounts.adminB)
        .updatePlatformRoyaltyAddressForContract(
          config.tokenB.address,
          config.royaltyAccounts.platformRoyaltyAddr1.address
        );
      // tokenB, project0
      response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenB.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist0.address,
          config.royaltyAccounts.additional0.address,
          config.royaltyAccounts.platformRoyaltyAddr1.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(600), new BN(defaultBps), new BN(defaultBps)]
      );
      // tokenB, project 1
      response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenB.address, tokenIdProject1);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist1.address,
          addressZero,
          config.royaltyAccounts.platformRoyaltyAddr1.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(1000), new BN(0), new BN(defaultBps), new BN(defaultBps)]
      );
    });
  });

  describe("reflects artist's updated royalties", async function () {
    it("reflects artist setting their royalties to zero and back", async function () {
      const config = await loadFixture(_beforeEach);
      // artist set royalties to zero
      await config.tokenA
        .connect(config.royaltyAccounts.artist0)
        .updateProjectSecondaryMarketRoyaltyPercentage(projectZero, 0);
      // check royalties response tokenA, project 0
      let response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist0.address,
          config.royaltyAccounts.additional0.address,
          config.royaltyAccounts.platformRoyaltyAddr1.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(0), new BN(0), new BN(defaultBps), new BN(defaultBps)]
      );
      // artist set royalties to non-zero (10 percent)
      await config.tokenA
        .connect(config.royaltyAccounts.artist0)
        .updateProjectSecondaryMarketRoyaltyPercentage(projectZero, 10);
      // check royalties response tokenA, project 0
      response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist0.address,
          config.royaltyAccounts.additional0.address,
          config.royaltyAccounts.platformRoyaltyAddr1.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(800), new BN(200), new BN(defaultBps), new BN(defaultBps)]
      );
    });

    it("reflects artist changing their secondary payee amount", async function () {
      const config = await loadFixture(_beforeEach);
      // artist set different secondary payee to 100 percent
      await config.tokenA
        .connect(config.royaltyAccounts.artist0)
        .updateProjectAdditionalPayeeInfo(
          projectZero,
          config.royaltyAccounts.additional1.address,
          100
        );
      // check royalties response tokenA, project 0
      let response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist0.address,
          config.royaltyAccounts.additional1.address,
          config.royaltyAccounts.platformRoyaltyAddr1.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(0), new BN(500), new BN(defaultBps), new BN(defaultBps)]
      );
      // artist set different secondary payee to 0 percent
      await config.tokenA
        .connect(config.royaltyAccounts.artist0)
        .updateProjectAdditionalPayeeInfo(
          projectZero,
          config.royaltyAccounts.additional1.address,
          0
        );
      // check royalties response tokenA, project 0
      response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist0.address,
          config.royaltyAccounts.additional1.address,
          config.royaltyAccounts.platformRoyaltyAddr1.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(500), new BN(0), new BN(defaultBps), new BN(defaultBps)]
      );
    });
  });

  describe("core PBAB contract enforces limits on artist's updated royalties", async function () {
    it("enforces limits when artist changes their royalty percentage", async function () {
      const config = await loadFixture(_beforeEach);
      // does not revert when setting secondary market royalty to 100%
      await config.tokenA
        .connect(config.royaltyAccounts.artist0)
        .updateProjectSecondaryMarketRoyaltyPercentage(projectZero, 0);
      // reverts when setting secondary market royalty to >100%
      await expectRevert(
        config.tokenA
          .connect(config.royaltyAccounts.artist0)
          .updateProjectSecondaryMarketRoyaltyPercentage(projectZero, 101),
        "Max of 100%"
      );
    });

    it("enforces limits when artist changes additional payee percentage", async function () {
      const config = await loadFixture(_beforeEach);
      // does not revert when setting additional payee percentage to 100%
      await config.tokenA
        .connect(config.royaltyAccounts.artist0)
        .updateProjectAdditionalPayeeInfo(
          projectZero,
          config.royaltyAccounts.additional1.address,
          100
        );
      // reverts when setting additional payee market royalty to >100%
      await expectRevert(
        config.tokenA
          .connect(config.royaltyAccounts.artist0)
          .updateProjectAdditionalPayeeInfo(
            projectZero,
            config.royaltyAccounts.additional1.address,
            101
          ),
        "Max of 100%"
      );
    });
  });

  describe("handles changes to platform royalty address", async function () {
    it("allows only contract admin to update platform royalty address for contract", async function () {
      const config = await loadFixture(_beforeEach);
      // reverts when non-admin tries to update payment addr for contract
      await expectRevert(
        config.royaltyOverride
          .connect(config.royaltyAccounts.adminA)
          .updatePlatformRoyaltyAddressForContract(
            config.tokenB.address,
            config.royaltyAccounts.platformRoyaltyAddr2.address
          ),
        "Only core admin for specified token contract"
      );
      // emits event when admin updates platform payment addr for contract
      await expect(
        config.royaltyOverride
          .connect(config.royaltyAccounts.adminB)
          .updatePlatformRoyaltyAddressForContract(
            config.tokenB.address,
            config.royaltyAccounts.platformRoyaltyAddr2.address
          )
      )
        .to.emit(
          config.royaltyOverride,
          "PlatformRoyaltyAddressForContractUpdated"
        )
        .withArgs(
          config.tokenB.address,
          config.royaltyAccounts.platformRoyaltyAddr2.address
        );
    });

    it("reflects updated platform royalty address for contract", async function () {
      const config = await loadFixture(_beforeEach);
      // initialize payment address for tokenB
      await config.royaltyOverride
        .connect(config.royaltyAccounts.adminB)
        .updatePlatformRoyaltyAddressForContract(
          config.tokenB.address,
          config.royaltyAccounts.platformRoyaltyAddr1.address
        );
      // update contract's payment address
      await config.royaltyOverride
        .connect(config.royaltyAccounts.adminB)
        .updatePlatformRoyaltyAddressForContract(
          config.tokenB.address,
          config.royaltyAccounts.platformRoyaltyAddr2.address
        );
      // ensure update is reflected in getRoyalties call
      let response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenB.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist0.address,
          config.royaltyAccounts.additional0.address,
          config.royaltyAccounts.platformRoyaltyAddr2.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(600), new BN(defaultBps), new BN(defaultBps)]
      );
    });
  });

  describe("handles changes to core render provider payment address", async function () {
    it("core allows only current core admin to update render provider address", async function () {
      const config = await loadFixture(_beforeEach);
      // reverts when non-admin tries to update render provider addr
      await expectRevert(
        config.tokenA
          .connect(config.royaltyAccounts.anyone)
          .updateRenderProviderAddress(
            config.royaltyAccounts.renderProviderRoyaltyAddr2.address
          ),
        "Only admin"
      );
      // core allows admin to update render provider addr
      await config.tokenA
        .connect(config.royaltyAccounts.adminA)
        .updateRenderProviderAddress(
          config.royaltyAccounts.renderProviderRoyaltyAddr2.address
        );
    });

    it("reflects updated core render provider address", async function () {
      const config = await loadFixture(_beforeEach);
      // core allows admin to update render provider addr
      await config.tokenA
        .connect(config.royaltyAccounts.adminA)
        .updateRenderProviderAddress(
          config.royaltyAccounts.renderProviderRoyaltyAddr2.address
        );
      // ensure update is reflected in getRoyalties call
      let response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist0.address,
          config.royaltyAccounts.additional0.address,
          config.royaltyAccounts.platformRoyaltyAddr1.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr2.address,
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
      const config = await loadFixture(_beforeEach);
      // reverts when non-admin tries to update bps for contract
      await expectRevert(
        config.royaltyOverride
          .connect(config.royaltyAccounts.adminA)
          .updateRenderProviderBpsForContract(config.tokenB.address, legalBps),
        "Only core admin for specified token contract"
      );
      // emits event when admin updates bps for contract
      await expect(
        config.royaltyOverride
          .connect(config.royaltyAccounts.adminB)
          .updateRenderProviderBpsForContract(config.tokenB.address, legalBps)
      )
        .to.emit(config.royaltyOverride, "RenderProviderBpsForContractUpdated")
        .withArgs(config.tokenB.address, true, legalBps);
      // reverts when non-admin tries to clear bps for contract
      await expectRevert(
        config.royaltyOverride
          .connect(config.royaltyAccounts.adminA)
          .clearRenderProviderBpsForContract(config.tokenB.address),
        "Only core admin for specified token contract"
      );
      // emits event when admin clears bps for contract
      await expect(
        config.royaltyOverride
          .connect(config.royaltyAccounts.adminB)
          .clearRenderProviderBpsForContract(config.tokenB.address)
      )
        .to.emit(config.royaltyOverride, "RenderProviderBpsForContractUpdated")
        .withArgs(config.tokenB.address, false, addressZero);
    });

    it("reflects updated render provider bps for contract", async function () {
      const config = await loadFixture(_beforeEach);
      // update contract's bps
      await config.royaltyOverride
        .connect(config.royaltyAccounts.adminA)
        .updateRenderProviderBpsForContract(config.tokenA.address, legalBps);
      // ensure update is reflected in getRoyalties call
      let response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist0.address,
          config.royaltyAccounts.additional0.address,
          config.royaltyAccounts.platformRoyaltyAddr1.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(defaultBps), new BN(legalBps)]
      );
      // clear contract's bps
      await config.royaltyOverride
        .connect(config.royaltyAccounts.adminA)
        .clearRenderProviderBpsForContract(config.tokenA.address);
      // ensure update is reflected in getRoyalties call
      response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist0.address,
          config.royaltyAccounts.additional0.address,
          config.royaltyAccounts.platformRoyaltyAddr1.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(defaultBps), new BN(defaultBps)]
      );
    });

    it("enforces constraints when updating render provider bps for contract", async function () {
      const config = await loadFixture(_beforeEach);
      // update contract's bps to minimum value
      await config.royaltyOverride
        .connect(config.royaltyAccounts.adminA)
        .updateRenderProviderBpsForContract(config.tokenA.address, zeroBps);
      // ensure update is reflected in getRoyalties call
      let response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist0.address,
          config.royaltyAccounts.additional0.address,
          config.royaltyAccounts.platformRoyaltyAddr1.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(defaultBps), new BN(zeroBps)]
      );
      // update contract's bps to max legal value
      await config.royaltyOverride
        .connect(config.royaltyAccounts.adminA)
        .updateRenderProviderBpsForContract(config.tokenA.address, maxLegalBps);
      // ensure update is reflected in getRoyalties call
      response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist0.address,
          config.royaltyAccounts.additional0.address,
          config.royaltyAccounts.platformRoyaltyAddr1.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(defaultBps), new BN(maxLegalBps)]
      );
      // expect revert when contract's bps is updated to illegal value
      await expectRevert(
        config.royaltyOverride
          .connect(config.royaltyAccounts.adminA)
          .updateRenderProviderBpsForContract(
            config.tokenA.address,
            illegalBps
          ),
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
      const config = await loadFixture(_beforeEach);
      // reverts when non-admin tries to update bps for contract
      await expectRevert(
        config.royaltyOverride
          .connect(config.royaltyAccounts.adminA)
          .updatePlatformBpsForContract(config.tokenB.address, legalBps),
        "Only core admin for specified token contract"
      );
      // emits event when admin updates bps for contract
      await expect(
        config.royaltyOverride
          .connect(config.royaltyAccounts.adminB)
          .updatePlatformBpsForContract(config.tokenB.address, legalBps)
      )
        .to.emit(config.royaltyOverride, "PlatformBpsForContractUpdated")
        .withArgs(config.tokenB.address, true, legalBps);
      // reverts when non-admin tries to clear bps for contract
      await expectRevert(
        config.royaltyOverride
          .connect(config.royaltyAccounts.adminA)
          .clearPlatformBpsForContract(config.tokenB.address),
        "Only core admin for specified token contract"
      );
      // emits event when admin clears bps for contract
      await expect(
        config.royaltyOverride
          .connect(config.royaltyAccounts.adminB)
          .clearPlatformBpsForContract(config.tokenB.address)
      )
        .to.emit(config.royaltyOverride, "PlatformBpsForContractUpdated")
        .withArgs(config.tokenB.address, false, addressZero);
    });

    it("reflects updated platform provider bps for contract", async function () {
      const config = await loadFixture(_beforeEach);
      // update contract's bps
      await config.royaltyOverride
        .connect(config.royaltyAccounts.adminA)
        .updatePlatformBpsForContract(config.tokenA.address, legalBps);
      // ensure update is reflected in getRoyalties call
      let response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist0.address,
          config.royaltyAccounts.additional0.address,
          config.royaltyAccounts.platformRoyaltyAddr1.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(legalBps), new BN(defaultBps)]
      );
      // clear contract's bps
      await config.royaltyOverride
        .connect(config.royaltyAccounts.adminA)
        .clearPlatformBpsForContract(config.tokenA.address);
      // ensure update is reflected in getRoyalties call
      response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist0.address,
          config.royaltyAccounts.additional0.address,
          config.royaltyAccounts.platformRoyaltyAddr1.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(defaultBps), new BN(defaultBps)]
      );
    });

    it("enforces constraints when updating platform bps for contract", async function () {
      const config = await loadFixture(_beforeEach);
      // update contract's bps to minimum value
      await config.royaltyOverride
        .connect(config.royaltyAccounts.adminA)
        .updatePlatformBpsForContract(config.tokenA.address, zeroBps);
      // ensure update is reflected in getRoyalties call
      let response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist0.address,
          config.royaltyAccounts.additional0.address,
          config.royaltyAccounts.platformRoyaltyAddr1.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(zeroBps), new BN(defaultBps)]
      );
      // update contract's bps to max legal value
      await config.royaltyOverride
        .connect(config.royaltyAccounts.adminA)
        .updatePlatformBpsForContract(config.tokenA.address, maxLegalBps);
      // ensure update is reflected in getRoyalties call
      response = await config.royaltyOverride
        .connect(config.royaltyAccounts.anyone)
        .getRoyalties(config.tokenA.address, tokenIdProject0);
      await assertRoyaltiesResponse(
        response,
        [
          config.royaltyAccounts.artist0.address,
          config.royaltyAccounts.additional0.address,
          config.royaltyAccounts.platformRoyaltyAddr1.address,
          config.royaltyAccounts.renderProviderRoyaltyAddr1.address,
        ],
        [new BN(400), new BN(100), new BN(maxLegalBps), new BN(defaultBps)]
      );
      // expect revert when contract's bps is updated to illegal value
      await expectRevert(
        config.royaltyOverride
          .connect(config.royaltyAccounts.adminA)
          .updatePlatformBpsForContract(config.tokenA.address, illegalBps),
        "invalid bps"
      );
    });
  });
});
