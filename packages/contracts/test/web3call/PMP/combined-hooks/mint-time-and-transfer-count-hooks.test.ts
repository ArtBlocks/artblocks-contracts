import { constants } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import helpers = require("@nomicfoundation/hardhat-network-helpers");
import { Contract } from "ethers";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../../../util/common";
import {
  PMPFixtureConfig,
  setupPMPFixture,
  setupPMPV1Fixture,
} from "../pmpFixtures";
import {
  getPMPInput,
  getPMPInputConfig,
  PMP_AUTH_ENUM,
  PMP_PARAM_TYPE_ENUM,
} from "../pmpTestUtils";
import { constants as ethersConstants } from "ethers";

const ITRANSFER_HOOK_INTERFACE_ID = "0x6344b0e2";
const IPMP_AUGMENT_HOOK_INTERFACE_ID = "0x58f8699f";
const IERC165_INTERFACE_ID = "0x01ffc9a7";

const PARAM_KEY_MINT_TIMESTAMP = "mintTimestamp";
const PARAM_KEY_SECONDS_SINCE_MINT = "secondsSinceMint";
const PARAM_KEY_TRANSFER_COUNT = "transferCount";

const coreContractsToTest = [
  "GenArt721CoreV3_Engine",
  "GenArt721CoreV3_Engine_Flex",
];

function findParam(
  params: { key: string; value: string }[],
  key: string
): { key: string; value: string } | undefined {
  return params.find((p) => p.key === key);
}

