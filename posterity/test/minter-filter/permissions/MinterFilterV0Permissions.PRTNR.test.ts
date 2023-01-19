import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../../util/common";

import { MinterFilterPermissions_Common } from "./MinterFilterPermissions.common";

describe("MinterFilterV0PermissionsEvents_V2PRTNRCore", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);
    // deploy and configure minter filter and minter
    ({ genArt721Core: this.genArt721Core, minterFilter: this.minterFilter } =
      await deployCoreWithMinterFilter.call(
        this,
        "GenArt721CoreV2_PRTNR",
        "MinterFilterV0"
      ));

    this.minter = await deployAndGet.call(this, "MinterSetPriceERC20V0", [
      this.genArt721Core.address,
      this.minterFilter.address,
    ]);

    // Project setup
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("Test Project", this.accounts.artist.address, 0);

    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addMintWhitelisted(this.minterFilter.address);
  });

  describe("common tests", async function () {
    await MinterFilterPermissions_Common();
  });
});
