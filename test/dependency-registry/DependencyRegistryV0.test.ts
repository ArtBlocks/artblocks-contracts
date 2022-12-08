import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { DependencyRegistryV0, GenArt721CoreV3 } from "../../scripts/contracts";

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  mintProjectUntilRemaining,
  advanceEVMByTime,
} from "../util/common";
import { FOUR_WEEKS } from "../util/constants";
import {
  SQUIGGLE_SCRIPT,
  SKULPTUUR_SCRIPT_APPROX,
  CONTRACT_SIZE_LIMIT_SCRIPT,
  GREATER_THAN_CONTRACT_SIZE_LIMIT_SCRIPT,
  MULTI_BYTE_UTF_EIGHT_SCRIPT,
} from "../util/example-scripts";

const ONLY_ADMIN_ACL_ERROR = "Only Admin ACL allowed";
const ONLY_EXISTING_DEPENDENCY_TYPE_ERROR = "Dependency type does not exist";
const ONLY_NON_EMPTY_STRING_ERROR = "Must input non-empty string";

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  "GenArt721CoreV3_Explorations", // V3 core explorations contract
];

interface DependencyRegistryV0TestContext extends Mocha.Context {
  dependencyRegistry: DependencyRegistryV0;
  genArt721Core: GenArt721CoreV3;
}

/**
 * Tests for V3 core dealing with configuring projects.
 */
