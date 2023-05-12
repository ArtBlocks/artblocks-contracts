import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { revertMessages } from "./constants";
import { setupConfigWitMinterFilterV2Suite } from "../../util/fixtures";
import { deployCore, safeAddProject } from "../../util/common";

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
  {
    core: "GenArt721CoreV3_Explorations",
  },
  {
    core: "GenArt721CoreV3_Engine",
  },
  {
    core: "GenArt721CoreV3_Engine_Flex",
  },
];

runForEach.forEach((params) => {
  describe(`MinterFilterV2 Integration tests w/ core ${params.core}`, async function () {
    async function _beforeEach() {
      // load minter filter V2 fixture
      const config = await loadFixture(setupConfigWitMinterFilterV2Suite);
      // deploy core contract and register on core registry
      ({
        genArt721Core: config.genArt721Core,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCore(config, params.core, config.coreRegistry));

      // update core's minter as the minter filter
      await config.genArt721Core.updateMinterContract(
        config.minterFilter.address
      );

      // Project setup
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );
      return config;
    }

    describe("mint_joo", async function () {
      describe("checks", async function () {
        it("does not allow project with no minter to call", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minterFilter.mint_joo(
              config.accounts.artist.address,
              config.projectZero,
              config.genArt721Core.address,
              config.accounts.artist.address
            ),
            revertMessages.nonExistentKey
          );
        });

        it("does not allow project with different minter to call", async function () {
          const config = await loadFixture(_beforeEach);
          // assign minter to project zero
          await config.minterFilter
            .connect(config.accounts.deployer)
            .setMinterForProject(
              config.projectZero,
              config.genArt721Core.address,
              config.minter.address
            );
          await expectRevert(
            config.minterFilter.mint_joo(
              config.accounts.artist.address,
              config.projectZero,
              config.genArt721Core.address,
              config.accounts.artist.address
            ),
            revertMessages.onlyAssignedMinter
          );
        });
      });

      describe("effects", async function () {
        it("mints a token", async function () {
          const config = await loadFixture(_beforeEach);
          // assign minter to project zero
          await config.minterFilter
            .connect(config.accounts.deployer)
            .setMinterForProject(
              config.projectZero,
              config.genArt721Core.address,
              config.minter.address
            );
          // mint token from minter
          await config.minter
            .connect(config.accounts.artist)
            .purchase(config.projectZero, config.genArt721Core.address);
          // check that token was minted
          expect(
            await config.genArt721Core.balanceOf(config.accounts.artist.address)
          ).to.eq(1);
        });
      });
    });
  });
});
