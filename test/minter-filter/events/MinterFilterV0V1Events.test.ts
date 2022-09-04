import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
} from "../../util/common";
import { ethers } from "hardhat";

import { MinterFilterEvents_Common } from "./MinterFilterEvents.common";

const runForEach = [
  {
    core: "GenArt721CoreV1",
    coreFirstProjectNumber: 3,
    minterFilter: "MinterFilterV0",
    minter: "MinterSetPriceERC20V0",
    minter2: "MinterSetPriceV0",
    minter3: "MinterDALinV0",
  },
  {
    core: "GenArt721CoreV3",
    coreFirstProjectNumber: 0,
    minterFilter: "MinterFilterV1",
    minter: "MinterSetPriceERC20V2",
    minter2: "MinterSetPriceV2",
    minter3: "MinterDALinV2",
  },
];

runForEach.forEach((params) => {
  describe(`${params.minterFilter} Events`, async function () {
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
      await safeAddProject(
        this.genArt721Core,
        this.accounts.deployer,
        this.accounts.artist.address
      );

      this.minter = await deployAndGet.call(this, params.minter, [
        this.genArt721Core.address,
        this.minterFilter.address,
      ]);

      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      // deploy different types of filtered minters
      const minterFactoryETH = await ethers.getContractFactory(params.minter2);
      this.minterETH = await minterFactoryETH.deploy(
        this.genArt721Core.address,
        this.minterFilter.address
      );
      const minterFactoryETHAuction = await ethers.getContractFactory(
        params.minter3
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
});
