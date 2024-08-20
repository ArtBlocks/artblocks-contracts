import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../util/common";
import { expect } from "chai";

import { T_Config } from "../../util/common";
import {
  GenArt721CoreV3_Engine,
  SeaDropXArtBlocksShim,
} from "../../../scripts/contracts";

interface T_SeaDropShimTestConfig extends T_Config {
  genArt721Core: GenArt721CoreV3_Engine;
  minter: SeaDropXArtBlocksShim;
  projectZero: number;
}

// @dev testing with V3 engine sufficient - no different logic is tested with flex, etc.
const runForEach = [
  {
    core: "GenArt721CoreV3_Engine",
  },
];

// we don't mock SeaDrop contract, instead rely on end-to-end testing on testnet for SeaDrop integration
// @dev this maintains security via testing our contract logic, but also tests the integration with SeaDrop
// on systems outside of our dev environment and developed by third party teams

runForEach.forEach((params) => {
  describe(`SeaDropXArtBlocksShim Integration w/ core ${params.core}`, async function () {
    async function _beforeEach() {
      // load minter filter V2 fixture
      const config = await loadFixture(setupConfigWitMinterFilterV2Suite);
      // deploy core contract and register on core registry
      ({
        genArt721Core: config.genArt721Core,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCore(config, params.core, config.coreRegistry));

      // Project setup (do prior to minter deployment for pre-syncing artist address in constructor test)
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );

      config.minter = await deployAndGet(config, "SeaDropXArtBlocksShim", [
        config.accounts.deployer.address, // IMPORTANT: using deployer wallet as SeaDrop for testing purposes
        config.genArt721Core.address,
        config.projectZero,
      ]);

      // non-standard - set contract's minter as the shim minter directly
      await config.genArt721Core.updateMinterContract(config.minter.address);
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 15);

      return config as T_SeaDropShimTestConfig;
    }

    describe("mintSeaDrop", async function () {
      it("should revert if not called by SeaDrop", async function () {
        const config = await _beforeEach();
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .mintSeaDrop(config.accounts.deployer.address, 1)
        ).to.be.revertedWithCustomError(config.minter, "OnlyAllowedSeaDrop");
      });

      it("updates state when called by SeaDrop", async function () {
        const config = await _beforeEach();
        // verify starting state is no token zero
        await expectRevert.unspecified(
          config.genArt721Core.ownerOf(config.projectZeroTokenZero?.toString())
        );
        // perform mint action
        await config.minter
          .connect(config.accounts.deployer)
          .mintSeaDrop(config.accounts.artist.address, 2);
        // minterNumMinted should be updated
        expect(
          await config.minter.minterNumMinted(config.accounts.artist.address)
        ).to.equal(2);
        // core contract should have minted - verify owner
        expect(
          await config.genArt721Core.ownerOf(
            config.projectZeroTokenZero?.toString()
          )
        ).to.equal(config.accounts.artist.address);
        expect(
          await config.genArt721Core.ownerOf(
            config.projectZeroTokenOne?.toString()
          )
        ).to.equal(config.accounts.artist.address);
      });
    });
  });
});
