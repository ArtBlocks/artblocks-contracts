import { constants } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumber, Contract } from "ethers";
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
  getPMPInput,
  getPMPInputConfig,
  PMP_AUTH_ENUM,
  PMP_PARAM_TYPE_ENUM,
} from "../pmpTestUtils";

const ITRANSFER_HOOK_INTERFACE_ID = "0x6344b0e2";
const IPMP_AUGMENT_HOOK_INTERFACE_ID = "0x58f8699f";
const IPMP_CONFIGURE_HOOK_INTERFACE_ID = "0x677e7135";
const IERC165_INTERFACE_ID = "0x01ffc9a7";

const PARAM_KEY_BOUND_PALETTE_TOKEN_ID = "boundPaletteTokenId";
const PARAM_KEY_BOUND_PALETTE_TOKEN_HASH = "boundPaletteTokenHash";
const PARAM_KEY_BOUND_FORM_TOKEN_ID = "boundFormTokenId";

const UNBOUND = 0;

// project layout used by every test in this file
const FORM_PROJECT_ID = 0;
const PALETTE_PROJECT_ID = 1;
const OTHER_PROJECT_ID = 2;

const FORM_TOKEN_ZERO = BigNumber.from(0);
const FORM_TOKEN_ONE = BigNumber.from(1);
const PALETTE_TOKEN_ZERO = BigNumber.from(1_000_000);
const PALETTE_TOKEN_ONE = BigNumber.from(1_000_001);
const OTHER_TOKEN_ZERO = BigNumber.from(2_000_000);
const PALETTE_PARAM_MAX_RANGE = BigNumber.from(1_999_999);

// IFormPaletteBindingHooks.UnbindReason
const UNBIND_REASON = {
  Configured: 0,
  FormTransferred: 1,
  PaletteTransferred: 2,
};

// IFormPaletteBindingHooks.BindBlocker
const BIND_BLOCKER = {
  None: 0,
  FormTokenNotInFormProject: 1,
  PaletteTokenNotInPaletteProject: 2,
  FormTokenDoesNotExist: 3,
  PaletteTokenDoesNotExist: 4,
  FormAlreadyBound: 5,
  PaletteAlreadyBound: 6,
  OwnerMismatch: 7,
};

function toBytes32(value: BigNumber | number): string {
  return ethers.utils.hexZeroPad(BigNumber.from(value).toHexString(), 32);
}

function bindInput(paletteTokenId: BigNumber | number) {
  return getPMPInput(
    PARAM_KEY_BOUND_PALETTE_TOKEN_ID,
    PMP_PARAM_TYPE_ENUM.Uint256Range,
    toBytes32(paletteTokenId),
    false,
    ""
  );
}

function findParam(
  params: { key: string; value: string }[],
  key: string
): { key: string; value: string } | undefined {
  return params.find((p) => p.key === key);
}

interface BindingConfig extends T_Config {
  genArt721Core: Contract;
  pmp: Contract;
  hook: Contract;
  minter: Contract;
}

