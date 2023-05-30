import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { T_Config } from "../../util/common";
import { revertMessages } from "../constants";
import { Common_Configure } from "../common.configure";

/**
 * These tests are intended to check common configure Minter functionality
 * for set price minters in our minter suite.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const SetPrice_Common_Configure = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("Common Minter Configure Tests", async function () {
    await Common_Configure(_beforeEach);
  });

  describe("updatePricePerTokenInWei", async function () {
    it("only allows artist to update price", async function () {
      const config = await loadFixture(_beforeEach);
      // doesn't allow user
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          ),
        revertMessages.onlyArtist
      );
      // doesn't allow deployer
      await expectRevert(
        config.minter
          .connect(config.accounts.deployer)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          ),
        revertMessages.onlyArtist
      );
      // doesn't allow additional
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          ),
        revertMessages.onlyArtist
      );
      // does allow artist
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.genArt721Core.address,
          config.pricePerTokenInWei
        );
    });
  });

  describe("syncProjectMaxInvocationsToCore", async function () {
    it("allows artist to call setProjectMaxInvocations", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.artist)
        .syncProjectMaxInvocationsToCore(
          config.projectZero,
          config.genArt721Core.address
        );
    });
  });
};
