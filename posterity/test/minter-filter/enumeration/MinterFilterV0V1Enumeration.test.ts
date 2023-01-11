import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
} from "../../util/common";
import { expectRevert } from "@openzeppelin/test-helpers";
import { MinterFilterEnumeration_Common } from "./MinterFilterEnumeration.common";

const runForEach = [
  {
    core: "GenArt721CoreV1",
    coreFirstProjectNumber: 3,
    minterFilter: "MinterFilterV0",
    minter: "MinterSetPriceERC20V0",
  },
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
    beforeEach(async function () {
      // standard accounts and constants
      this.accounts = await getAccounts();
      await assignDefaultConstants.call(this, params.coreFirstProjectNumber);
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
    });

    describe("common tests", async function () {
      await MinterFilterEnumeration_Common();
    });

    describe("test specific to V1", async function () {
      it("doesn't allow removal of unapproved minters", async function () {
        if (params.minterFilter !== "MinterFilterV1") {
          console.log("skipping test for non-V1 minter filter");
          return;
        }
        // reverts when attempting to remove minter being used
        await expectRevert(
          this.minterFilter
            .connect(this.accounts.deployer)
            .removeApprovedMinter(this.minter.address),
          "Only approved minters"
        );
      });
    });
  });
});
