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
} from "../../../util/common";

const ITRANSFER_HOOK_INTERFACE_ID = "0x6344b0e2";

const coreContractsToTest = [
  "GenArt721CoreV3_Engine",
  "GenArt721CoreV3_Engine_Flex",
];

for (const coreContractName of coreContractsToTest) {
  describe(`OwnerHistoryTransferHook w/ ${coreContractName}`, async function () {
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
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);

      // two projects, so a hook configured on one can be shown not to record
      // transfers of the other
      for (const [projectId, artist] of [
        [config.projectZero, config.accounts.artist],
        [config.projectOne, config.accounts.artist2],
      ] as const) {
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addProject("name", artist.address);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .toggleProjectIsActive(projectId);
        await config.genArt721Core
          .connect(artist)
          .updateProjectMaxInvocations(projectId, config.maxInvocations);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(projectId, config.minter.address);
        await config.minter
          .connect(artist)
          .updatePricePerTokenInWei(projectId, 0);
        await config.genArt721Core
          .connect(artist)
          .toggleProjectIsPaused(projectId);
      }

      config.transferHook = await deployAndGet(
        config,
        "OwnerHistoryTransferHook",
        []
      );
      return config;
    }

    /** Configure the reference hook on projectZero, as the artist would. */
    async function configureHook(config: T_Config) {
      await config.genArt721Core
        .connect(config.accounts.artist)
        .configureProjectTransferHook(
          config.projectZero,
          config.transferHook.address
        );
    }

    describe("ERC-165", function () {
      it("advertises ITransferHook, which the core requires", async function () {
        const config = await loadFixture(_beforeEach);
        expect(
          await config.transferHook.supportsInterface(
            ITRANSFER_HOOK_INTERFACE_ID
          )
        ).to.be.true;
        // the core rejects a hook that does not advertise it, so a successful
        // configure is the check that matters in practice
        await expect(configureHook(config)).to.not.be.reverted;
      });
    });

    describe("recording from mint", function () {
      it("anchors the chain at address(0) and records the minter", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);

        const tokenId = config.projectZeroTokenZero.toNumber();
        const records = await config.transferHook.ownerHistory(
          config.genArt721Core.address,
          tokenId
        );
        expect(records.length).to.equal(2);
        expect(records[0].owner).to.equal(constants.ZERO_ADDRESS);
        expect(records[1].owner).to.equal(config.accounts.user.address);
        expect(
          await config.transferHook.isTrackedFromMint(
            config.genArt721Core.address,
            tokenId
          )
        ).to.be.true;
        expect(
          await config.transferHook.lastRecordedOwner(
            config.genArt721Core.address,
            tokenId
          )
        ).to.equal(config.accounts.user.address);
        // no previous owner yet: the minter is the only real owner, and the
        // address(0) anchor is not one
        expect(
          await config.transferHook.previousOwners(
            config.genArt721Core.address,
            tokenId
          )
        ).to.deep.equal([]);
      });

      it("records a block timestamp on each entry", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        const tx = await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt.blockNumber);

        const records = await config.transferHook.ownerHistory(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
        expect(records[0].timestamp).to.equal(block.timestamp);
        expect(records[1].timestamp).to.equal(block.timestamp);
      });

      it("emits OwnerRecorded for each entry", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        const tokenId = config.projectZeroTokenZero.toNumber();
        await expect(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero)
        )
          .to.emit(config.transferHook, "OwnerRecorded")
          .withArgs(
            config.genArt721Core.address,
            tokenId,
            config.accounts.user.address,
            1,
            (value: any) => value.gt(0)
          );
      });
    });

    describe("recording transfers", function () {
      it("appends each new owner in order", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const tokenId = config.projectZeroTokenZero.toNumber();

        await config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.user.address,
            config.accounts.user2.address,
            tokenId
          );
        await config.genArt721Core
          .connect(config.accounts.user2)
          .transferFrom(
            config.accounts.user2.address,
            config.accounts.artist.address,
            tokenId
          );

        const records = await config.transferHook.ownerHistory(
          config.genArt721Core.address,
          tokenId
        );
        expect(records.map((r: any) => r.owner)).to.deep.equal([
          constants.ZERO_ADDRESS,
          config.accounts.user.address,
          config.accounts.user2.address,
          config.accounts.artist.address,
        ]);
        expect(
          await config.transferHook.previousOwners(
            config.genArt721Core.address,
            tokenId
          )
        ).to.deep.equal([
          config.accounts.user.address,
          config.accounts.user2.address,
        ]);
        expect(
          await config.transferHook.ownerHistoryLength(
            config.genArt721Core.address,
            tokenId
          )
        ).to.equal(4);
      });

      it("records safeTransferFrom the same as transferFrom", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const tokenId = config.projectZeroTokenZero.toNumber();

        await config.genArt721Core
          .connect(config.accounts.user)
          [
            "safeTransferFrom(address,address,uint256)"
          ](config.accounts.user.address, config.accounts.user2.address, tokenId);

        expect(
          await config.transferHook.lastRecordedOwner(
            config.genArt721Core.address,
            tokenId
          )
        ).to.equal(config.accounts.user2.address);
      });

      it("does not record a self-transfer", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const tokenId = config.projectZeroTokenZero.toNumber();

        await config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.user.address,
            config.accounts.user.address,
            tokenId
          );

        // ownership did not change, so the chain must not repeat the owner
        expect(
          await config.transferHook.ownerHistoryLength(
            config.genArt721Core.address,
            tokenId
          )
        ).to.equal(2);
      });
    });

    describe("configured after tokens exist", function () {
      it("anchors at the owner it first observes, not address(0)", async function () {
        const config = await loadFixture(_beforeEach);
        // mint and transfer once with no hook configured
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const tokenId = config.projectZeroTokenZero.toNumber();
        await config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.user.address,
            config.accounts.user2.address,
            tokenId
          );
        expect(
          await config.transferHook.ownerHistoryLength(
            config.genArt721Core.address,
            tokenId
          )
        ).to.equal(0);

        await configureHook(config);
        await config.genArt721Core
          .connect(config.accounts.user2)
          .transferFrom(
            config.accounts.user2.address,
            config.accounts.artist.address,
            tokenId
          );

        const records = await config.transferHook.ownerHistory(
          config.genArt721Core.address,
          tokenId
        );
        expect(records.map((r: any) => r.owner)).to.deep.equal([
          config.accounts.user2.address,
          config.accounts.artist.address,
        ]);
        expect(
          await config.transferHook.isTrackedFromMint(
            config.genArt721Core.address,
            tokenId
          )
        ).to.be.false;
        // the anchor is a real owner here, so it counts as a previous owner
        expect(
          await config.transferHook.previousOwners(
            config.genArt721Core.address,
            tokenId
          )
        ).to.deep.equal([config.accounts.user2.address]);
      });

      it("stops recording when the project's hook is cleared, keeping prior records", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const tokenId = config.projectZeroTokenZero.toNumber();

        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            constants.ZERO_ADDRESS
          );
        await config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.user.address,
            config.accounts.user2.address,
            tokenId
          );

        expect(
          await config.transferHook.ownerHistoryLength(
            config.genArt721Core.address,
            tokenId
          )
        ).to.equal(2);
        // the last recorded owner is now stale relative to the core
        expect(
          await config.transferHook.lastRecordedOwner(
            config.genArt721Core.address,
            tokenId
          )
        ).to.equal(config.accounts.user.address);
        expect(await config.genArt721Core.ownerOf(tokenId)).to.equal(
          config.accounts.user2.address
        );
      });
    });

    describe("scope", function () {
      it("does not record projects that did not configure it", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectOne);

        expect(
          await config.transferHook.ownerHistoryLength(
            config.genArt721Core.address,
            config.projectOneTokenZero.toNumber()
          )
        ).to.equal(0);
      });

      it("keeps separate histories per core contract", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const tokenId = config.projectZeroTokenZero.toNumber();

        // a second "core" writing the same tokenId must not touch the first
        const spoofingCore = await deployAndGet(config, "MockSpoofingCore", []);
        await spoofingCore.setConfiguredHook(config.transferHook.address);
        await spoofingCore.callHook(
          config.transferHook.address,
          tokenId,
          constants.ZERO_ADDRESS,
          config.accounts.user2.address,
          config.accounts.user2.address
        );

        expect(
          await config.transferHook.ownerHistoryLength(
            config.genArt721Core.address,
            tokenId
          )
        ).to.equal(2);
        expect(
          await config.transferHook.lastRecordedOwner(
            config.genArt721Core.address,
            tokenId
          )
        ).to.equal(config.accounts.user.address);
        expect(
          await config.transferHook.lastRecordedOwner(
            spoofingCore.address,
            tokenId
          )
        ).to.equal(config.accounts.user2.address);
      });

      it("reverts when called by an address other than coreContract", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.transferHook
            .connect(config.accounts.user)
            .onTokenTransfer(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              constants.ZERO_ADDRESS,
              config.accounts.user.address,
              config.accounts.user.address
            )
        ).to.be.revertedWithCustomError(
          config.transferHook,
          "TransferHookCallerNotCoreContract"
        );
      });

      it("reverts when the calling core has not configured this hook", async function () {
        const config = await loadFixture(_beforeEach);
        const spoofingCore = await deployAndGet(config, "MockSpoofingCore", []);
        // configuredHook defaults to address(0), i.e. not this hook
        await expect(
          spoofingCore.callHook(
            config.transferHook.address,
            config.projectZeroTokenZero.toNumber(),
            constants.ZERO_ADDRESS,
            config.accounts.user.address,
            config.accounts.user.address
          )
        ).to.be.revertedWithCustomError(
          config.transferHook,
          "HookNotConfiguredForProject"
        );
      });
    });

    describe("ownerHistorySlice", function () {
      it("pages, truncates, and returns empty past the end", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const tokenId = config.projectZeroTokenZero.toNumber();
        await config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.user.address,
            config.accounts.user2.address,
            tokenId
          );
        // chain is now [0x0, user, user2]
        const core = config.genArt721Core.address;

        const firstPage = await config.transferHook.ownerHistorySlice(
          core,
          tokenId,
          0,
          2
        );
        expect(firstPage.map((r: any) => r.owner)).to.deep.equal([
          constants.ZERO_ADDRESS,
          config.accounts.user.address,
        ]);

        // count beyond the end truncates rather than reverting
        const secondPage = await config.transferHook.ownerHistorySlice(
          core,
          tokenId,
          2,
          10
        );
        expect(secondPage.map((r: any) => r.owner)).to.deep.equal([
          config.accounts.user2.address,
        ]);

        expect(
          await config.transferHook.ownerHistorySlice(core, tokenId, 3, 1)
        ).to.deep.equal([]);
      });
    });

    describe("views on an unrecorded token", function () {
      it("return empty rather than reverting", async function () {
        const config = await loadFixture(_beforeEach);
        const core = config.genArt721Core.address;
        const tokenId = config.projectZeroTokenZero.toNumber();
        expect(
          await config.transferHook.ownerHistoryLength(core, tokenId)
        ).to.equal(0);
        expect(
          await config.transferHook.ownerHistory(core, tokenId)
        ).to.deep.equal([]);
        expect(
          await config.transferHook.previousOwners(core, tokenId)
        ).to.deep.equal([]);
        expect(
          await config.transferHook.lastRecordedOwner(core, tokenId)
        ).to.equal(constants.ZERO_ADDRESS);
        expect(await config.transferHook.isTrackedFromMint(core, tokenId)).to.be
          .false;
      });
    });
  });
}

