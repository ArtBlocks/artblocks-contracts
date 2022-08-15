import { Coder } from "@ethersproject/abi/lib/coders/abstract-coder";
import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../util/common";
import { GenArt721MinterV1V2_Common } from "./GenArt721CoreV1V2.common";

/**
 * These tests are intended to check integration of the MinterFilter suite with
 * the V2 PRTNR core contract.
 * Some basic core tests, and basic functional tests to ensure purchase
 * does in fact mint tokens to purchaser.
 */
describe("GenArt721CoreV2_PRTNR_Integration", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);
    // deploy and configure minter filter and minter
    ({ genArt721Core: this.genArt721Core, minterFilter: this.minterFilter } =
      await deployCoreWithMinterFilter.call(
        this,
        "GenArt721CoreV2_PRTNR",
        "MinterFilterV0"
      ));
    this.minter = await deployAndGet.call(this, "MinterSetPriceV1", [
      this.genArt721Core.address,
      this.minterFilter.address,
    ]);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minter.address);
    // add project
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("name", this.accounts.artist.address, 0);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);
    // set project's minter and price
    await this.minter
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(this.projectZero, this.pricePerTokenInWei);
    await this.minterFilter
      .connect(this.accounts.artist)
      .setMinterForProject(this.projectZero, this.minter.address);
    // get project's info
    this.projectZeroInfo = await this.genArt721Core.projectTokenInfo(
      this.projectZero
    );
  });

  describe("common tests", async function () {
    GenArt721MinterV1V2_Common();
  });

  describe("purchase payments and gas", async function () {
    it("can create a token then funds distributed (no additional payee) [ @skip-on-coverage ]", async function () {
      const artistBalance = await this.accounts.artist.getBalance();
      const ownerBalance = await this.accounts.user.getBalance();
      const deployerBalance = await this.accounts.deployer.getBalance();

      this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectZero);

      // pricePerTokenInWei setup above to be 1 ETH
      await expect(
        this.minter.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        })
      )
        .to.emit(this.genArt721Core, "Transfer")
        .withArgs(
          constants.ZERO_ADDRESS,
          this.accounts.user.address,
          this.projectZeroTokenZero
        );

      this.projectZeroInfo = await this.genArt721Core.projectTokenInfo(
        this.projectZero
      );
      expect(this.projectZeroInfo.invocations).to.equal("1");
      expect(
        (await this.accounts.deployer.getBalance()).sub(deployerBalance)
      ).to.equal(ethers.utils.parseEther("0.1"));
      expect(
        (await this.accounts.artist.getBalance()).sub(artistBalance)
      ).to.equal(ethers.utils.parseEther("0.8971195"));
      expect(
        (await this.accounts.user.getBalance()).sub(ownerBalance)
      ).to.equal(ethers.utils.parseEther("1.0216789").mul("-1")); // spent 1 ETH
    });

    it("can create a token then funds distributed (with additional payee) [ @skip-on-coverage ]", async function () {
      const additionalBalance = await this.accounts.additional.getBalance();
      const artistBalance = await this.accounts.artist.getBalance();
      const ownerBalance = await this.accounts.user.getBalance();
      const deployerBalance = await this.accounts.deployer.getBalance();

      const additionalPayeePercentage = 10;
      this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectAdditionalPayeeInfo(
          this.projectZero,
          this.accounts.additional.address,
          additionalPayeePercentage
        );
      this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectZero);

      // pricePerTokenInWei setup above to be 1 ETH
      await expect(
        this.minter.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        })
      )
        .to.emit(this.genArt721Core, "Transfer")
        .withArgs(
          constants.ZERO_ADDRESS,
          this.accounts.user.address,
          this.projectZeroTokenZero
        );

      this.projectZeroInfo = await this.genArt721Core.projectTokenInfo(
        this.projectZero
      );
      expect(this.projectZeroInfo.invocations).to.equal("1");

      expect(
        (await this.accounts.deployer.getBalance()).sub(deployerBalance)
      ).to.equal(ethers.utils.parseEther("0.1"));
      expect(
        (await this.accounts.additional.getBalance()).sub(additionalBalance)
      ).to.equal(ethers.utils.parseEther("0.09"));
      expect(
        (await this.accounts.user.getBalance()).sub(ownerBalance)
      ).to.equal(ethers.utils.parseEther("1.0230737").mul("-1")); // spent 1 ETH
      expect(
        (await this.accounts.artist.getBalance()).sub(artistBalance)
      ).to.equal(ethers.utils.parseEther("0.8002442"));
    });

    it("can create a token then funds distributed (with additional payee getting 100%) [ @skip-on-coverage ]", async function () {
      const additionalBalance = await this.accounts.additional.getBalance();
      const artistBalance = await this.accounts.artist.getBalance();
      const ownerBalance = await this.accounts.user.getBalance();
      const deployerBalance = await this.accounts.deployer.getBalance();

      const additionalPayeePercentage = 100;
      this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectAdditionalPayeeInfo(
          this.projectZero,
          this.accounts.additional.address,
          additionalPayeePercentage
        );
      this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectZero);

      // pricePerTokenInWei setup above to be 1 ETH
      await expect(
        this.minter.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        })
      )
        .to.emit(this.genArt721Core, "Transfer")
        .withArgs(
          constants.ZERO_ADDRESS,
          this.accounts.user.address,
          this.projectZeroTokenZero
        );

      this.projectZeroInfo = await this.genArt721Core.projectTokenInfo(
        this.projectZero
      );
      expect(this.projectZeroInfo.invocations).to.equal("1");

      expect(
        (await this.accounts.deployer.getBalance()).sub(deployerBalance)
      ).to.equal(ethers.utils.parseEther("0.1"));
      expect(
        (await this.accounts.additional.getBalance()).sub(additionalBalance)
      ).to.equal(ethers.utils.parseEther("0.9"));
      expect(
        (await this.accounts.user.getBalance()).sub(ownerBalance)
      ).to.equal(ethers.utils.parseEther("1.0218145").mul("-1")); // spent 1 ETH
      expect(
        (await this.accounts.artist.getBalance()).sub(artistBalance)
      ).to.equal(ethers.utils.parseEther("0.0097558").mul("-1"));
    });
  });
});