for (const coreContractName of coreContractsToTest) {
  describe(`MintTimeAndTransferCountHooks w/ ${coreContractName}`, async function () {
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
        "MintTimeAndTransferCountHooks",
        [constants.ZERO_ADDRESS]
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
        await expect(configureHook(config)).to.not.be.reverted;
      });

      it("advertises IPMPAugmentHook", async function () {
        const config = await loadFixture(_beforeEach);
        expect(
          await config.transferHook.supportsInterface(
            IPMP_AUGMENT_HOOK_INTERFACE_ID
          )
        ).to.be.true;
      });

      it("advertises ERC165 and rejects an unknown interface", async function () {
        const config = await loadFixture(_beforeEach);
        expect(
          await config.transferHook.supportsInterface(IERC165_INTERFACE_ID)
        ).to.be.true;
        expect(await config.transferHook.supportsInterface("0xdeadbeef")).to.be
          .false;
      });
    });

    describe("recording from mint", function () {
      it("records the mint timestamp and leaves transferCount at 0", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        const tx = await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt.blockNumber);

        const tokenId = config.projectZeroTokenZero.toNumber();
        const core = config.genArt721Core.address;
        expect(await config.transferHook.mintTimestamp(core, tokenId)).to.equal(
          block.timestamp
        );
        expect(await config.transferHook.transferCount(core, tokenId)).to.equal(
          0
        );
        expect(await config.transferHook.isTrackedFromMint(core, tokenId)).to.be
          .true;
        const state = await config.transferHook.tokenTransferState(
          core,
          tokenId
        );
        expect(state.mintTimestamp).to.equal(block.timestamp);
        expect(state.transferCount).to.equal(0);
      });

      it("emits MintTimestampRecorded and does not emit TransferCounted on mint", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        const tokenId = config.projectZeroTokenZero.toNumber();
        const tx = await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        await expect(tx)
          .to.emit(config.transferHook, "MintTimestampRecorded")
          .withArgs(config.genArt721Core.address, tokenId, (value: any) =>
            value.gt(0)
          );
        await expect(tx).to.not.emit(config.transferHook, "TransferCounted");
      });
    });

    describe("recording transfers", function () {
      it("increments transferCount once per ownership-changing transfer", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const tokenId = config.projectZeroTokenZero.toNumber();
        const core = config.genArt721Core.address;

        await config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.user.address,
            config.accounts.user2.address,
            tokenId
          );
        expect(await config.transferHook.transferCount(core, tokenId)).to.equal(
          1
        );

        await config.genArt721Core
          .connect(config.accounts.user2)
          .transferFrom(
            config.accounts.user2.address,
            config.accounts.artist.address,
            tokenId
          );
        expect(await config.transferHook.transferCount(core, tokenId)).to.equal(
          2
        );
        // mint timestamp is unchanged by subsequent transfers
        expect(await config.transferHook.isTrackedFromMint(core, tokenId)).to.be
          .true;
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
          await config.transferHook.transferCount(
            config.genArt721Core.address,
            tokenId
          )
        ).to.equal(1);
      });

      it("does not count a self-transfer", async function () {
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

        expect(
          await config.transferHook.transferCount(
            config.genArt721Core.address,
            tokenId
          )
        ).to.equal(0);
      });

      it("emits TransferCounted with the new count", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const tokenId = config.projectZeroTokenZero.toNumber();

        await expect(
          config.genArt721Core
            .connect(config.accounts.user)
            .transferFrom(
              config.accounts.user.address,
              config.accounts.user2.address,
              tokenId
            )
        )
          .to.emit(config.transferHook, "TransferCounted")
          .withArgs(
            config.genArt721Core.address,
            tokenId,
            1,
            config.accounts.user.address,
            config.accounts.user2.address
          );
      });
    });

    describe("configured after tokens exist", function () {
      it("does not backfill mint timestamp, but counts later transfers", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const tokenId = config.projectZeroTokenZero.toNumber();
        const core = config.genArt721Core.address;

        await config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.user.address,
            config.accounts.user2.address,
            tokenId
          );
        expect(await config.transferHook.mintTimestamp(core, tokenId)).to.equal(
          0
        );
        expect(await config.transferHook.transferCount(core, tokenId)).to.equal(
          0
        );

        await configureHook(config);
        await config.genArt721Core
          .connect(config.accounts.user2)
          .transferFrom(
            config.accounts.user2.address,
            config.accounts.artist.address,
            tokenId
          );

        expect(await config.transferHook.mintTimestamp(core, tokenId)).to.equal(
          0
        );
        expect(await config.transferHook.isTrackedFromMint(core, tokenId)).to.be
          .false;
        expect(
          await config.transferHook.secondsSinceMint(core, tokenId)
        ).to.equal(0);
        expect(await config.transferHook.transferCount(core, tokenId)).to.equal(
          1
        );
      });

      it("stops recording when the project's hook is cleared, keeping prior records", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const tokenId = config.projectZeroTokenZero.toNumber();
        const core = config.genArt721Core.address;

        await config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.user.address,
            config.accounts.user2.address,
            tokenId
          );
        await config.genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(
            config.projectZero,
            constants.ZERO_ADDRESS
          );
        await config.genArt721Core
          .connect(config.accounts.user2)
          .transferFrom(
            config.accounts.user2.address,
            config.accounts.artist.address,
            tokenId
          );

        expect(await config.transferHook.transferCount(core, tokenId)).to.equal(
          1
        );
        expect(await config.transferHook.isTrackedFromMint(core, tokenId)).to.be
          .true;
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
          await config.transferHook.mintTimestamp(
            config.genArt721Core.address,
            config.projectOneTokenZero.toNumber()
          )
        ).to.equal(0);
        expect(
          await config.transferHook.transferCount(
            config.genArt721Core.address,
            config.projectOneTokenZero.toNumber()
          )
        ).to.equal(0);
      });

      it("keeps separate state per core contract", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const tokenId = config.projectZeroTokenZero.toNumber();

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
          await config.transferHook.mintTimestamp(
            config.genArt721Core.address,
            tokenId
          )
        ).to.not.equal(0);
        expect(
          await config.transferHook.mintTimestamp(spoofingCore.address, tokenId)
        ).to.not.equal(0);
        expect(
          await config.transferHook.mintTimestamp(
            config.genArt721Core.address,
            tokenId
          )
        ).to.not.equal(
          await config.transferHook.mintTimestamp(spoofingCore.address, tokenId)
        );
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

    describe("views on an unrecorded token", function () {
      it("return zeros rather than reverting", async function () {
        const config = await loadFixture(_beforeEach);
        const core = config.genArt721Core.address;
        const tokenId = config.projectZeroTokenZero.toNumber();
        expect(await config.transferHook.mintTimestamp(core, tokenId)).to.equal(
          0
        );
        expect(await config.transferHook.transferCount(core, tokenId)).to.equal(
          0
        );
        expect(
          await config.transferHook.secondsSinceMint(core, tokenId)
        ).to.equal(0);
        expect(await config.transferHook.isTrackedFromMint(core, tokenId)).to.be
          .false;
        const state = await config.transferHook.tokenTransferState(
          core,
          tokenId
        );
        expect(state.mintTimestamp).to.equal(0);
        expect(state.transferCount).to.equal(0);
      });
    });

    describe("onTokenPMPReadAugmentation", function () {
      it("appends the three reserved keys to empty params after mint", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        const tx = await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt.blockNumber);
        const tokenId = config.projectZeroTokenZero.toNumber();

        const params = await config.transferHook.onTokenPMPReadAugmentation(
          config.genArt721Core.address,
          tokenId,
          []
        );
        expect(params.length).to.equal(3);
        expect(params[0].key).to.equal(PARAM_KEY_MINT_TIMESTAMP);
        expect(params[0].value).to.equal(block.timestamp.toString());
        expect(params[1].key).to.equal(PARAM_KEY_SECONDS_SINCE_MINT);
        expect(parseInt(params[1].value, 10)).to.be.at.least(0);
        expect(params[2].key).to.equal(PARAM_KEY_TRANSFER_COUNT);
        expect(params[2].value).to.equal("0");
      });

      it("preserves existing params and appends the reserved keys", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const tokenId = config.projectZeroTokenZero.toNumber();

        const params = await config.transferHook.onTokenPMPReadAugmentation(
          config.genArt721Core.address,
          tokenId,
          [
            { key: "param1", value: "value1" },
            { key: "param2", value: "value2" },
          ]
        );
        expect(params.length).to.equal(5);
        expect(params[0].key).to.equal("param1");
        expect(params[0].value).to.equal("value1");
        expect(params[1].key).to.equal("param2");
        expect(params[1].value).to.equal("value2");
        expect(params[2].key).to.equal(PARAM_KEY_MINT_TIMESTAMP);
        expect(params[3].key).to.equal(PARAM_KEY_SECONDS_SINCE_MINT);
        expect(params[4].key).to.equal(PARAM_KEY_TRANSFER_COUNT);
      });

      it("strips colliding reserved keys so this hook is the source of truth", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const tokenId = config.projectZeroTokenZero.toNumber();

        const params = await config.transferHook.onTokenPMPReadAugmentation(
          config.genArt721Core.address,
          tokenId,
          [
            { key: PARAM_KEY_MINT_TIMESTAMP, value: "stale" },
            { key: "keepMe", value: "ok" },
            { key: PARAM_KEY_TRANSFER_COUNT, value: "999" },
          ]
        );
        expect(params.length).to.equal(4);
        expect(params[0].key).to.equal("keepMe");
        expect(params[0].value).to.equal("ok");
        expect(params[1].key).to.equal(PARAM_KEY_MINT_TIMESTAMP);
        expect(params[1].value).to.not.equal("stale");
        expect(params[3].key).to.equal(PARAM_KEY_TRANSFER_COUNT);
        expect(params[3].value).to.equal("0");
      });

      it("returns a larger secondsSinceMint after time passes", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHook(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero);
        const tokenId = config.projectZeroTokenZero.toNumber();
        const core = config.genArt721Core.address;

        const elapsed1 = (
          await config.transferHook.secondsSinceMint(core, tokenId)
        ).toNumber();
        await helpers.time.increase(60);
        const elapsed2 = (
          await config.transferHook.secondsSinceMint(core, tokenId)
        ).toNumber();
        expect(elapsed2).to.be.at.least(elapsed1 + 60);

        const params = await config.transferHook.onTokenPMPReadAugmentation(
          core,
          tokenId,
          []
        );
        expect(parseInt(params[1].value, 10)).to.equal(elapsed2);
      });

      it("injects zeros for a token whose mint was not observed", async function () {
        const config = await loadFixture(_beforeEach);
        const params = await config.transferHook.onTokenPMPReadAugmentation(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          []
        );
        expect(params.map((p: { value: string }) => p.value)).to.deep.equal([
          "0",
          "0",
          "0",
        ]);
      });
    });
  });
}

