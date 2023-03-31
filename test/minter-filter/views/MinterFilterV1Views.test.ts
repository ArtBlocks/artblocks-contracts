import { BN, constants, expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
} from "../../util/common";

import { MinterFilterViews_Common } from "./MinterFilterViews.common";

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
  describe(`${params.minterFilter} Views w/${params.core} core`, async function () {
    async function _beforeEach() {
      let config: T_Config = {
        accounts: await getAccounts(),
      };
      config = await assignDefaultConstants(
        config,
        params.coreFirstProjectNumber
      ); // projectZero = 3 on V1 core
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
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );
      return config;
    }

    describe("common tests", async function () {
      await MinterFilterViews_Common(_beforeEach);
    });

    describe("V1+ specific input checks", async function () {
      it("reverts on improper address inputs", async function () {
        const config = await loadFixture(_beforeEach);
        // addProject
        expectRevert(
          config.minterFilter
            .connect(config.accounts.deployer)
            .addApprovedMinter(constants.ZERO_ADDRESS),
          "Must input non-zero address"
        );
      });
    });

    describe("minterFilterVersion", async function () {
      it("returns expected value", async function () {
        const config = await loadFixture(_beforeEach);
        // addProject
        const minterFilterVersion =
          await config.minterFilter.minterFilterVersion();
        expect(minterFilterVersion).to.equal("v1.0.1");
      });
    });

    describe("minterFilterType", async function () {
      it("returns expected value", async function () {
        const config = await loadFixture(_beforeEach);
        // addProject
        const minterFilterType = await config.minterFilter.minterFilterType();
        expect(minterFilterType).to.equal("MinterFilterV1");
      });
    });
  });
});
