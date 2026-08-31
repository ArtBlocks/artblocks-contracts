import { constants } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  mintProjectUntilRemaining,
  advanceEVMByTime,
  GENART721_ERROR_NAME,
  GENART721_ERROR_CODES,
  PROJECT_UPDATED_FIELDS,
} from "../../util/common";
import { FOUR_WEEKS } from "../../util/constants";

const coreContractsToTest = [
  "GenArt721CoreV3_Engine",
  "GenArt721CoreV3_Engine_Flex",
];

for (const coreContractName of coreContractsToTest) {
  describe(`${coreContractName} Transfer Hooks`, async function () {
    async function _beforeEach() {
      let config: T_Config = {
        accounts: await getAccounts(),
      };
      config = await assignDefaultConstants(config);

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

      await config.genArt721Core
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist.address);
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);

      await config.genArt721Core
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist2.address);
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectOne);
      await config.genArt721Core
        .connect(config.accounts.artist2)
        .updateProjectMaxInvocations(config.projectOne, config.maxInvocations);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectOne, config.minter.address);
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectZero, 0);
      await config.minter
        .connect(config.accounts.artist2)
        .updatePricePerTokenInWei(config.projectOne, 0);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist2)
        .toggleProjectIsPaused(config.projectOne);

      config.transferHook = await deployAndGet(config, "MockTransferHook", []);
      return config;
    }

    describe("configureProjectTransferHook", function () {
      it("allows artist or admin to set and clear a hook", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        expect(
          (
            await config.genArt721Core.projectTransferHookConfig(
              config.projectZero
            )
          ).hook
        ).to.equal(config.transferHook.address);

        await config.genArt721Core
          .connect(config.accounts.deployer)
          .configureProjectTransferHook(
            config.projectZero,
            constants.ZERO_ADDRESS
          );
        expect(
          (
            await config.genArt721Core.projectTransferHookConfig(
              config.projectZero
            )
          ).hook
        ).to.equal(constants.ZERO_ADDRESS);
      });

      it("reverts for non-artist non-admin", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.genArt721Core
            .connect(config.accounts.user)
            .configureProjectTransferHook(
              config.projectZero,
              config.transferHook.address
            )
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.OnlyArtistOrAdminACL);
      });

      it("reverts for a non-existent project", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .configureProjectTransferHook(999, config.transferHook.address)
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.ProjectDoesNotExist);
      });

      it("reverts when the hook does not implement ITransferHook", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .configureProjectTransferHook(
              config.projectZero,
              config.minter.address
            )
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookInvalidInterface);
      });

      it("emits ProjectUpdated and ProjectTransferHookUpdated", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .configureProjectTransferHook(
              config.projectZero,
              config.transferHook.address
            )
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            PROJECT_UPDATED_FIELDS.FIELD_PROJECT_TRANSFER_HOOK
          )
          .and.to.emit(config.genArt721Core, "ProjectTransferHookUpdated")
          .withArgs(config.projectZero, config.transferHook.address);
      });

      it("auto-locks at address(0) when the four-week project metadata lock elapses with no hook set", async function () {
        const config = await loadFixture(_beforeEach);
        await mintProjectUntilRemaining(
          config,
          config.projectZero,
          config.accounts.artist,
          0
        );
        await advanceEVMByTime(FOUR_WEEKS + 1);

        const hookConfig = await config.genArt721Core.projectTransferHookConfig(
          config.projectZero
        );
        expect(hookConfig.hook).to.equal(constants.ZERO_ADDRESS);
        expect(hookConfig.locked).to.equal(true);

        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .configureProjectTransferHook(
              config.projectZero,
              config.transferHook.address
            )
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookLocked);

        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .lockProjectTransferHook(config.projectZero, constants.ZERO_ADDRESS)
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookLocked);
      });

      it("remains configurable after the four-week lock if a hook was already set", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        await mintProjectUntilRemaining(
          config,
          config.projectZero,
          config.accounts.artist,
          0
        );
        await advanceEVMByTime(FOUR_WEEKS + 1);

        const hookConfigBefore =
          await config.genArt721Core.projectTransferHookConfig(
            config.projectZero
          );
        expect(hookConfigBefore.hook).to.equal(config.transferHook.address);
        expect(hookConfigBefore.locked).to.equal(false);

        const transferHook2 = await deployAndGet(
          config,
          "MockTransferHook",
          []
        );
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            transferHook2.address
          );
        expect(
          (
            await config.genArt721Core.projectTransferHookConfig(
              config.projectZero
            )
          ).hook
        ).to.equal(transferHook2.address);

        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            constants.ZERO_ADDRESS
          );
        const hookConfigCleared =
          await config.genArt721Core.projectTransferHookConfig(
            config.projectZero
          );
        expect(hookConfigCleared.hook).to.equal(constants.ZERO_ADDRESS);
        expect(hookConfigCleared.locked).to.equal(true);

        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .configureProjectTransferHook(
              config.projectZero,
              config.transferHook.address
            )
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookLocked);
      });
    });

    describe("lockProjectTransferHook", function () {
      it("is artist-only and one-way", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .lockProjectTransferHook(config.projectZero, constants.ZERO_ADDRESS)
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.OnlyArtist);

        await expect(
          config.genArt721Core
            .connect(config.accounts.user)
            .lockProjectTransferHook(config.projectZero, constants.ZERO_ADDRESS)
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.OnlyArtist);

        await config.genArt721Core
          .connect(config.accounts.artist)
          .lockProjectTransferHook(config.projectZero, constants.ZERO_ADDRESS);
        expect(
          (
            await config.genArt721Core.projectTransferHookConfig(
              config.projectZero
            )
          ).locked
        ).to.equal(true);

        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .lockProjectTransferHook(config.projectZero, constants.ZERO_ADDRESS)
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookLocked);
      });

      it("locking at address(0) forever forbids assigning a hook", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .lockProjectTransferHook(config.projectZero, constants.ZERO_ADDRESS);

        // transfers remain unhooked — today's security profile
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .transferFrom(
            config.accounts.artist.address,
            config.accounts.user.address,
            config.projectZeroTokenZero.toNumber()
          );
        expect(
          await config.genArt721Core.ownerOf(
            config.projectZeroTokenZero.toNumber()
          )
        ).to.equal(config.accounts.user.address);
        expect(await config.transferHook.callCount()).to.equal(0);

        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .configureProjectTransferHook(
              config.projectZero,
              config.transferHook.address
            )
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookLocked);

        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .configureProjectTransferHook(
              config.projectZero,
              config.transferHook.address
            )
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookLocked);

        expect(
          (
            await config.genArt721Core.projectTransferHookConfig(
              config.projectZero
            )
          ).hook
        ).to.equal(constants.ZERO_ADDRESS);
      });

      it("can still lock a configured hook after the four-week project metadata lock", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        await mintProjectUntilRemaining(
          config,
          config.projectZero,
          config.accounts.artist,
          0
        );
        await advanceEVMByTime(FOUR_WEEKS + 1);

        await config.genArt721Core
          .connect(config.accounts.artist)
          .lockProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );

        expect(
          (
            await config.genArt721Core.projectTransferHookConfig(
              config.projectZero
            )
          ).locked
        ).to.equal(true);

        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .configureProjectTransferHook(
              config.projectZero,
              constants.ZERO_ADDRESS
            )
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookLocked);
      });

      it("locking a configured hook freezes that hook", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        await config.genArt721Core
          .connect(config.accounts.artist)
          .lockProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );

        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .configureProjectTransferHook(
              config.projectZero,
              constants.ZERO_ADDRESS
            )
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookLocked);

        expect(
          (
            await config.genArt721Core.projectTransferHookConfig(
              config.projectZero
            )
          ).hook
        ).to.equal(config.transferHook.address);
      });

      it("emits ProjectTransferHookLocked with the frozen hook address", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .lockProjectTransferHook(
              config.projectZero,
              config.transferHook.address
            )
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            PROJECT_UPDATED_FIELDS.FIELD_PROJECT_TRANSFER_HOOK_LOCKED
          )
          .and.to.emit(config.genArt721Core, "ProjectTransferHookLocked")
          .withArgs(config.projectZero, config.transferHook.address);
      });
    });

    describe("dispatch", function () {
      it("does not call a hook when none is configured", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        expect(await config.transferHook.callCount()).to.equal(0);

        await config.genArt721Core
          .connect(config.accounts.artist)
          .transferFrom(
            config.accounts.artist.address,
            config.accounts.user.address,
            config.projectZeroTokenZero.toNumber()
          );
        expect(await config.transferHook.callCount()).to.equal(0);
      });

      it("calls the hook on mint after hash assignment", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );

        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);

        expect(await config.transferHook.callCount()).to.equal(1);
        expect(await config.transferHook.lastCoreContract()).to.equal(
          config.genArt721Core.address
        );
        expect(await config.transferHook.lastTokenId()).to.equal(
          config.projectZeroTokenZero.toNumber()
        );
        expect(await config.transferHook.lastFrom()).to.equal(
          constants.ZERO_ADDRESS
        );
        expect(await config.transferHook.lastTo()).to.equal(
          config.accounts.user.address
        );
        // mint operator is `_by` (the purchaser), not the minter contract
        expect(await config.transferHook.lastOperator()).to.equal(
          config.accounts.user.address
        );
        expect(await config.transferHook.lastTokenHash()).to.not.equal(
          ethers.constants.HashZero
        );
      });

      it("calls the hook on transferFrom and safeTransferFrom", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        expect(await config.transferHook.callCount()).to.equal(1);

        await config.genArt721Core
          .connect(config.accounts.artist)
          .transferFrom(
            config.accounts.artist.address,
            config.accounts.user.address,
            config.projectZeroTokenZero.toNumber()
          );
        expect(await config.transferHook.callCount()).to.equal(2);
        expect(await config.transferHook.lastFrom()).to.equal(
          config.accounts.artist.address
        );
        expect(await config.transferHook.lastTo()).to.equal(
          config.accounts.user.address
        );
        expect(await config.transferHook.lastOperator()).to.equal(
          config.accounts.artist.address
        );

        await config.genArt721Core
          .connect(config.accounts.user)
          [
            "safeTransferFrom(address,address,uint256)"
          ](config.accounts.user.address, config.accounts.user2.address, config.projectZeroTokenZero.toNumber());
        expect(await config.transferHook.callCount()).to.equal(3);
        expect(await config.transferHook.lastFrom()).to.equal(
          config.accounts.user.address
        );
        expect(await config.transferHook.lastTo()).to.equal(
          config.accounts.user2.address
        );
        expect(await config.transferHook.lastOperator()).to.equal(
          config.accounts.user.address
        );
      });

      it("passes the approved operator as operator", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .approve(
            config.accounts.user.address,
            config.projectZeroTokenZero.toNumber()
          );
        await config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.artist.address,
            config.accounts.user2.address,
            config.projectZeroTokenZero.toNumber()
          );
        expect(await config.transferHook.lastOperator()).to.equal(
          config.accounts.user.address
        );
      });

      it("does not dispatch a project-zero hook for a project-one token", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        await config.minter
          .connect(config.accounts.artist2)
          .purchase(config.projectOne);
        expect(await config.transferHook.callCount()).to.equal(0);
      });

      it("reverting hook aborts mint and transfer", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        await config.transferHook.setShouldRevert(true);

        await expect(
          config.minter
            .connect(config.accounts.artist)
            .purchase(config.projectZero)
        ).to.be.revertedWith("MockTransferHook: Intentional revert");

        await config.transferHook.setShouldRevert(false);
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        await config.transferHook.setShouldRevert(true);

        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .transferFrom(
              config.accounts.artist.address,
              config.accounts.user.address,
              config.projectZeroTokenZero.toNumber()
            )
        ).to.be.revertedWith("MockTransferHook: Intentional revert");

        expect(
          await config.genArt721Core.ownerOf(
            config.projectZeroTokenZero.toNumber()
          )
        ).to.equal(config.accounts.artist.address);
      });
    });

    describe("reentrancy", function () {
      it("reverts if the hook reenters transferFrom", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);

        // transfer to the hook so it is the owner and could otherwise transfer
        await config.transferHook.setReenterTransfer(
          true,
          config.accounts.user.address
        );
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .transferFrom(
              config.accounts.artist.address,
              config.transferHook.address,
              config.projectZeroTokenZero.toNumber()
            )
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookReentrancy);
      });

      it("reverts if the hook reenters configureProjectTransferHook", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        // hook must be the artist so auth would otherwise pass and the
        // reentrancy guard is what fails
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProjectArtistAddress(
            config.projectZero,
            config.transferHook.address
          );
        await config.transferHook.setReenterConfigure(true);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .purchase(config.projectZero)
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookReentrancy);
      });

      it("reverts if the hook reenters lockProjectTransferHook", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProjectArtistAddress(
            config.projectZero,
            config.transferHook.address
          );
        await config.transferHook.setReenterLock(true);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .purchase(config.projectZero)
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookReentrancy);
      });
    });

    describe("lock front-running guard", function () {
      it("reverts if the configured hook does not match _expectedHook", async function () {
        const config = await loadFixture(_beforeEach);
        // artist intends to lock at address(0), but a hook lands first
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .lockProjectTransferHook(config.projectZero, constants.ZERO_ADDRESS)
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookUnexpectedHook);
        // the unintended hook was NOT locked in
        expect(
          (
            await config.genArt721Core.projectTransferHookConfig(
              config.projectZero
            )
          ).locked
        ).to.equal(false);
      });

      it("reverts if a different hook is configured than expected", async function () {
        const config = await loadFixture(_beforeEach);
        const otherHook = await deployAndGet(config, "MockTransferHook", []);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .lockProjectTransferHook(config.projectZero, otherHook.address)
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookUnexpectedHook);
      });

      it("succeeds when _expectedHook matches address(0)", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .lockProjectTransferHook(config.projectZero, constants.ZERO_ADDRESS);
        expect(
          (
            await config.genArt721Core.projectTransferHookConfig(
              config.projectZero
            )
          ).locked
        ).to.equal(true);
      });
    });

    describe("configure validation edge cases", function () {
      it("reverts when the hook is an EOA (no returndata from supportsInterface)", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .configureProjectTransferHook(
              config.projectZero,
              config.accounts.user.address
            )
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookInvalidInterface);
      });

      it("reverts when the hook is the core contract itself", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .configureProjectTransferHook(
              config.projectZero,
              config.genArt721Core.address
            )
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookInvalidInterface);
      });

      it("projectTransferHookConfig reverts for a non-existent project", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(config.genArt721Core.projectTransferHookConfig(999))
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.ProjectDoesNotExist);
      });
    });

    describe("guard scope", function () {
      it("blocks a hook from transferring a token of a different project", async function () {
        const config = await loadFixture(_beforeEach);
        // mint a project one token to the user, with no hook on project one
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectOne);
        const projectOneTokenZero = config.projectOneTokenZero.toNumber();
        // project one owner approves the hook to move their token
        await config.genArt721Core
          .connect(config.accounts.user)
          .setApprovalForAll(config.transferHook.address, true);
        // configure hook on project zero only, and have it attempt to move the
        // project one token during a project zero transfer
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        await config.transferHook.setReenterTransfer(
          true,
          config.accounts.user2.address
        );
        await config.transferHook.setReenterCustomToken(
          true,
          config.accounts.user.address,
          projectOneTokenZero
        );
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .purchase(config.projectZero)
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookReentrancy);
        // project one token was not moved
        expect(
          await config.genArt721Core.ownerOf(projectOneTokenZero)
        ).to.equal(config.accounts.user.address);
      });

      it("blocks a hook from minting on the core via a second minter", async function () {
        const config = await loadFixture(_beforeEach);
        // @dev a second minter is used so that the reentrant purchase is not
        // short-circuited by the first minter's own reentrancy guard; this
        // exercises the core's guard directly
        const minter2 = await deployAndGet(config, "MinterSetPriceV2", [
          config.genArt721Core.address,
          config.minterFilter.address,
        ]);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(minter2.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(config.projectOne, minter2.address);
        await minter2
          .connect(config.accounts.artist2)
          .updatePricePerTokenInWei(config.projectOne, 0);

        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        await config.transferHook.setReenterPurchase(
          true,
          minter2.address,
          config.projectOne
        );
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .purchase(config.projectZero)
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.TransferHookReentrancy);
        // no project one token was minted
        expect(
          (await config.genArt721Core.projectStateData(config.projectOne))
            .invocations
        ).to.equal(0);
      });

      it("is additionally blocked by the minter's own reentrancy guard when reentering the same minter", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        await config.transferHook.setReenterPurchase(
          true,
          config.minter.address,
          config.projectOne
        );
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .purchase(config.projectZero)
        ).to.be.revertedWith("ReentrancyGuard: reentrant call");
      });

      it("releases the guard before onERC721Received, so a receiver may forward", async function () {
        const config = await loadFixture(_beforeEach);
        const receiver = await deployAndGet(
          config,
          "MockForwardingERC721Receiver",
          []
        );
        await receiver.setForwardTo(config.accounts.user2.address);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        const tokenId = config.projectZeroTokenZero.toNumber();

        await config.genArt721Core
          .connect(config.accounts.artist)
          [
            "safeTransferFrom(address,address,uint256)"
          ](config.accounts.artist.address, receiver.address, tokenId);

        // the receiver forwarded the token onward within the same transaction
        expect(await config.genArt721Core.ownerOf(tokenId)).to.equal(
          config.accounts.user2.address
        );
        // hook fired for the mint, the safe transfer, and the forward
        expect(await config.transferHook.callCount()).to.equal(3);
        expect(await config.transferHook.lastFrom()).to.equal(receiver.address);
        expect(await config.transferHook.lastTo()).to.equal(
          config.accounts.user2.address
        );
      });

      it("allows multiple sequential transfers in a single transaction", async function () {
        const config = await loadFixture(_beforeEach);
        const batcher = await deployAndGet(config, "MockBatchTransferrer", []);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            config.transferHook.address
          );
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        const tokenZero = config.projectZeroTokenZero.toNumber();
        const tokenOne = config.projectZeroTokenOne.toNumber();
        await config.genArt721Core
          .connect(config.accounts.artist)
          .setApprovalForAll(batcher.address, true);

        await batcher.batchTransfer(
          config.genArt721Core.address,
          config.accounts.artist.address,
          config.accounts.user.address,
          [tokenZero, tokenOne]
        );

        expect(await config.genArt721Core.ownerOf(tokenZero)).to.equal(
          config.accounts.user.address
        );
        expect(await config.genArt721Core.ownerOf(tokenOne)).to.equal(
          config.accounts.user.address
        );
        // two mints + two transfers
        expect(await config.transferHook.callCount()).to.equal(4);
      });
    });

    describe("AbstractTransferHook caller authentication", function () {
      it("reverts when onTokenTransfer is called by an address other than coreContract", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.transferHook
            .connect(config.accounts.user)
            .onTokenTransfer(
              config.genArt721Core.address,
              0,
              config.accounts.artist.address,
              config.accounts.user.address,
              config.accounts.user.address
            )
        )
          .to.be.revertedWithCustomError(
            config.transferHook,
            "TransferHookCallerNotCoreContract"
          )
          .withArgs(config.accounts.user.address, config.genArt721Core.address);
      });

      it("advertises the ITransferHook interface id", async function () {
        const config = await loadFixture(_beforeEach);
        // @dev type(ITransferHook).interfaceId — selector of onTokenTransfer
        expect(await config.transferHook.supportsInterface("0x6344b0e2")).to.be
          .true;
        // ERC-165 itself
        expect(await config.transferHook.supportsInterface("0x01ffc9a7")).to.be
          .true;
        expect(await config.transferHook.supportsInterface("0xffffffff")).to.be
          .false;
      });
    });

    describe("gas", function () {
      it("adds a bounded amount of gas to an unhooked transfer [@skip-on-coverage]", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        const tx = await config.genArt721Core
          .connect(config.accounts.artist)
          .transferFrom(
            config.accounts.artist.address,
            config.accounts.user.address,
            config.projectZeroTokenZero.toNumber()
          );
        const receipt = await tx.wait();
        // @dev pre-v3.3 this transfer cost ~58.2k gas; v3.3 adds two cold
        // SLOADs (~4.2k) for the reentrancy flag and the project hook slot.
        // This bound exists to catch an unintended regression in the unhooked
        // path, not to assert an exact figure.
        expect(receipt.gasUsed.toNumber()).to.be.lessThan(64_000);
      });
    });
  });
}
