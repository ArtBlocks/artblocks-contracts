import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Contract } from "ethers";
import { setupConfigWitMinterFilterV2Suite } from "../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../util/common";

// we use a dummy shared minter for these tests
const expectedMinterType = "DummySharedMinter";

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
  {
    core: "GenArt721CoreV3_Explorations",
  },
  {
    core: "GenArt721CoreV3_Engine",
  },
  {
    core: "GenArt721CoreV3_Engine_Flex",
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
  describe(`MinterFilterV2 Views w/ core ${params.core}`, async function () {
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
      return config;
    }

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC STATE VARIABLE GETTER FUNCTIONS
    ///////////////////////////////////////////////////////////////////////////

    describe("minterFilterVersion", async function () {
      const expectedMinterFilterVersion = "v2.0.0";

      it("returns expected value", async function () {
        const config = await loadFixture(_beforeEach);
        let result = await config.minterFilter.minterFilterVersion();
        expect(result).to.be.equal(expectedMinterFilterVersion);
      });
    });

    describe("minterFilterType", async function () {
      const expectedMinterFilterType = "MinterFilterV2";

      it("returns expected value", async function () {
        const config = await loadFixture(_beforeEach);
        let result = await config.minterFilter.minterFilterType();
        expect(result).to.be.equal(expectedMinterFilterType);
      });
    });

    describe("numProjectsUsingMinter", async function () {
      it("returns zero when no projects have a minter", async function () {
        const config = await loadFixture(_beforeEach);
        let result = await config.minterFilter.numProjectsUsingMinter(
          config.minter.address
        );
        expect(result).to.be.equal(0);
      });

      it("returns expected value when one project has a minter", async function () {
        const config = await loadFixture(_beforeEach);
        // assign minter to project zero
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectZero,
            config.genArt721Core.address,
            config.minter.address
          );
        // expect contract to have one minter
        let result = await config.minterFilter.numProjectsUsingMinter(
          config.minter.address
        );
        expect(result).to.be.equal(1);
      });
    });

    ///////////////////////////////////////////////////////////////////////////
    // EXTERNAL VIEW FUNCTIONS
    ///////////////////////////////////////////////////////////////////////////

    describe("getMinterForProject", async function () {
      // expected revert messages
      const noMinterAssignedRevertMessage = "No minter assigned";

      it("reverts when project does not have minter", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minterFilter.getMinterForProject(
            config.projectZero,
            config.genArt721Core.address
          ),
          noMinterAssignedRevertMessage
        );
      });

      it("returns minter address when project has minter", async function () {
        const config = await loadFixture(_beforeEach);
        // initial: expect project zero to not have minter
        await expectRevert(
          config.minterFilter.getMinterForProject(
            config.projectZero,
            config.genArt721Core.address
          ),
          noMinterAssignedRevertMessage
        );
        // assign minter to project zero
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectZero,
            config.genArt721Core.address,
            config.minter.address
          );
        // expect project zero to have minter
        let result = await config.minterFilter.getMinterForProject(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result).to.be.equal(config.minter.address);
      });
    });

    describe("projectHasMinter", async function () {
      it("returns false when project does not have minter", async function () {
        const config = await loadFixture(_beforeEach);
        let result = await config.minterFilter.projectHasMinter(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result).to.be.equal(false);
      });

      it("returns true when project has minter", async function () {
        const config = await loadFixture(_beforeEach);
        // initial: expect project zero to not have minter
        let result = await config.minterFilter.projectHasMinter(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result).to.be.equal(false);
        // assign minter to project zero
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectZero,
            config.genArt721Core.address,
            config.minter.address
          );
        // expect project zero to have minter
        result = await config.minterFilter.projectHasMinter(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result).to.be.equal(true);
      });
    });

    describe("getNumProjectsOnContractWithMinters", async function () {
      it("returns 0 when no projects have a minter", async function () {
        const config = await loadFixture(_beforeEach);
        let result =
          await config.minterFilter.getNumProjectsOnContractWithMinters(
            config.genArt721Core.address
          );
        expect(result).to.be.equal(0);
      });

      it("returns expected values when projects have minters", async function () {
        const config = await loadFixture(_beforeEach);
        // initial: expect core to have no minters
        let result =
          await config.minterFilter.getNumProjectsOnContractWithMinters(
            config.genArt721Core.address
          );
        expect(result).to.be.equal(0);
        // assign minter to project zero
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectZero,
            config.genArt721Core.address,
            config.minter.address
          );
        // expect contract to have one minter
        result = await config.minterFilter.getNumProjectsOnContractWithMinters(
          config.genArt721Core.address
        );
        expect(result).to.be.equal(1);
        // assign minter to project one
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectOne,
            config.genArt721Core.address,
            config.minter.address
          );
        // expect contract to have two minters
        result = await config.minterFilter.getNumProjectsOnContractWithMinters(
          config.genArt721Core.address
        );
        expect(result).to.be.equal(2);
      });
    });

    describe("getProjectAndMinterInfoOnContractAt", async function () {
      it("reverts when index is out of bounds", async function () {
        const config = await loadFixture(_beforeEach);
        // @dev we use unspecified here becasue OpenZeppelin lib does not have a
        // revert message for out of bounds error
        await expectRevert.unspecified(
          config.minterFilter.getProjectAndMinterInfoOnContractAt(
            config.genArt721Core.address,
            0
          )
        );
      });

      it("returns expected values when projects have minters", async function () {
        const config = await loadFixture(_beforeEach);
        // assign minters to two projects
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectZero,
            config.genArt721Core.address,
            config.minter.address
          );
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectOne,
            config.genArt721Core.address,
            config.minter.address
          );
        // expect results at index 0
        let result =
          await config.minterFilter.getProjectAndMinterInfoOnContractAt(
            config.genArt721Core.address,
            0
          );
        expect(result.projectId).to.be.equal(config.projectZero);
        expect(result.minterAddress).to.be.equal(config.minter.address);
        expect(result.minterType).to.be.equal(expectedMinterType);
        // expect results at index 1
        result = await config.minterFilter.getProjectAndMinterInfoOnContractAt(
          config.genArt721Core.address,
          1
        );
        expect(result.projectId).to.be.equal(config.projectOne);
        expect(result.minterAddress).to.be.equal(config.minter.address);
        expect(result.minterType).to.be.equal(expectedMinterType);
      });
    });

    describe("isRegisteredCoreContract", async function () {
      it("returns false when core contract is not registered", async function () {
        const config = await loadFixture(_beforeEach);
        let result = await config.minterFilter.isRegisteredCoreContract(
          constants.ZERO_ADDRESS
        );
        expect(result).to.be.equal(false);
      });

      it("returns true when core contract is registered", async function () {
        const config = await loadFixture(_beforeEach);
        let result = await config.minterFilter.isRegisteredCoreContract(
          config.genArt721Core.address
        );
        expect(result).to.be.equal(true);
      });
    });

    describe("getProjectsOnContractUsingMinter", async function () {
      it("returns empty array when no projects have a minter", async function () {
        const config = await loadFixture(_beforeEach);
        let result = await config.minterFilter.getProjectsOnContractUsingMinter(
          config.genArt721Core.address,
          config.minter.address
        );
        expect(result.length).to.be.equal(0);
      });

      it("returns expected values when one contract is using minter", async function () {
        const config = await loadFixture(_beforeEach);
        // assign minter to project zero
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectZero,
            config.genArt721Core.address,
            config.minter.address
          );
        // expect contract to have one minter
        let result = await config.minterFilter.getProjectsOnContractUsingMinter(
          config.genArt721Core.address,
          config.minter.address
        );
        expect(result.length).to.be.equal(1);
        expect(result[0]).to.be.equal(config.projectZero);
      });

      it("returns expected values when > 1 contract is using minter", async function () {
        const config = await loadFixture(_beforeEach);
        // assign minter to project zero
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectZero,
            config.genArt721Core.address,
            config.minter.address
          );
        // deploy and register a second core contract
        const { newCore } = await deployAndRegisterAdditionalCore(
          config,
          "GenArt721CoreV3",
          true
        );
        // assign minter to (ficticious) project zero on second core contract
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectZero,
            newCore.address,
            config.minter.address
          );
        // expect original contract to still only have one project using minter
        let result = await config.minterFilter.getProjectsOnContractUsingMinter(
          config.genArt721Core.address,
          config.minter.address
        );
        expect(result.length).to.be.equal(1);
        expect(result[0]).to.be.equal(config.projectZero);
        // expect second contract to have one project using minter
        result = await config.minterFilter.getProjectsOnContractUsingMinter(
          newCore.address,
          config.minter.address
        );
        expect(result.length).to.be.equal(1);
        expect(result[0]).to.be.equal(config.projectZero);
      });
    });

    describe("owner", async function () {
      it("returns expected value", async function () {
        const config = await loadFixture(_beforeEach);
        let result = await config.minterFilter.owner();
        expect(result).to.be.equal(config.minterFilterAdminACL.address);
      });
    });
  });
});
