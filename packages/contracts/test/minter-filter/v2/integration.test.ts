import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Contract } from "ethers";
import { setupConfigWitMinterFilterV2Suite } from "../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../util/common";

// we use a dummy shared minter for these tests
const expectedMinterType = "DummySharedMinter";

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

// // helper functions
// async function deployAndRegisterAdditionalCore(
//   config,
//   coreContractName,
//   addInitialProject
// ) {
//   // deploy core contract and register on core registry
//   let newCore: Contract;
//   ({ genArt721Core: newCore } = await deployCore(
//     config,
//     coreContractName,
//     config.coreRegistry
//   ));
//   if (addInitialProject) {
//     await safeAddProject(
//       newCore,
//       config.accounts.deployer,
//       config.accounts.artist2.address
//     );
//   }
//   return { newCore };
// }

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

    describe("TODO", async function () {
      // TODO
    });
  });
});
