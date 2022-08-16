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
 * Tests for V3 core dealing with configuring projects.
 */
describe("GenArt721CoreV3 Project Configure", async function () {
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

  describe("updateProjectMaxInvocations", function () {
    it("only allows artist to update", async function () {
      // deployer cannot update
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProjectMaxInvocations(
            this.projectZero,
            this.maxInvocations - 1
          ),
        "Only artist"
      );
      // artist can update
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectZero, this.maxInvocations - 1);
    });

    it("only allows maxInvocations to be reduced", async function () {
      // invocations must be reduced
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectMaxInvocations(this.projectZero, this.maxInvocations),
        "maxInvocations may only be decreased"
      );
      // artist can reduce
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectZero, this.maxInvocations - 1);
    });

    it("only allows maxInvocations to be gte current invocations", async function () {
      // mint a token on project zero
      await this.minter
        .connect(this.accounts.artist)
        .purchase(this.projectZero);
      // invocations cannot be < current invocations
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectMaxInvocations(this.projectZero, 0),
        "Only max invocations gte current invocations"
      );
      // artist can set to greater than current invocations
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectZero, 2);
      // artist can set to equal to current invocations
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectZero, 1);
    });
  });

  describe("project complete state", function () {
    it("project may not mint when is completed due to reducing maxInvocations", async function () {
      // mint a token on project zero
      await this.minter
        .connect(this.accounts.artist)
        .purchase(this.projectZero);
      // set max invocations to number of invocations
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectZero, 1);
      // expect project to not mint when completed
      expectRevert(
        this.minter.connect(this.accounts.artist).purchase(this.projectZero),
        "Must not exceed max invocations"
      );
    });

    it("project may not mint when is completed due to minting out", async function () {
      // project mints out
      for (let i = 0; i < this.maxInvocations; i++) {
        await this.minter
          .connect(this.accounts.artist)
          .purchase(this.projectZero);
      }
      // expect project to not mint when completed
      expectRevert(
        this.minter.connect(this.accounts.artist).purchase(this.projectZero),
        "Must not exceed max invocations"
      );
    });
  });

  describe("projectLocked", function () {
    it("project is not locked by default", async function () {
      const projectStateData = await this.genArt721Core
        .connect(this.accounts.user)
        .projectStateData(this.projectZero);
      expect(projectStateData.locked).to.equal(false);
    });

    it("project is not locked < 4 weeks after being completed", async function () {
      // project is completed
      for (let i = 0; i < this.maxInvocations; i++) {
        await this.minter
          .connect(this.accounts.artist)
          .purchase(this.projectZero);
      }
      let projectStateData = await this.genArt721Core
        .connect(this.accounts.user)
        .projectStateData(this.projectZero);
      expect(projectStateData.locked).to.equal(false);
      // advance < 4 weeks
      await advanceEVMByTime(FOUR_WEEKS - 1);
      projectStateData = await this.genArt721Core
        .connect(this.accounts.user)
        .projectStateData(this.projectZero);
      // expect project to not be locked
      expect(projectStateData.locked).to.equal(false);
    });

    it("project is locked > 4 weeks after being minted out", async function () {
      // project is completed
      for (let i = 0; i < this.maxInvocations; i++) {
        await this.minter
          .connect(this.accounts.artist)
          .purchase(this.projectZero);
      }
      // advance > 4 weeks
      await advanceEVMByTime(FOUR_WEEKS + 1);
      const projectStateData = await this.genArt721Core
        .connect(this.accounts.user)
        .projectStateData(this.projectZero);
      // expect project to be locked
      expect(projectStateData.locked).to.equal(true);
    });
  });

  describe("updateProjectDescription", function () {
    const errorMessage = "Only artist when unlocked, owner when locked";
    it("owner cannot update when unlocked", async function () {
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProjectDescription(this.projectZero, "new description"),
        errorMessage
      );
    });

    it("artist can update when unlocked", async function () {
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectDescription(this.projectZero, "new description");
      // expect view to be updated
      const projectDetails = await this.genArt721Core
        .connect(this.accounts.user)
        .projectDetails(this.projectZero);
      expect(projectDetails.description).to.equal("new description");
    });

    it("owner can update when locked", async function () {
      await mintProjectUntilRemaining.call(
        this,
        this.projectZero,
        this.accounts.artist,
        0
      );
      await advanceEVMByTime(FOUR_WEEKS + 1);
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .updateProjectDescription(this.projectZero, "new description");
      // expect view to be updated
      const projectDetails = await this.genArt721Core
        .connect(this.accounts.user)
        .projectDetails(this.projectZero);
      expect(projectDetails.description).to.equal("new description");
    });

    it("artist cannot update when locked", async function () {
      await mintProjectUntilRemaining.call(
        this,
        this.projectZero,
        this.accounts.artist,
        0
      );
      await advanceEVMByTime(FOUR_WEEKS + 1);
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectDescription(this.projectZero, "new description"),
        errorMessage
      );
    });
  });

  describe("updateProjectName", function () {
    const errorMessage = "Only artist when unlocked, owner when locked";
    it("owner can update when unlocked", async function () {
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .updateProjectName(this.projectZero, "new name");
    });

    it("artist can update when unlocked", async function () {
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectName(this.projectZero, "new name");
      // expect view to be updated
      const projectDetails = await this.genArt721Core
        .connect(this.accounts.user)
        .projectDetails(this.projectZero);
      expect(projectDetails.projectName).to.equal("new name");
    });

    it("owner can not update when locked", async function () {
      await mintProjectUntilRemaining.call(
        this,
        this.projectZero,
        this.accounts.artist,
        0
      );
      await advanceEVMByTime(FOUR_WEEKS + 1);
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProjectName(this.projectZero, "new description"),
        "Only if unlocked"
      );
    });

    it("user cannot update", async function () {
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.user)
          .updateProjectName(this.projectZero, "new description"),
        "Only artist or Admin ACL allowed"
      );
    });
  });

  describe("updateProjectArtistAddress", function () {
    it("only allows owner to update project artist address", async function () {
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectArtistAddress(
            this.projectZero,
            this.accounts.artist2.address
          ),
        "Only Admin ACL allowed"
      );
      this.genArt721Core
        .connect(this.accounts.deployer)
        .updateProjectArtistAddress(
          this.projectZero,
          this.accounts.artist2.address
        );
    });

    it("reflects updated artist address", async function () {
      this.genArt721Core
        .connect(this.accounts.deployer)
        .updateProjectArtistAddress(
          this.projectZero,
          this.accounts.artist2.address
        );
      // expect view to reflect update
      const projectArtistPaymentInfo = await this.genArt721Core
        .connect(this.accounts.deployer)
        .projectArtistPaymentInfo(this.projectZero);
      expect(projectArtistPaymentInfo.artistAddress).to.equal(
        this.accounts.artist2.address
      );
    });
  });

  describe("update project payment addresses", function () {
    beforeEach(async function () {
      this.valuesToUpdateTo = [
        this.projectZero,
        this.accounts.artist2.address,
        this.accounts.additional.address,
        50,
        this.accounts.additional2.address,
        51,
      ];
    });

    it("only allows artist to propose updates", async function () {
      // rejects deployer as a proposer of updates
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.deployer)
          .proposeArtistPaymentAddressesAndSplits(...this.valuesToUpdateTo),
        "Only artist"
      );
      // rejects user as a proposer of updates
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.user)
          .proposeArtistPaymentAddressesAndSplits(...this.valuesToUpdateTo),
        "Only artist"
      );
      // allows artist to propose new values
      await this.genArt721Core
        .connect(this.accounts.artist)
        .proposeArtistPaymentAddressesAndSplits(...this.valuesToUpdateTo);
    });

    it("only allows adminACL-allowed account to accept updates if owner has not renounced ownership", async function () {
      // artist proposes new values
      await this.genArt721Core
        .connect(this.accounts.artist)
        .proposeArtistPaymentAddressesAndSplits(...this.valuesToUpdateTo);
      // rejects artist as an acceptor of updates
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.artist)
          .adminAcceptArtistAddressesAndSplits(...this.valuesToUpdateTo),
        "Only Admin ACL allowed"
      );
      // rejects user as an acceptor of updates
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.user)
          .adminAcceptArtistAddressesAndSplits(...this.valuesToUpdateTo),
        "Only Admin ACL allowed"
      );
      // allows deployer to accept new values
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .adminAcceptArtistAddressesAndSplits(...this.valuesToUpdateTo);
    });

    it("only allows artist account to accept proposed updates if owner has renounced ownership", async function () {
      // artist proposes new values
      await this.genArt721Core
        .connect(this.accounts.artist)
        .proposeArtistPaymentAddressesAndSplits(...this.valuesToUpdateTo);
      // admin renounces ownership
      await this.adminACL
        .connect(this.accounts.deployer)
        .renounceOwnershipOn(this.genArt721Core.address);
      // deployer may no longer accept proposed values
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...this.valuesToUpdateTo),
        "Only Admin ACL allowed, or artist if owner has renounced"
      );
      // user may not accept proposed values
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.user)
          .adminAcceptArtistAddressesAndSplits(...this.valuesToUpdateTo),
        "Only Admin ACL allowed, or artist if owner has renounced"
      );
      // artist may accept proposed values
      await this.genArt721Core
        .connect(this.accounts.artist)
        .adminAcceptArtistAddressesAndSplits(...this.valuesToUpdateTo);
    });

    it("does not allow adminACL-allowed account to accept updates that don't match artist proposed values", async function () {
      // artist proposes new values
      await this.genArt721Core
        .connect(this.accounts.artist)
        .proposeArtistPaymentAddressesAndSplits(...this.valuesToUpdateTo);
      // rejects deployer's updates if they don't match artist's proposed values
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(
            this.valuesToUpdateTo[0],
            this.valuesToUpdateTo[1],
            this.valuesToUpdateTo[2],
            this.valuesToUpdateTo[3],
            this.valuesToUpdateTo[4],
            this.valuesToUpdateTo[5] + 1
          ),
        "Must match artist proposal"
      );
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(
            this.valuesToUpdateTo[0],
            this.valuesToUpdateTo[1],
            this.valuesToUpdateTo[2],
            this.valuesToUpdateTo[3],
            this.valuesToUpdateTo[2],
            this.valuesToUpdateTo[5]
          ),
        "Must match artist proposal"
      );
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(
            this.valuesToUpdateTo[0],
            this.valuesToUpdateTo[1],
            this.valuesToUpdateTo[2],
            this.valuesToUpdateTo[3] - 1,
            this.valuesToUpdateTo[4],
            this.valuesToUpdateTo[5]
          ),
        "Must match artist proposal"
      );
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(
            this.valuesToUpdateTo[0],
            this.valuesToUpdateTo[1],
            this.valuesToUpdateTo[4],
            this.valuesToUpdateTo[3],
            this.valuesToUpdateTo[4],
            this.valuesToUpdateTo[5]
          ),
        "Must match artist proposal"
      );
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(
            this.valuesToUpdateTo[0],
            this.accounts.user.address,
            this.valuesToUpdateTo[2],
            this.valuesToUpdateTo[3],
            this.valuesToUpdateTo[4],
            this.valuesToUpdateTo[5]
          ),
        "Must match artist proposal"
      );
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(
            this.projectOne,
            this.valuesToUpdateTo[1],
            this.valuesToUpdateTo[2],
            this.valuesToUpdateTo[3],
            this.valuesToUpdateTo[4],
            this.valuesToUpdateTo[5]
          ),
        "Must match artist proposal"
      );
    });
  });
});
