import { BN, constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { T_Config } from "../util/common";

/**
 * These tests are intended to check integration of the MinterFilter suite
 * with the V1 or V2_PRTNR core contract.
 * Some basic core tests, and basic functional tests to ensure purchase
 * does in fact mint tokens to purchaser.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const GenArt721MinterV1V2PRTNR_Common = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("has whitelisted owner", function () {
    it("has an admin", async function () {
      const config = await loadFixture(_beforeEach);
      let addressResult;
      try {
        addressResult = await config.genArt721Core.artblocksAddress();
      } catch (error) {
        addressResult = await config.genArt721Core.renderProviderAddress();
      }
      expect(addressResult).to.be.equal(config.accounts.deployer.address);
    });

    it("has an admin", async function () {
      const config = await loadFixture(_beforeEach);
      expect(await config.genArt721Core.admin()).to.be.equal(
        config.accounts.deployer.address
      );
    });

    it("has a whitelisted account", async function () {
      const config = await loadFixture(_beforeEach);
      expect(
        await config.genArt721Core.isWhitelisted(
          config.accounts.deployer.address
        )
      ).to.be.equal(true);
    });
  });

  describe("reverts on project locked", async function () {
    it("reverts if try to modify script", async function () {
      const config = await loadFixture(_beforeEach);
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsLocked(config.projectZero);
      await expectRevert(
        config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectScriptJSON(config.projectZero, "lorem ipsum"),
        "Only if unlocked"
      );
    });
  });
  describe("purchase", async function () {
    it("reverts if below min amount", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, {
            value: 0,
          }),
        "Must send minimum value to mint!"
      );
    });

    it("reverts if project not active", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.deployer)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          }),
        "Purchases are paused."
      );
    });
  });

  describe("handles updating minter", async function () {
    it("only allows admin/whitelisted to update minter", async function () {
      const config = await loadFixture(_beforeEach);
      // allows admin to update minter
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .addMintWhitelisted(config.minter.address);
      // does not allow random to update minter
      await expectRevert(
        config.genArt721Core
          .connect(config.accounts.artist)
          .addMintWhitelisted(config.minter.address),
        "Only admin"
      );
    });
  });

  describe("projectTokenInfo", function () {
    it("returns expected values", async function () {
      const config = await loadFixture(_beforeEach);
      const tokenInfo = await config.genArt721Core
        .connect(config.accounts.deployer)
        .projectTokenInfo(config.projectZero);
      expect(tokenInfo.invocations).to.be.equal(0);
      expect(tokenInfo.maxInvocations).to.be.equal(config.maxInvocations);
      // The following are not used by MinterFilter, but should exist on V1
      expect(tokenInfo.pricePerTokenInWei).to.be.equal(0);
      expect(tokenInfo.currency).to.be.equal("ETH");
      expect(tokenInfo.currencyAddress).to.be.equal(constants.ZERO_ADDRESS);
    });
  });
};
