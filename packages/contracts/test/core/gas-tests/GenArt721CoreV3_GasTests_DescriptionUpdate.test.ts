import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
} from "../../util/common";
import {
  SQUIGGLE_DESCRIPTION,
  HUMAN_UNREADABLE_DESCRIPTION,
} from "../../util/example-descriptions";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const descriptionsToTest = [
  {
    title: "Chromie Squiggle Description (short)",
    description: SQUIGGLE_DESCRIPTION,
  },
  {
    title: "Human Unreadable Description (long)",
    description: HUMAN_UNREADABLE_DESCRIPTION,
  },
];

/**
 * Project Description Gas tests for V3 core.
 * Used to test the gas cost of different operations on the core, specifically
 * when optimizing for gas to quantify % reductions to aide in decision making.
 */
describe("GenArt721CoreV3 Gas Tests - Description Updates", async function () {
  async function _beforeEachFlagship() {
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);
    // deploy and configure minter filter and minter
    ({
      genArt721Core: config.genArt721Core,
      minterFilter: config.minterFilter,
      randomizer: config.randomizer,
    } = await deployCoreWithMinterFilter(
      config,
      "GenArt721CoreV3_Engine",
      "MinterFilterV1"
    ));
    await safeAddProject(
      config.genArt721Core,
      config.accounts.deployer,
      config.accounts.artist.address
    );
    return config;
  }

  async function _beforeEachEngine() {
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);
    // deploy and configure minter filter and minter
    ({
      genArt721Core: config.genArt721Core,
      minterFilter: config.minterFilter,
      randomizer: config.randomizer,
    } = await deployCoreWithMinterFilter(
      config,
      "GenArt721CoreV3_Engine",
      "MinterFilterV1"
    ));
    await safeAddProject(
      config.genArt721Core,
      config.accounts.deployer,
      config.accounts.artist.address
    );
    return config;
  }

  describe("project description upload gas analysis", function () {
    descriptionsToTest.forEach((descriptionToTest) => {
      describe(`${descriptionToTest.title}`, function () {
        it("reports gas to update initial description and subsequent, flagship [ @skip-on-coverage ]", async function () {
          const config = await loadFixture(_beforeEachFlagship);
          // upload initial description
          const tx = await config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectDescription(
              config.projectZero,
              descriptionToTest.description
            );
          const receipt = await tx.wait();
          const gasUsed = receipt.gasUsed.toNumber();
          console.log("gas used for initial description upload: ", gasUsed);
          // slightly different description
          const tx2 = await config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectDescription(
              config.projectZero,
              descriptionToTest.description + " "
            );
          const receipt2 = await tx2.wait();
          const gasUsed2 = receipt2.gasUsed.toNumber();
          console.log("gas used for subsequent description upload: ", gasUsed2);
        });
      });
    });
  });
});