describe("FormPaletteBindingHooks", async function () {
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
      "GenArt721CoreV3_Engine_Flex",
      "MinterFilterV1"
    ));

    const minter = await deployAndGet(config, "MinterSetPriceV2", [
      config.genArt721Core.address,
      config.minterFilter.address,
    ]);
    await config.minterFilter
      .connect(config.accounts.deployer)
      .addApprovedMinter(minter.address);

    // three projects, all by the same artist: form, palette, and an unrelated
    // project used to prove the hook leaves projects it does not serve alone
    for (const projectId of [
      FORM_PROJECT_ID,
      PALETTE_PROJECT_ID,
      OTHER_PROJECT_ID,
    ]) {
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .addProject(`project ${projectId}`, config.accounts.artist.address);
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(projectId);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(projectId, config.maxInvocations);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(projectId, minter.address);
      await minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(projectId, 0);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(projectId);
    }

    const delegateRegistry = await deployAndGet(config, "DelegateRegistry", []);
    const pmp = await deployAndGet(config, "PMPV1", [delegateRegistry.address]);

    const hook = await deployAndGet(config, "FormPaletteBindingHooks", [
      pmp.address,
      config.genArt721Core.address,
      FORM_PROJECT_ID,
      config.genArt721Core.address,
      PALETTE_PROJECT_ID,
    ]);

    const bindingConfig = {
      ...config,
      minter,
      pmp,
      hook,
    } as BindingConfig;
    return bindingConfig;
  }

  /** Apply the full setup documented in the hook's natspec. */
  async function configureAll(config: BindingConfig) {
    await configureBindingParam(config);
    await config.pmp
      .connect(config.accounts.artist)
      .configureProjectHooks(
        config.genArt721Core.address,
        FORM_PROJECT_ID,
        config.hook.address,
        config.hook.address
      );
    await config.pmp
      .connect(config.accounts.artist)
      .configureProjectHooks(
        config.genArt721Core.address,
        PALETTE_PROJECT_ID,
        constants.ZERO_ADDRESS,
        config.hook.address
      );
    for (const projectId of [FORM_PROJECT_ID, PALETTE_PROJECT_ID]) {
      await config.genArt721Core
        .connect(config.accounts.artist)
        .configureProjectTransferHook(projectId, config.hook.address);
    }
  }

  async function configureBindingParam(
    config: BindingConfig,
    overrides?: {
      authOption?: number;
      paramType?: number;
      authAddress?: string;
      minRange?: string;
      maxRange?: string;
      lockedAfter?: number;
    }
  ) {
    await config.pmp
      .connect(config.accounts.artist)
      .configureProject(config.genArt721Core.address, FORM_PROJECT_ID, [
        getPMPInputConfig(
          PARAM_KEY_BOUND_PALETTE_TOKEN_ID,
          overrides?.authOption ?? PMP_AUTH_ENUM.TokenOwnerAndAddress,
          overrides?.paramType ?? PMP_PARAM_TYPE_ENUM.Uint256Range,
          overrides?.lockedAfter ?? 0,
          overrides?.authAddress ?? config.hook.address,
          [],
          overrides?.minRange ?? toBytes32(UNBOUND),
          overrides?.maxRange ?? toBytes32(PALETTE_PARAM_MAX_RANGE)
        ),
      ]);
  }

  /** Mint `count` tokens of `projectId` to `to`. */
  async function mint(
    config: BindingConfig,
    projectId: number,
    to: any,
    count: number
  ) {
    for (let i = 0; i < count; i++) {
      await config.minter.connect(to).purchase(projectId, { value: 0 });
    }
  }

  /** Standard scenario: user owns form #0/#1 and palette #0/#1, all bindable. */
  async function _withTokens() {
    const config = await loadFixture(_beforeEach);
    await configureAll(config);
    await mint(config, FORM_PROJECT_ID, config.accounts.user, 2);
    await mint(config, PALETTE_PROJECT_ID, config.accounts.user, 2);
    return config;
  }

  async function bind(
    config: BindingConfig,
    signer: any,
    formTokenId: BigNumber,
    paletteTokenId: BigNumber | number
  ) {
    return config.pmp
      .connect(signer)
      .configureTokenParams(config.genArt721Core.address, formTokenId, [
        bindInput(paletteTokenId),
      ]);
  }

  async function getParams(config: BindingConfig, tokenId: BigNumber) {
    return config.pmp.getTokenParams(config.genArt721Core.address, tokenId);
  }

  describe("constructor", async function () {
    it("stores the immutable configuration", async function () {
      const config = await loadFixture(_beforeEach);
      expect(await config.hook.pmp()).to.equal(config.pmp.address);
      expect(await config.hook.formCore()).to.equal(
        config.genArt721Core.address
      );
      expect(await config.hook.formProjectId()).to.equal(FORM_PROJECT_ID);
      expect(await config.hook.paletteCore()).to.equal(
        config.genArt721Core.address
      );
      expect(await config.hook.paletteProjectId()).to.equal(PALETTE_PROJECT_ID);
      expect(await config.hook.bindingParamMaxRange()).to.equal(
        PALETTE_PARAM_MAX_RANGE
      );
      expect(await config.hook.UNBOUND_PARAM_VALUE()).to.equal(UNBOUND);
    });

    it("reverts on a zero PMP, zero core, palette project zero, or self-pairing", async function () {
      const config = await loadFixture(_beforeEach);
      const factory = await ethers.getContractFactory(
        "FormPaletteBindingHooks"
      );
      const core = config.genArt721Core.address;
      const zero = constants.ZERO_ADDRESS;
      const cases: [string, number, string, number][] = [
        // zero pmp
        [zero, core, FORM_PROJECT_ID, core, PALETTE_PROJECT_ID] as any,
        // zero form core
        [config.pmp.address, zero, FORM_PROJECT_ID, core, PALETTE_PROJECT_ID],
        // zero palette core
        [config.pmp.address, core, FORM_PROJECT_ID, zero, PALETTE_PROJECT_ID],
        // palette project id of zero collides with UNBOUND_PARAM_VALUE
        [config.pmp.address, core, FORM_PROJECT_ID, core, 0],
        // form and palette are the same project
        [
          config.pmp.address,
          core,
          PALETTE_PROJECT_ID,
          core,
          PALETTE_PROJECT_ID,
        ],
      ] as any;
      for (const args of cases) {
        await expect(
          factory.deploy(...(args as any))
        ).to.be.revertedWithCustomError(config.hook, "InvalidConstructorArgs");
      }
    });
  });

  describe("supportsInterface", async function () {
    it("advertises every interface its three registrations require", async function () {
      const config = await loadFixture(_beforeEach);
      // required by v3.3 cores before configureProjectTransferHook
      expect(await config.hook.supportsInterface(ITRANSFER_HOOK_INTERFACE_ID))
        .to.be.true;
      // required by PMP before configureProjectHooks
      expect(
        await config.hook.supportsInterface(IPMP_AUGMENT_HOOK_INTERFACE_ID)
      ).to.be.true;
      expect(
        await config.hook.supportsInterface(IPMP_CONFIGURE_HOOK_INTERFACE_ID)
      ).to.be.true;
      expect(await config.hook.supportsInterface(IERC165_INTERFACE_ID)).to.be
        .true;
      expect(await config.hook.supportsInterface("0xffffffff")).to.be.false;
    });

    it("is accepted by both cores and the PMP at registration time", async function () {
      const config = await loadFixture(_beforeEach);
      // reverts if supportsInterface answers incorrectly for any of the three
      await configureAll(config);
    });
  });

  describe("required PMP setup", async function () {
    // The hook's natspec specifies the binding param's configuration exactly,
    // and the contract deliberately does not re-check it on chain. Asserted
    // here against the live PMP so the documented setup stays pinned, and so a
    // deploy script has a reference for what to verify off chain.
    it("matches the configuration the natspec specifies", async function () {
      const config = await loadFixture(_beforeEach);
      await configureAll(config);
      const paramConfig = await config.pmp.getProjectPMPConfig(
        config.genArt721Core.address,
        FORM_PROJECT_ID,
        PARAM_KEY_BOUND_PALETTE_TOKEN_ID
      );
      expect(paramConfig.paramType).to.equal(PMP_PARAM_TYPE_ENUM.Uint256Range);
      expect(paramConfig.authOption).to.equal(
        PMP_AUTH_ENUM.TokenOwnerAndAddress
      );
      // the hook must be the authAddress, or transfer-driven unbinds cannot be
      // written and every pairing outlives the transfer that should break it
      expect(paramConfig.authAddress).to.equal(config.hook.address);
      expect(BigNumber.from(paramConfig.minRange)).to.equal(UNBOUND);
      expect(BigNumber.from(paramConfig.maxRange)).to.equal(
        await config.hook.bindingParamMaxRange()
      );
      // a non-zero lock timestamp would eventually freeze the param's value on
      // PMPV1, making existing pairings permanent
      expect(paramConfig.pmpLockedAfterTimestamp).to.equal(0);
    });

    it("configures the project hooks on both projects", async function () {
      const config = await loadFixture(_beforeEach);
      await configureAll(config);
      const formConfig = await config.pmp.getProjectConfig(
        config.genArt721Core.address,
        FORM_PROJECT_ID
      );
      expect(formConfig.tokenPMPPostConfigHook).to.equal(config.hook.address);
      expect(formConfig.tokenPMPReadAugmentationHook).to.equal(
        config.hook.address
      );
      const paletteConfig = await config.pmp.getProjectConfig(
        config.genArt721Core.address,
        PALETTE_PROJECT_ID
      );
      // the palette project has no binding param, so it needs no configure hook
      expect(paletteConfig.tokenPMPPostConfigHook).to.equal(
        constants.ZERO_ADDRESS
      );
      expect(paletteConfig.tokenPMPReadAugmentationHook).to.equal(
        config.hook.address
      );
      // the transfer hook must be set on BOTH projects
      for (const projectId of [FORM_PROJECT_ID, PALETTE_PROJECT_ID]) {
        const [hookAddress] =
          await config.genArt721Core.projectTransferHookConfig(projectId);
        expect(hookAddress).to.equal(config.hook.address);
      }
    });
  });

  describe("configure hook access control", async function () {
    it("reverts when called by anyone other than the bound PMP", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.hook
          .connect(config.accounts.user)
          .onTokenPMPConfigure(
            config.genArt721Core.address,
            FORM_TOKEN_ZERO,
            bindInput(PALETTE_TOKEN_ZERO)
          )
      )
        .to.be.revertedWithCustomError(config.hook, "OnlyPMP")
        .withArgs(config.accounts.user.address);
    });

    it("ignores writes of keys it does not own", async function () {
      const config = await _withTokens();
      // add an unrelated param alongside the binding param
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, FORM_PROJECT_ID, [
          getPMPInputConfig(
            PARAM_KEY_BOUND_PALETTE_TOKEN_ID,
            PMP_AUTH_ENUM.TokenOwnerAndAddress,
            PMP_PARAM_TYPE_ENUM.Uint256Range,
            0,
            config.hook.address,
            [],
            toBytes32(UNBOUND),
            toBytes32(PALETTE_PARAM_MAX_RANGE)
          ),
          getPMPInputConfig(
            "unrelated",
            PMP_AUTH_ENUM.TokenOwner,
            PMP_PARAM_TYPE_ENUM.Bool,
            0,
            constants.ZERO_ADDRESS,
            [],
            toBytes32(0),
            toBytes32(0)
          ),
        ]);
      await expect(
        config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(config.genArt721Core.address, FORM_TOKEN_ZERO, [
            getPMPInput(
              "unrelated",
              PMP_PARAM_TYPE_ENUM.Bool,
              toBytes32(1),
              false,
              ""
            ),
          ])
      ).to.not.be.reverted;
      const [isBound] = await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      expect(isBound).to.be.false;
    });

    it("reverts if registered as the configure hook on a project it does not serve", async function () {
      const config = await _withTokens();
      // artist points the palette project's configure hook at this contract and
      // gives it a binding param, which is not a supported configuration
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, PALETTE_PROJECT_ID, [
          getPMPInputConfig(
            PARAM_KEY_BOUND_PALETTE_TOKEN_ID,
            PMP_AUTH_ENUM.TokenOwnerAndAddress,
            PMP_PARAM_TYPE_ENUM.Uint256Range,
            0,
            config.hook.address,
            [],
            toBytes32(UNBOUND),
            toBytes32(PALETTE_PARAM_MAX_RANGE)
          ),
        ]);
      await config.pmp
        .connect(config.accounts.artist)
        .configureProjectHooks(
          config.genArt721Core.address,
          PALETTE_PROJECT_ID,
          config.hook.address,
          config.hook.address
        );
      await expect(
        config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(
            config.genArt721Core.address,
            PALETTE_TOKEN_ZERO,
            [bindInput(PALETTE_TOKEN_ONE)]
          )
      )
        .to.be.revertedWithCustomError(
          config.hook,
          "ConfigureHookOnUnexpectedProject"
        )
        .withArgs(config.genArt721Core.address, PALETTE_TOKEN_ZERO);
    });
  });

  describe("binding", async function () {
    it("binds both directions and emits Bound", async function () {
      const config = await _withTokens();
      await expect(
        bind(config, config.accounts.user, FORM_TOKEN_ZERO, PALETTE_TOKEN_ZERO)
      )
        .to.emit(config.hook, "Bound")
        .withArgs(
          FORM_TOKEN_ZERO,
          PALETTE_TOKEN_ZERO,
          config.accounts.user.address
        );

      const [formBound, palette] =
        await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      expect(formBound).to.be.true;
      expect(palette).to.equal(PALETTE_TOKEN_ZERO);
      const [paletteBound, form] =
        await config.hook.boundFormOf(PALETTE_TOKEN_ZERO);
      expect(paletteBound).to.be.true;
      expect(form).to.equal(FORM_TOKEN_ZERO);
    });

    it("rejects a palette token held by a different wallet", async function () {
      const config = await loadFixture(_beforeEach);
      await configureAll(config);
      await mint(config, FORM_PROJECT_ID, config.accounts.user, 1);
      await mint(config, PALETTE_PROJECT_ID, config.accounts.user2, 1);
      await expect(
        bind(config, config.accounts.user, FORM_TOKEN_ZERO, PALETTE_TOKEN_ZERO)
      )
        .to.be.revertedWithCustomError(config.hook, "OwnerMismatch")
        .withArgs(config.accounts.user.address, config.accounts.user2.address);
    });

    it("rejects a palette token already bound to another form token", async function () {
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      await expect(
        bind(config, config.accounts.user, FORM_TOKEN_ONE, PALETTE_TOKEN_ZERO)
      )
        .to.be.revertedWithCustomError(config.hook, "PaletteAlreadyBound")
        .withArgs(PALETTE_TOKEN_ZERO, FORM_TOKEN_ZERO);
    });

    it("rejects re-pointing a bound form token at a different palette", async function () {
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      await expect(
        bind(config, config.accounts.user, FORM_TOKEN_ZERO, PALETTE_TOKEN_ONE)
      )
        .to.be.revertedWithCustomError(config.hook, "FormAlreadyBound")
        .withArgs(FORM_TOKEN_ZERO, PALETTE_TOKEN_ZERO);
    });

    it("rejects a token id outside the palette project", async function () {
      const config = await _withTokens();
      // in range for the PMP param, but a form-project token id
      await expect(
        bind(config, config.accounts.user, FORM_TOKEN_ZERO, FORM_TOKEN_ONE)
      )
        .to.be.revertedWithCustomError(
          config.hook,
          "PaletteTokenNotInPaletteProject"
        )
        .withArgs(FORM_TOKEN_ONE);
      // above the palette project: rejected by the PMP's own range check
      await expect(
        bind(config, config.accounts.user, FORM_TOKEN_ZERO, OTHER_TOKEN_ZERO)
      ).to.be.revertedWith("PMP: param value out of bounds");
    });

    it("rejects an unminted palette token", async function () {
      const config = await _withTokens();
      await expect(
        bind(
          config,
          config.accounts.user,
          FORM_TOKEN_ZERO,
          PALETTE_TOKEN_ONE.add(50)
        )
      ).to.be.reverted;
    });

    it("rejects a caller who is not the form token owner", async function () {
      const config = await _withTokens();
      await expect(
        bind(config, config.accounts.user2, FORM_TOKEN_ZERO, PALETTE_TOKEN_ZERO)
      ).to.be.revertedWith("PMP: token owner and address auth required");
    });

    it("treats a re-write of the current pairing as a no-op", async function () {
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      await expect(
        bind(config, config.accounts.user, FORM_TOKEN_ZERO, PALETTE_TOKEN_ZERO)
      ).to.not.emit(config.hook, "Bound");
      const [isBound, palette] =
        await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      expect(isBound).to.be.true;
      expect(palette).to.equal(PALETTE_TOKEN_ZERO);
    });
  });

  describe("unbinding via the binding param", async function () {
    it("clears both directions and emits Unbound(Configured)", async function () {
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      await expect(bind(config, config.accounts.user, FORM_TOKEN_ZERO, UNBOUND))
        .to.emit(config.hook, "Unbound")
        .withArgs(
          FORM_TOKEN_ZERO,
          PALETTE_TOKEN_ZERO,
          UNBIND_REASON.Configured
        );
      const [formBound] = await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      const [paletteBound] = await config.hook.boundFormOf(PALETTE_TOKEN_ZERO);
      expect(formBound).to.be.false;
      expect(paletteBound).to.be.false;
    });

    it("is a no-op when already unbound", async function () {
      const config = await _withTokens();
      await expect(
        bind(config, config.accounts.user, FORM_TOKEN_ZERO, UNBOUND)
      ).to.not.emit(config.hook, "Unbound");
    });

    it("swaps a form token's palette atomically via two inputs in one write", async function () {
      // PMP processes pmpInputs sequentially and calls the configure hook after
      // each, so [unbind, bind] on one form token is a single transaction that
      // still passes through the unbound state, and emits one
      // TokenParamsConfigured -> one re-render of the form token.
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      const tx = config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(config.genArt721Core.address, FORM_TOKEN_ZERO, [
          bindInput(UNBOUND),
          bindInput(PALETTE_TOKEN_ONE),
        ]);
      await expect(tx)
        .to.emit(config.hook, "Unbound")
        .withArgs(
          FORM_TOKEN_ZERO,
          PALETTE_TOKEN_ZERO,
          UNBIND_REASON.Configured
        );
      await expect(tx)
        .to.emit(config.hook, "Bound")
        .withArgs(
          FORM_TOKEN_ZERO,
          PALETTE_TOKEN_ONE,
          config.accounts.user.address
        );
      const receipt = await (await tx).wait();
      const configuredEvents = receipt.events.filter(
        (e: any) =>
          e.address === config.pmp.address &&
          e.event === "TokenParamsConfigured"
      );
      expect(configuredEvents.length).to.equal(1);

      const [, palette] = await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      expect(palette).to.equal(PALETTE_TOKEN_ONE);
      const [oldStillBound] = await config.hook.boundFormOf(PALETTE_TOKEN_ZERO);
      expect(oldStillBound).to.be.false;
    });

    it("still rejects stealing a bound palette via a two-input write", async function () {
      // the two-input trick does not defeat the strict rule: the protection is
      // on the palette side, and the other form token was never written
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      await expect(
        config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(config.genArt721Core.address, FORM_TOKEN_ONE, [
            bindInput(UNBOUND),
            bindInput(PALETTE_TOKEN_ZERO),
          ])
      )
        .to.be.revertedWithCustomError(config.hook, "PaletteAlreadyBound")
        .withArgs(PALETTE_TOKEN_ZERO, FORM_TOKEN_ZERO);
    });

    it("supports the queued unbind-then-bind move of a palette to another form token", async function () {
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      // tx 1: unbind, which re-renders form #0
      await bind(config, config.accounts.user, FORM_TOKEN_ZERO, UNBOUND);
      // tx 2: bind, which re-renders form #1
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ONE,
        PALETTE_TOKEN_ZERO
      );
      const [, form] = await config.hook.boundFormOf(PALETTE_TOKEN_ZERO);
      expect(form).to.equal(FORM_TOKEN_ONE);
      const [zeroBound] = await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      expect(zeroBound).to.be.false;
    });
  });

  describe("augmentation", async function () {
    it("injects the bound palette token id and hash on a form token", async function () {
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      const params = await getParams(config, FORM_TOKEN_ZERO);
      expect(
        findParam(params, PARAM_KEY_BOUND_PALETTE_TOKEN_ID)?.value
      ).to.equal(PALETTE_TOKEN_ZERO.toString());
      const expectedHash =
        await config.genArt721Core.tokenIdToHash(PALETTE_TOKEN_ZERO);
      expect(
        findParam(params, PARAM_KEY_BOUND_PALETTE_TOKEN_HASH)?.value
      ).to.equal(expectedHash.toLowerCase());
    });

    it("always injects a zero-padded 32-byte hash string", async function () {
      // GenArt721GeneratorV0 stringifies hashes unpadded, dropping leading zero
      // bytes; this key is always padded so one derivation works for every token
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      const params = await getParams(config, FORM_TOKEN_ZERO);
      const hash = findParam(params, PARAM_KEY_BOUND_PALETTE_TOKEN_HASH)?.value;
      expect(hash).to.have.lengthOf(66);
      expect(hash).to.match(/^0x[0-9a-f]{64}$/);
    });

    it("injects the bound form token id on a palette token", async function () {
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      const params = await getParams(config, PALETTE_TOKEN_ZERO);
      expect(findParam(params, PARAM_KEY_BOUND_FORM_TOKEN_ID)?.value).to.equal(
        FORM_TOKEN_ZERO.toString()
      );
      // the palette project never carries the binding param itself
      expect(findParam(params, PARAM_KEY_BOUND_PALETTE_TOKEN_ID)).to.be
        .undefined;
    });

    it("injects empty strings when unbound", async function () {
      const config = await _withTokens();
      const formParams = await getParams(config, FORM_TOKEN_ZERO);
      expect(
        findParam(formParams, PARAM_KEY_BOUND_PALETTE_TOKEN_ID)?.value
      ).to.equal("");
      expect(
        findParam(formParams, PARAM_KEY_BOUND_PALETTE_TOKEN_HASH)?.value
      ).to.equal("");
      const paletteParams = await getParams(config, PALETTE_TOKEN_ZERO);
      expect(
        findParam(paletteParams, PARAM_KEY_BOUND_FORM_TOKEN_ID)?.value
      ).to.equal("");
    });

    it("strips the raw stored binding param so only canonical state is exposed", async function () {
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      const params = await getParams(config, FORM_TOKEN_ZERO);
      // exactly one entry for the key, and it is the injected (string) form
      const matches = params.filter(
        (p: any) => p.key === PARAM_KEY_BOUND_PALETTE_TOKEN_ID
      );
      expect(matches.length).to.equal(1);
      expect(matches[0].value).to.equal(PALETTE_TOKEN_ZERO.toString());
    });

    it("preserves unrelated params", async function () {
      const config = await _withTokens();
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, FORM_PROJECT_ID, [
          getPMPInputConfig(
            PARAM_KEY_BOUND_PALETTE_TOKEN_ID,
            PMP_AUTH_ENUM.TokenOwnerAndAddress,
            PMP_PARAM_TYPE_ENUM.Uint256Range,
            0,
            config.hook.address,
            [],
            toBytes32(UNBOUND),
            toBytes32(PALETTE_PARAM_MAX_RANGE)
          ),
          getPMPInputConfig(
            "unrelated",
            PMP_AUTH_ENUM.TokenOwner,
            PMP_PARAM_TYPE_ENUM.Bool,
            0,
            constants.ZERO_ADDRESS,
            [],
            toBytes32(0),
            toBytes32(0)
          ),
        ]);
      await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(config.genArt721Core.address, FORM_TOKEN_ZERO, [
          getPMPInput(
            "unrelated",
            PMP_PARAM_TYPE_ENUM.Bool,
            toBytes32(1),
            false,
            ""
          ),
        ]);
      const params = await getParams(config, FORM_TOKEN_ZERO);
      expect(findParam(params, "unrelated")?.value).to.equal("true");
      expect(
        findParam(params, PARAM_KEY_BOUND_PALETTE_TOKEN_ID)?.value
      ).to.equal("");
    });

    it("passes params through untouched on a project it does not serve", async function () {
      const config = await _withTokens();
      const input = [
        { key: PARAM_KEY_BOUND_PALETTE_TOKEN_ID, value: "not-stripped" },
        { key: "other", value: "kept" },
      ];
      const result = await config.hook.onTokenPMPReadAugmentation(
        config.genArt721Core.address,
        OTHER_TOKEN_ZERO,
        input
      );
      expect(result.length).to.equal(2);
      expect(result[0].value).to.equal("not-stripped");
      expect(result[1].value).to.equal("kept");
    });

    it("reports unbound when the two tokens no longer share an owner", async function () {
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      // simulate a deployment that never configured the palette project's
      // transfer hook, so nothing clears the pairing on transfer
      await config.genArt721Core
        .connect(config.accounts.artist)
        .configureProjectTransferHook(
          PALETTE_PROJECT_ID,
          constants.ZERO_ADDRESS
        );
      await config.genArt721Core
        .connect(config.accounts.user)
        .transferFrom(
          config.accounts.user.address,
          config.accounts.user2.address,
          PALETTE_TOKEN_ZERO
        );
      // canonical mapping is stale...
      const [isBound] = await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      expect(isBound).to.be.true;
      // ...but the render-time backstop refuses to report it
      const params = await getParams(config, FORM_TOKEN_ZERO);
      expect(
        findParam(params, PARAM_KEY_BOUND_PALETTE_TOKEN_ID)?.value
      ).to.equal("");
      expect(
        findParam(params, PARAM_KEY_BOUND_PALETTE_TOKEN_HASH)?.value
      ).to.equal("");
    });
  });

  describe("transfer hook", async function () {
    it("rejects a caller that is not the core it names", async function () {
      const config = await _withTokens();
      await expect(
        config.hook
          .connect(config.accounts.user)
          .onTokenTransfer(
            config.genArt721Core.address,
            FORM_TOKEN_ZERO,
            config.accounts.user.address,
            config.accounts.user2.address,
            config.accounts.user.address
          )
      ).to.be.revertedWithCustomError(
        config.hook,
        "TransferHookCallerNotCoreContract"
      );
    });

    it("is inert when a spoofing contract names itself as the core", async function () {
      // The one caller AbstractTransferHook cannot reject: a contract passing
      // its own address as coreContract. It can also lie about being the
      // configured hook, so the immutable core/project checks are the guard
      // that actually holds.
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      const spoofingCore = await deployAndGet(config, "MockSpoofingCore", []);
      await spoofingCore.setConfiguredHook(config.hook.address);

      // drive both branches with real, currently-bound token ids
      for (const tokenId of [FORM_TOKEN_ZERO, PALETTE_TOKEN_ZERO]) {
        await expect(
          spoofingCore
            .connect(config.accounts.user2)
            .callHook(
              config.hook.address,
              tokenId,
              config.accounts.user.address,
              config.accounts.user2.address,
              config.accounts.user2.address
            )
        ).to.not.emit(config.hook, "Unbound");
      }
      // the real pairing is untouched
      const [isBound, palette] =
        await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      expect(isBound).to.be.true;
      expect(palette).to.equal(PALETTE_TOKEN_ZERO);
    });

    it("unbinds and writes the binding param when the form token transfers", async function () {
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      const tx = config.genArt721Core
        .connect(config.accounts.user)
        .transferFrom(
          config.accounts.user.address,
          config.accounts.user2.address,
          FORM_TOKEN_ZERO
        );
      await expect(tx)
        .to.emit(config.hook, "Unbound")
        .withArgs(
          FORM_TOKEN_ZERO,
          PALETTE_TOKEN_ZERO,
          UNBIND_REASON.FormTransferred
        );
      // the PostParam write is what triggers the off-chain re-render
      await expect(tx).to.emit(config.pmp, "TokenParamsConfigured");

      const [formBound] = await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      const [paletteBound] = await config.hook.boundFormOf(PALETTE_TOKEN_ZERO);
      expect(formBound).to.be.false;
      expect(paletteBound).to.be.false;
      const stored = await config.pmp.getTokenPMPStorage(
        config.genArt721Core.address,
        FORM_TOKEN_ZERO,
        PARAM_KEY_BOUND_PALETTE_TOKEN_ID
      );
      expect(stored.configuredValue).to.equal(toBytes32(UNBOUND));
    });

    it("unbinds and re-renders the FORM token when the palette token transfers", async function () {
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      const tx = config.genArt721Core
        .connect(config.accounts.user)
        .transferFrom(
          config.accounts.user.address,
          config.accounts.user2.address,
          PALETTE_TOKEN_ZERO
        );
      await expect(tx)
        .to.emit(config.hook, "Unbound")
        .withArgs(
          FORM_TOKEN_ZERO,
          PALETTE_TOKEN_ZERO,
          UNBIND_REASON.PaletteTransferred
        );
      // the write targets the form token, not the transferred palette token
      await expect(tx)
        .to.emit(config.pmp, "TokenParamsConfigured")
        .withArgs(
          config.genArt721Core.address,
          FORM_TOKEN_ZERO,
          (inputs: any) => inputs.length === 1,
          (auths: any) => auths[0] === config.hook.address
        );
      const params = await getParams(config, FORM_TOKEN_ZERO);
      expect(
        findParam(params, PARAM_KEY_BOUND_PALETTE_TOKEN_ID)?.value
      ).to.equal("");
    });

    it("keeps the pairing on a self-transfer", async function () {
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      await expect(
        config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.user.address,
            config.accounts.user.address,
            FORM_TOKEN_ZERO
          )
      ).to.not.emit(config.hook, "Unbound");
      const [isBound] = await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      expect(isBound).to.be.true;
    });

    it("does nothing on mint or on transfer of an unbound token", async function () {
      const config = await loadFixture(_beforeEach);
      await configureAll(config);
      // mint path
      await expect(mint(config, FORM_PROJECT_ID, config.accounts.user, 1)).to
        .not.be.reverted;
      await mint(config, PALETTE_PROJECT_ID, config.accounts.user, 1);
      // unbound transfer path
      await expect(
        config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.user.address,
            config.accounts.user2.address,
            FORM_TOKEN_ZERO
          )
      ).to.not.emit(config.hook, "Unbound");
    });

    it("does nothing when configured on a project it does not serve", async function () {
      const config = await _withTokens();
      await config.genArt721Core
        .connect(config.accounts.artist)
        .configureProjectTransferHook(OTHER_PROJECT_ID, config.hook.address);
      await mint(config, OTHER_PROJECT_ID, config.accounts.user, 1);
      await expect(
        config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.user.address,
            config.accounts.user2.address,
            OTHER_TOKEN_ZERO
          )
      ).to.not.be.reverted;
    });

    it("allows the new owner to bind after a transfer breaks the pairing", async function () {
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      // move both tokens to user2, breaking the pairing on the first transfer
      for (const tokenId of [FORM_TOKEN_ZERO, PALETTE_TOKEN_ZERO]) {
        await config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.user.address,
            config.accounts.user2.address,
            tokenId
          );
      }
      const [isBound] = await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      expect(isBound).to.be.false;
      // the new owner re-binds
      await expect(
        bind(config, config.accounts.user2, FORM_TOKEN_ZERO, PALETTE_TOKEN_ZERO)
      )
        .to.emit(config.hook, "Bound")
        .withArgs(
          FORM_TOKEN_ZERO,
          PALETTE_TOKEN_ZERO,
          config.accounts.user2.address
        );
    });

    it("swallows a failed binding param write rather than bricking the transfer", async function () {
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      // artist reconfigures the project without the binding key, bumping the
      // config nonce; the hook's write now reverts inside the transfer
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, FORM_PROJECT_ID, [
          getPMPInputConfig(
            "unrelated",
            PMP_AUTH_ENUM.TokenOwner,
            PMP_PARAM_TYPE_ENUM.Bool,
            0,
            constants.ZERO_ADDRESS,
            [],
            toBytes32(0),
            toBytes32(0)
          ),
        ]);
      const tx = config.genArt721Core
        .connect(config.accounts.user)
        .transferFrom(
          config.accounts.user.address,
          config.accounts.user2.address,
          PALETTE_TOKEN_ZERO
        );
      await expect(tx)
        .to.emit(config.hook, "BindingParamSyncFailed")
        .withArgs(FORM_TOKEN_ZERO);
      // the transfer still succeeded and the pairing is still broken on chain
      expect(await config.genArt721Core.ownerOf(PALETTE_TOKEN_ZERO)).to.equal(
        config.accounts.user2.address
      );
      const [isBound] = await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      expect(isBound).to.be.false;
    });
  });

  describe("previewBind", async function () {
    it("allows a valid pairing", async function () {
      const config = await _withTokens();
      const [allowed, blocker] = await config.hook.previewBind(
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      expect(allowed).to.be.true;
      expect(blocker).to.equal(BIND_BLOCKER.None);
    });

    it("allows re-writing the pairing that already exists", async function () {
      // the write path treats this as a no-op success, so previewBind must not
      // report FormAlreadyBound and send a front end into a needless unbind
      const config = await _withTokens();
      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      const [allowed, blocker] = await config.hook.previewBind(
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      expect(allowed).to.be.true;
      expect(blocker).to.equal(BIND_BLOCKER.None);
      // and the write it predicts does in fact succeed
      await expect(
        bind(config, config.accounts.user, FORM_TOKEN_ZERO, PALETTE_TOKEN_ZERO)
      ).to.not.be.reverted;
    });

    it("reports each blocker without reverting", async function () {
      const config = await _withTokens();
      // wrong projects
      expect(
        (
          await config.hook.previewBind(PALETTE_TOKEN_ZERO, PALETTE_TOKEN_ONE)
        )[1]
      ).to.equal(BIND_BLOCKER.FormTokenNotInFormProject);
      expect(
        (await config.hook.previewBind(FORM_TOKEN_ZERO, FORM_TOKEN_ONE))[1]
      ).to.equal(BIND_BLOCKER.PaletteTokenNotInPaletteProject);
      // nonexistent tokens
      expect(
        (
          await config.hook.previewBind(
            FORM_TOKEN_ONE.add(50),
            PALETTE_TOKEN_ZERO
          )
        )[1]
      ).to.equal(BIND_BLOCKER.FormTokenDoesNotExist);
      expect(
        (
          await config.hook.previewBind(
            FORM_TOKEN_ZERO,
            PALETTE_TOKEN_ONE.add(50)
          )
        )[1]
      ).to.equal(BIND_BLOCKER.PaletteTokenDoesNotExist);

      await bind(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        PALETTE_TOKEN_ZERO
      );
      expect(
        (await config.hook.previewBind(FORM_TOKEN_ZERO, PALETTE_TOKEN_ONE))[1]
      ).to.equal(BIND_BLOCKER.FormAlreadyBound);
      expect(
        (await config.hook.previewBind(FORM_TOKEN_ONE, PALETTE_TOKEN_ZERO))[1]
      ).to.equal(BIND_BLOCKER.PaletteAlreadyBound);

      // owner mismatch
      await config.genArt721Core
        .connect(config.accounts.user)
        .transferFrom(
          config.accounts.user.address,
          config.accounts.user2.address,
          PALETTE_TOKEN_ONE
        );
      expect(
        (await config.hook.previewBind(FORM_TOKEN_ONE, PALETTE_TOKEN_ONE))[1]
      ).to.equal(BIND_BLOCKER.OwnerMismatch);
    });
  });

  describe("protocol premise", async function () {
    it("proves a configure hook cannot write a PostParam (PMP is nonReentrant)", async function () {
      // This is the constraint the strict state machine exists for: if a
      // configure hook could write, a bind could re-render the form token it
      // displaced and implicit re-pointing would be safe.
      const config = await _withTokens();
      const reentrantHook = await deployAndGet(
        config,
        "MockPMPReentrantConfigureHook",
        [
          config.pmp.address,
          config.genArt721Core.address,
          FORM_TOKEN_ONE,
          PARAM_KEY_BOUND_PALETTE_TOKEN_ID,
        ]
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureProjectHooks(
          config.genArt721Core.address,
          FORM_PROJECT_ID,
          reentrantHook.address,
          constants.ZERO_ADDRESS
        );
      await expect(
        bind(config, config.accounts.user, FORM_TOKEN_ZERO, PALETTE_TOKEN_ZERO)
      ).to.be.revertedWithCustomError(
        config.pmp,
        "ReentrancyGuardReentrantCall"
      );
    });
  });
});

/**
 * The hook's natspec quotes concrete gas figures, because configuring it means
 * choosing that cost for everyone who will ever transfer one of these tokens.
 * Measured here so those figures cannot drift silently.
 * @dev measured on `GenArt721CoreV3_Engine_Flex` with PMPV1.
 */
describe("FormPaletteBindingHooks gas", async function () {
  const FORM_TOKEN_TWO = BigNumber.from(2);

  /**
   * Builds a standalone environment and returns gas for each path. With
   * `withHook` false nothing is configured and the transfer is a plain ERC-721
   * move — the baseline every delta is taken against.
   */
  async function measure(withHook: boolean) {
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
    const minter = await deployAndGet(config, "MinterSetPriceV2", [
      config.genArt721Core.address,
      config.minterFilter.address,
    ]);
    await config.minterFilter
      .connect(config.accounts.deployer)
      .addApprovedMinter(minter.address);
    for (const projectId of [FORM_PROJECT_ID, PALETTE_PROJECT_ID]) {
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .addProject(`project ${projectId}`, config.accounts.artist.address);
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(projectId);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(projectId, config.maxInvocations);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(projectId, minter.address);
      await minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(projectId, 0);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(projectId);
    }
    const delegateRegistry = await deployAndGet(config, "DelegateRegistry", []);
    const pmp = await deployAndGet(config, "PMPV1", [delegateRegistry.address]);
    const hook = await deployAndGet(config, "FormPaletteBindingHooks", [
      pmp.address,
      config.genArt721Core.address,
      FORM_PROJECT_ID,
      config.genArt721Core.address,
      PALETTE_PROJECT_ID,
    ]);
    const local = { ...config, minter, pmp, hook } as BindingConfig;

    if (withHook) {
      await configureAllFor(local);
    }
    // three of each, all held by `user`
    for (const projectId of [FORM_PROJECT_ID, PALETTE_PROJECT_ID]) {
      for (let i = 0; i < 3; i++) {
        await minter
          .connect(config.accounts.user)
          .purchase(projectId, { value: 0 });
      }
    }

    const move = async (tokenId: BigNumber) => {
      const tx = await config.genArt721Core
        .connect(config.accounts.user)
        .transferFrom(
          config.accounts.user.address,
          config.accounts.user2.address,
          tokenId
        );
      return (await tx.wait()).gasUsed;
    };
    const write = async (formTokenId: BigNumber, value: BigNumber | number) => {
      const tx = await pmp
        .connect(config.accounts.user)
        .configureTokenParams(config.genArt721Core.address, formTokenId, [
          bindInput(value),
        ]);
      return (await tx.wait()).gasUsed;
    };

    // baseline path, valid with or without the hook
    const unboundTransfer = await move(FORM_TOKEN_TWO);

    if (!withHook) {
      const zero = BigNumber.from(0);
      return {
        unboundTransfer,
        boundFormTransfer: zero,
        boundPaletteTransfer: zero,
        bindWrite: zero,
        unbindWrite: zero,
      };
    }

    // bind / unbind / re-bind form #0, then transfer the bound form token
    const bindWrite = await write(FORM_TOKEN_ZERO, PALETTE_TOKEN_ZERO);
    const unbindWrite = await write(FORM_TOKEN_ZERO, UNBOUND);
    await write(FORM_TOKEN_ZERO, PALETTE_TOKEN_ZERO);
    const boundFormTransfer = await move(FORM_TOKEN_ZERO);

    // bind form #1, then transfer the bound palette token instead
    await write(FORM_TOKEN_ONE, PALETTE_TOKEN_ONE);
    const boundPaletteTransfer = await move(PALETTE_TOKEN_ONE);

    return {
      unboundTransfer,
      boundFormTransfer,
      boundPaletteTransfer,
      bindWrite,
      unbindWrite,
    };
  }

  /** The setup documented in the hook's natspec, applied to a local config. */
  async function configureAllFor(config: BindingConfig) {
    await config.pmp
      .connect(config.accounts.artist)
      .configureProject(config.genArt721Core.address, FORM_PROJECT_ID, [
        getPMPInputConfig(
          PARAM_KEY_BOUND_PALETTE_TOKEN_ID,
          PMP_AUTH_ENUM.TokenOwnerAndAddress,
          PMP_PARAM_TYPE_ENUM.Uint256Range,
          0,
          config.hook.address,
          [],
          toBytes32(UNBOUND),
          toBytes32(PALETTE_PARAM_MAX_RANGE)
        ),
      ]);
    await config.pmp
      .connect(config.accounts.artist)
      .configureProjectHooks(
        config.genArt721Core.address,
        FORM_PROJECT_ID,
        config.hook.address,
        config.hook.address
      );
    await config.pmp
      .connect(config.accounts.artist)
      .configureProjectHooks(
        config.genArt721Core.address,
        PALETTE_PROJECT_ID,
        constants.ZERO_ADDRESS,
        config.hook.address
      );
    for (const projectId of [FORM_PROJECT_ID, PALETTE_PROJECT_ID]) {
      await config.genArt721Core
        .connect(config.accounts.artist)
        .configureProjectTransferHook(projectId, config.hook.address);
    }
  }

  it("costs what the documentation says [@skip-on-coverage]", async function () {
    const withoutHook = await measure(false);
    const withHook = await measure(true);

    const baseline = withoutHook.unboundTransfer;
    const unboundDelta = withHook.unboundTransfer.sub(baseline).toNumber();
    const boundFormDelta = withHook.boundFormTransfer.sub(baseline).toNumber();
    const boundPaletteDelta = withHook.boundPaletteTransfer
      .sub(baseline)
      .toNumber();

    // @dev bounds are wide enough to absorb compiler and OpenZeppelin churn,
    // and tight enough that an extra SSTORE or external call fails here rather
    // than in production.
    // measured on GenArt721CoreV3_Engine_Flex with PMPV1:
    //   unbound transfer +20,652 / bound form +46,126 / bound palette +46,218
    //   bind write 159,473 / unbind write 67,216
    expect(unboundDelta).to.be.within(16_000, 26_000);
    expect(boundFormDelta).to.be.within(40_000, 53_000);
    expect(boundPaletteDelta).to.be.within(40_000, 53_000);
    expect(withHook.bindWrite.toNumber()).to.be.within(140_000, 180_000);
    expect(withHook.unbindWrite.toNumber()).to.be.within(55_000, 80_000);
  });
});
