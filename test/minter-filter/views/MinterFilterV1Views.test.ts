import { BN, constants, expectRevert } from "@openzeppelin/test-helpers";
import {
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
    beforeEach(async function () {
      // standard accounts and constants
      this.accounts = await getAccounts();
      await assignDefaultConstants.call(this, params.coreFirstProjectNumber); // projectZero = 3 on V1 core
      // deploy and configure minter filter and minter
      ({ genArt721Core: this.genArt721Core, minterFilter: this.minterFilter } =
        await deployCoreWithMinterFilter.call(
          this,
          params.core,
          params.minterFilter
        ));

      this.minter = await deployAndGet.call(this, params.minter, [
        this.genArt721Core.address,
        this.minterFilter.address,
      ]);

      // Project setup
      await safeAddProject(
        this.genArt721Core,
        this.accounts.deployer,
        this.accounts.artist.address
      );
      await safeAddProject(
        this.genArt721Core,
        this.accounts.deployer,
        this.accounts.artist.address
      );
    });

    describe("common tests", async function () {
      await MinterFilterViews_Common();
    });

    describe("V1+ specific input checks", async function () {
      it("reverts on improper address inputs", async function () {
        // addProject
        expectRevert(
          this.minterFilter
            .connect(this.accounts.deployer)
            .addApprovedMinter(constants.ZERO_ADDRESS),
          "Must input non-zero address"
        );
      });
    });
  });
});