describe(`DependencyRegistryV0`, async function () {
  const dependencyType = "p5js@1.0.0";
  const dependencyTypeBytes = ethers.utils.formatBytes32String(dependencyType);
  const preferredCDN =
    "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.0.0/p5.min.js";
  const preferredRepository = "https://github.com/processing/p5.js";
  const referenceWebsite = "https://p5js.org/";

  beforeEach(async function (this: DependencyRegistryV0TestContext) {
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

    this.dependencyRegistry = await deployAndGet.call(
      this,
      "DependencyRegistryV0",
      [this.adminACL.address]
    );

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

  describe("registered dependency types", function () {
    describe("addDependencyType", function () {
      it("does not allow non-admins to add a dependency type", async function (this: DependencyRegistryV0TestContext) {
        // deployer cannot update
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.artist)
            .addDependencyType(
              ethers.utils.formatBytes32String("p5js@1.0.0"),
              preferredCDN,
              preferredRepository,
              referenceWebsite
            ),
          "Only Admin ACL allowed"
        );
      });

      it("does not allow a dependency type to be added without exactly one @ symbol", async function (this: DependencyRegistryV0TestContext) {
        // deployer cannot update
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addDependencyType(
              ethers.utils.formatBytes32String("p5js"),
              preferredCDN,
              preferredRepository,
              referenceWebsite
            ),
          "must contain exactly one @"
        );
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addDependencyType(
              ethers.utils.formatBytes32String("p5@js@1.0.0"),
              preferredCDN,
              preferredRepository,
              referenceWebsite
            ),
          "must contain exactly one @"
        );
      });

      it("allows admin to add a dependency type", async function (this: DependencyRegistryV0TestContext) {
        // admin can update
        await expect(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addDependencyType(
              dependencyTypeBytes,
              preferredCDN,
              preferredRepository,
              referenceWebsite
            )
        )
          .to.emit(this.dependencyRegistry, "DependencyTypeAdded")
          .withArgs(
            dependencyTypeBytes,
            preferredCDN,
            preferredRepository,
            referenceWebsite
          );

        const registeredDependencyCount =
          await this.dependencyRegistry.getRegisteredDependencyTypeCount();
        expect(registeredDependencyCount).to.eq(1);

        const dependencyTypes =
          await this.dependencyRegistry.getRegisteredDependencyTypes();
        expect(dependencyTypes).to.deep.eq([dependencyType]);

        const dependencyTypeDetails =
          await this.dependencyRegistry.getDependencyTypeDetails(
            dependencyTypeBytes
          );
        expect(dependencyTypeDetails).to.deep.eq([
          dependencyType, // type@version
          preferredCDN, // preferredCDN
          0, // aadditionalCDNCount
          preferredRepository, // preferredRepository
          0, // additionalRepositoryCount
          referenceWebsite, // referenceWebsite
          false, // availableOnChain
          0, // scriptCount
        ]);
      });
    });

    describe("removeDependencyType", function () {
      it("does not allow non-admins to remove a dependency type", async function (this: DependencyRegistryV0TestContext) {
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addDependencyType(
            dependencyTypeBytes,
            preferredCDN,
            preferredRepository,
            referenceWebsite
          );

        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.user)
            .removeDependencyType(dependencyTypeBytes),
          ONLY_ADMIN_ACL_ERROR
        );
      });

      it("does not allow removal of a dependency type that does not exist", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .removeDependencyType(
              ethers.utils.formatBytes32String(dependencyType)
            ),
          ONLY_EXISTING_DEPENDENCY_TYPE_ERROR
        );
      });

      it("does not allow removal of a dependency type with additional CDNs, repositories, or scripts", async function (this: DependencyRegistryV0TestContext) {
        const noAssociatedDataError =
          "Cannot remove dependency type with additional CDNs, repositories, or scripts";

        // Add dependency type
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addDependencyType(
            dependencyTypeBytes,
            preferredCDN,
            preferredRepository,
            referenceWebsite
          );

        // Cannot remove with additional CDNs
        await this.dependencyRegistry.addDependencyTypeAdditionalCDN(
          dependencyTypeBytes,
          "https://additionalCDN.com"
        );

        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .removeDependencyType(dependencyTypeBytes),
          noAssociatedDataError
        );

        // Remove additional CDNs
        await this.dependencyRegistry.removeDependencyTypeAdditionalCDNAtIndex(
          dependencyTypeBytes,
          0
        );

        // Cannot remove with additional repositories
        await this.dependencyRegistry.addDependencyTypeAdditionalRepository(
          dependencyTypeBytes,
          "https://additionalRepository.com"
        );

        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .removeDependencyType(dependencyTypeBytes),
          noAssociatedDataError
        );

        // Remove additional repositories
        await this.dependencyRegistry.removeDependencyTypeAdditionalRepositoryAtIndex(
          dependencyTypeBytes,
          0
        );

        // Cannot remove with scripts
        await this.dependencyRegistry.addDependencyTypeScript(
          dependencyTypeBytes,
          "on-chain script"
        );

        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .removeDependencyType(dependencyTypeBytes),
          noAssociatedDataError
        );

        // Remove scripts
        await this.dependencyRegistry.removeDependencyTypeLastScript(
          dependencyTypeBytes
        );

        await this.dependencyRegistry.removeDependencyType(dependencyTypeBytes);
      });

      it("allows admin to remove a dependency type", async function (this: DependencyRegistryV0TestContext) {
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addDependencyType(
            dependencyTypeBytes,
            preferredCDN,
            preferredRepository,
            referenceWebsite
          );

        await expect(
          this.dependencyRegistry.removeDependencyType(dependencyTypeBytes)
        )
          .to.emit(this.dependencyRegistry, "DependencyTypeRemoved")
          .withArgs(dependencyTypeBytes);

        const registeredDependencyCount =
          await this.dependencyRegistry.getRegisteredDependencyTypeCount();
        expect(registeredDependencyCount).to.eq(0);

        const dependencyTypes =
          await this.dependencyRegistry.getRegisteredDependencyTypes();
        expect(dependencyTypes).to.deep.eq([]);
      });
    });
  });
  describe("dependency type scripts", function () {
    beforeEach(async function (this: DependencyRegistryV0TestContext) {
      await this.dependencyRegistry
        .connect(this.accounts.deployer)
        .addDependencyType(
          dependencyTypeBytes,
          preferredCDN,
          preferredRepository,
          referenceWebsite
        );
    });
    describe("addDependencyTypeScript", function () {
      it("does not allow non-admins to add a script", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.user)
            .addDependencyTypeScript(dependencyTypeBytes, "on-chain script"),
          ONLY_ADMIN_ACL_ERROR
        );
      });

      it("does not allow adding a script to a dependency type that does not exist", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addDependencyTypeScript(
              ethers.utils.formatBytes32String("nonExistentDependencyType"),
              "on-chain script"
            ),
          ONLY_EXISTING_DEPENDENCY_TYPE_ERROR
        );
      });

      it("does not allow adding an empty string as a script", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addDependencyTypeScript(dependencyTypeBytes, ""),
          ONLY_NON_EMPTY_STRING_ERROR
        );
      });

      it("allows admin to add a script", async function (this: DependencyRegistryV0TestContext) {
        const script = "on-chain script";
        await expect(
          this.dependencyRegistry.addDependencyTypeScript(
            dependencyTypeBytes,
            script
          )
        )
          .to.emit(this.dependencyRegistry, "DependencyTypeScriptUpdated")
          .withArgs(dependencyTypeBytes);

        const dependencyTypeDetails =
          await this.dependencyRegistry.getDependencyTypeDetails(
            dependencyTypeBytes
          );

        expect(dependencyTypeDetails.scriptCount).to.eq(1);

        const storedScript =
          await this.dependencyRegistry.getDependencyTypeScriptAtIndex(
            dependencyTypeBytes,
            0
          );
        expect(storedScript).to.eq(script);
      });
    });

    describe("removeDependencyTypeLastScript", function () {
      it("does not allow non-admins to remove a script", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.user)
            .removeDependencyTypeLastScript(dependencyTypeBytes),
          ONLY_ADMIN_ACL_ERROR
        );
      });

      it("does not allow removing a script from a dependency type that does not exist", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .removeDependencyType(
              ethers.utils.formatBytes32String("nonExistentDependencyType")
            ),
          ONLY_EXISTING_DEPENDENCY_TYPE_ERROR
        );
      });

      it("does not allow removing the last script if non-existent", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .removeDependencyTypeLastScript(dependencyTypeBytes),
          "there are no scripts to remove"
        );
      });

      it("allows admin to remove last script", async function (this: DependencyRegistryV0TestContext) {
        const script = "on-chain script";

        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addDependencyTypeScript(dependencyTypeBytes, script);

        await expect(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .removeDependencyTypeLastScript(dependencyTypeBytes)
        )
          .to.emit(this.dependencyRegistry, "DependencyTypeScriptUpdated")
          .withArgs(dependencyTypeBytes);

        const dependencyTypeDetails =
          await this.dependencyRegistry.getDependencyTypeDetails(
            dependencyTypeBytes
          );

        expect(dependencyTypeDetails.scriptCount).to.eq(0);

        const storedScript =
          await this.dependencyRegistry.getDependencyTypeScriptAtIndex(
            dependencyTypeBytes,
            0
          );
        expect(storedScript).to.eq("");
      });
    });

    describe("updateDependencyTypeScript", function () {
      it("does not allow non-admins to update a script", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.user)
            .updateDependencyTypeScript(
              dependencyTypeBytes,
              0,
              "on-chain script"
            ),
          ONLY_ADMIN_ACL_ERROR
        );
      });

      it("does not allow updating a script for a dependency type that does not exist", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .updateDependencyTypeScript(
              ethers.utils.formatBytes32String("nonExistentDependencyType"),
              0,
              "on-chain script"
            ),
          ONLY_EXISTING_DEPENDENCY_TYPE_ERROR
        );
      });

      it("does not allow updating a script that does not exist", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .updateDependencyTypeScript(
              dependencyTypeBytes,
              0,
              "on-chain script"
            ),
          "scriptId out of range"
        );
      });

      it("does not allow updating an empty string as a script", async function (this: DependencyRegistryV0TestContext) {
        const script = "on-chain script";

        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addDependencyTypeScript(dependencyTypeBytes, script);

        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .updateDependencyTypeScript(dependencyTypeBytes, 0, ""),
          ONLY_NON_EMPTY_STRING_ERROR
        );
      });

      it("allows admin to update a script", async function (this: DependencyRegistryV0TestContext) {
        const script = "on-chain script";

        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addDependencyTypeScript(dependencyTypeBytes, script);

        const updatedScript = "updated on-chain script";

        await expect(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .updateDependencyTypeScript(dependencyTypeBytes, 0, updatedScript)
        )
          .to.emit(this.dependencyRegistry, "DependencyTypeScriptUpdated")
          .withArgs(dependencyTypeBytes);

        const dependencyTypeDetails =
          await this.dependencyRegistry.getDependencyTypeDetails(
            dependencyTypeBytes
          );

        expect(dependencyTypeDetails.scriptCount).to.eq(1);

        const storedScript =
          await this.dependencyRegistry.getDependencyTypeScriptAtIndex(
            dependencyTypeBytes,
            0
          );
        expect(storedScript).to.eq(updatedScript);
      });
    });
  });
});
