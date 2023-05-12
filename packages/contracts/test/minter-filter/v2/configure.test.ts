import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Contract } from "ethers";
import { setupConfigWitMinterFilterV2Suite } from "../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../util/common";

// we use a dummy shared minter for these tests
const expectedMinterType = "DummySharedMinter";

// expected revert messages
const revertMessages = {
  noRenounceOwnership: "Cannot renounce ownership",
  onlyAdminACL: "Only Admin ACL allowed",
  onlyCoreAdminACL: "Only Core AdminACL allowed",
  onlyRegisteredCore: "Only registered core contract",
  onlyNonZeroAddress: "Only non-zero address",
  minterAlreadyApproved: "Minter already approved",
  onlyPreviouslyApprovedMinter: "Only previously approved minter",
};

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
  // {
  //   core: "GenArt721CoreV3_Explorations",
  // },
  // {
  //   core: "GenArt721CoreV3_Engine",
  // },
  // {
  //   core: "GenArt721CoreV3_Engine_Flex",
  // },
];

runForEach.forEach((params) => {
  describe(`MinterFilterV2 Integration tests w/ core ${params.core}`, async function () {
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

    describe("renounceOwnership", async function () {
      it("should revert", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minterFilter.renounceOwnership(),
          revertMessages.noRenounceOwnership
        );
      });
    });

    describe("updateCoreRegistry", async function () {
      it("does not allow non-admin to call", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minterFilter
            .connect(config.accounts.user)
            .updateCoreRegistry(config.coreRegistry.address),
          revertMessages.onlyAdminACL
        );
      });

      it("does not allow zero address", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minterFilter
            .connect(config.accounts.deployer)
            .updateCoreRegistry(constants.ZERO_ADDRESS),
          revertMessages.onlyNonZeroAddress
        );
      });

      it("updates engine registry", async function () {
        const config = await loadFixture(_beforeEach);
        // initial value is existing core registry
        expect(await config.minterFilter.coreRegistry()).to.equal(
          config.coreRegistry.address
        );
        // deploy new core registry, switch to it
        const newCoreRegistry = await deployAndGet(
          config,
          "CoreRegistryV1",
          []
        );
        await config.minterFilter
          .connect(config.accounts.deployer)
          .updateCoreRegistry(newCoreRegistry.address);
        // expect new core registry to be set
        expect(await config.minterFilter.coreRegistry()).to.equal(
          newCoreRegistry.address
        );
      });
    });

    describe("approveMinterGlobally", async function () {
      it("does not allow non-admin to call", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minterFilter
            .connect(config.accounts.user)
            .approveMinterGlobally(config.accounts.user.address),
          revertMessages.onlyAdminACL
        );
      });

      it("does not allow already-approved minter", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minterFilter
            .connect(config.accounts.deployer)
            .approveMinterGlobally(config.minter.address),
          revertMessages.minterAlreadyApproved
        );
      });

      it("approves minter globally", async function () {
        const config = await loadFixture(_beforeEach);
        // deploy and add new dummy shared minter
        const newMinter = await deployAndGet(config, expectedMinterType, [
          config.minterFilter.address,
        ]);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .approveMinterGlobally(newMinter.address);
        // expect new minter to be approved
        expect(
          await config.minterFilter.isGloballyApprovedMinter(newMinter.address)
        ).to.be.true;
      });
    });

    describe("revokeMinterGlobally", async function () {
      it("does not allow non-admin to call", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minterFilter
            .connect(config.accounts.user)
            .revokeMinterGlobally(config.minter.address),
          revertMessages.onlyAdminACL
        );
      });

      it("does not allow non-approved minter", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minterFilter
            .connect(config.accounts.deployer)
            .revokeMinterGlobally(constants.ZERO_ADDRESS),
          revertMessages.onlyPreviouslyApprovedMinter
        );
      });

      it("removes a previously approved minter", async function () {
        const config = await loadFixture(_beforeEach);
        // minter is initially approved
        let result = await config.minterFilter.isGloballyApprovedMinter(
          config.minter.address
        );
        expect(result).to.be.true;
        await config.minterFilter
          .connect(config.accounts.deployer)
          .revokeMinterGlobally(config.minter.address);
        // expect minter to be removed
        result = await config.minterFilter.isGloballyApprovedMinter(
          config.minter.address
        );
        expect(result).to.be.false;
      });
    });

    describe("approveMinterForContract", async function () {
      it("does not allow non-core-admin to call", async function () {
        const config = await loadFixture(_beforeEach);
        // update admin on core contract, not on minter filter
        await config.adminACL
          .connect(config.accounts.deployer)
          .changeSuperAdmin(config.accounts.deployer2.address, [
            config.genArt721Core.address,
          ]);
        // expect revert when calling from non-core-admin
        await expectRevert(
          config.minterFilter
            .connect(config.accounts.deployer)
            .approveMinterForContract(
              config.genArt721Core.address,
              config.minter.address
            ),
          revertMessages.onlyCoreAdminACL
        );
      });

      it("does not allow unregistered contract to call", async function () {
        const config = await loadFixture(_beforeEach);
        // unregister core contract
        await config.coreRegistry
          .connect(config.accounts.deployer)
          .unregisterContract(config.genArt721Core.address);
        // expect revert when calling for unregistered core
        await expectRevert(
          config.minterFilter
            .connect(config.accounts.deployer)
            .approveMinterForContract(
              config.genArt721Core.address,
              config.minter.address
            ),
          revertMessages.onlyRegisteredCore
        );
      });

      it("does not allow if already approved for contract at contract-level", async function () {
        const config = await loadFixture(_beforeEach);
        // expect success when calling first register
        await config.minterFilter
          .connect(config.accounts.deployer)
          .approveMinterForContract(
            config.genArt721Core.address,
            config.minter.address
          );
        // expect revert when calling second register (since already approved)
        await expectRevert(
          config.minterFilter
            .connect(config.accounts.deployer)
            .approveMinterForContract(
              config.genArt721Core.address,
              config.minter.address
            ),
          revertMessages.minterAlreadyApproved
        );
      });

      it("updates state", async function () {
        const config = await loadFixture(_beforeEach);
        // remove global approval of minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .revokeMinterGlobally(config.minter.address);
        // expect minter to not be approved for contract
        let result = await config.minterFilter.isApprovedMinterForContract(
          config.genArt721Core.address,
          config.minter.address
        );
        expect(result).to.be.false;
        // approve minter for contract
        await config.minterFilter
          .connect(config.accounts.deployer)
          .approveMinterForContract(
            config.genArt721Core.address,
            config.minter.address
          );
        // expect minter to be approved for contract
        result = await config.minterFilter.isApprovedMinterForContract(
          config.genArt721Core.address,
          config.minter.address
        );
        expect(result).to.be.true;
      });
    });

    describe("revokeMinterForContract", async function () {
      // fixture used for this describe block
      async function _beforeEach_revokeMinterForContract() {
        const config = await _beforeEach();
        // remove global approval of minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .revokeMinterGlobally(config.minter.address);
        // approve minter for contract
        await config.minterFilter
          .connect(config.accounts.deployer)
          .approveMinterForContract(
            config.genArt721Core.address,
            config.minter.address
          );
        return config;
      }

      it("does not allow non-core-admin to call", async function () {
        const config = await loadFixture(_beforeEach_revokeMinterForContract);
        // update admin on core contract, not on minter filter
        await config.adminACL
          .connect(config.accounts.deployer)
          .changeSuperAdmin(config.accounts.deployer2.address, [
            config.genArt721Core.address,
          ]);
        // expect revert when calling from non-core-admin
        await expectRevert(
          config.minterFilter
            .connect(config.accounts.deployer)
            .revokeMinterForContract(
              config.genArt721Core.address,
              config.minter.address
            ),
          revertMessages.onlyCoreAdminACL
        );
      });

      it("does not allow unregistered contract to call", async function () {
        const config = await loadFixture(_beforeEach_revokeMinterForContract);
        // unregister core contract
        await config.coreRegistry
          .connect(config.accounts.deployer)
          .unregisterContract(config.genArt721Core.address);
        // expect revert when calling for unregistered core
        await expectRevert(
          config.minterFilter
            .connect(config.accounts.deployer)
            .revokeMinterForContract(
              config.genArt721Core.address,
              config.minter.address
            ),
          revertMessages.onlyRegisteredCore
        );
      });

      it("does not allow if already approved for contract at contract-level", async function () {
        const config = await loadFixture(_beforeEach_revokeMinterForContract);
        // expect success when calling first revoke
        await config.minterFilter
          .connect(config.accounts.deployer)
          .revokeMinterForContract(
            config.genArt721Core.address,
            config.minter.address
          );
        // expect revert when calling second revoke (since already revoked)
        await expectRevert(
          config.minterFilter
            .connect(config.accounts.deployer)
            .revokeMinterForContract(
              config.genArt721Core.address,
              config.minter.address
            ),
          revertMessages.onlyPreviouslyApprovedMinter
        );
      });

      it("updates state", async function () {
        const config = await loadFixture(_beforeEach_revokeMinterForContract);
        // expect minter to be approved for contract
        let result = await config.minterFilter.isApprovedMinterForContract(
          config.genArt721Core.address,
          config.minter.address
        );
        expect(result).to.be.true;
        // revoke minter for contract
        await config.minterFilter
          .connect(config.accounts.deployer)
          .revokeMinterForContract(
            config.genArt721Core.address,
            config.minter.address
          );
        // expect minter to no longer be approved for contract
        result = await config.minterFilter.isApprovedMinterForContract(
          config.genArt721Core.address,
          config.minter.address
        );
        expect(result).to.be.false;
      });

      it("does not remove global approval minter", async function () {
        const config = await loadFixture(_beforeEach_revokeMinterForContract);
        // expect minter to be approved for contract
        let result = await config.minterFilter.isApprovedMinterForContract(
          config.genArt721Core.address,
          config.minter.address
        );
        expect(result).to.be.true;
        // add global approval of minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .approveMinterGlobally(config.minter.address);
        // revoke minter for contract
        await config.minterFilter
          .connect(config.accounts.deployer)
          .revokeMinterForContract(
            config.genArt721Core.address,
            config.minter.address
          );
        // expect minter to still be approved globally for any contract
        result = await config.minterFilter.isApprovedMinterForContract(
          constants.ZERO_ADDRESS,
          config.minter.address
        );
        expect(result).to.be.true;
      });
    });
  });
});
