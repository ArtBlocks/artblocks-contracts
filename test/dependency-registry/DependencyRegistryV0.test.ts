import { expectRevert, constants } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  AdminACLV0,
  AdminACLV0__factory,
  DependencyRegistryV0,
  GenArt721CoreV1,
  GenArt721CoreV3,
} from "../../scripts/contracts";

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../util/common";

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
  adminACL: AdminACLV0;
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
      "DependencyRegistryV0"
    );
    await this.dependencyRegistry
      .connect(this.accounts.deployer)
      .initialize(this.adminACL.address);

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

        const storedDepType =
          await this.dependencyRegistry.getRegisteredDependencyTypeAtIndex(0);
        expect(storedDepType).to.eq(dependencyType);

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
    describe("update", function () {
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
      describe("updateDependencyTypePreferredCDN", function () {
        it("does not allow non-admins to update preferred cdn", async function (this: DependencyRegistryV0TestContext) {
          await expectRevert(
            this.dependencyRegistry
              .connect(this.accounts.user)
              .updateDependencyTypePreferredCDN(
                dependencyTypeBytes,
                "https://cdn.com"
              ),
            ONLY_ADMIN_ACL_ERROR
          );
        });
        it("does not allow updating preferred cdn for a dependency type that does not exist", async function (this: DependencyRegistryV0TestContext) {
          await expectRevert(
            this.dependencyRegistry
              .connect(this.accounts.deployer)
              .updateDependencyTypePreferredCDN(
                ethers.utils.formatBytes32String("nonExistentDependencyType"),
                "https://cdn.com"
              ),
            ONLY_EXISTING_DEPENDENCY_TYPE_ERROR
          );
        });
        it("allows admin to update preferred cdn", async function (this: DependencyRegistryV0TestContext) {
          await this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addDependencyTypeAdditionalCDN(
              dependencyTypeBytes,
              "https://cdn.com"
            );

          await expect(
            this.dependencyRegistry
              .connect(this.accounts.deployer)
              .updateDependencyTypePreferredCDN(
                dependencyTypeBytes,
                "https://cdn2.com"
              )
          )
            .to.emit(
              this.dependencyRegistry,
              "DependencyTypePreferredCDNUpdated"
            )
            .withArgs(dependencyTypeBytes, "https://cdn2.com");

          const dependencyTypeDetails =
            await this.dependencyRegistry.getDependencyTypeDetails(
              dependencyTypeBytes
            );

          expect(dependencyTypeDetails.preferredCDN).to.eq("https://cdn2.com");
        });
      });
      describe("updateDependencyTypePreferredRepository", function () {
        it("does not allow non-admins to update preferred repository", async function (this: DependencyRegistryV0TestContext) {
          await expectRevert(
            this.dependencyRegistry
              .connect(this.accounts.user)
              .updateDependencyTypePreferredRepository(
                dependencyTypeBytes,
                "https://github.com"
              ),
            ONLY_ADMIN_ACL_ERROR
          );
        });
        it("does not allow updating preferred repository for a dependency type that does not exist", async function (this: DependencyRegistryV0TestContext) {
          await expectRevert(
            this.dependencyRegistry
              .connect(this.accounts.deployer)
              .updateDependencyTypePreferredRepository(
                ethers.utils.formatBytes32String("nonExistentDependencyType"),
                "https://github.com"
              ),
            ONLY_EXISTING_DEPENDENCY_TYPE_ERROR
          );
        });
        it("allows admin to update preferred repository", async function (this: DependencyRegistryV0TestContext) {
          await expect(
            this.dependencyRegistry
              .connect(this.accounts.deployer)
              .updateDependencyTypePreferredRepository(
                dependencyTypeBytes,
                "https://github.com"
              )
          )
            .to.emit(
              this.dependencyRegistry,
              "DependencyTypePreferredRepositoryUpdated"
            )
            .withArgs(dependencyTypeBytes, "https://github.com");

          const dependencyTypeDetails =
            await this.dependencyRegistry.getDependencyTypeDetails(
              dependencyTypeBytes
            );

          expect(dependencyTypeDetails.preferredRepository).to.eq(
            "https://github.com"
          );
        });
      });
      describe("updateDependencyTypeReferenceWebsite", function () {
        it("does not allow non-admins to update reference website", async function (this: DependencyRegistryV0TestContext) {
          await expectRevert(
            this.dependencyRegistry
              .connect(this.accounts.user)
              .updateDependencyTypeReferenceWebsite(
                dependencyTypeBytes,
                "https://reference.com"
              ),
            ONLY_ADMIN_ACL_ERROR
          );
        });
        it("does not allow updating reference website for a dependency type that does not exist", async function (this: DependencyRegistryV0TestContext) {
          await expectRevert(
            this.dependencyRegistry
              .connect(this.accounts.deployer)
              .updateDependencyTypeReferenceWebsite(
                ethers.utils.formatBytes32String("nonExistentDependencyType"),
                "https://reference.com"
              ),
            ONLY_EXISTING_DEPENDENCY_TYPE_ERROR
          );
        });
        it("allows admin to update reference website", async function (this: DependencyRegistryV0TestContext) {
          await expect(
            this.dependencyRegistry
              .connect(this.accounts.deployer)
              .updateDependencyTypeReferenceWebsite(
                dependencyTypeBytes,
                "https://reference.com"
              )
          )
            .to.emit(
              this.dependencyRegistry,
              "DependencyTypeReferenceWebsiteUpdated"
            )
            .withArgs(dependencyTypeBytes, "https://reference.com");

          const dependencyTypeDetails =
            await this.dependencyRegistry.getDependencyTypeDetails(
              dependencyTypeBytes
            );

          expect(dependencyTypeDetails.referenceWebsite).to.eq(
            "https://reference.com"
          );
        });
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
    describe("views", function () {
      it("getDependencyTypeDetails", async function (this: DependencyRegistryV0TestContext) {
        const script = "on-chain script";

        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addDependencyTypeScript(dependencyTypeBytes, script);

        const dependencyTypeDetails =
          await this.dependencyRegistry.getDependencyTypeDetails(
            dependencyTypeBytes
          );

        expect(dependencyTypeDetails.scriptCount).to.eq(1);
        expect(dependencyTypeDetails.availableOnChain).to.eq(true);
      });

      it("getDependencyTypeScriptAtIndex", async function (this: DependencyRegistryV0TestContext) {
        const script = "on-chain script";

        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addDependencyTypeScript(dependencyTypeBytes, script);

        const storedScript =
          await this.dependencyRegistry.getDependencyTypeScriptAtIndex(
            dependencyTypeBytes,
            0
          );
        expect(storedScript).to.eq(script);
      });

      it("getDependencyTypeScriptBytecodeAddressAtIndex", async function (this: DependencyRegistryV0TestContext) {
        const script = "on-chain script";

        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addDependencyTypeScript(dependencyTypeBytes, script);

        const storedScriptByteCodeAddress =
          await this.dependencyRegistry.getDependencyTypeScriptBytecodeAddressAtIndex(
            dependencyTypeBytes,
            0
          );

        const scriptBytecode = await ethers.provider.getCode(
          storedScriptByteCodeAddress
        );
        expect(scriptBytecode).to.contain(
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes(script)).substring(2)
        );
      });
    });
  });
  describe("dependency type additional cdns", function () {
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

    describe("addDependencyTypeAdditionalCDN", function () {
      it("does not allow non-admins to add a cdn", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.user)
            .addDependencyTypeAdditionalCDN(
              dependencyTypeBytes,
              "https://cdn.com"
            ),
          ONLY_ADMIN_ACL_ERROR
        );
      });

      it("does not allow adding a cdn for a dependency type that does not exist", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addDependencyTypeAdditionalCDN(
              ethers.utils.formatBytes32String("nonExistentDependencyType"),
              "https://cdn.com"
            ),
          ONLY_EXISTING_DEPENDENCY_TYPE_ERROR
        );
      });

      it("does not allow adding an empty string as a cdn", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addDependencyTypeAdditionalCDN(dependencyTypeBytes, ""),
          ONLY_NON_EMPTY_STRING_ERROR
        );
      });

      it("allows admin to add a cdn", async function (this: DependencyRegistryV0TestContext) {
        await expect(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addDependencyTypeAdditionalCDN(
              dependencyTypeBytes,
              "https://cdn.com"
            )
        )
          .to.emit(
            this.dependencyRegistry,
            "DependencyTypeAdditionalCDNUpdated"
          )
          .withArgs(dependencyTypeBytes, "https://cdn.com", 0);

        const dependencyTypeDetails =
          await this.dependencyRegistry.getDependencyTypeDetails(
            dependencyTypeBytes
          );

        expect(dependencyTypeDetails.additionalCDNCount).to.eq(1);

        const storedCDN =
          await this.dependencyRegistry.getDependencyTypeAdditionalCDNAtIndex(
            dependencyTypeBytes,
            0
          );
        expect(storedCDN).to.eq("https://cdn.com");
      });
    });
    describe("removeDependencyTypeAdditionalCDNAtIndex", function () {
      it("does not allow non-admins to remove a cdn", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.user)
            .removeDependencyTypeAdditionalCDNAtIndex(dependencyTypeBytes, 0),
          ONLY_ADMIN_ACL_ERROR
        );
      });

      it("does not allow removing a cdn for a dependency type that does not exist", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .removeDependencyTypeAdditionalCDNAtIndex(
              ethers.utils.formatBytes32String("nonExistentDependencyType"),
              0
            ),
          ONLY_EXISTING_DEPENDENCY_TYPE_ERROR
        );
      });

      it("does not allow removing a cdn with out of range index", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .removeDependencyTypeAdditionalCDNAtIndex(dependencyTypeBytes, 0),
          "Asset index out of range"
        );
      });

      it("allows admin to remove a cdn", async function (this: DependencyRegistryV0TestContext) {
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addDependencyTypeAdditionalCDN(
            dependencyTypeBytes,
            "https://cdn.com"
          );

        await expect(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .removeDependencyTypeAdditionalCDNAtIndex(dependencyTypeBytes, 0)
        )
          .to.emit(
            this.dependencyRegistry,
            "DependencyTypeAdditionalCDNRemoved"
          )
          .withArgs(dependencyTypeBytes, 0);

        const dependencyTypeDetails =
          await this.dependencyRegistry.getDependencyTypeDetails(
            dependencyTypeBytes
          );

        expect(dependencyTypeDetails.additionalCDNCount).to.eq(0);
      });
    });

    describe("updateDependencyTypeAdditionalCDNAtIndex", function () {
      it("does not allow non-admins to update a cdn", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.user)
            .updateDependencyTypeAdditionalCDNAtIndex(
              dependencyTypeBytes,
              0,
              "https://cdn.com"
            ),
          ONLY_ADMIN_ACL_ERROR
        );
      });
      it("does not allow updating a cdn for a dependency type that does not exist", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .updateDependencyTypeAdditionalCDNAtIndex(
              ethers.utils.formatBytes32String("nonExistentDependencyType"),
              0,
              "https://cdn.com"
            ),
          ONLY_EXISTING_DEPENDENCY_TYPE_ERROR
        );
      });
      it("does not allow updating a cdn with out of range index", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .updateDependencyTypeAdditionalCDNAtIndex(
              dependencyTypeBytes,
              0,
              "https://cdn.com"
            ),
          "Asset index out of range"
        );
      });
      it("does not allow updating a cdn with empty string", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .updateDependencyTypeAdditionalCDNAtIndex(
              dependencyTypeBytes,
              0,
              ""
            ),
          ONLY_NON_EMPTY_STRING_ERROR
        );
      });
      it("allows admin to update a cdn", async function (this: DependencyRegistryV0TestContext) {
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addDependencyTypeAdditionalCDN(
            dependencyTypeBytes,
            "https://cdn.com"
          );

        await expect(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .updateDependencyTypeAdditionalCDNAtIndex(
              dependencyTypeBytes,
              0,
              "https://cdn2.com"
            )
        )
          .to.emit(
            this.dependencyRegistry,
            "DependencyTypeAdditionalCDNUpdated"
          )
          .withArgs(dependencyTypeBytes, "https://cdn2.com", 0);

        const dependencyTypeDetails =
          await this.dependencyRegistry.getDependencyTypeDetails(
            dependencyTypeBytes
          );

        expect(dependencyTypeDetails.additionalCDNCount).to.eq(1);

        const storedCDN =
          await this.dependencyRegistry.getDependencyTypeAdditionalCDNAtIndex(
            dependencyTypeBytes,
            0
          );
        expect(storedCDN).to.eq("https://cdn2.com");
      });
    });
    describe("views", function () {
      it("getDependencyTypeDetails", async function (this: DependencyRegistryV0TestContext) {
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addDependencyTypeAdditionalCDN(
            dependencyTypeBytes,
            "https://cdn.com"
          );

        const dependencyTypeDetails =
          await this.dependencyRegistry.getDependencyTypeDetails(
            dependencyTypeBytes
          );

        expect(dependencyTypeDetails.additionalCDNCount).to.eq(1);
      });

      it("getDependencyTypeAdditionalCDNAtIndex", async function (this: DependencyRegistryV0TestContext) {
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addDependencyTypeAdditionalCDN(
            dependencyTypeBytes,
            "https://cdn.com"
          );

        const storedCDN =
          await this.dependencyRegistry.getDependencyTypeAdditionalCDNAtIndex(
            dependencyTypeBytes,
            0
          );
        expect(storedCDN).to.eq("https://cdn.com");
      });
    });
  });
  describe("dependency type repositories", function () {
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

    describe("addDependencyTypeAdditionalRepository", function () {
      it("does not allow non-admins to add additional repository", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.user)
            .addDependencyTypeAdditionalRepository(
              dependencyTypeBytes,
              "https://github.com"
            ),
          ONLY_ADMIN_ACL_ERROR
        );
      });
      it("does not allow adding additional repository for a dependency type that does not exist", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addDependencyTypeAdditionalRepository(
              ethers.utils.formatBytes32String("nonExistentDependencyType"),
              "https://github.com"
            ),
          ONLY_EXISTING_DEPENDENCY_TYPE_ERROR
        );
      });
      it("does not allow adding empty string as additional repository", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addDependencyTypeAdditionalRepository(dependencyTypeBytes, ""),
          ONLY_NON_EMPTY_STRING_ERROR
        );
      });
      it("allows admin to add additional repository", async function (this: DependencyRegistryV0TestContext) {
        await expect(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addDependencyTypeAdditionalRepository(
              dependencyTypeBytes,
              "https://github.com"
            )
        )
          .to.emit(
            this.dependencyRegistry,
            "DependencyTypeAdditionalRepositoryUpdated"
          )
          .withArgs(dependencyTypeBytes, "https://github.com", 0);

        const dependencyTypeDetails =
          await this.dependencyRegistry.getDependencyTypeDetails(
            dependencyTypeBytes
          );

        expect(dependencyTypeDetails.additionalRepositoryCount).to.eq(1);

        const storedRepository =
          await this.dependencyRegistry.getDependencyTypeAdditionalRepositoryAtIndex(
            dependencyTypeBytes,
            0
          );
        expect(storedRepository).to.eq("https://github.com");
      });
    });
    describe("removeDependencyTypeAdditionalRepositoryAtIndex", function () {
      it("does not allow non-admins to remove additional repository", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.user)
            .removeDependencyTypeAdditionalRepositoryAtIndex(
              dependencyTypeBytes,
              0
            ),
          ONLY_ADMIN_ACL_ERROR
        );
      });
      it("does not allow removing additional repository for a dependency type that does not exist", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .removeDependencyTypeAdditionalRepositoryAtIndex(
              ethers.utils.formatBytes32String("nonExistentDependencyType"),
              0
            ),
          ONLY_EXISTING_DEPENDENCY_TYPE_ERROR
        );
      });
      it("does not allow removing additional repository at index that does not exist", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .removeDependencyTypeAdditionalRepositoryAtIndex(
              dependencyTypeBytes,
              1
            ),
          "Asset index out of range"
        );
      });
      it("allows admin to remove additional repository", async function (this: DependencyRegistryV0TestContext) {
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addDependencyTypeAdditionalRepository(
            dependencyTypeBytes,
            "https://github.com"
          );

        await expect(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .removeDependencyTypeAdditionalRepositoryAtIndex(
              dependencyTypeBytes,
              0
            )
        )
          .to.emit(
            this.dependencyRegistry,
            "DependencyTypeAdditionalRepositoryRemoved"
          )
          .withArgs(dependencyTypeBytes, 0);

        const dependencyTypeDetails =
          await this.dependencyRegistry.getDependencyTypeDetails(
            dependencyTypeBytes
          );

        expect(dependencyTypeDetails.additionalRepositoryCount).to.eq(0);

        const storedRepository =
          await this.dependencyRegistry.getDependencyTypeAdditionalRepositoryAtIndex(
            dependencyTypeBytes,
            0
          );
        expect(storedRepository).to.eq("");
      });
    });
    describe("updateDependencyTypeAdditionalRepositoryAtIndex", function () {
      it("does not allow non-admins to update additional repository", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.user)
            .updateDependencyTypeAdditionalRepositoryAtIndex(
              dependencyTypeBytes,
              0,
              "https://github.com"
            ),
          ONLY_ADMIN_ACL_ERROR
        );
      });
      it("does not allow updating additional repository for a dependency type that does not exist", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .updateDependencyTypeAdditionalRepositoryAtIndex(
              ethers.utils.formatBytes32String("nonExistentDependencyType"),
              0,
              "https://github.com"
            ),
          ONLY_EXISTING_DEPENDENCY_TYPE_ERROR
        );
      });
      it("does not allow updating additional repository at index that does not exist", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .updateDependencyTypeAdditionalRepositoryAtIndex(
              dependencyTypeBytes,
              1,
              "https://github.com"
            ),
          "Asset index out of range"
        );
      });
      it("does not allow updating additional repository to empty string", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .updateDependencyTypeAdditionalRepositoryAtIndex(
              dependencyTypeBytes,
              0,
              ""
            ),
          ONLY_NON_EMPTY_STRING_ERROR
        );
      });
      it("allows admin to update additional repository", async function (this: DependencyRegistryV0TestContext) {
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addDependencyTypeAdditionalRepository(
            dependencyTypeBytes,
            "https://github.com"
          );

        await expect(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .updateDependencyTypeAdditionalRepositoryAtIndex(
              dependencyTypeBytes,
              0,
              "https://bitbucket.com"
            )
        )
          .to.emit(
            this.dependencyRegistry,
            "DependencyTypeAdditionalRepositoryUpdated"
          )
          .withArgs(dependencyTypeBytes, "https://bitbucket.com", 0);

        const storedRepository =
          await this.dependencyRegistry.getDependencyTypeAdditionalRepositoryAtIndex(
            dependencyTypeBytes,
            0
          );
        expect(storedRepository).to.eq("https://bitbucket.com");
      });
    });

    describe("views", function () {
      it("getDependencyTypeDetails", async function (this: DependencyRegistryV0TestContext) {
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addDependencyTypeAdditionalRepository(
            dependencyTypeBytes,
            "https://github.com"
          );

        const dependencyTypeDetails =
          await this.dependencyRegistry.getDependencyTypeDetails(
            dependencyTypeBytes
          );

        expect(dependencyTypeDetails.additionalRepositoryCount).to.eq(1);
      });
      it("getDependencyTypeAdditionalRepositoryAtIndex", async function (this: DependencyRegistryV0TestContext) {
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addDependencyTypeAdditionalRepository(
            dependencyTypeBytes,
            "https://github.com"
          );

        const storedRepository =
          await this.dependencyRegistry.getDependencyTypeAdditionalRepositoryAtIndex(
            dependencyTypeBytes,
            0
          );
        expect(storedRepository).to.eq("https://github.com");
      });
    });
  });
  describe("project dependency override", function () {
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
    describe("addSupportedCoreContract", function () {
      it("does not allow non-admins to add supported core contract", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.user)
            .addSupportedCoreContract(this.genArt721Core.address),
          ONLY_ADMIN_ACL_ERROR
        );
      });
      it("does not allow adding supported core contract that already exists", async function (this: DependencyRegistryV0TestContext) {
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addSupportedCoreContract(this.genArt721Core.address);

        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addSupportedCoreContract(this.genArt721Core.address),
          "Contract already supported"
        );
      });
      it("does not allow the zero addresss", function (this: DependencyRegistryV0TestContext) {
        expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addSupportedCoreContract(ethers.constants.AddressZero),
          "Must input non-zero address"
        );
      });
      it("allows admin to add supported core contract", async function (this: DependencyRegistryV0TestContext) {
        await expect(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addSupportedCoreContract(this.genArt721Core.address)
        )
          .to.emit(this.dependencyRegistry, "SupportedCoreContractAdded")
          .withArgs(this.genArt721Core.address);

        const supportedCoreContractCount =
          await this.dependencyRegistry.getSupportedCoreContractCount();
        expect(supportedCoreContractCount).to.eq(1);

        const storedCoreContract =
          await this.dependencyRegistry.getSupportedCoreContractAtIndex(0);
        expect(storedCoreContract).to.eq(this.genArt721Core.address);

        const supportedCoreContracts =
          await this.dependencyRegistry.getSupportedCoreContracts();
        expect(supportedCoreContracts).to.deep.eq([this.genArt721Core.address]);
      });
    });
    describe("removeSupportedCoreContract", function () {
      it("does not allow non-admins to remove supported core contract", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.user)
            .removeSupportedCoreContract(this.genArt721Core.address),
          ONLY_ADMIN_ACL_ERROR
        );
      });
      it("does not allow removing supported core contract that does not exist", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .removeSupportedCoreContract(this.genArt721Core.address),
          "Core contract not supported"
        );
      });
      it("allows admin to remove supported core contract", async function (this: DependencyRegistryV0TestContext) {
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addSupportedCoreContract(this.genArt721Core.address);

        await expect(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .removeSupportedCoreContract(this.genArt721Core.address)
        )
          .to.emit(this.dependencyRegistry, "SupportedCoreContractRemoved")
          .withArgs(this.genArt721Core.address);

        const supportedCoreContractCount =
          await this.dependencyRegistry.getSupportedCoreContractCount();
        expect(supportedCoreContractCount).to.eq(0);

        await expectRevert(
          this.dependencyRegistry.getSupportedCoreContractAtIndex(0),
          "Index out of bounds"
        );

        const supportedCoreContracts =
          await this.dependencyRegistry.getSupportedCoreContracts();
        expect(supportedCoreContracts).to.deep.eq([]);
      });
    });
    describe("addProjectDependencyOverride", function () {
      it("does not allow non-admins to add project dependency override", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.user)
            .addProjectDependencyOverride(
              this.genArt721Core.address,
              0,
              dependencyTypeBytes
            ),
          ONLY_ADMIN_ACL_ERROR
        );
      });
      it("does not allow adding override that is not a registered dependency", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addProjectDependencyOverride(
              this.genArt721Core.address,
              0,
              ethers.utils.formatBytes32String("not@registered")
            ),
          "Dependency type does not exist"
        );
      });
      it("does not allow adding override for a project that is not on a supported core contract", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addProjectDependencyOverride(
              this.genArt721Core.address,
              0,
              dependencyTypeBytes
            ),
          "Core contract not supported"
        );
      });
      it("allows admin to add project dependency override", async function (this: DependencyRegistryV0TestContext) {
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addSupportedCoreContract(this.genArt721Core.address);

        await expect(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .addProjectDependencyOverride(
              this.genArt721Core.address,
              0,
              dependencyTypeBytes
            )
        )
          .to.emit(this.dependencyRegistry, "ProjectDependencyOverrideAdded")
          .withArgs(this.genArt721Core.address, 0, dependencyTypeBytes);

        const storedDependencyType =
          await this.dependencyRegistry.getDependencyTypeForProject(
            this.genArt721Core.address,
            0
          );
        expect(storedDependencyType).to.eq(dependencyType);
      });
    });
    describe("removeProjectDependencyOverride", function () {
      it("does not allow non-admins to remove project dependency override", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.user)
            .removeProjectDependencyOverride(this.genArt721Core.address, 0),
          ONLY_ADMIN_ACL_ERROR
        );
      });
      it("reverts if override does not exist", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .removeProjectDependencyOverride(this.genArt721Core.address, 0),
          "No override set for project"
        );
      });
      it("allows admin to remove project dependency override", async function (this: DependencyRegistryV0TestContext) {
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addSupportedCoreContract(this.genArt721Core.address);

        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addProjectDependencyOverride(
            this.genArt721Core.address,
            0,
            dependencyTypeBytes
          );

        await expect(
          this.dependencyRegistry
            .connect(this.accounts.deployer)
            .removeProjectDependencyOverride(this.genArt721Core.address, 0)
        )
          .to.emit(this.dependencyRegistry, "ProjectDependencyOverrideRemoved")
          .withArgs(this.genArt721Core.address, 0);

        const storedDependencyType =
          await this.dependencyRegistry.getDependencyTypeForProject(
            this.genArt721Core.address,
            0
          );
        expect(storedDependencyType).to.eq("");
      });
    });
    describe("getDependencyTypeForProject", function () {
      it("reverts if core contract is not supported", async function (this: DependencyRegistryV0TestContext) {
        await expectRevert(
          this.dependencyRegistry.getDependencyTypeForProject(
            this.genArt721Core.address,
            0
          ),
          "Core contract not supported"
        );
      });

      it("reverts if no override and contract does not support projectScriptDetails", async function (this: DependencyRegistryV0TestContext) {
        const {
          genArt721Core: genArt721CoreV1,
        }: { genArt721Core: GenArt721CoreV1 } =
          await deployCoreWithMinterFilter.call(
            this,
            "GenArt721CoreV1",
            "MinterFilterV0"
          );

        await genArt721CoreV1.addProject(
          "v1 project",
          this.accounts.artist.address,
          ethers.utils.parseEther("0.1"),
          true
        );

        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addSupportedCoreContract(genArt721CoreV1.address);

        await expectRevert(
          this.dependencyRegistry.getDependencyTypeForProject(
            genArt721CoreV1.address,
            0
          ),
          "Contract does not implement projectScriptDetails and has no override set."
        );
      });

      it("returns the overridden value if present", async function (this: DependencyRegistryV0TestContext) {
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addSupportedCoreContract(this.genArt721Core.address);

        const coreDepType = "core@0";
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProjectScriptType(
            0,
            ethers.utils.formatBytes32String(coreDepType)
          );

        const override = dependencyType;
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addProjectDependencyOverride(
            this.genArt721Core.address,
            0,
            ethers.utils.formatBytes32String(override)
          );

        const regDepType =
          await this.dependencyRegistry.getDependencyTypeForProject(
            this.genArt721Core.address,
            0
          );

        expect(regDepType).to.eq(override);
      });

      it("returns the dependency type from the core contract if no override is set", async function (this: DependencyRegistryV0TestContext) {
        await this.dependencyRegistry
          .connect(this.accounts.deployer)
          .addSupportedCoreContract(this.genArt721Core.address);

        const coreDepType = "core@0";
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProjectScriptType(
            0,
            ethers.utils.formatBytes32String(coreDepType)
          );

        const regDepType =
          await this.dependencyRegistry.getDependencyTypeForProject(
            this.genArt721Core.address,
            0
          );

        expect(regDepType).to.eq(coreDepType);
      });
    });
  });
  describe("adminACLContract", function () {
    it("returns expected adminACLContract address", async function (this: DependencyRegistryV0TestContext) {
      expect(await this.genArt721Core.adminACLContract()).to.be.equal(
        this.adminACL.address
      );
    });

    it("behaves as expected when transferring ownership", async function (this: DependencyRegistryV0TestContext) {
      // deploy new ACL with user as superAdmin
      const userAdminACLFactory = new AdminACLV0__factory(this.accounts.user);
      const userAdminACL = await userAdminACLFactory.deploy();

      // update owner of core to new userAdminACL, expect OwnershipTransferred event
      await expect(
        this.adminACL
          .connect(this.accounts.deployer)
          .transferOwnershipOn(
            this.dependencyRegistry.address,
            userAdminACL.address
          )
      )
        .to.emit(this.dependencyRegistry, "OwnershipTransferred")
        .withArgs(this.adminACL.address, userAdminACL.address);
      // ensure owner + public adminACLContract has been updated
      expect(await this.dependencyRegistry.owner()).to.be.equal(
        userAdminACL.address
      );
      expect(await this.dependencyRegistry.adminACLContract()).to.be.equal(
        userAdminACL.address
      );
      // ensure new userAdminACL may update project
      await this.dependencyRegistry
        .connect(this.accounts.user)
        .addDependencyType(
          ethers.utils.formatBytes32String("three@0.0.24"),
          "preferredCDN",
          "preferredRepository",
          "referenceWebsite"
        );
    });

    it("behaves as expected when renouncing ownership", async function (this: DependencyRegistryV0TestContext) {
      // update owner of core to null address, expect OwnershipTransferred event
      await expect(
        await this.adminACL
          .connect(this.accounts.deployer)
          .renounceOwnershipOn(this.dependencyRegistry.address)
      )
        .to.emit(this.dependencyRegistry, "OwnershipTransferred")
        .withArgs(this.adminACL.address, constants.ZERO_ADDRESS);

      // ensure owner + public adminACLContract has been updated
      expect(await this.dependencyRegistry.owner()).to.be.equal(
        constants.ZERO_ADDRESS
      );
      expect(await this.dependencyRegistry.adminACLContract()).to.be.equal(
        constants.ZERO_ADDRESS
      );
      // ensure prior adminACL may not perform an admin function
      await expectRevert(
        // ensure new userAdminACL may update project
        this.dependencyRegistry
          .connect(this.accounts.user)
          .addDependencyType(
            ethers.utils.formatBytes32String("three@0.0.24"),
            "preferredCDN",
            "preferredRepository",
            "referenceWebsite"
          ),
        "Only Admin ACL allowed"
      );
    });
  });
});
