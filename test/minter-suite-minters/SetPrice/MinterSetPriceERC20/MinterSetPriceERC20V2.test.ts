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
import { MinterSetPriceV1V2_Common } from "../MinterSetPriceV1V2.common";

/**
 * These tests intended to ensure this Filtered Minter integrates properly with
 * V3 core contract.
 */
describe("MinterSetPriceERC20V2_V3Core", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);
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
      "GenArt721CoreV3",
      "MinterFilterV1"
    ));

    const minterFactory = await ethers.getContractFactory(
      "MinterSetPriceERC20V2"
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

    this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectZero);
    this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectOne);
    this.genArt721Core
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
    MinterSetPriceERC20_Common();
  });

  describe("common MinterSetPrice V1V2 tests", async function () {
    MinterSetPriceV1V2_Common();
  });

  describe("calculates gas", async function () {
    it("mints and calculates gas values", async function () {
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
      expect(txCost.toString()).to.equal(ethers.utils.parseEther("0.0183169"));
    });
  });

  describe("purchaseTo", async function () {});
});
