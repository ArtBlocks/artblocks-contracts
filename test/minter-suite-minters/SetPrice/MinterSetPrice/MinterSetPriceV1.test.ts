import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
} from "../../../util/common";

import { MinterSetPrice_ETH_Common } from "./MinterSetPrice.common";
import { MinterSetPriceV1_ETH_Common } from "../MinterSetPriceV1.common";

/**
 * These tests intended to ensure this Filtered Minter integrates properly with
 * V1 core contract.
 */
describe("MinterSetPriceV1_V1Core", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this, 3); // projectZero = 3 on V1 core
    this.higherPricePerTokenInWei = this.pricePerTokenInWei.add(
      ethers.utils.parseEther("0.1")
    );

    // deploy and configure minter filter and minter
    ({
      genArt721Core: this.genArt721Core,
      minterFilter: this.minterFilter,
      randomizer: this.randomizer,
    } = await deployCoreWithMinterFilter.call(
      this,
      "GenArt721CoreV1",
      "MinterFilterV0"
    ));

    const minterFactory = await ethers.getContractFactory("MinterSetPriceV1");
    this.minter1 = await minterFactory.deploy(
      this.genArt721Core.address,
      this.minterFilter.address
    );

    // support common tests and also give access to this.minter1 at this.minter
    this.minter = this.minter1;

    this.minter2 = await minterFactory.deploy(
      this.genArt721Core.address,
      this.minterFilter.address
    );
    this.minter3 = await minterFactory.deploy(
      this.genArt721Core.address,
      this.minterFilter.address
    );

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("project1", this.accounts.artist.address, 0, false);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("project2", this.accounts.artist.address, 0, false);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("project3", this.accounts.artist.address, 0, false);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectOne);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectTwo);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addMintWhitelisted(this.minterFilter.address);

    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectOne, this.maxInvocations);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectTwo, this.maxInvocations);

    await this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectOne);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectTwo);

    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minter1.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minter2.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minter3.address);

    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(this.projectZero, this.minter1.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(this.projectOne, this.minter2.address);
    // We leave project three with no minter on purpose

    // set token price for first two projects on minter one
    await this.minter1
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(this.projectZero, this.pricePerTokenInWei);
    await this.minter1
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(this.projectOne, this.pricePerTokenInWei);
  });

  describe("common MinterSetPrice (ETH) tests", async () => {
    MinterSetPrice_ETH_Common();
  });

  describe("common MinterSetPrice V1 tests", async function () {
    MinterSetPriceV1_ETH_Common();
  });

  describe("calculates gas", async function () {
    it("mints and calculates gas values", async function () {
      const tx = await this.minter1
        .connect(this.accounts.user)
        .purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        });

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed).toString();
      console.log(
        "Gas cost for a successful Ether mint: ",
        ethers.utils.formatUnits(txCost, "ether").toString(),
        "ETH"
      );

      expect(txCost.toString()).to.equal(ethers.utils.parseEther("0.0361817")); // assuming a cost of 100 GWEI
    });
  });

  describe("purchaseTo", async function () {
    it("does not support toggling of `purchaseToDisabled`", async function () {
      await expectRevert(
        this.minter1
          .connect(this.accounts.artist)
          .togglePurchaseToDisabled(this.projectZero),
        "Action not supported"
      );
      // still allows `purchaseTo`.
      await this.minter1
        .connect(this.accounts.user)
        .purchaseTo(this.accounts.artist.address, this.projectZero, {
          value: this.pricePerTokenInWei,
        });
    });

    it("doesn't support `purchaseTo` toggling", async function () {
      await expectRevert(
        this.minter1
          .connect(this.accounts.artist)
          .togglePurchaseToDisabled(this.projectZero),
        "Action not supported"
      );
    });
  });
});
