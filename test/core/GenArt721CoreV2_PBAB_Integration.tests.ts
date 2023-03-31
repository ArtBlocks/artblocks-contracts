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
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../util/common";

/**
 * These tests are intended to check basic updates to the V2 PBAB core contract.
 * Note that config test suite is not complete, and does not test all functionality.
 * It includes tests for any added functionality after initial V2 PBAB release.
 */
describe("GenArt721CoreV2_PBAB_Integration", async function () {
  async function _beforeEach() {
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);

    // deploy and configure core, randomizer, and minter
    config.randomizer = await deployAndGet(config, "BasicRandomizer", []);
    // V2_PRTNR need additional arg for starting project ID
    config.genArt721Core = await deployAndGet(config, "GenArt721CoreV2_PBAB", [
      config.name,
      config.symbol,
      config.randomizer.address,
      0,
    ]);
    config.minter = await deployAndGet(config, "GenArt721Minter_PBAB", [
      config.genArt721Core.address,
    ]);
    // add minter
    config.genArt721Core
      .connect(config.accounts.deployer)
      .addMintWhitelisted(config.minter.address);
    // add project
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .addProject("name", config.accounts.artist.address, 0);
    return config;
  }

  describe("initial nextProjectId", function () {
    it("returns zero when initialized to zero nextProjectId", async function () {
      const config = await loadFixture(_beforeEach);
      // one project has already been added, so should be one
      expect(await config.genArt721Core.nextProjectId()).to.be.equal(1);
    });

    it("returns >0 when initialized to >0 nextProjectId", async function () {
      const config = await loadFixture(_beforeEach);
      const differentGenArt721Core = await deployAndGet(
        config,
        "GenArt721CoreV2_PRTNR",
        [config.name, config.symbol, config.randomizer.address, 365]
      );
      expect(await differentGenArt721Core.nextProjectId()).to.be.equal(365);
    });
  });
});
