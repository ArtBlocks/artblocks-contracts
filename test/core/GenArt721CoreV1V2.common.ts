import { BN, constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";

/**
 * These tests are intended to check integration of the MinterFilter suite
 * with the V1 or V2_PRTNR core contract.
 * Some basic core tests, and basic functional tests to ensure purchase
 * does in fact mint tokens to purchaser.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const GenArt721MinterV1V2_Common = async () => {
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
        .toggleProjectIsLocked(this.projectZero);
      await expectRevert(
        this.token
          .connect(this.accounts.artist)
          .updateProjectScriptJSON(this.projectZero, "lorem ipsum"),
        "Only if unlocked"
      );
    });
  });
  describe("purchase", async function () {
    it("reverts if below min amount", async function () {
      await expectRevert(
        this.minter.connect(this.accounts.artist).purchase(this.projectZero, {
          value: 0,
        }),
        "Must send minimum value to mint!"
      );
    });

    it("reverts if project not active", async function () {
      await expectRevert(
        this.minter.connect(this.accounts.deployer).purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
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
        .projectTokenInfo(this.projectZero);
      expect(tokenInfo.invocations).to.be.equal(0);
      expect(tokenInfo.maxInvocations).to.be.equal(this.maxInvocations);
      // The following are not used by MinterFilter, but should exist on V1
      expect(tokenInfo.pricePerTokenInWei).to.be.equal(0);
      expect(tokenInfo.currency).to.be.equal("ETH");
      expect(tokenInfo.currencyAddress).to.be.equal(constants.ZERO_ADDRESS);
    });
  });
};
