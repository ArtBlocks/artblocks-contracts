import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../../util/common";
import { MinterFilterEnumeration_Common } from "./MinterFilterEnumeration.common";

describe("MinterFilterV0Enumeration", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this, 3); // projectZero = 3 on V1 core
    // deploy and configure minter filter and minter
    ({ genArt721Core: this.genArt721Core, minterFilter: this.minterFilter } =
      await deployCoreWithMinterFilter.call(
        this,
        "GenArt721CoreV1",
        "MinterFilterV0"
      ));
    this.minter = await deployAndGet.call(this, "MinterSetPriceERC20V0", [
      this.genArt721Core.address,
      this.minterFilter.address,
    ]);

    // Project setup
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("Test Project", this.accounts.artist.address, 0, false);
  });

  describe("common tests", async function () {
    MinterFilterEnumeration_Common();
  });
});
