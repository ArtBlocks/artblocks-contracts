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

/**
 * These tests are intended to check basic updates to the V2 PBAB core contract.
 * Note that this test suite is not complete, and does not test all functionality.
 * It includes tests for any added functionality after initial V2 PBAB release.
 */
describe("GenArt721CoreV2_PBAB_Integration", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);
    // deploy and configure core, randomizer, and minter
    this.randomizer = await deployAndGet.call(this, "BasicRandomizer", []);
    // V2_PRTNR need additional arg for starting project ID
    this.genArt721Core = await deployAndGet.call(this, "GenArt721CoreV2_PBAB", [
      this.name,
      this.symbol,
      this.randomizer.address,
      0,
    ]);
    this.minter = await deployAndGet.call(this, "GenArt721Minter_PBAB", [
      this.genArt721Core.address,
    ]);
    // add minter
    this.genArt721Core
      .connect(this.accounts.deployer)
      .addMintWhitelisted(this.minter.address);
    // add project
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("name", this.accounts.artist.address, 0);
  });

  describe("initial nextProjectId", function () {
    it("returns zero when initialized to zero nextProjectId", async function () {
      // one project has already been added, so should be one
      expect(await this.genArt721Core.nextProjectId()).to.be.equal(1);
    });

    it("returns >0 when initialized to >0 nextProjectId", async function () {
      const differentGenArt721Core = await deployAndGet.call(
        this,
        "GenArt721CoreV2_PRTNR",
        [this.name, this.symbol, this.randomizer.address, 365]
      );
      expect(await differentGenArt721Core.nextProjectId()).to.be.equal(365);
    });
  });
});
