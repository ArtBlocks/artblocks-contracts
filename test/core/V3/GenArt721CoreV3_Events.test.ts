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
 * Tests for V3 core dealing with configuring projects.
 */
describe("GenArt721CoreV3", async function () {
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

    // TBD - V3 DOES NOT CURRENTLY HAVE A WORKING MINTER

    // allow artist to mint on contract
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .updateMinterContract(this.accounts.artist.address);

    // add project zero
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("name", this.accounts.artist.address);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);

    // add project one without setting it to active or setting max invocations
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("name", this.accounts.artist2.address);
  });

  describe("ProjectCompleted", function () {
    it("emits ProjectCompleted when being minted out", async function () {
      for (let i = 0; i < this.maxInvocations - 1; i++) {
        await this.genArt721Core
          .connect(this.accounts.artist)
          .mint(
            this.accounts.artist.address,
            this.projectZero,
            this.accounts.artist.address
          );
      }
      // emits event when being minted out
      expect(
        await this.genArt721Core
          .connect(this.accounts.artist)
          .mint(
            this.accounts.artist.address,
            this.projectZero,
            this.accounts.artist.address
          )
      )
        .to.emit(this.genArt721Core, "ProjectCompleted")
        .withArgs(this.projectZero);
    });
  });
});
