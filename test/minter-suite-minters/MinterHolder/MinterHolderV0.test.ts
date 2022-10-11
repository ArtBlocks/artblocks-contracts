import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  compareBN,
  safeAddProject,
  deployAndGetPBAB,
} from "../../util/common";

import { MinterHolder_Common } from "./MinterHolder.common";

/**
 * These tests intended to ensure Filtered Minter integrates properly with V1
 * core contract.
 */
describe("MinterHolderV0", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this, 3); // this.projectZero = 3 on V1 core
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

    this.minter = await deployAndGet.call(this, "MinterHolderV0", [
      this.genArt721Core.address,
      this.minterFilter.address,
    ]);

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

    // artist mints a token on this.projectZero to use as proof of ownership
    const minterFactorySetPrice = await ethers.getContractFactory(
      "MinterSetPriceV1"
    );
    this.minterSetPrice = await minterFactorySetPrice.deploy(
      this.genArt721Core.address,
      this.minterFilter.address
    );
    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minterSetPrice.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(this.projectZero, this.minterSetPrice.address);
    await this.minterSetPrice
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(this.projectZero, this.pricePerTokenInWei);
    await this.minterSetPrice
      .connect(this.accounts.artist)
      .purchase(this.projectZero, { value: this.pricePerTokenInWei });
    // switch this.projectZero back to MinterHolderV0
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(this.projectZero, this.minter.address);
    await this.minter
      .connect(this.accounts.deployer)
      .registerNFTAddress(this.genArt721Core.address);
    await this.minter
      .connect(this.accounts.artist)
      .allowHoldersOfProjects(
        this.projectZero,
        [this.genArt721Core.address],
        [this.projectZero]
      );
  });

  describe("common MinterHolder tests", async () => {
    await MinterHolder_Common();
  });

  describe("calculates gas", async function () {
    it("mints and calculates gas values [ @skip-on-coverage ]", async function () {
      const tx = await this.minter
        .connect(this.accounts.artist)
        ["purchase(uint256,address,uint256)"](
          this.projectZero,
          this.genArt721Core.address,
          this.projectZeroTokenZero.toNumber(),
          {
            value: this.pricePerTokenInWei,
          }
        );

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed);

      console.log(
        "Gas cost for a successful ERC20 mint: ",
        ethers.utils.formatUnits(txCost.toString(), "ether").toString(),
        "ETH"
      );
      expect(compareBN(txCost, ethers.utils.parseEther("0.03199"), 1)).to.be
        .true;
    });
  });
});
