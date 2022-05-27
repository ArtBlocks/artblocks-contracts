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

/**
 * @notice This tests MinterFilter enumeration when integrating with a V2_PRTNR
 * core contract.
 */
describe("MinterFilterV0Enumeration_V2PRTNRCore", async function () {
  const pricePerTokenInWei = ethers.utils.parseEther("1");

  beforeEach(async function () {
    // Deployment
    const [deployer, artist, misc] = await ethers.getSigners();
    this.accounts = {
      deployer: deployer,
      artist: artist,
      misc: misc,
    };
    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();
    const coreFactory = await ethers.getContractFactory(
      "GenArt721CoreV2_PRTNR"
    );
    this.genArt721Core = await coreFactory
      .connect(deployer)
      .deploy("Test Contract", "TEST", this.randomizer.address);
    const minterFilterFactory = await ethers.getContractFactory(
      "MinterFilterV0"
    );
    this.minterFilter = await minterFilterFactory.deploy(
      this.genArt721Core.address
    );
    const minterFactory = await ethers.getContractFactory(
      "MinterSetPriceERC20V1"
    );
    this.minter = await minterFactory.deploy(
      this.genArt721Core.address,
      this.minterFilter.address
    );

    // Project setup
    await this.genArt721Core
      .connect(deployer)
      .addProject("Test Project", this.accounts.artist.address, 0);
  });

  describe("Enumerable Map: minterForProject", async function () {
    describe("no projects configured", async function () {
      const indexErrorMessage =
        "Array accessed at an out-of-bounds or negative index";

      it("returns correct length when no projects assigned minter", async function () {
        const numProjects = await this.minterFilter
          .connect(this.accounts.deployer)
          .getNumProjectsWithMinters();
        expect(numProjects).to.be.equal(0);
      });

      it("throws when getting info at non-existent index", async function () {
        await expectRevert(
          this.minterFilter
            .connect(this.accounts.deployer)
            .getProjectAndMinterInfoAt(0),
          indexErrorMessage
        );
      });
    });

    describe("project is configured", async function () {
      it("returns correct length when one project assigned minter", async function () {
        // approve and assign minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address);
        // expect length to reflect configured project
        const numProjects = await this.minterFilter
          .connect(this.accounts.deployer)
          .getNumProjectsWithMinters();
        expect(numProjects).to.be.equal(1);
      });

      it("returns correct info for project at existing index", async function () {
        // approve and assign minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address);
        // expect appropriate info when getting at index that exists
        const results = await this.minterFilter
          .connect(this.accounts.deployer)
          .getProjectAndMinterInfoAt(0);
        const expectedMinterType = await this.minter
          .connect(this.accounts.deployer)
          .minterType();
        expect(expectedMinterType).to.not.be.equal(undefined);
        expect(results.projectId).to.be.equal(0);
        expect(results.minterAddress).to.be.equal(this.minter.address);
        expect(results.minterType).to.be.equal(expectedMinterType);
      });
    });

    describe("project has minter", async function () {
      it("returns true when project has a minter", async function () {
        // approve and assign minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address);
        // expect projectHasMinter to be true
        const _projectHasMinter = await this.minterFilter
          .connect(this.accounts.deployer)
          .projectHasMinter(0);
        expect(_projectHasMinter).to.be.true;
      });

      it("returns false when project does not have a minter", async function () {
        // expect projectHasMinter to be false
        const _projectHasMinter = await this.minterFilter
          .connect(this.accounts.deployer)
          .projectHasMinter(0);
        expect(_projectHasMinter).to.be.false;
      });
    });
  });

  describe("mapping: numProjectsUsingMinter", async function () {
    beforeEach(async function () {
      // Project 1 setup
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .addProject("Test Project One", this.accounts.artist.address, 0);
    });

    describe("keeps count while add/remove minter for project", async function () {
      it("initializes count to zero", async function () {
        // approve minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address);
        // expect count to still be at initialized value of zero
        const result = await this.minterFilter
          .connect(this.accounts.deployer)
          .numProjectsUsingMinter(this.minter.address);
        expect(result).to.be.equal(0);
      });

      it("keeps count while add/single-remove one minter for project", async function () {
        // approve and assign minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address);
        // expect proper count
        let result = await this.minterFilter
          .connect(this.accounts.deployer)
          .numProjectsUsingMinter(this.minter.address);
        expect(result).to.be.equal(1);
        // remove minter from project
        await this.minterFilter
          .connect(this.accounts.deployer)
          .removeMinterForProject(0);
        // expect proper count
        result = await this.minterFilter
          .connect(this.accounts.deployer)
          .numProjectsUsingMinter(this.minter.address);
        expect(result).to.be.equal(0);
      });

      it("keeps count while add/bulk-remove one minter for project", async function () {
        // approve and assign minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address);
        // expect proper count
        let result = await this.minterFilter
          .connect(this.accounts.deployer)
          .numProjectsUsingMinter(this.minter.address);
        expect(result).to.be.equal(1);
        // remove minter from project
        await this.minterFilter
          .connect(this.accounts.deployer)
          .removeMintersForProjects([0]);
        // expect proper count
        result = await this.minterFilter
          .connect(this.accounts.deployer)
          .numProjectsUsingMinter(this.minter.address);
        expect(result).to.be.equal(0);
      });

      it("keeps count while add/single-remove multiple minters for projects", async function () {
        // approve and assign minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(1, this.minter.address);
        // expect proper count
        let result = await this.minterFilter
          .connect(this.accounts.deployer)
          .numProjectsUsingMinter(this.minter.address);
        expect(result).to.be.equal(2);
        // remove minter from project 0
        await this.minterFilter
          .connect(this.accounts.deployer)
          .removeMinterForProject(0);
        // expect proper count
        result = await this.minterFilter
          .connect(this.accounts.deployer)
          .numProjectsUsingMinter(this.minter.address);
        expect(result).to.be.equal(1);
        // remove minter from project 1
        await this.minterFilter
          .connect(this.accounts.deployer)
          .removeMinterForProject(1);
        // expect proper count
        result = await this.minterFilter
          .connect(this.accounts.deployer)
          .numProjectsUsingMinter(this.minter.address);
        expect(result).to.be.equal(0);
      });

      it("keeps count while add/bulk-remove multiple minters for projects", async function () {
        // approve and assign minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(1, this.minter.address);
        // expect proper count
        let result = await this.minterFilter
          .connect(this.accounts.deployer)
          .numProjectsUsingMinter(this.minter.address);
        expect(result).to.be.equal(2);
        // bulk-remove minter from project 0
        await this.minterFilter
          .connect(this.accounts.deployer)
          .removeMintersForProjects([0]);
        // expect proper count
        result = await this.minterFilter
          .connect(this.accounts.deployer)
          .numProjectsUsingMinter(this.minter.address);
        expect(result).to.be.equal(1);
        // re-add to project 0
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address);
        // expect proper count
        result = await this.minterFilter
          .connect(this.accounts.deployer)
          .numProjectsUsingMinter(this.minter.address);
        expect(result).to.be.equal(2);
        // bulk-remove minter from projects 0 & 1
        await this.minterFilter
          .connect(this.accounts.deployer)
          .removeMintersForProjects([0, 1]);
        // expect proper count
        result = await this.minterFilter
          .connect(this.accounts.deployer)
          .numProjectsUsingMinter(this.minter.address);
        expect(result).to.be.equal(0);
      });

      it("keeps count while setting same minter twice to single project", async function () {
        // approve and assign minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address);
        // expect proper count
        let result = await this.minterFilter
          .connect(this.accounts.deployer)
          .numProjectsUsingMinter(this.minter.address);
        expect(result).to.be.equal(1);
      });

      it("keeps count while bulk-removing empty array", async function () {
        // approve and assign minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address);
        // bulk-remove minter from no projects
        await this.minterFilter
          .connect(this.accounts.deployer)
          .removeMintersForProjects([]);
        // expect proper count
        let result = await this.minterFilter
          .connect(this.accounts.deployer)
          .numProjectsUsingMinter(this.minter.address);
        expect(result).to.be.equal(1);
      });

      it("keeps count after invalid set minter for project opereration", async function () {
        // approve and assign minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address);
        // add minter for invalid project
        await expectRevert.unspecified(
          this.minterFilter
            .connect(this.accounts.deployer)
            .setMinterForProject(99, this.minter.address)
        );
        // expect proper count
        let result = await this.minterFilter
          .connect(this.accounts.deployer)
          .numProjectsUsingMinter(this.minter.address);
        expect(result).to.be.equal(1);
      });

      it("keeps count after invalid single-remove minter for project opereration", async function () {
        // approve and assign minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address);
        // remove minter from invalid project
        await expectRevert.unspecified(
          this.minterFilter
            .connect(this.accounts.deployer)
            .removeMinterForProject(99)
        );
        // expect proper count
        let result = await this.minterFilter
          .connect(this.accounts.deployer)
          .numProjectsUsingMinter(this.minter.address);
        expect(result).to.be.equal(1);
      });

      it("keeps count after invalid bulk-remove minter for project opereration", async function () {
        // approve and assign minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(1, this.minter.address);
        // remove minter from invalid project
        await expectRevert(
          this.minterFilter
            .connect(this.accounts.deployer)
            .removeMintersForProjects([0, 0]),
          "EnumerableMap: nonexistent key"
        );
        // expect proper count
        let result = await this.minterFilter
          .connect(this.accounts.deployer)
          .numProjectsUsingMinter(this.minter.address);
        expect(result).to.be.equal(2);
      });
    });

    describe("keeps count and supports removeApprovedMinter logic", async function () {
      it("removes minter when no project using minter", async function () {
        // approve minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address);
        // removes minter without reverting
        await this.minterFilter
          .connect(this.accounts.deployer)
          .removeApprovedMinter(this.minter.address);
        // approve and assign minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address);
        // remove minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .removeMinterForProject(0);
        // removes minter without reverting
        await this.minterFilter
          .connect(this.accounts.deployer)
          .removeApprovedMinter(this.minter.address);
      });

      it("doesn't remove minter when >0 projects using minter", async function () {
        // approve and assign minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address);
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address);
        // reverts when attempting to remove minter being used
        await expectRevert(
          this.minterFilter
            .connect(this.accounts.deployer)
            .removeApprovedMinter(this.minter.address),
          "Only unused minters"
        );
        // add another project to minter
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(1, this.minter.address);
        // remove minter from one project
        await this.minterFilter
          .connect(this.accounts.deployer)
          .removeMintersForProjects([0]);
        // reverts when attempting to remove minter being used
        await expectRevert(
          this.minterFilter
            .connect(this.accounts.deployer)
            .removeApprovedMinter(this.minter.address),
          "Only unused minters"
        );
      });
    });
  });
});
