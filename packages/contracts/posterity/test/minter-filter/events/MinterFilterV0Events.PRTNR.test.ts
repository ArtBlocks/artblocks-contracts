import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../../util/common";

import { MinterFilterEvents_Common } from "./MinterFilterEvents.common";
import { ethers } from "hardhat";

describe("MinterFilterV0Events_V2PRTNRCore", async function () {
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

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("project0", this.accounts.deployer.address, 0);

    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minter.address);
    // deploy different types of filtered minters
    const minterFactoryETH = await ethers.getContractFactory(
      "MinterSetPriceV0"
    );
    this.minterETH = await minterFactoryETH.deploy(
      this.genArt721Core.address,
      this.minterFilter.address
    );
    const minterFactoryETHAuction = await ethers.getContractFactory(
      "MinterDALinV0"
    );
    this.minterETHAuction = await minterFactoryETHAuction.deploy(
      this.genArt721Core.address,
      this.minterFilter.address
    );
  });

  describe("common tests", async function () {
    await MinterFilterEvents_Common();
  });
});
