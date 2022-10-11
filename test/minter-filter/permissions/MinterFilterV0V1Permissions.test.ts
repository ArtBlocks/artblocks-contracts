import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
} from "../../util/common";

import { MinterFilterPermissions_Common } from "./MinterFilterPermissions.common";

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
];

runForEach.forEach((params) => {
  describe(`${params.minterFilter} Permissions`, async function () {
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

      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);
    });

    describe("common tests", async function () {
      await MinterFilterPermissions_Common();
    });
  });
});
