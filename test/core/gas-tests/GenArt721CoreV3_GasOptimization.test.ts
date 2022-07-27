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
} from "../../util/common";

/**
 * General Gas tests for V3 core.
 * Used to test the gas cost of different operations on the core, specifically
 * when optimizing for gas to quantify % reductions to aide in decision making.
 */
describe("GenArt721CoreV3 Gas Tests", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);

    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();
    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV3");
    this.genArt721Core = await artblocksFactory
      .connect(this.accounts.deployer)
      .deploy(this.name, this.symbol, this.randomizer.address);

    // allow user to mint on contract to remove any minter gas noise
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .updateMinterContract(this.accounts.user.address);

    // add project zero
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("proj 0", this.accounts.artist.address);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);

    // add project one to test cases where project is not a null byte
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("proj 1", this.accounts.artist.address);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectOne);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectOne);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectOne, this.maxInvocations);

    // mint token zero on project one to test cases where token is not a null byte
    await this.genArt721Core
      .connect(this.accounts.user)
      .mint(
        this.accounts.user.address,
        this.projectOne,
        this.accounts.user.address
      );

    // gas tests should mint token 1+ on project one+
  });

  describe("mint gas optimization", function () {
    it("mints with expected gas cost", async function () {
      // mint
      const tx = await this.genArt721Core
        .connect(this.accounts.user)
        .mint(
          this.accounts.user.address,
          this.projectOne,
          this.accounts.user.address
        );
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      console.log(`gas used for mint optimization test: ${receipt.gasUsed}`);
      const gasCostAt100gwei = receipt.effectiveGasPrice
        .mul(receipt.gasUsed)
        .toString();
      const gasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(gasCostAt100gwei, "ether")
      );
      const gasCostAt100gweiAt2kUSDPerETH = gasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${gasCostAt100gweiAt2kUSDPerETH}`
      );
    });
  });
});
