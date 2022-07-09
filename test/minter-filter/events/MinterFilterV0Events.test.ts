import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../../util/common";
import { ethers } from "hardhat";

import { MinterFilterEvents_Common } from "./MinterFilterEvents.common";

describe("MinterFilterV0Events", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts.call(this);
    await assignDefaultConstants.call(this, 3); // projectZero = 3 on V1 core
    // deploy and configure minter filter and minter
    ({ genArt721Core: this.genArt721Core, minterFilter: this.minterFilter } =
      await deployCoreWithMinterFilter.call(
        this,
        "GenArt721CoreV1",
        "MinterFilterV0"
      ));

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("project0", this.accounts.deployer.address, 0, false);

    this.minter = await deployAndGet.call(this, "MinterSetPriceERC20V0", [
      this.genArt721Core.address,
      this.minterFilter.address,
    ]);

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
    MinterFilterEvents_Common();
  });
});
