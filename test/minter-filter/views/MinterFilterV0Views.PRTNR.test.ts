import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../../util/common";

import { MinterFilterViews_Common } from "./MinterFilterViews.common";

describe("MinterFilterV0Views", async function () {
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
    // Project 1 setup
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("Test Project One", this.accounts.artist.address, 0);
  });

  describe("common tests", async function () {
    MinterFilterViews_Common();
  });
});
