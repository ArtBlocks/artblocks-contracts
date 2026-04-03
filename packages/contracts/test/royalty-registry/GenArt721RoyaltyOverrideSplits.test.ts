import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

// IArtblocksRoyaltyOverride interface ID: getRoyalties(address,uint256)
const ROYALTY_OVERRIDE_INTERFACE_ID = "0x9ca7dc7a";
// IERC165 interface ID
const ERC165_INTERFACE_ID = "0x01ffc9a7";

describe("GenArt721RoyaltyOverrideSplits", async function () {
  let owner: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let splitterAddr1: SignerWithAddress;
  let splitterAddr2: SignerWithAddress;
  let royaltyOverride: Contract;

  // use two fake "core contract" addresses for testing
  let coreContractA: SignerWithAddress;
  let coreContractB: SignerWithAddress;

  const projectZero = 0;
  const projectOne = 1;
  const projectTwo = 2;
  const tokenIdProject0 = 0; // tokenId 0 -> projectId 0
  const tokenIdProject1 = 1_000_000; // tokenId 1M -> projectId 1
  const tokenIdProject2 = 2_000_042; // tokenId 2000042 -> projectId 2
  const bps500 = 500;
  const bps750 = 750;
  const bps10000 = 10000;

  async function _beforeEach() {
    [
      owner,
      nonOwner,
      splitterAddr1,
      splitterAddr2,
      coreContractA,
      coreContractB,
    ] = await ethers.getSigners();

    const factory = await ethers.getContractFactory(
      "GenArt721RoyaltyOverrideSplits"
    );
    royaltyOverride = await factory.connect(owner).deploy(owner.address);
  }

  describe("deployment", async function () {
    it("sets owner correctly", async function () {
      await loadFixture(_beforeEach);
      expect(await royaltyOverride.owner()).to.equal(owner.address);
    });

    it("reports correct MAX_BPS", async function () {
      await loadFixture(_beforeEach);
      expect(await royaltyOverride.MAX_BPS()).to.equal(10000);
    });
  });

  describe("supportsInterface", async function () {
    it("supports IArtblocksRoyaltyOverride (0x9ca7dc7a)", async function () {
      await loadFixture(_beforeEach);
      expect(
        await royaltyOverride.supportsInterface(ROYALTY_OVERRIDE_INTERFACE_ID)
      ).to.be.true;
    });

    it("supports IERC165 (0x01ffc9a7)", async function () {
      await loadFixture(_beforeEach);
      expect(await royaltyOverride.supportsInterface(ERC165_INTERFACE_ID)).to.be
        .true;
    });

    it("does not support invalid interface (0xffffffff)", async function () {
      await loadFixture(_beforeEach);
      expect(await royaltyOverride.supportsInterface("0xffffffff")).to.be.false;
    });
  });

  describe("setRoyaltyConfig", async function () {
    it("allows owner to set config", async function () {
      await loadFixture(_beforeEach);
      await expect(
        royaltyOverride
          .connect(owner)
          .setRoyaltyConfig(
            coreContractA.address,
            projectZero,
            splitterAddr1.address,
            bps500
          )
      )
        .to.emit(royaltyOverride, "RoyaltyConfigUpdated")
        .withArgs(
          coreContractA.address,
          projectZero,
          splitterAddr1.address,
          bps500
        );
    });

    it("reverts for non-owner", async function () {
      await loadFixture(_beforeEach);
      await expectRevert(
        royaltyOverride
          .connect(nonOwner)
          .setRoyaltyConfig(
            coreContractA.address,
            projectZero,
            splitterAddr1.address,
            bps500
          ),
        "OwnableUnauthorizedAccount"
      );
    });

    it("reverts for zero-address splitter", async function () {
      await loadFixture(_beforeEach);
      await expectRevert(
        royaltyOverride
          .connect(owner)
          .setRoyaltyConfig(
            coreContractA.address,
            projectZero,
            ADDRESS_ZERO,
            bps500
          ),
        "Must not be zero address"
      );
    });

    it("reverts when bps exceeds MAX_BPS", async function () {
      await loadFixture(_beforeEach);
      await expectRevert(
        royaltyOverride
          .connect(owner)
          .setRoyaltyConfig(
            coreContractA.address,
            projectZero,
            splitterAddr1.address,
            10001
          ),
        "Exceeds max BPS"
      );
    });

    it("allows bps of exactly MAX_BPS (10000)", async function () {
      await loadFixture(_beforeEach);
      await royaltyOverride
        .connect(owner)
        .setRoyaltyConfig(
          coreContractA.address,
          projectZero,
          splitterAddr1.address,
          bps10000
        );
      const config = await royaltyOverride.royaltyConfigs(
        coreContractA.address,
        projectZero
      );
      expect(config.splitter).to.equal(splitterAddr1.address);
      expect(config.bps).to.equal(bps10000);
    });

    it("allows bps of zero", async function () {
      await loadFixture(_beforeEach);
      await royaltyOverride
        .connect(owner)
        .setRoyaltyConfig(
          coreContractA.address,
          projectZero,
          splitterAddr1.address,
          0
        );
      const config = await royaltyOverride.royaltyConfigs(
        coreContractA.address,
        projectZero
      );
      expect(config.splitter).to.equal(splitterAddr1.address);
      expect(config.bps).to.equal(0);
    });

    it("can update an existing config", async function () {
      await loadFixture(_beforeEach);
      await royaltyOverride
        .connect(owner)
        .setRoyaltyConfig(
          coreContractA.address,
          projectZero,
          splitterAddr1.address,
          bps500
        );
      // update to new splitter and bps
      await royaltyOverride
        .connect(owner)
        .setRoyaltyConfig(
          coreContractA.address,
          projectZero,
          splitterAddr2.address,
          bps750
        );
      const config = await royaltyOverride.royaltyConfigs(
        coreContractA.address,
        projectZero
      );
      expect(config.splitter).to.equal(splitterAddr2.address);
      expect(config.bps).to.equal(bps750);
    });

    it("configs are independent per core contract and project", async function () {
      await loadFixture(_beforeEach);
      await royaltyOverride
        .connect(owner)
        .setRoyaltyConfig(
          coreContractA.address,
          projectZero,
          splitterAddr1.address,
          bps500
        );
      await royaltyOverride
        .connect(owner)
        .setRoyaltyConfig(
          coreContractB.address,
          projectOne,
          splitterAddr2.address,
          bps750
        );
      const configA = await royaltyOverride.royaltyConfigs(
        coreContractA.address,
        projectZero
      );
      const configB = await royaltyOverride.royaltyConfigs(
        coreContractB.address,
        projectOne
      );
      expect(configA.splitter).to.equal(splitterAddr1.address);
      expect(configA.bps).to.equal(bps500);
      expect(configB.splitter).to.equal(splitterAddr2.address);
      expect(configB.bps).to.equal(bps750);
    });
  });

  describe("removeRoyaltyConfig", async function () {
    it("allows owner to remove config", async function () {
      await loadFixture(_beforeEach);
      await royaltyOverride
        .connect(owner)
        .setRoyaltyConfig(
          coreContractA.address,
          projectZero,
          splitterAddr1.address,
          bps500
        );
      await expect(
        royaltyOverride
          .connect(owner)
          .removeRoyaltyConfig(coreContractA.address, projectZero)
      )
        .to.emit(royaltyOverride, "RoyaltyConfigUpdated")
        .withArgs(coreContractA.address, projectZero, ADDRESS_ZERO, 0);

      const config = await royaltyOverride.royaltyConfigs(
        coreContractA.address,
        projectZero
      );
      expect(config.splitter).to.equal(ADDRESS_ZERO);
      expect(config.bps).to.equal(0);
    });

    it("reverts for non-owner", async function () {
      await loadFixture(_beforeEach);
      await expectRevert(
        royaltyOverride
          .connect(nonOwner)
          .removeRoyaltyConfig(coreContractA.address, projectZero),
        "OwnableUnauthorizedAccount"
      );
    });
  });

  describe("getRoyalties", async function () {
    it("returns correct splitter and bps for configured project", async function () {
      await loadFixture(_beforeEach);
      await royaltyOverride
        .connect(owner)
        .setRoyaltyConfig(
          coreContractA.address,
          projectZero,
          splitterAddr1.address,
          bps500
        );
      const response = await royaltyOverride.getRoyalties(
        coreContractA.address,
        tokenIdProject0
      );
      expect(response.recipients_).to.deep.equal([splitterAddr1.address]);
      expect(response.bps.length).to.equal(1);
      expect(response.bps[0]).to.equal(bps500);
    });

    it("correctly derives projectId from tokenId", async function () {
      await loadFixture(_beforeEach);
      // configure project 2
      await royaltyOverride
        .connect(owner)
        .setRoyaltyConfig(
          coreContractA.address,
          projectTwo,
          splitterAddr2.address,
          bps750
        );
      // tokenId 2000042 -> projectId 2
      const response = await royaltyOverride.getRoyalties(
        coreContractA.address,
        tokenIdProject2
      );
      expect(response.recipients_).to.deep.equal([splitterAddr2.address]);
      expect(response.bps[0]).to.equal(bps750);
    });

    it("reverts for unconfigured project", async function () {
      await loadFixture(_beforeEach);
      await expectRevert(
        royaltyOverride.getRoyalties(coreContractA.address, tokenIdProject0),
        "No royalty configured"
      );
    });

    it("reverts after config is removed", async function () {
      await loadFixture(_beforeEach);
      await royaltyOverride
        .connect(owner)
        .setRoyaltyConfig(
          coreContractA.address,
          projectZero,
          splitterAddr1.address,
          bps500
        );
      await royaltyOverride
        .connect(owner)
        .removeRoyaltyConfig(coreContractA.address, projectZero);
      await expectRevert(
        royaltyOverride.getRoyalties(coreContractA.address, tokenIdProject0),
        "No royalty configured"
      );
    });

    it("different core contracts are independent", async function () {
      await loadFixture(_beforeEach);
      await royaltyOverride
        .connect(owner)
        .setRoyaltyConfig(
          coreContractA.address,
          projectZero,
          splitterAddr1.address,
          bps500
        );
      // coreContractB project 0 is not configured
      await expectRevert(
        royaltyOverride.getRoyalties(coreContractB.address, tokenIdProject0),
        "No royalty configured"
      );
    });
  });

  describe("royaltyConfigs view", async function () {
    it("returns zero values for unconfigured project", async function () {
      await loadFixture(_beforeEach);
      const config = await royaltyOverride.royaltyConfigs(
        coreContractA.address,
        projectZero
      );
      expect(config.splitter).to.equal(ADDRESS_ZERO);
      expect(config.bps).to.equal(0);
    });

    it("returns correct values after configuration", async function () {
      await loadFixture(_beforeEach);
      await royaltyOverride
        .connect(owner)
        .setRoyaltyConfig(
          coreContractA.address,
          projectOne,
          splitterAddr2.address,
          bps750
        );
      const config = await royaltyOverride.royaltyConfigs(
        coreContractA.address,
        projectOne
      );
      expect(config.splitter).to.equal(splitterAddr2.address);
      expect(config.bps).to.equal(bps750);
    });
  });
});
