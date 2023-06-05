import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { T_Config } from "../util/common";
import { revertMessages } from "./constants";

/**
 * These tests are intended to check common configure Minter functionality
 * for minters in our minter suite.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const Common_Configure = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("manuallyLimitProjectMaxInvocations", async function () {
    it("allows artist to call manuallyLimitProjectMaxInvocations", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.artist)
        .manuallyLimitProjectMaxInvocations(
          config.projectZero,
          config.genArt721Core.address,
          config.maxInvocations - 1
        );
    });
    it("does not support manually setting project max invocations to be greater than the project max invocations set on the core contract", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            config.maxInvocations + 1
          ),
        "Invalid max invocations"
      );
    });
  });

  describe("syncProjectMaxInvocationsToCore", async function () {
    it("reverts for unconfigured/non-existent project", async function () {
      const config = await loadFixture(_beforeEach);

      expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .syncProjectMaxInvocationsToCore(99, config.genArt721Core.address),
        revertMessages.projectIdDoesNotExist
      );
    });
    it("updates local projectMaxInvocations after syncing to core", async function () {
      const config = await loadFixture(_beforeEach);
      const minterType = await config.minter.minterType();
      if (minterType.startsWith("MinterDAExpSettlement")) {
        console.log(
          "syncProjectMaxInvocationsToCore not supported for DAExpSettlement minters"
        );
        return;
      }

      // update max invocations to 1 on the core
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 2);
      // sync max invocations on minter
      await config.minter
        .connect(config.accounts.artist)
        .syncProjectMaxInvocationsToCore(
          config.projectZero,
          config.genArt721Core.address
        );
      // expect max invocations to be 2 on the minter
      expect(
        (
          await config.minter.maxInvocationsProjectConfig(
            config.genArt721Core.address,
            config.projectZero
          )
        ).maxInvocations
      ).to.be.equal(2);
    });
  });
};
