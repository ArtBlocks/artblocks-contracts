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
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployWithStorageLibraryAndGet,
  deployCoreWithMinterFilter,
  mintProjectUntilRemaining,
  advanceEVMByTime,
} from "../../util/common";
import { FOUR_WEEKS } from "../../util/constants";

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3_Engine", // V3 core Engine contract
  "GenArt721CoreV3_Engine_Flex", // V3 core Engine_Flex contract
];

/**
 * General Integration tests for V3 core.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${coreContractName} Integration`, async function () {
    async function _beforeEach() {
      let config: T_Config = {
        accounts: await getAccounts(),
      };
      config = await assignDefaultConstants(config);

      // deploy and configure minter filter and minter
      ({
        genArt721Core: config.genArt721Core,
        minterFilter: config.minterFilter,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCoreWithMinterFilter(
        config,
        coreContractName,
        "MinterFilterV1"
      ));

      config.minter = await deployAndGet(config, "MinterSetPriceV2", [
        config.genArt721Core.address,
        config.minterFilter.address,
      ]);

      // add project
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist.address);
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);

      // configure minter for project zero
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectZero, 0);
      return config;
    }

    describe("{artblocks,provider}PrimarySalesAddress", function () {
      if (coreContractName.includes("GenArt721CoreV3_Engine")) {
        it("returns expected renderProviderPrimarySalesAddress", async function () {
          const config = await loadFixture(_beforeEach);
          expect(
            await config.genArt721Core.renderProviderPrimarySalesAddress()
          ).to.be.equal(config.accounts.deployer.address);
        });
        it("returns expected renderProviderPrimarySalesAddress", async function () {
          const config = await loadFixture(_beforeEach);
          expect(
            await config.genArt721Core.platformProviderPrimarySalesAddress()
          ).to.be.equal(config.accounts.additional.address);
        });
      } else {
        it("returns expected artblocksPrimarySalesAddress", async function () {
          const config = await loadFixture(_beforeEach);
          expect(
            await config.genArt721Core.artblocksPrimarySalesAddress()
          ).to.be.equal(config.accounts.deployer.address);
        });
      }
    });

    describe("artblocksAddress", function () {
      if (coreContractName.includes("GenArt721CoreV3_Engine")) {
        it("always passes, non-relevant", async function () {
          const config = await loadFixture(_beforeEach);
          // This test is non-relevant for Engine variant V3 contracts.
          expect(true);
        });
      } else {
        it("returns expected artblocksAddress", async function () {
          const config = await loadFixture(_beforeEach);
          expect(await config.genArt721Core.artblocksAddress()).to.be.equal(
            config.accounts.deployer.address
          );
        });
      }
    });

    describe("{artblocks,provider}SecondarySalesAddress", function () {
      if (coreContractName.includes("GenArt721CoreV3_Engine")) {
        it("returns expected renderProviderSecondarySalesAddress", async function () {
          const config = await loadFixture(_beforeEach);
          expect(
            await config.genArt721Core.renderProviderSecondarySalesAddress()
          ).to.be.equal(config.accounts.deployer.address);
        });
        it("returns expected renderProviderSecondarySalesAddress", async function () {
          const config = await loadFixture(_beforeEach);
          expect(
            await config.genArt721Core.platformProviderSecondarySalesAddress()
          ).to.be.equal(config.accounts.additional.address);
        });
      } else {
        it("returns expected artblocksSecondarySalesAddress", async function () {
          const config = await loadFixture(_beforeEach);
          expect(
            await config.genArt721Core.artblocksSecondarySalesAddress()
          ).to.be.equal(config.accounts.deployer.address);
        });
      }
    });

    describe("{artblocks,provider}Percentage", function () {
      if (coreContractName.includes("GenArt721CoreV3_Engine")) {
        it("returns expected renderProviderPrimarySalesPercentage", async function () {
          const config = await loadFixture(_beforeEach);
          expect(
            await config.genArt721Core.renderProviderPrimarySalesPercentage()
          ).to.be.equal(10);
        });
        it("returns expected platformProviderPrimarySalesPercentage", async function () {
          const config = await loadFixture(_beforeEach);
          expect(
            await config.genArt721Core.platformProviderPrimarySalesPercentage()
          ).to.be.equal(10);
        });
        it("returns expected renderProviderSecondarySalesBPS", async function () {
          const config = await loadFixture(_beforeEach);
          expect(
            await config.genArt721Core.renderProviderSecondarySalesBPS()
          ).to.be.equal(250);
        });
        it("returns expected platformProviderSecondarySalesBPS", async function () {
          const config = await loadFixture(_beforeEach);
          expect(
            await config.genArt721Core.platformProviderSecondarySalesBPS()
          ).to.be.equal(250);
        });
      } else {
        it("returns expected artblocksPercentage", async function () {
          const config = await loadFixture(_beforeEach);
          expect(await config.genArt721Core.artblocksPercentage()).to.be.equal(
            10
          );
        });
      }
    });

    describe("owner", function () {
      it("returns expected owner", async function () {
        const config = await loadFixture(_beforeEach);
        expect(await config.genArt721Core.owner()).to.be.equal(
          config.adminACL.address
        );
      });
    });

    describe("admin", function () {
      it("returns expected backwards-compatible admin (owner)", async function () {
        const config = await loadFixture(_beforeEach);
        expect(await config.genArt721Core.admin()).to.be.equal(
          config.adminACL.address
        );
      });
    });

    describe("adminACLContract", function () {
      it("returns expected adminACLContract address", async function () {
        const config = await loadFixture(_beforeEach);
        expect(await config.genArt721Core.adminACLContract()).to.be.equal(
          config.adminACL.address
        );
      });

      it("behaves as expected when transferring ownership", async function () {
        const config = await loadFixture(_beforeEach);
        // deploy new ACL with user as superAdmin
        const userAdminACLFactory =
          await ethers.getContractFactory("AdminACLV0");
        const userAdminACL = await userAdminACLFactory
          .connect(config.accounts.user)
          .deploy();
        // update owner of core to new userAdminACL, expect OwnershipTransferred event
        await expect(
          config.adminACL
            .connect(config.accounts.deployer)
            .transferOwnershipOn(
              config.genArt721Core.address,
              userAdminACL.address
            )
        )
          .to.emit(config.genArt721Core, "OwnershipTransferred")
          .withArgs(config.adminACL.address, userAdminACL.address);
        // ensure owner + public adminACLContract has been updated
        expect(await config.genArt721Core.owner()).to.be.equal(
          userAdminACL.address
        );
        expect(await config.genArt721Core.adminACLContract()).to.be.equal(
          userAdminACL.address
        );
        // ensure new userAdminACL may update project
        await config.genArt721Core
          .connect(config.accounts.user)
          .addProject("new project", config.accounts.artist2.address);
      });

      it("behaves as expected when renouncing ownership", async function () {
        const config = await loadFixture(_beforeEach);
        // update owner of core to null address, expect OwnershipTransferred event
        await expect(
          await config.adminACL
            .connect(config.accounts.deployer)
            .renounceOwnershipOn(config.genArt721Core.address)
        )
          .to.emit(config.genArt721Core, "OwnershipTransferred")
          .withArgs(config.adminACL.address, constants.ZERO_ADDRESS);
        // ensure owner + public adminACLContract has been updated
        expect(await config.genArt721Core.owner()).to.be.equal(
          constants.ZERO_ADDRESS
        );
        expect(await config.genArt721Core.adminACLContract()).to.be.equal(
          constants.ZERO_ADDRESS
        );
        // ensure prior adminACL may not perform an admin function
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .addProject("new project", config.accounts.artist2.address),
          "Only Admin ACL allowed"
        );
      });
    });

    describe("reverts on project locked", async function () {
      const config = await loadFixture(_beforeEach);
      it("reverts if try to add script", async function () {
        const config = await loadFixture(_beforeEach);
        await mintProjectUntilRemaining(
          config,
          config.projectZero,
          config.accounts.artist,
          0
        );
        // wait until project is locked
        await advanceEVMByTime(FOUR_WEEKS + 1);
        // expect revert
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .addProjectScript(config.projectZero, "lorem ipsum"),
          "Only if unlocked"
        );
      });
      it("reverts if try to add compressed script", async function () {
        const config = await loadFixture(_beforeEach);
        await mintProjectUntilRemaining(
          config,
          config.projectZero,
          config.accounts.artist,
          0
        );
        // wait until project is locked
        await advanceEVMByTime(FOUR_WEEKS + 1);
        const compressedScript = await config.genArt721Core
          ?.connect(config.accounts.artist)
          .getCompressed("lorem ipsum");
        // expect revert
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .addProjectScriptCompressed(config.projectZero, compressedScript),
          "Only if unlocked"
        );
      });
    });

    describe("coreVersion", function () {
      it("returns expected value", async function () {
        const config = await loadFixture(_beforeEach);
        let targetCoreVersion;
        if (coreContractName === "GenArt721CoreV3") {
          throw new Error("Untested core contract version");
        } else if (coreContractName === "GenArt721CoreV3_Explorations") {
          throw new Error("Untested core contract version");
        } else if (coreContractName.includes("GenArt721CoreV3_Engine_Flex")) {
          targetCoreVersion = "v3.2.5";
        } else if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          targetCoreVersion = "v3.2.4";
        } else {
          throw new Error("Unexpected core contract name");
        }
        const coreVersion = await config.genArt721Core
          .connect(config.accounts.deployer)
          .coreVersion();
        expect(coreVersion).to.be.equal(targetCoreVersion);
      });
    });

    describe("coreType", function () {
      it("returns expected value", async function () {
        const config = await loadFixture(_beforeEach);
        const coreType = await config.genArt721Core
          .connect(config.accounts.deployer)
          .coreType();
        if (coreContractName === "GenArt721CoreV3_Engine") {
          // coreType is same for GenArt721CoreV3 & GenArt721CoreV3_Explorations,
          // as they have same interface expectations
          expect(coreType).to.be.equal("GenArt721CoreV3_Engine");
        } else if (coreContractName === "GenArt721CoreV3_Engine_Flex") {
          expect(coreType).to.be.equal("GenArt721CoreV3_Engine_Flex");
        } else {
          // coreType is same for GenArt721CoreV3 & GenArt721CoreV3_Explorations
          throw new Error("Untested core contract version");
        }
      });
    });

    describe("supportsInterface", function () {
      it("supports ERC-2981", async function () {
        const config = await loadFixture(_beforeEach);
        // expected true for supporting: bytes4(keccak256("royaltyInfo(uint256,uint256)")) == 0x2a55205a
        expect(
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .supportsInterface(0x2a55205a)
        ).to.be.true;
      });

      it("doesn't support IManifold", async function () {
        const config = await loadFixture(_beforeEach);
        // expected false for supporting: bytes4(keccak256('getRoyalties(uint256)')) == 0xbb3bafd6
        expect(
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .supportsInterface(0xbb3bafd6)
        ).to.be.false;
      });

      it("supports IERC721", async function () {
        const config = await loadFixture(_beforeEach);
        // expected true for interface = 0x80ac58cd
        expect(
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .supportsInterface(0x80ac58cd)
        ).to.be.true;
      });

      it("supports IERC165", async function () {
        const config = await loadFixture(_beforeEach);
        // expected true for interface = 0x01ffc9a7
        expect(
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .supportsInterface(0x01ffc9a7)
        ).to.be.true;
      });

      it("does not support 0xffffffff", async function () {
        const config = await loadFixture(_beforeEach);
        expect(
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .supportsInterface(0xffffffff)
        ).to.be.false;
      });
    });

    describe("initial nextProjectId", function () {
      it("returns zero when initialized to zero nextProjectId", async function () {
        const config = await loadFixture(_beforeEach);
        // one project has already been added, so should be one
        expect(await config.genArt721Core.nextProjectId()).to.be.equal(1);
      });

      it("returns >0 when initialized to >0 nextProjectId", async function () {
        const config = await loadFixture(_beforeEach);
        const nextProjectId = 365;
        let differentGenArt721Core;
        if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          const engineRegistryFactory =
            await ethers.getContractFactory("EngineRegistryV0");
          const engineRegistry = await engineRegistryFactory
            .connect(config.accounts.deployer)
            .deploy();
          differentGenArt721Core = await deployWithStorageLibraryAndGet(
            config,
            coreContractName,
            [
              config.name,
              config.symbol,
              config.accounts.deployer.address,
              config.accounts.additional.address,
              config.randomizer.address,
              config.adminACL.address,
              nextProjectId,
              false,
              config.splitProvider.address,
            ]
          );
        } else {
          differentGenArt721Core = await deployWithStorageLibraryAndGet(
            config,
            coreContractName,
            [
              config.name,
              config.symbol,
              config.randomizer.address,
              config.adminACL.address,
              nextProjectId,
              config.splitProvider.address,
            ]
          );
        }
        expect(await differentGenArt721Core.nextProjectId()).to.be.equal(365);
      });
    });

    describe("startingProjectId", function () {
      it("returns zero when initialized to zero nextProjectId", async function () {
        const config = await loadFixture(_beforeEach);
        // one project has already been added, but starting project ID should remain at 0
        expect(await config.genArt721Core.startingProjectId()).to.be.equal(0);
      });

      it("returns >0 when initialized to >0 nextProjectId", async function () {
        const config = await loadFixture(_beforeEach);
        const nextProjectId = 365;
        let differentGenArt721Core;
        if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          const engineRegistryFactory =
            await ethers.getContractFactory("EngineRegistryV0");
          const engineRegistry = await engineRegistryFactory
            .connect(config.accounts.deployer)
            .deploy();
          differentGenArt721Core = await deployWithStorageLibraryAndGet(
            config,
            coreContractName,
            [
              config.name,
              config.symbol,
              config.accounts.deployer.address,
              config.accounts.additional.address,
              config.randomizer.address,
              config.adminACL.address,
              nextProjectId,
              false,
              config.splitProvider.address,
            ]
          );
        } else {
          differentGenArt721Core = await deployWithStorageLibraryAndGet(
            config,
            coreContractName,
            [
              config.name,
              config.symbol,
              config.randomizer.address,
              config.adminACL.address,
              nextProjectId,
              config.splitProvider.address,
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
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .mint_Ecf(
              config.accounts.artist.address,
              config.projectZero,
              config.accounts.artist.address
            ),
          "Must mint from minter contract"
        );
      });

      it("reverts if try to mint non-active project", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .toggleProjectIsActive(config.projectZero);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero),
          "Project must exist and be active"
        );
      });

      it("reverts if try to mint paused from non-artist account", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero),
          "Purchases are paused."
        );
      });
    });

    describe("setTokenHash_8PT", function () {
      it("does not allow non-randomizer to call", async function () {
        const config = await loadFixture(_beforeEach);
        // mint token zero so it is a valid token
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);

        // call directly from non-randomizer account and expect revert
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .setTokenHash_8PT(
              config.projectZeroTokenZero.toNumber(),
              ethers.constants.MaxInt256
            ),
          "Only randomizer may set"
        );
      });

      it("does allow randomizer to call, and updates token hash", async function () {
        const config = await loadFixture(_beforeEach);
        // ensure token hash is initially zero
        expect(
          await config.genArt721Core.tokenIdToHash(
            config.projectZeroTokenZero.toNumber()
          )
        ).to.be.equal(ethers.constants.HashZero);
        // mint a token and expect token hash to be updated to a non-zero hash
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        expect(
          await config.genArt721Core.tokenIdToHash(
            config.projectZeroTokenZero.toNumber()
          )
        ).to.not.be.equal(ethers.constants.HashZero);
      });

      it("does not allow randomizer to call once a token hash has been set", async function () {
        const config = await loadFixture(_beforeEach);
        // ensure token hash is initially zero
        expect(
          await config.genArt721Core.tokenIdToHash(
            config.projectZeroTokenZero.toNumber()
          )
        ).to.be.equal(ethers.constants.HashZero);
        // update randomizer to be a special mock randomizer for config test (seperate mint from token hash assignment)
        // deploy new RandomizerV2_NoAssignMock randomizer
        const mockRandomizer = await deployAndGet(
          config,
          "RandomizerV2_NoAssignMock",
          []
        );
        // update randomizer to new randomizer
        await mockRandomizer
          .connect(config.accounts.deployer)
          .assignCoreAndRenounce(config.genArt721Core.address);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateRandomizerAddress(mockRandomizer.address);
        // mint a token and expect token hash to not be updated (due to the alternate randomizer)
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        // set token hash and expect success
        await mockRandomizer.actuallyAssignTokenHash(
          config.projectZeroTokenZero.toNumber()
        );
        // expect revert when attempting to overwrite the token hash
        await expectRevert(
          mockRandomizer.actuallyAssignTokenHash(
            config.projectZeroTokenZero.toNumber()
          ),
          "Token hash already set"
        );
      });

      it("does not allow randomizer to set token hash seed to zero", async function () {
        const config = await loadFixture(_beforeEach);
        // update randomizer to be a special mock randomizer for config test (seperate mint from token hash assignment)
        // deploy new RandomizerV2_NoAssignMock randomizer
        const mockRandomizer = await deployAndGet(
          config,
          "RandomizerV2_NoAssignMock",
          []
        );
        // update randomizer to new randomizer
        await mockRandomizer
          .connect(config.accounts.deployer)
          .assignCoreAndRenounce(config.genArt721Core.address);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateRandomizerAddress(mockRandomizer.address);
        // mint a token and expect token hash to not be updated (due to the alternate randomizer)
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        // expect revert when attempting to set token hash to zero
        await expectRevert(
          mockRandomizer.actuallyAssignZeroTokenHash(
            config.projectZeroTokenZero.toNumber()
          ),
          "No zero hash seed"
        );
      });

      it("does not allow randomizer to assign hash if token does not yet exist", async function () {
        const config = await loadFixture(_beforeEach);
        // update randomizer to be a special mock randomizer for config test (seperate mint from token hash assignment)
        // deploy new RandomizerV2_NoAssignMock randomizer
        const mockRandomizer = await deployAndGet(
          config,
          "RandomizerV2_NoAssignMock",
          []
        );
        // update randomizer to new randomizer
        await mockRandomizer
          .connect(config.accounts.deployer)
          .assignCoreAndRenounce(config.genArt721Core.address);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateRandomizerAddress(mockRandomizer.address);
        // expect revert when attempting to set token hash of non-existing token
        await expectRevert(
          mockRandomizer.actuallyAssignTokenHash(
            config.projectZeroTokenZero.toNumber()
          ),
          "Token ID does not exist"
        );
      });
    });

    describe("tokenIdToHashSeed", function () {
      it("updates token hash seed from null to non-null when token is minted", async function () {
        const config = await loadFixture(_beforeEach);
        // ensure token hash is initially zero
        expect(
          await config.genArt721Core.tokenIdToHashSeed(
            config.projectZeroTokenZero.toNumber()
          )
        ).to.be.equal("0x000000000000000000000000"); // bytes12(0)
        // mint a token and expect token hash seed to be updated to a non-zero hash
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        expect(
          await config.genArt721Core.tokenIdToHashSeed(
            config.projectZeroTokenZero.toNumber()
          )
        ).to.not.be.equal(ethers.constants.HashZero);
      });
    });

    describe("onlyValidProjectId", function () {
      it("does not allow invalid project when using onlyValidProjectId modifier", async function () {
        const config = await loadFixture(_beforeEach);
        // mint token zero so it is a valid token
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .toggleProjectIsActive(999),
          "Project ID does not exist"
        );
      });
    });
  });
}
