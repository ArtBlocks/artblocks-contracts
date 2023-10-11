import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { setupConfigWitMinterFilterV2Suite } from "../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../util/common";

// we use a dummy shared minter for these tests
const expectedMinterType = "DummySharedMinter";

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
];

// helper functions
async function deployAndRegisterAdditionalCore(
  config,
  coreContractName,
  addInitialProject
) {
  // deploy core contract and register on core registry
  let newCore: Contract;
  ({ genArt721Core: newCore } = await deployCore(
    config,
    coreContractName,
    config.coreRegistry
  ));
  if (addInitialProject) {
    await safeAddProject(
      newCore,
      config.accounts.deployer,
      config.accounts.artist2.address
    );
  }
  return { newCore };
}

runForEach.forEach((params) => {
  describe(`MinterFilterV2 Events w/ core ${params.core}`, async function () {
    async function _beforeEach() {
      // load minter filter V2 fixture
      const config = await loadFixture(setupConfigWitMinterFilterV2Suite);
      // deploy core contract and register on core registry
      ({
        genArt721Core: config.genArt721Core,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCore(config, params.core, config.coreRegistry));

      // Project setup
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );
      // deploy and add new dummy shared minter
      config.altMinter = await deployAndGet(config, expectedMinterType, [
        config.minterFilter.address,
      ]);
      return config;
    }

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC STATE VARIABLE GETTER FUNCTIONS
    ///////////////////////////////////////////////////////////////////////////

    describe("Deployed", async function () {
      it("should emit Deployed during deployment", async function () {
        const config = await loadFixture(_beforeEach);
        const minterFilterFactory =
          await ethers.getContractFactory("MinterFilterV2");
        // odd syntax to test events on deployment
        const tx = await minterFilterFactory
          .connect(config.accounts.deployer)
          .deploy(
            config.minterFilterAdminACL.address,
            config.genArt721Core.address
          );
        const receipt = await tx.deployTransaction.wait();
        const deployed = receipt.logs[receipt.logs.length - 1];
        // expect "Deployed" event as last log
        await expect(deployed.topics[0]).to.be.equal(
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Deployed()"))
        );
      });
    });

    describe("MinterApprovedGlobally", async function () {
      it("emits when a minter is added", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minterFilter
            .connect(config.accounts.deployer)
            .approveMinterGlobally(config.altMinter.address)
        )
          .to.emit(config.minterFilter, "MinterApprovedGlobally")
          .withArgs(config.altMinter.address, expectedMinterType);
      });
    });

    describe("revokeMinterGlobally", async function () {
      it("emits when a minter is removed", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minterFilter
            .connect(config.accounts.deployer)
            .revokeMinterGlobally(config.minter.address)
        )
          .to.emit(config.minterFilter, "MinterRevokedGlobally")
          .withArgs(config.minter.address);
      });
    });

    describe("approveMinterForContract", async function () {
      it("emits when a minter is added for contract", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minterFilter
            .connect(config.accounts.deployer)
            .approveMinterForContract(
              config.genArt721Core.address,
              config.altMinter.address
            )
        )
          .to.emit(config.minterFilter, "MinterApprovedForContract")
          .withArgs(
            config.genArt721Core.address,
            config.altMinter.address,
            expectedMinterType
          );
      });
    });

    describe("revokeMinterForContract", async function () {
      it("emits when a minter is removed for contract", async function () {
        const config = await loadFixture(_beforeEach);
        // approve minter for contract
        await config.minterFilter
          .connect(config.accounts.deployer)
          .approveMinterForContract(
            config.genArt721Core.address,
            config.altMinter.address
          );
        await expect(
          config.minterFilter
            .connect(config.accounts.deployer)
            .revokeMinterForContract(
              config.genArt721Core.address,
              config.altMinter.address
            )
        )
          .to.emit(config.minterFilter, "MinterRevokedForContract")
          .withArgs(config.genArt721Core.address, config.altMinter.address);
      });
    });

    describe("ProjectMinterRegistered", async function () {
      it("emits when a project minter is registered", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minterFilter
            .connect(config.accounts.deployer)
            .setMinterForProject(
              config.projectZero,
              config.genArt721Core.address,
              config.minter.address
            )
        )
          .to.emit(config.minterFilter, "ProjectMinterRegistered")
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            config.minter.address,
            expectedMinterType
          );
      });
    });

    describe("ProjectMinterRemoved", async function () {
      it("emits when a project minter is removed", async function () {
        const config = await loadFixture(_beforeEach);
        // set project zero minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectZero,
            config.genArt721Core.address,
            config.minter.address
          );
        await expect(
          config.minterFilter
            .connect(config.accounts.deployer)
            .removeMinterForProject(
              config.projectZero,
              config.genArt721Core.address
            )
        )
          .to.emit(config.minterFilter, "ProjectMinterRemoved")
          .withArgs(config.projectZero, config.genArt721Core.address);
      });

      it("emits when a muliple project minters are removed", async function () {
        const config = await loadFixture(_beforeEach);
        // set project zero minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectZero,
            config.genArt721Core.address,
            config.minter.address
          );
        // set project one's minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectOne,
            config.genArt721Core.address,
            config.minter.address
          );
        // remove both minters
        await expect(
          config.minterFilter
            .connect(config.accounts.deployer)
            .removeMintersForProjectsOnContract(
              [config.projectZero, config.projectOne],
              config.genArt721Core.address
            )
        )
          .to.emit(config.minterFilter, "ProjectMinterRemoved")
          .withArgs(config.projectZero, config.genArt721Core.address)
          .and.to.emit(config.minterFilter, "ProjectMinterRemoved")
          .withArgs(config.projectOne, config.genArt721Core.address);
      });
    });

    describe("CoreRegistryUpdated", async function () {
      it("emits when the core registry is updated", async function () {
        const config = await loadFixture(_beforeEach);
        // update to dummy new core registry
        await expect(
          config.minterFilter
            .connect(config.accounts.deployer)
            .updateCoreRegistry(config.adminACL.address) // nonsense address, okay for test
        )
          .to.emit(config.minterFilter, "CoreRegistryUpdated")
          .withArgs(config.adminACL.address);
      });
    });
  });
});