/**
 * The hook's natspec quotes concrete gas figures, because an artist choosing it
 * is choosing that cost for everyone who will ever transfer one of their
 * tokens. Measured here so those figures cannot drift silently.
 */
describe("OwnerHistoryTransferHook gas", async function () {
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
      "GenArt721CoreV3_Engine",
      "MinterFilterV1"
    ));
    config.minter = await deployAndGet(config, "MinterSetPriceV2", [
      config.genArt721Core.address,
      config.minterFilter.address,
    ]);
    await config.minterFilter
      .connect(config.accounts.deployer)
      .addApprovedMinter(config.minter.address);
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .addProject("name", config.accounts.artist.address);
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .toggleProjectIsActive(config.projectZero);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);
    await config.minterFilter
      .connect(config.accounts.deployer)
      .setMinterForProject(config.projectZero, config.minter.address);
    await config.minter
      .connect(config.accounts.artist)
      .updatePricePerTokenInWei(config.projectZero, 0);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .toggleProjectIsPaused(config.projectZero);
    config.transferHook = await deployAndGet(
      config,
      "OwnerHistoryTransferHook",
      []
    );
    return config;
  }

  /**
   * Mint one token and transfer it twice, from an identical starting state, so
   * the only difference between the two runs is whether the hook is configured.
   */
  async function measure(withHook: boolean) {
    const config = await loadFixture(_beforeEach);
    if (withHook) {
      await config.genArt721Core
        .connect(config.accounts.artist)
        .configureProjectTransferHook(
          config.projectZero,
          config.transferHook.address
        );
    }
    const mint = await (
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero)
    ).wait();
    const tokenId = config.projectZeroTokenZero.toNumber();
    const transfer = await (
      await config.genArt721Core
        .connect(config.accounts.user)
        .transferFrom(
          config.accounts.user.address,
          config.accounts.user2.address,
          tokenId
        )
    ).wait();
    return { mint: mint.gasUsed, transfer: transfer.gasUsed };
  }

  it("costs what the documentation says [@skip-on-coverage]", async function () {
    const withoutHook = await measure(false);
    const withHook = await measure(true);

    const transferDelta = withHook.transfer
      .sub(withoutHook.transfer)
      .toNumber();
    const mintDelta = withHook.mint.sub(withoutHook.mint).toNumber();

    // @dev bounds are wide enough to absorb compiler and OpenZeppelin churn,
    // and tight enough that a change of storage layout or an extra SSTORE
    // fails here rather than in production.
    expect(transferDelta).to.be.within(43_000, 54_000);
    expect(mintDelta).to.be.within(83_000, 95_000);
  });
});