interface T_ConfigWithHook extends PMPFixtureConfig {
  hook: Contract;
}

describe("MintTimeAndTransferCountHooks PMP integration", function () {
  async function _beforeEach(): Promise<T_ConfigWithHook> {
    const config = await loadFixture(setupPMPFixture);
    const hook = await deployAndGet(config, "MintTimeAndTransferCountHooks", [
      config.pmp.address,
    ]);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .configureProjectTransferHook(config.projectZero, hook.address);
    await config.pmp.connect(config.accounts.artist).configureProjectHooks(
      config.genArt721Core.address,
      config.projectZero,
      ethersConstants.AddressZero, // tokenPMPPostConfigHook
      hook.address // tokenPMPReadAugmentationHook
    );
    return {
      ...config,
      hook,
    } as T_ConfigWithHook;
  }

  async function mintNextProjectZeroToken(config: T_ConfigWithHook) {
    const minterAddress = await config.minterFilter.getMinterForProject(
      config.projectZero
    );
    const minter = await ethers.getContractAt(
      "MinterSetPriceV2",
      minterAddress
    );
    const tx = await minter
      .connect(config.accounts.user)
      .purchase(config.projectZero, {
        value: ethers.utils.parseEther("0.1"),
      });
    const receipt = await tx.wait();
    // fixture already minted tokens 0 and 1
    const tokenId = config.projectZeroTokenTwo;
    return { tokenId, receipt, tx };
  }

  function getTransferCountPmpConfig(
    authAddress: string,
    overrides: { maxRange?: string; pmpLockedAfterTimestamp?: number } = {}
  ) {
    return getPMPInputConfig(
      PARAM_KEY_TRANSFER_COUNT,
      PMP_AUTH_ENUM.Address,
      PMP_PARAM_TYPE_ENUM.Uint256Range,
      overrides.pmpLockedAfterTimestamp ?? 0,
      authAddress,
      [],
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      overrides.maxRange ??
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    );
  }

  async function storedTransferCountWithoutAugment(
    config: T_ConfigWithHook,
    tokenId: ReturnType<typeof ethers.BigNumber.from> | number
  ): Promise<string | undefined> {
    await config.pmp
      .connect(config.accounts.artist)
      .configureProjectHooks(
        config.genArt721Core.address,
        config.projectZero,
        ethersConstants.AddressZero,
        ethersConstants.AddressZero
      );
    const params = await config.pmp.getTokenParams(
      config.genArt721Core.address,
      tokenId
    );
    return findParam(params, PARAM_KEY_TRANSFER_COUNT)?.value;
  }

  it("binds the constructor PMP address", async function () {
    const config = await loadFixture(_beforeEach);
    expect(await config.hook.pmp()).to.equal(config.pmp.address);
  });

  it("exposes the documented PostParam keys", async function () {
    const config = await loadFixture(_beforeEach);
    expect(await config.hook.PARAM_KEY_MINT_TIMESTAMP()).to.equal(
      PARAM_KEY_MINT_TIMESTAMP
    );
    expect(await config.hook.PARAM_KEY_SECONDS_SINCE_MINT()).to.equal(
      PARAM_KEY_SECONDS_SINCE_MINT
    );
    expect(await config.hook.PARAM_KEY_TRANSFER_COUNT()).to.equal(
      PARAM_KEY_TRANSFER_COUNT
    );
  });

  it("returns zeros via PMP getTokenParams for a token minted before the transfer hook was configured", async function () {
    const config = await loadFixture(_beforeEach);
    const params = await config.pmp.getTokenParams(
      config.genArt721Core.address,
      config.projectZeroTokenZero
    );
    expect(findParam(params, PARAM_KEY_MINT_TIMESTAMP)?.value).to.equal("0");
    expect(findParam(params, PARAM_KEY_SECONDS_SINCE_MINT)?.value).to.equal(
      "0"
    );
    expect(findParam(params, PARAM_KEY_TRANSFER_COUNT)?.value).to.equal("0");
  });

  it("injects mint timestamp, seconds since mint, and transfer count via PMP getTokenParams", async function () {
    const config = await loadFixture(_beforeEach);
    const { tokenId, receipt } = await mintNextProjectZeroToken(config);
    const block = await ethers.provider.getBlock(receipt.blockNumber);

    const paramsAfterMint = await config.pmp.getTokenParams(
      config.genArt721Core.address,
      tokenId
    );
    expect(
      findParam(paramsAfterMint, PARAM_KEY_MINT_TIMESTAMP)?.value
    ).to.equal(block.timestamp.toString());
    expect(
      findParam(paramsAfterMint, PARAM_KEY_TRANSFER_COUNT)?.value
    ).to.equal("0");

    await config.genArt721Core
      .connect(config.accounts.user)
      .transferFrom(
        config.accounts.user.address,
        config.accounts.user2.address,
        tokenId
      );

    await helpers.time.increase(30);

    const paramsAfterTransfer = await config.pmp.getTokenParams(
      config.genArt721Core.address,
      tokenId
    );
    expect(
      findParam(paramsAfterTransfer, PARAM_KEY_MINT_TIMESTAMP)?.value
    ).to.equal(block.timestamp.toString());
    expect(
      findParam(paramsAfterTransfer, PARAM_KEY_TRANSFER_COUNT)?.value
    ).to.equal("1");
    expect(
      parseInt(
        findParam(paramsAfterTransfer, PARAM_KEY_SECONDS_SINCE_MINT)!.value,
        10
      )
    ).to.be.at.least(30);
  });

  it("keeps configured PostParams and appends the injected keys", async function () {
    const config = await loadFixture(_beforeEach);
    const pmpConfig = getPMPInputConfig(
      "param1",
      PMP_AUTH_ENUM.ArtistAndTokenOwner,
      PMP_PARAM_TYPE_ENUM.String,
      0,
      ethersConstants.AddressZero,
      [],
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    await config.pmp
      .connect(config.accounts.artist)
      .configureProject(config.genArt721Core.address, config.projectZero, [
        pmpConfig,
      ]);

    const { tokenId } = await mintNextProjectZeroToken(config);
    const pmpInput = getPMPInput(
      "param1",
      PMP_PARAM_TYPE_ENUM.String,
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      false,
      "hello"
    );
    await config.pmp
      .connect(config.accounts.user)
      .configureTokenParams(config.genArt721Core.address, tokenId, [pmpInput]);

    const params = await config.pmp.getTokenParams(
      config.genArt721Core.address,
      tokenId
    );
    expect(findParam(params, "param1")?.value).to.equal("hello");
    expect(findParam(params, PARAM_KEY_MINT_TIMESTAMP)).to.not.be.undefined;
    expect(findParam(params, PARAM_KEY_SECONDS_SINCE_MINT)).to.not.be.undefined;
    expect(findParam(params, PARAM_KEY_TRANSFER_COUNT)?.value).to.equal("0");
  });

  describe("Address-auth transferCount PMP writes", function () {
    async function configureTransferCountPmp(config: T_ConfigWithHook) {
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          getTransferCountPmpConfig(config.hook.address),
        ]);
    }

    it("writes transferCount 0 to PMP on mint so the param is populated from first render", async function () {
      const config = await loadFixture(_beforeEach);
      await configureTransferCountPmp(config);
      const { tokenId, tx } = await mintNextProjectZeroToken(config);

      await expect(tx)
        .to.emit(config.pmp, "TokenParamsConfigured")
        .and.to.emit(config.hook, "MintTimestampRecorded");
      await expect(tx).to.not.emit(config.hook, "TransferCounted");

      const params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        tokenId
      );
      expect(findParam(params, PARAM_KEY_TRANSFER_COUNT)?.value).to.equal("0");
    });

    it("writes transferCount to PMP and emits TokenParamsConfigured on transfer", async function () {
      const config = await loadFixture(_beforeEach);
      await configureTransferCountPmp(config);
      const { tokenId } = await mintNextProjectZeroToken(config);

      const tx = await config.genArt721Core
        .connect(config.accounts.user)
        .transferFrom(
          config.accounts.user.address,
          config.accounts.user2.address,
          tokenId
        );
      await expect(tx)
        .to.emit(config.pmp, "TokenParamsConfigured")
        .and.to.emit(config.hook, "TransferCounted");

      const params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        tokenId
      );
      expect(findParam(params, PARAM_KEY_TRANSFER_COUNT)?.value).to.equal("1");
    });

    it("updates the stored PMP on each subsequent transfer", async function () {
      const config = await loadFixture(_beforeEach);
      await configureTransferCountPmp(config);
      const { tokenId } = await mintNextProjectZeroToken(config);

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

      const params = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        tokenId
      );
      expect(findParam(params, PARAM_KEY_TRANSFER_COUNT)?.value).to.equal("2");
    });

    it("does not revert the transfer when the PMP param is not configured", async function () {
      const config = await loadFixture(_beforeEach);
      const { tokenId } = await mintNextProjectZeroToken(config);

      const tx = await config.genArt721Core
        .connect(config.accounts.user)
        .transferFrom(
          config.accounts.user.address,
          config.accounts.user2.address,
          tokenId
        );
      await expect(tx)
        .to.emit(config.hook, "TransferCountPMPSyncFailed")
        .withArgs(config.genArt721Core.address, tokenId, 1);
      await expect(tx).to.not.emit(config.pmp, "TokenParamsConfigured");

      expect(
        await config.hook.transferCount(config.genArt721Core.address, tokenId)
      ).to.equal(1);
      expect(await config.genArt721Core.ownerOf(tokenId)).to.equal(
        config.accounts.user2.address
      );
    });

    it("does not revert the transfer when a different address is authorized", async function () {
      const config = await loadFixture(_beforeEach);
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          getTransferCountPmpConfig(config.accounts.deployer.address),
        ]);
      const { tokenId } = await mintNextProjectZeroToken(config);

      await expect(
        config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.user.address,
            config.accounts.user2.address,
            tokenId
          )
      )
        .to.emit(config.hook, "TransferCountPMPSyncFailed")
        .withArgs(config.genArt721Core.address, tokenId, 1);
    });

    it("does not backfill mint PMP 0 when a token is first seen on transfer", async function () {
      const config = await loadFixture(_beforeEach);
      await configureTransferCountPmp(config);
      // fixture minted token 0 before this hook was configured as the transfer hook
      const tokenId = config.projectZeroTokenZero;
      const core = config.genArt721Core.address;
      expect(await config.hook.isTrackedFromMint(core, tokenId)).to.be.false;

      await expect(
        config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.user.address,
            config.accounts.user2.address,
            tokenId
          )
      ).to.emit(config.pmp, "TokenParamsConfigured");

      expect(await config.hook.mintTimestamp(core, tokenId)).to.equal(0);
      expect(await config.hook.transferCount(core, tokenId)).to.equal(1);
      const params = await config.pmp.getTokenParams(core, tokenId);
      expect(findParam(params, PARAM_KEY_MINT_TIMESTAMP)?.value).to.equal("0");
      expect(findParam(params, PARAM_KEY_TRANSFER_COUNT)?.value).to.equal("1");
    });

    it("does not revert when maxRange is exceeded; PMP stays at the last in-range value", async function () {
      const config = await loadFixture(_beforeEach);
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          getTransferCountPmpConfig(config.hook.address, {
            maxRange:
              "0x0000000000000000000000000000000000000000000000000000000000000001",
          }),
        ]);
      const { tokenId } = await mintNextProjectZeroToken(config);

      await config.genArt721Core
        .connect(config.accounts.user)
        .transferFrom(
          config.accounts.user.address,
          config.accounts.user2.address,
          tokenId
        );
      const tx = await config.genArt721Core
        .connect(config.accounts.user2)
        .transferFrom(
          config.accounts.user2.address,
          config.accounts.artist.address,
          tokenId
        );
      await expect(tx)
        .to.emit(config.hook, "TransferCountPMPSyncFailed")
        .withArgs(config.genArt721Core.address, tokenId, 2);

      expect(
        await config.hook.transferCount(config.genArt721Core.address, tokenId)
      ).to.equal(2);
      expect(await storedTransferCountWithoutAugment(config, tokenId)).to.equal(
        "1"
      );
    });

    it("invokes an existing post-config hook on transferCount writes", async function () {
      const config = await loadFixture(_beforeEach);
      await config.pmp
        .connect(config.accounts.artist)
        .configureProjectHooks(
          config.genArt721Core.address,
          config.projectZero,
          config.configureHook.address,
          config.hook.address
        );
      await configureTransferCountPmp(config);
      const { tokenId, tx } = await mintNextProjectZeroToken(config);

      await expect(tx).to.emit(config.pmp, "TokenParamsConfigured");
      await expect(tx).to.emit(config.configureHook, "TokenPMPConfigured");
      expect(await config.configureHook.lastPmpKey()).to.equal(
        PARAM_KEY_TRANSFER_COUNT
      );
      expect(await config.configureHook.lastTokenId()).to.equal(tokenId);
    });

    it("does not revert mint or transfer when the post-config hook reverts", async function () {
      const config = await loadFixture(_beforeEach);
      await config.configureHook.setShouldRevert(true);
      await config.pmp
        .connect(config.accounts.artist)
        .configureProjectHooks(
          config.genArt721Core.address,
          config.projectZero,
          config.configureHook.address,
          config.hook.address
        );
      await configureTransferCountPmp(config);
      const { tokenId, tx: mintTx } = await mintNextProjectZeroToken(config);
      await expect(mintTx)
        .to.emit(config.hook, "TransferCountPMPSyncFailed")
        .withArgs(config.genArt721Core.address, tokenId, 0);

      const transferTx = await config.genArt721Core
        .connect(config.accounts.user)
        .transferFrom(
          config.accounts.user.address,
          config.accounts.user2.address,
          tokenId
        );
      await expect(transferTx)
        .to.emit(config.hook, "TransferCountPMPSyncFailed")
        .withArgs(config.genArt721Core.address, tokenId, 1);
      expect(await config.genArt721Core.ownerOf(tokenId)).to.equal(
        config.accounts.user2.address
      );
      expect(
        await config.hook.transferCount(config.genArt721Core.address, tokenId)
      ).to.equal(1);
    });
  });
});

