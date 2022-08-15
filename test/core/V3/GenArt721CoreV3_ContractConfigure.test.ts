import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  mintProjectUntilRemaining,
  advanceEVMByTime,
} from "../../util/common";
import { FOUR_WEEKS } from "../../util/constants";

/**
 * Tests for V3 core dealing with configuring the core contract.
 */
describe("GenArt721CoreV3 Contract Configure", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);

    // deploy and configure minter filter and minter
    ({
      genArt721Core: this.genArt721Core,
      minterFilter: this.minterFilter,
      randomizer: this.randomizer,
      adminACL: this.adminACL,
    } = await deployCoreWithMinterFilter.call(
      this,
      "GenArt721CoreV3",
      "MinterFilterV1"
    ));

    this.minter = await deployAndGet.call(this, "MinterSetPriceV2", [
      this.genArt721Core.address,
      this.minterFilter.address,
    ]);

    // add project zero
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("name", this.accounts.artist.address);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);

    // add project one without setting it to active or setting max invocations
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("name", this.accounts.artist2.address);

    // configure minter for project zero
    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minter.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(this.projectZero, this.minter.address);
    await this.minter
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(this.projectZero, 0);
  });

  describe("updateArtblocksPrimarySalesPercentage", function () {
    it("does not allow a value > 25%", async function () {
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.deployer)
          .updateArtblocksPrimarySalesPercentage(26),
        "Max of 25%"
      );
    });

    it("does allow a value of 25%", async function () {
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .updateArtblocksPrimarySalesPercentage(25);
    });

    it("does allow a value of < 25%", async function () {
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .updateArtblocksPrimarySalesPercentage(0);
    });
  });

  describe("updateArtblocksSecondarySalesBPS", function () {
    it("does not allow a value > 2.5%", async function () {
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.deployer)
          .updateArtblocksSecondarySalesBPS(260),
        "Max of 2.5%"
      );
    });

    it("does allow a value of 2.5%", async function () {
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .updateArtblocksSecondarySalesBPS(250);
    });

    it("does allow a value of < 2.5%", async function () {
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .updateArtblocksSecondarySalesBPS(0);
    });
  });
});
