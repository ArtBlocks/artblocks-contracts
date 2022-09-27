import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { Minter_Common } from "../../Minter.common";

/**
 * These tests are intended to check common MinterSetPrice functionality.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterSetPrice_ETH_Common = async () => {
  describe("common minter tests", async () => {
    Minter_Common();
  });

  describe("updatePricePerTokenInWei", async function () {
    it("only allows artist to update price", async function () {
      const onlyArtistErrorMessage = "Only Artist";
      // doesn't allow user
      await expectRevert(
        this.minter1
          .connect(this.accounts.user)
          .updatePricePerTokenInWei(
            this.projectZero,
            this.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow deployer
      await expectRevert(
        this.minter1
          .connect(this.accounts.deployer)
          .updatePricePerTokenInWei(
            this.projectZero,
            this.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        this.minter1
          .connect(this.accounts.additional)
          .updatePricePerTokenInWei(
            this.projectZero,
            this.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await this.minter1
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(
          this.projectZero,
          this.higherPricePerTokenInWei
        );
    });

    it("enforces price update", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist increases price
      await this.minter1
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(
          this.projectZero,
          this.higherPricePerTokenInWei
        );
      // cannot purchase token at lower price
      await expectRevert(
        this.minter1.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        }),
        needMoreValueErrorMessage
      );
      // can purchase token at higher price
      await this.minter1
        .connect(this.accounts.user)
        .purchase(this.projectZero, {
          value: this.higherPricePerTokenInWei,
        });
    });

    it("enforces price update only on desired project", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // update project two to use minter one
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectOne, this.minter1.address);
      // artist increases price of project one
      await this.minter1
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(
          this.projectZero,
          this.higherPricePerTokenInWei
        );
      // cannot purchase project one token at lower price
      await expectRevert(
        this.minter1.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        }),
        needMoreValueErrorMessage
      );
      // can purchase project two token at lower price
      await this.minter1.connect(this.accounts.user).purchase(this.projectOne, {
        value: this.pricePerTokenInWei,
      });
    });

    it("emits event upon price update", async function () {
      // artist increases price
      await expect(
        this.minter1
          .connect(this.accounts.artist)
          .updatePricePerTokenInWei(
            this.projectZero,
            this.higherPricePerTokenInWei
          )
      )
        .to.emit(this.minter1, "PricePerTokenInWeiUpdated")
        .withArgs(this.projectZero, this.higherPricePerTokenInWei);
    });
  });

  describe("setProjectMaxInvocations", async function () {
    it("handles getting tokenInfo invocation info with V1 core", async function () {
      await this.minter1
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(this.projectZero);
      // minter should update storage with accurate projectMaxInvocations
      let maxInvocations = await this.minter1
        .connect(this.accounts.deployer)
        .projectMaxInvocations(this.projectZero);
      expect(maxInvocations).to.be.equal(this.maxInvocations);
      // ensure hasMaxBeenReached did not unexpectedly get set as true
      let hasMaxBeenInvoked = await this.minter1
        .connect(this.accounts.deployer)
        .projectMaxHasBeenInvoked(this.projectZero);
      expect(hasMaxBeenInvoked).to.be.false;
      // ensure minter2 gives same results
      await this.minter2
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(this.projectOne);
      await this.minter2
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(this.projectOne);
      maxInvocations = await this.minter2
        .connect(this.accounts.deployer)
        .projectMaxInvocations(this.projectOne);
      expect(maxInvocations).to.be.equal(this.maxInvocations);
    });

    it("reverts for unconfigured/non-existent project", async function () {
      // trying to set this on unconfigured project (e.g. 99) should cause
      // revert on the underlying CoreContract.
      expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .setProjectMaxInvocations(99),
        "Project ID does not exist"
      );
    });
  });

  describe("purchase", async function () {
    it("does not allow purchase prior to configuring price", async function () {
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectTwo, this.minter3.address);
      await expectRevert(
        this.minter3.connect(this.accounts.user).purchase(this.projectTwo, {
          value: this.pricePerTokenInWei,
        }),
        "Price not configured"
      );
    });

    it("allows purchases through the correct minter", async function () {
      for (let i = 0; i < 15; i++) {
        await this.minter1
          .connect(this.accounts.user)
          .purchase(this.projectZero, {
            value: this.pricePerTokenInWei,
          });
      }
      await this.minter2
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectOne, this.pricePerTokenInWei);
      for (let i = 0; i < 15; i++) {
        await this.minter2
          .connect(this.accounts.user)
          .purchase(this.projectOne, {
            value: this.pricePerTokenInWei,
          });
      }
    });

    it("blocks purchases through the incorrect minter", async function () {
      const noAssignedMinterErrorMessage = "EnumerableMap: nonexistent key";
      const OnlyAssignedMinterErrorMessage = "Only assigned minter";
      // project one on minter two
      await this.minter2
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectZero, this.pricePerTokenInWei);
      await expectRevert(
        this.minter2.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        }),
        OnlyAssignedMinterErrorMessage
      );
      // project two on minter one
      await this.minter1
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectOne, this.pricePerTokenInWei);
      await expectRevert(
        this.minter1.connect(this.accounts.user).purchase(this.projectOne, {
          value: this.pricePerTokenInWei,
        }),
        OnlyAssignedMinterErrorMessage
      );
      // project three on minter one
      await this.minter1
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectTwo, this.pricePerTokenInWei);
      await expectRevert(
        this.minter1.connect(this.accounts.user).purchase(this.projectTwo, {
          value: this.pricePerTokenInWei,
        }),
        noAssignedMinterErrorMessage
      );
      // project three on minter two
      await this.minter2
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectTwo, this.pricePerTokenInWei);
      await expectRevert(
        this.minter2.connect(this.accounts.user).purchase(this.projectTwo, {
          value: this.pricePerTokenInWei,
        }),
        noAssignedMinterErrorMessage
      );
      // project three on minter three
      await this.minter3
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectZero, this.pricePerTokenInWei);
      await expectRevert(
        this.minter3.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        }),
        OnlyAssignedMinterErrorMessage
      );
      // project two on minter three
      await this.minter3
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectOne, this.pricePerTokenInWei);
      await expectRevert(
        this.minter3.connect(this.accounts.user).purchase(this.projectOne, {
          value: this.pricePerTokenInWei,
        }),
        OnlyAssignedMinterErrorMessage
      );
      // project three on minter three
      await this.minter3
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectTwo, this.pricePerTokenInWei);
      await expectRevert(
        this.minter3.connect(this.accounts.user).purchase(this.projectTwo, {
          value: this.pricePerTokenInWei,
        }),
        noAssignedMinterErrorMessage
      );
    });
  });

  describe("purchaseTo", async function () {
    it("does not allow purchase prior to configuring price", async function () {
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectTwo, this.minter3.address);
      await expectRevert(
        this.minter3
          .connect(this.accounts.user)
          .purchaseTo(this.accounts.additional.address, this.projectTwo, {
            value: this.pricePerTokenInWei,
          }),
        "Price not configured"
      );
    });

    it("allows `purchaseTo` by default", async function () {
      await this.minter1
        .connect(this.accounts.user)
        .purchaseTo(this.accounts.additional.address, this.projectZero, {
          value: this.pricePerTokenInWei,
        });
    });
  });
};