describe("MintTimeAndTransferCountHooks PMPV1 value lock", function () {
  async function _beforeEach(): Promise<T_ConfigWithHook> {
    const config = await loadFixture(setupPMPV1Fixture);
    const hook = await deployAndGet(config, "MintTimeAndTransferCountHooks", [
      config.pmp.address,
    ]);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .configureProjectTransferHook(config.projectZero, hook.address);
    await config.pmp
      .connect(config.accounts.artist)
      .configureProjectHooks(
        config.genArt721Core.address,
        config.projectZero,
        ethersConstants.AddressZero,
        hook.address
      );
    return {
      ...config,
      hook,
    } as T_ConfigWithHook;
  }

  async function mintNextProjectZeroToken(config: T_ConfigWithHook) {
    const minterAddress = await config.minterFilter.getMinterForProject(
      config.projectZero
    );
    const minter = await ethers.getContractAt(
      "MinterSetPriceV2",
      minterAddress
    );
    const tx = await minter
      .connect(config.accounts.user)
      .purchase(config.projectZero, {
        value: ethers.utils.parseEther("0.1"),
      });
    await tx.wait();
    return { tokenId: config.projectZeroTokenTwo, tx };
  }

  it("does not revert a transfer after the PMPV1 value lock; PMP stays at the pre-lock count", async function () {
    const config = await loadFixture(_beforeEach);
    const lockAt = (await helpers.time.latest()) + 60;
    await config.pmp
      .connect(config.accounts.artist)
      .configureProject(config.genArt721Core.address, config.projectZero, [
        getPMPInputConfig(
          PARAM_KEY_TRANSFER_COUNT,
          PMP_AUTH_ENUM.Address,
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          lockAt,
          config.hook.address,
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        ),
      ]);
    const { tokenId } = await mintNextProjectZeroToken(config);

    await helpers.time.increase(120);

    const tx = await config.genArt721Core
      .connect(config.accounts.user)
      .transferFrom(
        config.accounts.user.address,
        config.accounts.user2.address,
        tokenId
      );
    await expect(tx)
      .to.emit(config.hook, "TransferCountPMPSyncFailed")
      .withArgs(config.genArt721Core.address, tokenId, 1);
    await expect(tx).to.not.emit(config.pmp, "TokenParamsConfigured");

    expect(
      await config.hook.transferCount(config.genArt721Core.address, tokenId)
    ).to.equal(1);
    expect(await config.genArt721Core.ownerOf(tokenId)).to.equal(
      config.accounts.user2.address
    );

    await config.pmp
      .connect(config.accounts.artist)
      .configureProjectHooks(
        config.genArt721Core.address,
        config.projectZero,
        ethersConstants.AddressZero,
        ethersConstants.AddressZero
      );
    const stored = await config.pmp.getTokenParams(
      config.genArt721Core.address,
      tokenId
    );
    expect(findParam(stored, PARAM_KEY_TRANSFER_COUNT)?.value).to.equal("0");
  });
});

