import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
} from "../../../util/common";

import { MinterSetPriceERC20_Common } from "./MinterSetPriceERC20.common";

/**
 * These tests intended to ensure this Filtered Minter integrates properly with
 * V1 core contract.
 */
const addressZero = "0x0000000000000000000000000000000000000000";

describe("MinterSetPriceERC20V0_V1Core", async function () {
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

    this.targetMinterName = "MinterSetPriceERC20V0";
    const minterFactory = await ethers.getContractFactory(
      this.targetMinterName
    );
    this.minter = await minterFactory.deploy(
      this.genArt721Core.address,
      this.minterFilter.address
    );

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("project0", this.accounts.artist.address, 0, false);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("project1", this.accounts.artist.address, 0, false);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("project2", this.accounts.artist.address, 0, false);

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
      .addApprovedMinter(this.minter.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(this.projectZero, this.minter.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(this.projectOne, this.minter.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(this.projectTwo, this.minter.address);

    // set token price for projects zero and one on minter
    await this.minter
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(this.projectZero, this.pricePerTokenInWei);
    await this.minter
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(this.projectOne, this.pricePerTokenInWei);

    // mock ERC20 token
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    this.ERC20Mock = await ERC20Factory.connect(this.accounts.user).deploy(
      ethers.utils.parseEther("100")
    );
  });

  describe("common MinterSetPrice (ETH) tests", async () => {
    await MinterSetPriceERC20_Common();
  });

  describe("calculates gas", async function () {
    it("mints and calculates gas values [ @skip-on-coverage ]", async function () {
      const tx = await this.minter
        .connect(this.accounts.user)
        ["purchase(uint256)"](this.projectOne, {
          value: this.pricePerTokenInWei,
        });
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed).toString();

      console.log(
        "Gas cost for a successful ERC20 mint: ",
        ethers.utils.formatUnits(txCost, "ether").toString(),
        "ETH"
      );
      expect(txCost.toString()).to.equal(ethers.utils.parseEther("0.0370837"));
    });
    it("mints and calculates gas values when passing currency and price through [ @skip-on-coverage ]", async function () {
      const tx = await this.minter
        .connect(this.accounts.user)
        ["purchase(uint256,uint256,address)"](
          this.projectOne,
          this.pricePerTokenInWei,
          addressZero,
          {
            value: this.pricePerTokenInWei,
          }
        );
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed).toString();

      console.log(
        "Gas cost for a successful ERC20 mint: ",
        ethers.utils.formatUnits(txCost, "ether").toString(),
        "ETH"
      );
      expect(txCost.toString()).to.equal(ethers.utils.parseEther("0.0370837"));
    });
  });

  describe("purchaseTo", async function () {
    it("disallows `purchaseTo` if disallowed explicitly", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .togglePurchaseToDisabled(this.projectOne);
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchaseTo(address,uint256)"](
            this.accounts.additional.address,
            this.projectOne,
            {
              value: this.pricePerTokenInWei,
            }
          ),
        "No `purchaseTo` Allowed"
      );
      // still allows `purchaseTo` if destination matches sender.
      await this.minter
        .connect(this.accounts.user)
        ["purchaseTo(address,uint256)"](
          this.accounts.user.address,
          this.projectOne,
          {
            value: this.pricePerTokenInWei,
          }
        );
    });
    it("disallows `purchaseTo` if disallowed explicitly - passing currency and price through", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .togglePurchaseToDisabled(this.projectOne);
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchaseTo(address,uint256,uint256,address)"](
            this.accounts.additional.address,
            this.projectOne,
            this.pricePerTokenInWei,
            addressZero,
            {
              value: this.pricePerTokenInWei,
            }
          ),
        "No `purchaseTo` Allowed"
      );
      // still allows `purchaseTo` if destination matches sender.
      await this.minter
        .connect(this.accounts.user)
        ["purchaseTo(address,uint256,uint256,address)"](
          this.accounts.user.address,
          this.projectOne,
          this.pricePerTokenInWei,
          addressZero,
          {
            value: this.pricePerTokenInWei,
          }
        );
    });

    it("emits event when `purchaseTo` is toggled", async function () {
      // emits true when changed from initial value of false
      await expect(
        this.minter
          .connect(this.accounts.deployer)
          .togglePurchaseToDisabled(this.projectOne)
      )
        .to.emit(this.minter, "PurchaseToDisabledUpdated")
        .withArgs(this.projectOne, true);
      // emits false when changed from initial value of true
      await expect(
        this.minter
          .connect(this.accounts.deployer)
          .togglePurchaseToDisabled(this.projectOne)
      )
        .to.emit(this.minter, "PurchaseToDisabledUpdated")
        .withArgs(this.projectOne, false);
    });
  });
});
