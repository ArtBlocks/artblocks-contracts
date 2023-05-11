import { BN, constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2 } from "../../util/fixtures";
import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCore,
  safeAddProject,
} from "../../util/common";

// Note: will deploy with compatible minter(s) when they become available

const runForEach = [
  {
    core: "GenArt721CoreV3",
    coreFirstProjectNumber: 0,
    minter: "MinterSetPriceV4",
  },
  {
    core: "GenArt721CoreV3_Explorations",
    coreFirstProjectNumber: 0,
    minter: "MinterSetPriceV4",
  },
];

runForEach.forEach((params) => {
  describe(`MinterFilterV2 Views w/ core ${params.core} core`, async function () {
    async function _beforeEach() {
      // load minter filter V2 fixture
      const config = await loadFixture(setupConfigWitMinterFilterV2);
      // deploy core contract and register on core registry
      ({
        genArt721Core: config.genArt721Core,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCore(config, params.core, config.coreRegistry));
      // @dev TODO - add a mock shared minter here

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

    describe("projectHasMinter", async function () {
      it("returns false when project does not have minter", async function () {
        const config = await loadFixture(_beforeEach);
        let result = await config.minterFilter
          .connect(config.accounts.deployer)
          .projectHasMinter(config.projectZero, config.genArt721Core.address);
        expect(result).to.be.equal(false);
      });

      it("returns true when project has minter", async function () {
        const config = await loadFixture(_beforeEach);
        // TODO - update after mock shared minter is added
        // // approve minter and assign minter
        // await config.minterFilter
        //   .connect(config.accounts.deployer)
        //   .addApprovedMinter(config.minter.address);
        // await config.minterFilter
        //   .connect(config.accounts.deployer)
        //   .setMinterForProject(config.projectZero, config.minter.address);
        // // expect project zero to have minter
        // let result = await config.minterFilter
        //   .connect(config.accounts.deployer)
        //   .projectHasMinter(config.projectZero);
        // expect(result).to.be.equal(true);
      });
    });
  });
});