/**
 * The hook's natspec quotes concrete gas figures, because an artist choosing it
 * is choosing that cost for everyone who will ever transfer one of their
 * tokens. Measured here so those figures cannot drift silently.
 */
describe("MintTimeAndTransferCountHooks gas", async function () {
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
      "MintTimeAndTransferCountHooks",
      [constants.ZERO_ADDRESS]
    );
    return config;
  }

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
    // measured: mint 40,387 / transfer 28,012
    expect(transferDelta).to.be.within(23_000, 33_000);
    expect(mintDelta).to.be.within(35_000, 46_000);
  });
});

/**
 * Production path: transfer hook plus Address-auth `transferCount` PMP writes.
 * Hook-only figures above do not include this cost.
 */
describe("MintTimeAndTransferCountHooks gas with PMP writes", async function () {
  async function _beforeEach(withHook: boolean) {
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
      "GenArt721CoreV3_Engine_Flex",
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

    const delegateRegistry = await deployAndGet(config, "DelegateRegistry", []);
    const pmp = await deployAndGet(config, "PMPV0", [delegateRegistry.address]);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .addProjectAssetDependencyOnChainAtAddress(
        config.projectZero,
        pmp.address
      );

    config.transferHook = await deployAndGet(
      config,
      "MintTimeAndTransferCountHooks",
      [pmp.address]
    );
    if (withHook) {
      await config.genArt721Core
        .connect(config.accounts.artist)
        .configureProjectTransferHook(
          config.projectZero,
          config.transferHook.address
        );
      await pmp
        .connect(config.accounts.artist)
        .configureProjectHooks(
          config.genArt721Core.address,
          config.projectZero,
          ethersConstants.AddressZero,
          config.transferHook.address
        );
      await pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          getPMPInputConfig(
            PARAM_KEY_TRANSFER_COUNT,
            PMP_AUTH_ENUM.Address,
            PMP_PARAM_TYPE_ENUM.Uint256Range,
            0,
            config.transferHook.address,
            [],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
          ),
        ]);
    }
    return config;
  }

  async function measure(withHook: boolean) {
    const config = await loadFixture(_beforeEach.bind(null, withHook));
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

  it("PMP writes add bounded gas on mint and transfer [@skip-on-coverage]", async function () {
    const withoutHook = await measure(false);
    const withHook = await measure(true);

    const transferDelta = withHook.transfer
      .sub(withoutHook.transfer)
      .toNumber();
    const mintDelta = withHook.mint.sub(withoutHook.mint).toNumber();

    // measured: mint 92,840 / transfer 78,449
    expect(transferDelta).to.be.within(73_000, 84_000);
    expect(mintDelta).to.be.within(87_000, 99_000);
  });
});
