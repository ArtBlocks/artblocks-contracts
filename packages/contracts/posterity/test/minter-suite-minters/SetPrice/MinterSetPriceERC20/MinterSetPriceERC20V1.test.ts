import { expectRevert } from "@openzeppelin/test-helpers";
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
import { MinterSetPriceV1V2V3_Common } from "../MinterSetPriceV1V2V3.common";

/**
 * These tests intended to ensure this Filtered Minter integrates properly with
 * V1 core contract.
 */
const addressZero = "0x0000000000000000000000000000000000000000";

describe("MinterSetPriceERC20V1_V1Core", async function () {
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

    this.targetMinterName = "MinterSetPriceERC20V1";
    const minterFactory = await ethers.getContractFactory(
      this.targetMinterName
    );
    this.minter = await minterFactory.deploy(
      this.genArt721Core.address,
      this.minterFilter.address
    );

    await safeAddProject(
      this.genArt721Core,
      this.accounts.deployer,
      this.accounts.artist.address
    );
    await safeAddProject(
      this.genArt721Core,
      this.accounts.deployer,
      this.accounts.artist.address
    );
    await safeAddProject(
      this.genArt721Core,
      this.accounts.deployer,
      this.accounts.artist.address
    );

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

  describe("common MinterSetPrice V1V2V3 tests", async function () {
    await MinterSetPriceV1V2V3_Common();
  });

  describe("calculates gas", async function () {
    it("mints and calculates gas values [ @skip-on-coverage ]", async function () {
      const tx = await this.minter
        .connect(this.accounts.user)
        .purchase(this.projectOne, {
          value: this.pricePerTokenInWei,
        });

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed).toString();

      console.log(
        "Gas cost for a successful ERC20 mint: ",
        ethers.utils.formatUnits(txCost, "ether").toString(),
        "ETH"
      );
      expect(txCost.toString()).to.equal(ethers.utils.parseEther("0.0364129"));
    });
  });

  describe("purchase", async function () {
    it("allows purchase with ETH with or without explicitly passing the currency address through if project is configured to accept ETH", async function () {
      // Update projectOne currency to ETH
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(this.projectOne, "ETH", addressZero);

      // can purchase project one token with ETH, auto-forwarding currency address
      await this.minter
        .connect(this.accounts.user)
        ["purchase(uint256)"](this.projectOne, {
          value: this.pricePerTokenInWei,
        });

      // can purchase project one token with ETH, explicitly passing in currency address
      await this.minter
        .connect(this.accounts.user)
        ["purchase(uint256,uint256,address)"](
          this.projectOne,
          this.pricePerTokenInWei,
          addressZero,
          {
            value: this.pricePerTokenInWei,
          }
        );

      // cannot not purchase project one with ETH without including msg.value
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchase(uint256,uint256,address)"](
            this.projectOne,
            this.pricePerTokenInWei,
            addressZero
          ),
        "inconsistent msg.value"
      );

      // can not purchase project one token with ERC-20
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchase(uint256,uint256,address)"](
            this.projectOne,
            this.pricePerTokenInWei,
            this.ERC20Mock.address
          ),
        "Currency addresses must match"
      );
    });

    it("enforces currency address and price per token to be passed explicitly for ERC-20 configured projects", async function () {
      // artist changes currency info for project one
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          this.projectOne,
          "MOCK",
          this.ERC20Mock.address
        );

      // approve contract and able to mint with Mock token
      await this.ERC20Mock.connect(this.accounts.artist).approve(
        this.minter.address,
        ethers.utils.parseEther("100")
      );

      // cannot purchase project one token with ETH
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256)"](this.projectOne, {
            value: this.pricePerTokenInWei,
          }),
        "Currency addresses must match"
      );

      // can purchase project one with ERC-20
      await this.minter
        .connect(this.accounts.artist)
        ["purchase(uint256,uint256,address)"](
          this.projectOne,
          this.pricePerTokenInWei,
          this.ERC20Mock.address
        );
      // cannot send ETH when purchasing with ERC-20
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256,uint256,address)"](
            this.projectOne,
            this.pricePerTokenInWei,
            this.ERC20Mock.address,
            {
              value: this.pricePerTokenInWei,
            }
          ),
        "this project accepts a different currency and cannot accept ETH"
      );
    });
  });

  describe("purchaseTo", async function () {
    it("allows purchaseTo with ETH with or without explicitly passing the currency address through if project is configured to accept ETH", async function () {
      // Update projectOne currency to ETH
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(this.projectOne, "ETH", addressZero);
      // can purchase project one token with ETH, auto-forwarding currency address
      await this.minter
        .connect(this.accounts.user)
        ["purchaseTo(address,uint256)"](
          this.accounts.additional.address,
          this.projectOne,
          {
            value: this.pricePerTokenInWei,
          }
        );
      // can purchase project one token with ETH, explicitly passing in currency address
      await this.minter
        .connect(this.accounts.user)
        ["purchaseTo(address,uint256,uint256,address)"](
          this.accounts.additional.address,
          this.projectOne,
          this.pricePerTokenInWei,
          addressZero,
          {
            value: this.pricePerTokenInWei,
          }
        );
      // cannot not purchase project one with ETH without including msg.value
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchaseTo(address,uint256,uint256,address)"](
            this.accounts.additional.address,
            this.projectOne,
            this.pricePerTokenInWei,
            addressZero
          ),
        "inconsistent msg.value"
      );
      // can not purchase project one token with ERC-20
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchaseTo(address,uint256,uint256,address)"](
            this.accounts.additional.address,
            this.projectOne,
            this.pricePerTokenInWei,
            this.ERC20Mock.address
          ),
        "Currency addresses must match"
      );
    });
    it("allows purchaseTo with ERC-20 when explicitly passing the currency address through if project is configured to accept ERC-20", async function () {
      // Update projectOne currency to ETH
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          this.projectOne,
          "MOCK",
          this.ERC20Mock.address
        );
      // can purchase project one token with ERC-20, explicitly passing currency address
      await this.minter
        .connect(this.accounts.user)
        ["purchaseTo(address,uint256,uint256,address)"](
          this.accounts.additional.address,
          this.projectOne,
          this.pricePerTokenInWei,
          this.ERC20Mock.address
        );
      // cannot not purchase project one with ETH
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
        "Currency addresses must match"
      );
      // cannot not purchase project one with ERC-20 if msg.value is populated
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchaseTo(address,uint256,uint256,address)"](
            this.accounts.additional.address,
            this.projectOne,
            this.pricePerTokenInWei,
            this.ERC20Mock.address,
            {
              value: this.pricePerTokenInWei,
            }
          ),
        "this project accepts a different currency and cannot accept ETH"
      );
    });
  });
});
