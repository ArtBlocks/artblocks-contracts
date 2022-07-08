import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../../util/common";
import { MinterFilterEnumeration_Common } from "./MinterFilterV0Enumeration.common";

describe("MinterFilterV0Enumeration", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts.call(this);
    await assignDefaultConstants.call(this);
    // deploy and configure minter filter and minter
    ({ token: this.token, minterFilter: this.minterFilter } =
      await deployCoreWithMinterFilter.call(
        this,
        "GenArt721CoreV2_PRTNR",
        "MinterFilterV0"
      ));
    this.minter = await deployAndGet.call(this, "MinterSetPriceERC20V1", [
      this.token.address,
      this.minterFilter.address,
    ]);

    // Project setup
    await this.token
      .connect(this.accounts.deployer)
      .addProject("Test Project", this.accounts.artist.address, 0);
  });

  describe("common tests", async function () {
    MinterFilterEnumeration_Common();
  });
});
