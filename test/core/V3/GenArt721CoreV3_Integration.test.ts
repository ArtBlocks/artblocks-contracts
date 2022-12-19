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
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  mintProjectUntilRemaining,
  advanceEVMByTime,
} from "../../util/common";
import { FOUR_WEEKS } from "../../util/constants";

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  "GenArt721CoreV3_Explorations", // V3 core explorations contract
  "GenArt721CoreV3_Engine", // V3 core Engine contract
];

/**
 * General Integration tests for V3 core.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${coreContractName} Integration`, async function () {
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
        coreContractName,
        "MinterFilterV1"
      ));

      this.minter = await deployAndGet.call(this, "MinterSetPriceV2", [
        this.genArt721Core.address,
        this.minterFilter.address,
      ]);

      // add project
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .addProject("name", this.accounts.artist.address);
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .toggleProjectIsActive(this.projectZero);
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);

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

    describe("{artblocks,provider}PrimarySalesAddress", function () {
      if (coreContractName === "GenArt721CoreV3_Engine") {
        it("returns expected renderProviderPrimarySalesAddress", async function () {
          expect(
            await this.genArt721Core.renderProviderPrimarySalesAddress()
          ).to.be.equal(this.accounts.deployer.address);
        });
        it("returns expected renderProviderPrimarySalesAddress", async function () {
          expect(
            await this.genArt721Core.platformProviderPrimarySalesAddress()
          ).to.be.equal(this.accounts.additional.address);
        });
      } else {
        it("returns expected artblocksPrimarySalesAddress", async function () {
          expect(
            await this.genArt721Core.artblocksPrimarySalesAddress()
          ).to.be.equal(this.accounts.deployer.address);
        });
      }
    });

    describe("artblocksAddress", function () {
      if (coreContractName === "GenArt721CoreV3_Engine") {
        it("always passes, non-relevant", async function () {
          // This test is non-relevant for Engine variant V3 contracts.
          expect(true);
        });
      } else {
        it("returns expected artblocksAddress", async function () {
          expect(await this.genArt721Core.artblocksAddress()).to.be.equal(
            this.accounts.deployer.address
          );
        });
      }
    });

    describe("{artblocks,provider}SecondarySalesAddress", function () {
      if (coreContractName === "GenArt721CoreV3_Engine") {
        it("returns expected renderProviderSecondarySalesAddress", async function () {
          expect(
            await this.genArt721Core.renderProviderSecondarySalesAddress()
          ).to.be.equal(this.accounts.deployer.address);
        });
        it("returns expected renderProviderSecondarySalesAddress", async function () {
          expect(
            await this.genArt721Core.platformProviderSecondarySalesAddress()
          ).to.be.equal(this.accounts.additional.address);
        });
      } else {
        it("returns expected artblocksSecondarySalesAddress", async function () {
          expect(
            await this.genArt721Core.artblocksSecondarySalesAddress()
          ).to.be.equal(this.accounts.deployer.address);
        });
      }
    });

    describe("{artblocks,provider}Percentage", function () {
      if (coreContractName === "GenArt721CoreV3_Engine") {
        it("returns expected renderProviderPrimarySalesPercentage", async function () {
          expect(
            await this.genArt721Core.renderProviderPrimarySalesPercentage()
          ).to.be.equal(10);
        });
        it("returns expected platformProviderPrimarySalesPercentage", async function () {
          expect(
            await this.genArt721Core.platformProviderPrimarySalesPercentage()
          ).to.be.equal(10);
        });
        it("returns expected renderProviderSecondarySalesBPS", async function () {
          expect(
            await this.genArt721Core.renderProviderSecondarySalesBPS()
          ).to.be.equal(250);
        });
        it("returns expected platformProviderSecondarySalesBPS", async function () {
          expect(
            await this.genArt721Core.platformProviderSecondarySalesBPS()
          ).to.be.equal(250);
        });
      } else {
        it("returns expected artblocksPercentage", async function () {
          expect(await this.genArt721Core.artblocksPercentage()).to.be.equal(
            10
          );
        });
      }
    });

    describe("owner", function () {
      it("returns expected owner", async function () {
        if (coreContractName === "GenArt721CoreV3_Engine") {
          // Starting with GenArt721CoreV3_Engine v3.1.0, the backwards-compatible
          // admin that is returned is the underlying admin ACL's superAdmin.
          expect(await this.genArt721Core.owner()).to.be.equal(
            await this.adminACL.superAdmin()
          );
        } else {
          expect(await this.genArt721Core.owner()).to.be.equal(
            this.adminACL.address
          );
        }
      });
    });

    describe("admin", function () {
      it("returns expected backwards-compatible admin (owner)", async function () {
        if (coreContractName === "GenArt721CoreV3_Engine") {
          // Starting with GenArt721CoreV3_Engine v3.1.0, the backwards-compatible
          // admin that is returned is the underlying admin ACL's superAdmin.
          expect(await this.genArt721Core.admin()).to.be.equal(
            await this.adminACL.superAdmin()
          );
        } else {
          expect(await this.genArt721Core.admin()).to.be.equal(
            this.adminACL.address
          );
        }
      });
    });

    describe("adminACLContract", function () {
      it("returns expected adminACLContract address", async function () {
        expect(await this.genArt721Core.adminACLContract()).to.be.equal(
          this.adminACL.address
        );
      });

      it("behaves as expected when transferring ownership", async function () {
        // deploy new ACL with user as superAdmin
        const userAdminACLFactory = await ethers.getContractFactory(
          "AdminACLV0"
        );
        const userAdminACL = await userAdminACLFactory
          .connect(this.accounts.user)
          .deploy();
        // update owner of core to new userAdminACL, expect OwnershipTransferred event
        await expect(
          this.adminACL
            .connect(this.accounts.deployer)
            .transferOwnershipOn(
              this.genArt721Core.address,
              userAdminACL.address
            )
        )
          .to.emit(this.genArt721Core, "OwnershipTransferred")
          .withArgs(this.adminACL.address, userAdminACL.address);
        // ensure owner + public adminACLContract has been updated
        expect(await this.genArt721Core.owner()).to.be.equal(
          userAdminACL.address
        );
        expect(await this.genArt721Core.adminACLContract()).to.be.equal(
          userAdminACL.address
        );
        // ensure new userAdminACL may update project
        await this.genArt721Core
          .connect(this.accounts.user)
          .addProject("new project", this.accounts.artist2.address);
      });

      it("behaves as expected when renouncing ownership", async function () {
        // update owner of core to null address, expect OwnershipTransferred event
        await expect(
          await this.adminACL
            .connect(this.accounts.deployer)
            .renounceOwnershipOn(this.genArt721Core.address)
        )
          .to.emit(this.genArt721Core, "OwnershipTransferred")
          .withArgs(this.adminACL.address, constants.ZERO_ADDRESS);
        // ensure owner + public adminACLContract has been updated
        expect(await this.genArt721Core.owner()).to.be.equal(
          constants.ZERO_ADDRESS
        );
        expect(await this.genArt721Core.adminACLContract()).to.be.equal(
          constants.ZERO_ADDRESS
        );
        // ensure prior adminACL may not perform an admin function
        await expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .addProject("new project", this.accounts.artist2.address),
          "Only Admin ACL allowed"
        );
      });
    });

    describe("reverts on project locked", async function () {
      it("reverts if try to add script", async function () {
        await mintProjectUntilRemaining.call(
          this,
          this.projectZero,
          this.accounts.artist,
          0
        );
        // wait until project is locked
        await advanceEVMByTime(FOUR_WEEKS + 1);
        // expect revert
        await expectRevert(
          this.genArt721Core
            .connect(this.accounts.artist)
            .addProjectScript(this.projectZero, "lorem ipsum"),
          "Only if unlocked"
        );
      });
    });

    describe("coreVersion", function () {
      it("returns expected value", async function () {
        let targetCoreVersion;
        if (coreContractName === "GenArt721CoreV3") {
          targetCoreVersion = "v3.0.0";
        } else if (coreContractName === "GenArt721CoreV3_Explorations") {
          targetCoreVersion = "v3.0.1";
        } else if (coreContractName === "GenArt721CoreV3_Engine") {
          targetCoreVersion = "v3.1.0";
        } else {
          throw new Error("Unexpected core contract name");
        }
        const coreVersion = await this.genArt721Core
          .connect(this.accounts.deployer)
          .coreVersion();
        expect(coreVersion).to.be.equal(targetCoreVersion);
      });
    });

    describe("coreType", function () {
      it("returns expected value", async function () {
        const coreType = await this.genArt721Core
          .connect(this.accounts.deployer)
          .coreType();
        if (coreContractName === "GenArt721CoreV3_Engine") {
          // coreType is same for GenArt721CoreV3 & GenArt721CoreV3_Explorations,
          // as they have same interface expectations
          expect(coreType).to.be.equal("GenArt721CoreV3_Engine");
        } else {
          // coreType is same for GenArt721CoreV3 & GenArt721CoreV3_Explorations
          expect(coreType).to.be.equal("GenArt721CoreV3");
        }
      });
    });

    describe("supportsInterface", function () {
      it("supports IManifold", async function () {
        // expected true for supporting: bytes4(keccak256('getRoyalties(uint256)')) == 0xbb3bafd6
        expect(
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .supportsInterface(0xbb3bafd6)
        ).to.be.true;
      });

      it("supports IERC721", async function () {
        // expected true for interface = 0x80ac58cd
        expect(
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .supportsInterface(0x80ac58cd)
        ).to.be.true;
      });

      it("supports IERC165", async function () {
        // expected true for interface = 0x01ffc9a7
        expect(
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .supportsInterface(0x01ffc9a7)
        ).to.be.true;
      });

      it("does not support 0xffffffff", async function () {
        expect(
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .supportsInterface(0xffffffff)
        ).to.be.false;
      });
    });

    describe("initial nextProjectId", function () {
      it("returns zero when initialized to zero nextProjectId", async function () {
        // one project has already been added, so should be one
        expect(await this.genArt721Core.nextProjectId()).to.be.equal(1);
      });

      it("returns >0 when initialized to >0 nextProjectId", async function () {
        const nextProjectId = 365;
        let differentGenArt721Core;
        if (coreContractName === "GenArt721CoreV3_Engine") {
          const engineRegistryFactory = await ethers.getContractFactory(
            "EngineRegistryV0"
          );
          const engineRegistry = await engineRegistryFactory
            .connect(this.accounts.deployer)
            .deploy();
          differentGenArt721Core = await deployAndGet.call(
            this,
            coreContractName,
            [
              this.name,
              this.symbol,
              this.accounts.deployer.address,
              this.accounts.additional.address,
              this.randomizer.address,
              this.adminACL.address,
              nextProjectId,
              false,
              engineRegistry.address, // Note: important to use a real engine registry
            ]
          );
        } else {
          differentGenArt721Core = await deployAndGet.call(
            this,
            coreContractName,
            [
              this.name,
              this.symbol,
              this.randomizer.address,
              this.adminACL.address,
              nextProjectId,
            ]
          );
        }
        expect(await differentGenArt721Core.nextProjectId()).to.be.equal(365);
      });
    });

    describe("startingProjectId", function () {
      it("returns zero when initialized to zero nextProjectId", async function () {
        // one project has already been added, but starting project ID should remain at 0
        expect(await this.genArt721Core.startingProjectId()).to.be.equal(0);
      });

      it("returns >0 when initialized to >0 nextProjectId", async function () {
        const nextProjectId = 365;
        let differentGenArt721Core;
        if (coreContractName === "GenArt721CoreV3_Engine") {
          const engineRegistryFactory = await ethers.getContractFactory(
            "EngineRegistryV0"
          );
          const engineRegistry = await engineRegistryFactory
            .connect(this.accounts.deployer)
            .deploy();
          differentGenArt721Core = await deployAndGet.call(
            this,
            coreContractName,
            [
              this.name,
              this.symbol,
              this.accounts.deployer.address,
              this.accounts.additional.address,
              this.randomizer.address,
              this.adminACL.address,
              nextProjectId,
              false,
              engineRegistry.address, // Note: important to use a real engine registry
            ]
          );
        } else {
          differentGenArt721Core = await deployAndGet.call(
            this,
            coreContractName,
            [
              this.name,
              this.symbol,
              this.randomizer.address,
              this.adminACL.address,
              nextProjectId,
            ]
          );
        }
        expect(await differentGenArt721Core.startingProjectId()).to.be.equal(
          nextProjectId
        );
      });
    });

    describe("mint_ECF", function () {
      it("reverts if not called by the minter contract", async function () {
        await expectRevert(
          this.genArt721Core
            .connect(this.accounts.artist)
            .mint_Ecf(
              this.accounts.artist.address,
              this.projectZero,
              this.accounts.artist.address
            ),
          "Must mint from minter contract"
        );
      });

      it("reverts if try to mint non-active project", async function () {
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .toggleProjectIsActive(this.projectZero);
        await expectRevert(
          this.minter.connect(this.accounts.user).purchase(this.projectZero),
          "Project must exist and be active"
        );
      });

      it("reverts if try to mint paused from non-artist account", async function () {
        await expectRevert(
          this.minter.connect(this.accounts.user).purchase(this.projectZero),
          "Purchases are paused."
        );
      });
    });

    describe("setTokenHash_8PT", function () {
      it("does not allow non-randomizer to call", async function () {
        // mint token zero so it is a valid token
        await this.minter
          .connect(this.accounts.artist)
          .purchase(this.projectZero);

        // call directly from non-randomizer account and expect revert
        await expectRevert(
          this.genArt721Core
            .connect(this.accounts.artist)
            .setTokenHash_8PT(
              this.projectZeroTokenZero.toNumber(),
              ethers.constants.MaxInt256
            ),
          "Only randomizer may set"
        );
      });

      it("does allow randomizer to call, and updates token hash", async function () {
        // ensure token hash is initially zero
        expect(
          await this.genArt721Core.tokenIdToHash(
            this.projectZeroTokenZero.toNumber()
          )
        ).to.be.equal(ethers.constants.HashZero);
        // mint a token and expect token hash to be updated to a non-zero hash
        await this.minter
          .connect(this.accounts.artist)
          .purchase(this.projectZero);
        expect(
          await this.genArt721Core.tokenIdToHash(
            this.projectZeroTokenZero.toNumber()
          )
        ).to.not.be.equal(ethers.constants.HashZero);
      });

      it("does not allow randomizer to call once a token hash has been set", async function () {
        // ensure token hash is initially zero
        expect(
          await this.genArt721Core.tokenIdToHash(
            this.projectZeroTokenZero.toNumber()
          )
        ).to.be.equal(ethers.constants.HashZero);
        // update randomizer to be a special mock randomizer for this test (seperate mint from token hash assignment)
        // deploy new RandomizerV2_NoAssignMock randomizer
        const mockRandomizer = await deployAndGet.call(
          this,
          "RandomizerV2_NoAssignMock",
          []
        );
        // update randomizer to new randomizer
        await mockRandomizer
          .connect(this.accounts.deployer)
          .assignCoreAndRenounce(this.genArt721Core.address);
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateRandomizerAddress(mockRandomizer.address);
        // mint a token and expect token hash to not be updated (due to the alternate randomizer)
        await this.minter
          .connect(this.accounts.artist)
          .purchase(this.projectZero);
        // set token hash and expect success
        await mockRandomizer.actuallyAssignTokenHash(
          this.projectZeroTokenZero.toNumber()
        );
        // expect revert when attempting to overwrite the token hash
        await expectRevert(
          mockRandomizer.actuallyAssignTokenHash(
            this.projectZeroTokenZero.toNumber()
          ),
          "Token hash already set"
        );
      });

      it("does not allow randomizer to set token hash seed to zero", async function () {
        // update randomizer to be a special mock randomizer for this test (seperate mint from token hash assignment)
        // deploy new RandomizerV2_NoAssignMock randomizer
        const mockRandomizer = await deployAndGet.call(
          this,
          "RandomizerV2_NoAssignMock",
          []
        );
        // update randomizer to new randomizer
        await mockRandomizer
          .connect(this.accounts.deployer)
          .assignCoreAndRenounce(this.genArt721Core.address);
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateRandomizerAddress(mockRandomizer.address);
        // mint a token and expect token hash to not be updated (due to the alternate randomizer)
        await this.minter
          .connect(this.accounts.artist)
          .purchase(this.projectZero);
        // expect revert when attempting to set token hash to zero
        await expectRevert(
          mockRandomizer.actuallyAssignZeroTokenHash(
            this.projectZeroTokenZero.toNumber()
          ),
          "No zero hash seed"
        );
      });

      it("does not allow randomizer to assign hash if token does not yet exist", async function () {
        // update randomizer to be a special mock randomizer for this test (seperate mint from token hash assignment)
        // deploy new RandomizerV2_NoAssignMock randomizer
        const mockRandomizer = await deployAndGet.call(
          this,
          "RandomizerV2_NoAssignMock",
          []
        );
        // update randomizer to new randomizer
        await mockRandomizer
          .connect(this.accounts.deployer)
          .assignCoreAndRenounce(this.genArt721Core.address);
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateRandomizerAddress(mockRandomizer.address);
        // expect revert when attempting to set token hash of non-existing token
        await expectRevert(
          mockRandomizer.actuallyAssignTokenHash(
            this.projectZeroTokenZero.toNumber()
          ),
          "Token ID does not exist"
        );
      });
    });
  });
}
