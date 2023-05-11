import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
} from "../../../util/common";
import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { MinterFilterEnumeration_Common } from "./MinterFilterEnumeration.common";

const runForEach = [
  {
    core: "GenArt721CoreV3",
    coreFirstProjectNumber: 0,
    minterFilter: "MinterFilterV1",
    minter: "MinterSetPriceERC20V2",
  },
  {
    core: "GenArt721CoreV3_Explorations",
    coreFirstProjectNumber: 0,
    minterFilter: "MinterFilterV1",
    minter: "MinterSetPriceERC20V2",
  },
];
runForEach.forEach((params) => {
  describe(`${params.minterFilter} Enumeration w/${params.core} core`, async function () {
    async function _beforeEach() {
      let config: T_Config = {
        accounts: await getAccounts(),
      };
      config = await assignDefaultConstants(config);

      // deploy and configure minter filter and minter
      ({
        genArt721Core: config.genArt721Core,
        minterFilter: config.minterFilter,
      } = await deployCoreWithMinterFilter(
        config,
        params.core,
        params.minterFilter
      ));
      config.minter = await deployAndGet(config, params.minter, [
        config.genArt721Core.address,
        config.minterFilter.address,
      ]);

      // Project setup
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );
      return config;
    }

    describe("common tests", async function () {
      await MinterFilterEnumeration_Common(_beforeEach);
    });

    describe("test specific to V1", async function () {
      it("doesn't allow removal of unapproved minters", async function () {
        const config = await loadFixture(_beforeEach);
        if (params.minterFilter !== "MinterFilterV1") {
          console.log("skipping test for non-V1 minter filter");
          return;
        }
        // reverts when attempting to remove minter being used
        await expectRevert(
          config.minterFilter
            .connect(config.accounts.deployer)
            .removeApprovedMinter(config.minter.address),
          "Only approved minters"
        );
      });
    });
  });
});
