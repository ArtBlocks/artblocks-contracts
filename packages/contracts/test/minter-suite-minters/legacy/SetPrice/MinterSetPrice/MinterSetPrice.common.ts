import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { Minter_Common } from "../../Minter.common";
import { T_Config } from "../../../../util/common";

/**
 * These tests are intended to check common MinterSetPrice functionality.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterSetPrice_ETH_Common = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("common minter tests", async () => {
    await Minter_Common(_beforeEach);
  });

  describe("updatePricePerTokenInWei", async function () {
    it("only allows artist to update price", async function () {
      const config = await loadFixture(_beforeEach);
      const onlyArtistErrorMessage = "Only Artist";
      // doesn't allow user
      await expectRevert(
        config.minter1
          .connect(config.accounts.user)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow deployer
      await expectRevert(
        config.minter1
          .connect(config.accounts.deployer)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        config.minter1
          .connect(config.accounts.additional)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await config.minter1
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.higherPricePerTokenInWei
        );
    });

    it("enforces price update", async function () {
      const config = await loadFixture(_beforeEach);
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist increases price
      await config.minter1
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.higherPricePerTokenInWei
        );
      // cannot purchase token at lower price
      await expectRevert(
        config.minter1
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          }),
        needMoreValueErrorMessage
      );
      // can purchase token at higher price
      await config.minter1
        .connect(config.accounts.user)
        .purchase(config.projectZero, {
          value: config.higherPricePerTokenInWei,
        });
    });

    it("enforces price update only on desired project", async function () {
      const config = await loadFixture(_beforeEach);
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // update project two to use minter one
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectOne, config.minter1.address);
      // artist increases price of project one
      await config.minter1
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.higherPricePerTokenInWei
        );
      // cannot purchase project one token at lower price
      await expectRevert(
        config.minter1
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          }),
        needMoreValueErrorMessage
      );
      // can purchase project two token at lower price
      await config.minter1
        .connect(config.accounts.user)
        .purchase(config.projectOne, {
          value: config.pricePerTokenInWei,
        });
    });

    it("emits event upon price update", async function () {
      const config = await loadFixture(_beforeEach);
      // artist increases price
      await expect(
        config.minter1
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          )
      )
        .to.emit(config.minter1, "PricePerTokenInWeiUpdated")
        .withArgs(config.projectZero, config.higherPricePerTokenInWei);
    });
  });

  describe("setProjectMaxInvocations", async function () {
    it("handles getting tokenInfo invocation info with V1 core", async function () {
      const config = await loadFixture(_beforeEach);
      const minterType = await config.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? config.accounts.deployer
          : config.accounts.artist;

      await config.minter1
        .connect(accountToTestWith)
        .setProjectMaxInvocations(config.projectZero);
      // minter should update storage with accurate projectMaxInvocations
      let maxInvocations = await config.minter1
        .connect(accountToTestWith)
        .projectMaxInvocations(config.projectZero);
      expect(maxInvocations).to.be.equal(config.maxInvocations);
      // ensure hasMaxBeenReached did not unexpectedly get set as true
      let hasMaxBeenInvoked = await config.minter1
        .connect(accountToTestWith)
        .projectMaxHasBeenInvoked(config.projectZero);
      expect(hasMaxBeenInvoked).to.be.false;
      // ensure minter2 gives same results
      await config.minter2
        .connect(accountToTestWith)
        .setProjectMaxInvocations(config.projectOne);
      await config.minter2
        .connect(accountToTestWith)
        .setProjectMaxInvocations(config.projectOne);
      maxInvocations = await config.minter2
        .connect(accountToTestWith)
        .projectMaxInvocations(config.projectOne);
      expect(maxInvocations).to.be.equal(config.maxInvocations);
    });

    it("reverts for unconfigured/non-existent project", async function () {
      const config = await loadFixture(_beforeEach);
      // trying to set config on unconfigured project (e.g. 99) should cause
      // revert on the underlying CoreContract.
      const minterType = await config.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? config.accounts.deployer
          : config.accounts.artist;

      expectRevert(
        config.minter.connect(accountToTestWith).setProjectMaxInvocations(99),
        "Project ID does not exist"
      );
    });
  });

  describe("purchase", async function () {
    it("does not allow purchase prior to configuring price", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectTwo, config.minter3.address);
      await expectRevert(
        config.minter3
          .connect(config.accounts.user)
          .purchase(config.projectTwo, {
            value: config.pricePerTokenInWei,
          }),
        "Price not configured"
      );
    });

    it("allows purchases through the correct minter", async function () {
      const config = await loadFixture(_beforeEach);
      for (let i = 0; i < 15; i++) {
        await config.minter1
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          });
      }
      await config.minter2
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectOne, config.pricePerTokenInWei);
      for (let i = 0; i < 15; i++) {
        await config.minter2
          .connect(config.accounts.user)
          .purchase(config.projectOne, {
            value: config.pricePerTokenInWei,
          });
      }
    });

    it("blocks purchases through the incorrect minter", async function () {
      const config = await loadFixture(_beforeEach);
      const noAssignedMinterErrorMessage = "EnumerableMap: nonexistent key";
      const OnlyAssignedMinterErrorMessage = "Only assigned minter";
      // project one on minter two
      await config.minter2
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.pricePerTokenInWei
        );
      await expectRevert(
        config.minter2
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          }),
        OnlyAssignedMinterErrorMessage
      );
      // project two on minter one
      await config.minter1
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectOne, config.pricePerTokenInWei);
      await expectRevert(
        config.minter1
          .connect(config.accounts.user)
          .purchase(config.projectOne, {
            value: config.pricePerTokenInWei,
          }),
        OnlyAssignedMinterErrorMessage
      );
      // project three on minter one
      await config.minter1
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectTwo, config.pricePerTokenInWei);
      await expectRevert(
        config.minter1
          .connect(config.accounts.user)
          .purchase(config.projectTwo, {
            value: config.pricePerTokenInWei,
          }),
        noAssignedMinterErrorMessage
      );
      // project three on minter two
      await config.minter2
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectTwo, config.pricePerTokenInWei);
      await expectRevert(
        config.minter2
          .connect(config.accounts.user)
          .purchase(config.projectTwo, {
            value: config.pricePerTokenInWei,
          }),
        noAssignedMinterErrorMessage
      );
      // project three on minter three
      await config.minter3
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.pricePerTokenInWei
        );
      await expectRevert(
        config.minter3
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          }),
        OnlyAssignedMinterErrorMessage
      );
      // project two on minter three
      await config.minter3
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectOne, config.pricePerTokenInWei);
      await expectRevert(
        config.minter3
          .connect(config.accounts.user)
          .purchase(config.projectOne, {
            value: config.pricePerTokenInWei,
          }),
        OnlyAssignedMinterErrorMessage
      );
      // project three on minter three
      await config.minter3
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectTwo, config.pricePerTokenInWei);
      await expectRevert(
        config.minter3
          .connect(config.accounts.user)
          .purchase(config.projectTwo, {
            value: config.pricePerTokenInWei,
          }),
        noAssignedMinterErrorMessage
      );
    });
  });

  describe("purchaseTo", async function () {
    it("does not allow purchase prior to configuring price", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectTwo, config.minter3.address);
      await expectRevert(
        config.minter3
          .connect(config.accounts.user)
          .purchaseTo(config.accounts.additional.address, config.projectTwo, {
            value: config.pricePerTokenInWei,
          }),
        "Price not configured"
      );
    });

    it("allows `purchaseTo` by default", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter1
        .connect(config.accounts.user)
        .purchaseTo(config.accounts.additional.address, config.projectZero, {
          value: config.pricePerTokenInWei,
        });
    });
  });
};
