import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { T_Config } from "../../util/common";
import { Common_Events } from "../common.events";

/**
 * These tests are intended to check common events Minter functionality
 * for set price minters in our minter suite.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const SetPrice_Common_Events = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("Common Minter Events Tests", async function () {
    await Common_Events(_beforeEach);
  });

  describe("updatePricePerTokenInWei", async function () {
    it("emits event upon price update", async function () {
      const config = await loadFixture(_beforeEach);
      // artist increases price
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          )
      )
        .to.emit(config.minter, "PricePerTokenInWeiUpdated")
        .withArgs(
          config.projectZero,
          config.genArt721Core.address,
          config.pricePerTokenInWei
        );
    });
  });
};
