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

// XOR of the selectors IFormPaletteBindingHooks declares itself; Solidity
// excludes functions inherited from the three hook interfaces
const IFORM_PALETTE_BINDING_HOOKS_INTERFACE_ID = [
  "registerPaletteProject(address,uint256,string[])",
  "isPaletteProject(address,uint256)",
  "paletteProjectCount()",
  "boundPaletteOf(uint256)",
  "boundFormOf(address,uint256)",
  "bindingParamValueFor(address,uint256)",
  "previewBind(uint256,address,uint256)",
  "paletteProjectAt(uint256)",
  "paletteCount(address,uint256)",
  "paletteAt(address,uint256,uint256)",
  "paletteDataFor(address,uint256)",
].reduce(
  (acc, sig) =>
    ethers.BigNumber.from(acc)
      .xor(ethers.BigNumber.from(ethers.utils.id(sig).slice(0, 10)))
      .toHexString(),
  "0x00000000"
);

const PARAM_KEY_BOUND_PALETTE_TOKEN_ID = "boundPaletteTokenId";
const PARAM_KEY_BOUND_PALETTE_CORE_CONTRACT = "boundPaletteCoreContract";
const PARAM_KEY_BOUND_PALETTE_TOKEN_HASH = "boundPaletteTokenHash";
const PARAM_KEY_BOUND_FORM_TOKEN_ID = "boundFormTokenId";
const PARAM_KEY_PALETTE_DATA = "paletteData";

const UNBOUND = 0;
// the binding param packs the core contract into the high 160 bits and the
// token ID into the low 96
const TOKEN_ID_BITS = 96;

// project layout on core A
const FORM_PROJECT_ID = 0;
const PALETTE_PROJECT_ID = 1;
const OTHER_PROJECT_ID = 2;
// a second palette collection on core A, registered after launch
const PALETTE_TWO_PROJECT_ID = 3;
// and a third on a different core entirely, at project 0 to prove project 0 is
// registrable now that slots rather than token IDs carry the sentinel
const PALETTE_ON_CORE_B_PROJECT_ID = 0;

const FORM_TOKEN_ZERO = BigNumber.from(0);
const FORM_TOKEN_ONE = BigNumber.from(1);
const PALETTE_TOKEN_ZERO = BigNumber.from(1_000_000);
const PALETTE_TOKEN_ONE = BigNumber.from(1_000_001);
const OTHER_TOKEN_ZERO = BigNumber.from(2_000_000);
const PALETTE_TWO_TOKEN_ZERO = BigNumber.from(3_000_000);
const PALETTE_ON_CORE_B_TOKEN_ZERO = BigNumber.from(0);

// the binding param is deliberately unbounded; the hook owns validation
const PARAM_MAX_RANGE = ethers.constants.MaxUint256;

// opaque to the contract; whatever the two art scripts agree to consume
const PALETTES_ONE = ['{"n":"ember"}', '{"n":"frost"}', '{"n":"moss"}'];
const PALETTES_TWO = ['{"n":"dusk"}', '{"n":"dawn"}'];
const PALETTES_THREE = ['{"n":"tide"}'];

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
  PaletteProjectNotRegistered: 2,
  FormTokenDoesNotExist: 3,
  PaletteTokenDoesNotExist: 4,
  FormAlreadyBound: 5,
  PaletteAlreadyBound: 6,
  OwnerMismatch: 7,
};

function toBytes32(value: BigNumber | number): string {
  return ethers.utils.hexZeroPad(BigNumber.from(value).toHexString(), 32);
}

/**
 * The binding param value naming a palette token, computed test-side from
 * public information alone. No contract call is needed to derive it.
 */
function paramValue(
  coreContract: string,
  paletteTokenId: BigNumber | number
): BigNumber {
  return BigNumber.from(coreContract)
    .shl(TOKEN_ID_BITS)
    .or(BigNumber.from(paletteTokenId));
}

function bindInput(value: BigNumber | number) {
  return getPMPInput(
    PARAM_KEY_BOUND_PALETTE_TOKEN_ID,
    PMP_PARAM_TYPE_ENUM.Uint256Range,
    toBytes32(value),
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

/** The entry `hash % palettes.length` selects. */
function expectedPalette(hash: string, palettes: string[]): string {
  return palettes[BigNumber.from(hash).mod(palettes.length).toNumber()];
}

interface BindingConfig extends T_Config {
  genArt721Core: Contract;
  coreB: Contract;
  minter: Contract;
  minterB: Contract;
  pmp: Contract;
  hook: Contract;
}

describe("FormPaletteBindingHooks", async function () {
  async function _beforeEach() {
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);

    const deployCore = async () => {
      const { genArt721Core, minterFilter } = await deployCoreWithMinterFilter(
        config,
        "GenArt721CoreV3_Engine_Flex",
        "MinterFilterV1"
      );
      const minter = await deployAndGet(config, "MinterSetPriceV2", [
        genArt721Core.address,
        minterFilter.address,
      ]);
      await minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(minter.address);
      return { core: genArt721Core, minterFilter, minter };
    };

    const addProject = async (
      core: Contract,
      minterFilter: Contract,
      minter: Contract,
      projectId: number
    ) => {
      await core
        .connect(config.accounts.deployer)
        .addProject(`project ${projectId}`, config.accounts.artist.address);
      await core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(projectId);
      await core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(projectId, config.maxInvocations);
      await minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(projectId, minter.address);
      await minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(projectId, 0);
      await core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(projectId);
    };

    // core A carries the form project plus two palette collections and one
    // unrelated project; core B carries a palette collection at project 0
    const a = await deployCore();
    for (const projectId of [
      FORM_PROJECT_ID,
      PALETTE_PROJECT_ID,
      OTHER_PROJECT_ID,
      PALETTE_TWO_PROJECT_ID,
    ]) {
      await addProject(a.core, a.minterFilter, a.minter, projectId);
    }
    const b = await deployCore();
    await addProject(
      b.core,
      b.minterFilter,
      b.minter,
      PALETTE_ON_CORE_B_PROJECT_ID
    );

    const delegateRegistry = await deployAndGet(config, "DelegateRegistry", []);
    const pmp = await deployAndGet(config, "PMPV1", [delegateRegistry.address]);
    const hook = await deployAndGet(config, "FormPaletteBindingHooks", [
      pmp.address,
      a.core.address,
      FORM_PROJECT_ID,
    ]);

    return {
      ...config,
      genArt721Core: a.core,
      coreB: b.core,
      minter: a.minter,
      minterB: b.minter,
      pmp,
      hook,
    } as BindingConfig;
  }

  /** Register a palette project as the form project's artist. */
  async function registerPalette(
    config: BindingConfig,
    core: Contract,
    projectId: number,
    palettes: string[]
  ) {
    return config.hook
      .connect(config.accounts.artist)
      .registerPaletteProject(core.address, projectId, palettes);
  }

  /** Steps B and C of the per-palette-project checklist. */
  async function wirePaletteProject(
    config: BindingConfig,
    core: Contract,
    projectId: number
  ) {
    await config.pmp
      .connect(config.accounts.artist)
      .configureProjectHooks(
        core.address,
        projectId,
        constants.ZERO_ADDRESS,
        config.hook.address
      );
    await core
      .connect(config.accounts.artist)
      .configureProjectTransferHook(projectId, config.hook.address);
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
          overrides?.maxRange ?? toBytes32(PARAM_MAX_RANGE)
        ),
      ]);
  }

  /** The full setup documented in the hook's natspec. */
  async function configureAll(config: BindingConfig) {
    await registerPalette(
      config,
      config.genArt721Core,
      PALETTE_PROJECT_ID,
      PALETTES_ONE
    );
    await configureBindingParam(config);
    await config.pmp
      .connect(config.accounts.artist)
      .configureProjectHooks(
        config.genArt721Core.address,
        FORM_PROJECT_ID,
        config.hook.address,
        config.hook.address
      );
    await config.genArt721Core
      .connect(config.accounts.artist)
      .configureProjectTransferHook(FORM_PROJECT_ID, config.hook.address);
    await wirePaletteProject(config, config.genArt721Core, PALETTE_PROJECT_ID);
  }

  async function mint(
    config: BindingConfig,
    minter: Contract,
    projectId: number,
    to: any,
    count: number
  ) {
    for (let i = 0; i < count; i++) {
      await minter.connect(to).purchase(projectId, { value: 0 });
    }
  }

  /** Standard scenario: user owns form #0/#1 and palette #0/#1 on core A. */
  async function _withTokens() {
    const config = await loadFixture(_beforeEach);
    await configureAll(config);
    await mint(config, config.minter, FORM_PROJECT_ID, config.accounts.user, 2);
    await mint(
      config,
      config.minter,
      PALETTE_PROJECT_ID,
      config.accounts.user,
      2
    );
    return config;
  }

  async function bind(
    config: BindingConfig,
    signer: any,
    formTokenId: BigNumber,
    value: BigNumber | number
  ) {
    return config.pmp
      .connect(signer)
      .configureTokenParams(config.genArt721Core.address, formTokenId, [
        bindInput(value),
      ]);
  }

  /** Bind by naming the palette token, the way a front end would. */
  async function bindToken(
    config: BindingConfig,
    signer: any,
    formTokenId: BigNumber,
    core: Contract,
    paletteTokenId: BigNumber
  ) {
    const [, value] = await config.hook.bindingParamValueFor(
      core.address,
      paletteTokenId
    );
    return bind(config, signer, formTokenId, value);
  }

  async function getParams(config: BindingConfig, tokenId: BigNumber) {
    return config.pmp.getTokenParams(config.genArt721Core.address, tokenId);
  }

  describe("constructor", async function () {
    it("stores the immutable configuration and starts with no palettes", async function () {
      const config = await loadFixture(_beforeEach);
      expect(await config.hook.pmp()).to.equal(config.pmp.address);
      expect(await config.hook.formCore()).to.equal(
        config.genArt721Core.address
      );
      expect(await config.hook.formProjectId()).to.equal(FORM_PROJECT_ID);
      expect(await config.hook.UNBOUND_PARAM_VALUE()).to.equal(UNBOUND);
      expect(await config.hook.BINDING_PARAM_MAX_RANGE()).to.equal(
        ethers.constants.MaxUint256
      );
      expect(await config.hook.paletteProjectCount()).to.equal(0);
      expect(
        await config.hook.isPaletteProject(
          config.genArt721Core.address,
          PALETTE_PROJECT_ID
        )
      ).to.be.false;
    });

    it("reverts on a zero PMP or zero form core", async function () {
      const config = await loadFixture(_beforeEach);
      const factory = await ethers.getContractFactory(
        "FormPaletteBindingHooks"
      );
      const zero = constants.ZERO_ADDRESS;
      for (const args of [
        [zero, config.genArt721Core.address, FORM_PROJECT_ID],
        [config.pmp.address, zero, FORM_PROJECT_ID],
      ]) {
        await expect(
          factory.deploy(...(args as any))
        ).to.be.revertedWithCustomError(config.hook, "InvalidConstructorArgs");
      }
    });
  });

  describe("palette project registry", async function () {
    it("is managed by the form project's artist and nobody else", async function () {
      const config = await loadFixture(_beforeEach);
      for (const account of [
        config.accounts.deployer,
        config.accounts.user,
        config.accounts.artist2,
      ]) {
        await expect(
          config.hook
            .connect(account)
            .registerPaletteProject(
              config.genArt721Core.address,
              PALETTE_PROJECT_ID,
              PALETTES_ONE
            )
        )
          .to.be.revertedWithCustomError(config.hook, "OnlyFormProjectArtist")
          .withArgs(account.address, config.accounts.artist.address);
      }
      await expect(
        registerPalette(
          config,
          config.genArt721Core,
          PALETTE_PROJECT_ID,
          PALETTES_ONE
        )
      )
        .to.emit(config.hook, "PaletteProjectRegistered")
        .withArgs(
          config.genArt721Core.address,
          PALETTE_PROJECT_ID,
          PALETTES_ONE.length
        );
      expect(await config.hook.paletteProjectCount()).to.equal(1);
      expect(
        await config.hook.isPaletteProject(
          config.genArt721Core.address,
          PALETTE_PROJECT_ID
        )
      ).to.be.true;
    });

    it("follows the form project's artist if it changes", async function () {
      const config = await loadFixture(_beforeEach);
      // the right is read live from the core, not stored here
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .updateProjectArtistAddress(
          FORM_PROJECT_ID,
          config.accounts.artist2.address
        );
      await expect(
        registerPalette(
          config,
          config.genArt721Core,
          PALETTE_PROJECT_ID,
          PALETTES_ONE
        )
      ).to.be.revertedWithCustomError(config.hook, "OnlyFormProjectArtist");
      await expect(
        config.hook
          .connect(config.accounts.artist2)
          .registerPaletteProject(
            config.genArt721Core.address,
            PALETTE_PROJECT_ID,
            PALETTES_ONE
          )
      ).to.emit(config.hook, "PaletteProjectRegistered");
    });

    it("rejects the zero core, the form project, duplicates, and empty lists", async function () {
      const config = await loadFixture(_beforeEach);
      const artist = config.hook.connect(config.accounts.artist);
      await expect(
        artist.registerPaletteProject(
          constants.ZERO_ADDRESS,
          PALETTE_PROJECT_ID,
          PALETTES_ONE
        )
      )
        .to.be.revertedWithCustomError(config.hook, "InvalidPaletteProject")
        .withArgs(constants.ZERO_ADDRESS, PALETTE_PROJECT_ID);
      await expect(
        artist.registerPaletteProject(
          config.genArt721Core.address,
          FORM_PROJECT_ID,
          PALETTES_ONE
        )
      )
        .to.be.revertedWithCustomError(config.hook, "InvalidPaletteProject")
        .withArgs(config.genArt721Core.address, FORM_PROJECT_ID);
      await expect(
        artist.registerPaletteProject(
          config.genArt721Core.address,
          PALETTE_PROJECT_ID,
          []
        )
      ).to.be.revertedWithCustomError(config.hook, "EmptyPaletteList");
      await registerPalette(
        config,
        config.genArt721Core,
        PALETTE_PROJECT_ID,
        PALETTES_ONE
      );
      // registration is one-shot, so a palette list can never be replaced
      await expect(
        artist.registerPaletteProject(
          config.genArt721Core.address,
          PALETTE_PROJECT_ID,
          PALETTES_TWO
        )
      )
        .to.be.revertedWithCustomError(
          config.hook,
          "PaletteProjectAlreadyRegistered"
        )
        .withArgs(config.genArt721Core.address, PALETTE_PROJECT_ID);
    });

    it("rejects a project id whose tokens could not be packed losslessly", async function () {
      const config = await loadFixture(_beforeEach);
      // the packing gives the token ID 96 bits; a project ID above this bound
      // would produce token IDs that do not fit
      const maxProjectId = BigNumber.from(2)
        .pow(TOKEN_ID_BITS)
        .sub(1)
        .sub(999_999)
        .div(1_000_000);
      await expect(
        config.hook
          .connect(config.accounts.artist)
          .registerPaletteProject(
            config.genArt721Core.address,
            maxProjectId.add(1),
            PALETTES_ONE
          )
      )
        .to.be.revertedWithCustomError(config.hook, "InvalidPaletteProject")
        .withArgs(config.genArt721Core.address, maxProjectId.add(1));
      // the bound itself is accepted
      await expect(
        config.hook
          .connect(config.accounts.artist)
          .registerPaletteProject(
            config.genArt721Core.address,
            maxProjectId,
            PALETTES_ONE
          )
      ).to.emit(config.hook, "PaletteProjectRegistered");
    });

    it("assigns slots in order across any number of cores", async function () {
      const config = await _withTokens();
      // project 0 of another core is registrable: the sentinel lives in slot 0,
      // not in any token ID
      await registerPalette(
        config,
        config.coreB,
        PALETTE_ON_CORE_B_PROJECT_ID,
        PALETTES_TWO
      );
      await registerPalette(
        config,
        config.genArt721Core,
        PALETTE_TWO_PROJECT_ID,
        PALETTES_THREE
      );
      expect(await config.hook.paletteProjectCount()).to.equal(3);
      const expected = [
        [config.genArt721Core.address, PALETTE_PROJECT_ID],
        [config.coreB.address, PALETTE_ON_CORE_B_PROJECT_ID],
        [config.genArt721Core.address, PALETTE_TWO_PROJECT_ID],
      ];
      // enumeration is zero-based and in registration order
      for (let i = 0; i < expected.length; i++) {
        const [core, projectId] = expected[i];
        expect(await config.hook.isPaletteProject(core, projectId)).to.be.true;
        const at = await config.hook.paletteProjectAt(i);
        expect(at.coreContract).to.equal(core);
        expect(at.projectId).to.equal(projectId);
      }
      // an index at or past the count is unused
      const past = await config.hook.paletteProjectAt(expected.length);
      expect(past.coreContract).to.equal(constants.ZERO_ADDRESS);
      // the same project ID on two cores gets two distinct slots, which is
      // exactly what a token-ID-valued param could not express
      const [, onA] = await config.hook.bindingParamValueFor(
        config.genArt721Core.address,
        PALETTE_TOKEN_ZERO
      );
      const [, onB] = await config.hook.bindingParamValueFor(
        config.coreB.address,
        PALETTE_ON_CORE_B_TOKEN_ZERO
      );
      expect(onA).to.not.equal(onB);
      // and each carries its own core in the high bits
      expect(BigNumber.from(onA).shr(TOKEN_ID_BITS).toHexString()).to.equal(
        config.genArt721Core.address.toLowerCase()
      );
      expect(BigNumber.from(onB).shr(TOKEN_ID_BITS).toHexString()).to.equal(
        config.coreB.address.toLowerCase()
      );
    });

    it("stores each project's entries immutably and independently", async function () {
      const config = await _withTokens();
      await registerPalette(
        config,
        config.coreB,
        PALETTE_ON_CORE_B_PROJECT_ID,
        PALETTES_TWO
      );
      const cases: [Contract, number, string[]][] = [
        [config.genArt721Core, PALETTE_PROJECT_ID, PALETTES_ONE],
        [config.coreB, PALETTE_ON_CORE_B_PROJECT_ID, PALETTES_TWO],
      ];
      for (const [core, projectId, palettes] of cases) {
        expect(
          await config.hook.paletteCount(core.address, projectId)
        ).to.equal(palettes.length);
        // registering a second collection cannot move the first one's indices,
        // which is the drift the reference implementation was exposed to
        for (let i = 0; i < palettes.length; i++) {
          expect(
            await config.hook.paletteAt(core.address, projectId, i)
          ).to.equal(palettes[i]);
        }
      }
      expect(
        await config.hook.paletteCount(
          config.genArt721Core.address,
          OTHER_PROJECT_ID
        )
      ).to.equal(0);
    });

    it("makes a later-registered collection bindable with no script change", async function () {
      const config = await _withTokens();
      await mint(
        config,
        config.minter,
        PALETTE_TWO_PROJECT_ID,
        config.accounts.user,
        1
      );
      // not bindable before registration
      expect(
        (
          await config.hook.previewBind(
            FORM_TOKEN_ZERO,
            config.genArt721Core.address,
            PALETTE_TWO_TOKEN_ZERO
          )
        )[1]
      ).to.equal(BIND_BLOCKER.PaletteProjectNotRegistered);

      await registerPalette(
        config,
        config.genArt721Core,
        PALETTE_TWO_PROJECT_ID,
        PALETTES_THREE
      );
      await wirePaletteProject(
        config,
        config.genArt721Core,
        PALETTE_TWO_PROJECT_ID
      );

      await expect(
        bindToken(
          config,
          config.accounts.user,
          FORM_TOKEN_ZERO,
          config.genArt721Core,
          PALETTE_TWO_TOKEN_ZERO
        )
      ).to.emit(config.hook, "Bound");

      // the form token paints from the new collection's entries, with no change
      // to either art script
      const params = await getParams(config, FORM_TOKEN_ZERO);
      expect(findParam(params, PARAM_KEY_PALETTE_DATA)?.value).to.equal(
        expectedPalette(
          await config.genArt721Core.tokenIdToHash(PALETTE_TWO_TOKEN_ZERO),
          PALETTES_THREE
        )
      );
      // and the transfer hook breaks pairings on the new collection too
      await expect(
        config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.user.address,
            config.accounts.user2.address,
            PALETTE_TWO_TOKEN_ZERO
          )
      )
        .to.emit(config.hook, "Unbound")
        .withArgs(
          FORM_TOKEN_ZERO,
          config.genArt721Core.address,
          PALETTE_TWO_TOKEN_ZERO,
          UNBIND_REASON.PaletteTransferred
        );
    });

    it("reports no pairing for a token whose project is not registered", async function () {
      const config = await _withTokens();
      for (const [core, tokenId] of [
        [config.genArt721Core.address, OTHER_TOKEN_ZERO],
        [config.coreB.address, PALETTE_ON_CORE_B_TOKEN_ZERO],
      ] as const) {
        const [isBound, formTokenId] = await config.hook.boundFormOf(
          core,
          tokenId
        );
        expect(isBound).to.be.false;
        expect(formTokenId).to.equal(0);
      }
    });

    it("computes binding param values only for registered projects", async function () {
      const config = await _withTokens();
      const [registered, value] = await config.hook.bindingParamValueFor(
        config.genArt721Core.address,
        PALETTE_TOKEN_ONE
      );
      expect(registered).to.be.true;
      // derivable off chain from the core address and token ID alone
      expect(value).to.equal(
        paramValue(config.genArt721Core.address, PALETTE_TOKEN_ONE)
      );
      const [notRegistered, zero] = await config.hook.bindingParamValueFor(
        config.genArt721Core.address,
        OTHER_TOKEN_ZERO
      );
      expect(notRegistered).to.be.false;
      expect(zero).to.equal(UNBOUND);
    });
  });

  describe("supportsInterface", async function () {
    it("advertises every interface its three registrations require", async function () {
      const config = await loadFixture(_beforeEach);
      for (const id of [
        ITRANSFER_HOOK_INTERFACE_ID,
        IPMP_AUGMENT_HOOK_INTERFACE_ID,
        IPMP_CONFIGURE_HOOK_INTERFACE_ID,
        IERC165_INTERFACE_ID,
        ethers.utils.hexZeroPad(IFORM_PALETTE_BINDING_HOOKS_INTERFACE_ID, 4),
      ]) {
        expect(await config.hook.supportsInterface(id)).to.be.true;
      }
      expect(await config.hook.supportsInterface("0xffffffff")).to.be.false;
    });

    it("is accepted by both cores and the PMP at registration time", async function () {
      const config = await loadFixture(_beforeEach);
      // reverts if supportsInterface answers incorrectly for any of the three
      await configureAll(config);
      await registerPalette(
        config,
        config.coreB,
        PALETTE_ON_CORE_B_PROJECT_ID,
        PALETTES_TWO
      );
      await wirePaletteProject(
        config,
        config.coreB,
        PALETTE_ON_CORE_B_PROJECT_ID
      );
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
        await config.hook.BINDING_PARAM_MAX_RANGE()
      );
      // a non-zero lock timestamp would eventually freeze the param's value on
      // PMPV1, making existing pairings permanent
      expect(paramConfig.pmpLockedAfterTimestamp).to.equal(0);
    });

    it("configures the project hooks on the form and palette projects", async function () {
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
      // a palette project has no binding param, so it needs no configure hook
      expect(paletteConfig.tokenPMPPostConfigHook).to.equal(
        constants.ZERO_ADDRESS
      );
      expect(paletteConfig.tokenPMPReadAugmentationHook).to.equal(
        config.hook.address
      );
      // the transfer hook must be set on the form project AND every palette one
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
            bindInput(
              paramValue(config.genArt721Core.address, PALETTE_TOKEN_ZERO)
            )
          )
      )
        .to.be.revertedWithCustomError(config.hook, "OnlyPMP")
        .withArgs(config.accounts.user.address);
    });

    it("ignores writes of keys it does not own", async function () {
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
            toBytes32(PARAM_MAX_RANGE)
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
      // artist misconfigures: gives a palette project a binding param and points
      // its configure hook here
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
            toBytes32(PARAM_MAX_RANGE)
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
            [
              bindInput(
                paramValue(config.genArt721Core.address, PALETTE_TOKEN_ONE)
              ),
            ]
          )
      )
        .to.be.revertedWithCustomError(
          config.hook,
          "ConfigureHookOnUnexpectedProject"
        )
        .withArgs(config.genArt721Core.address, PALETTE_TOKEN_ZERO);
    });

    it("rejects a binding param write arriving from a palette core", async function () {
      const config = await _withTokens();
      await registerPalette(
        config,
        config.coreB,
        PALETTE_ON_CORE_B_PROJECT_ID,
        PALETTES_TWO
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.coreB.address, PALETTE_ON_CORE_B_PROJECT_ID, [
          getPMPInputConfig(
            PARAM_KEY_BOUND_PALETTE_TOKEN_ID,
            PMP_AUTH_ENUM.TokenOwnerAndAddress,
            PMP_PARAM_TYPE_ENUM.Uint256Range,
            0,
            config.hook.address,
            [],
            toBytes32(UNBOUND),
            toBytes32(PARAM_MAX_RANGE)
          ),
        ]);
      await config.pmp
        .connect(config.accounts.artist)
        .configureProjectHooks(
          config.coreB.address,
          PALETTE_ON_CORE_B_PROJECT_ID,
          config.hook.address,
          config.hook.address
        );
      await mint(
        config,
        config.minterB,
        PALETTE_ON_CORE_B_PROJECT_ID,
        config.accounts.user,
        1
      );
      await expect(
        config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(
            config.coreB.address,
            PALETTE_ON_CORE_B_TOKEN_ZERO,
            [
              bindInput(
                paramValue(config.genArt721Core.address, PALETTE_TOKEN_ZERO)
              ),
            ]
          )
      )
        .to.be.revertedWithCustomError(
          config.hook,
          "ConfigureHookOnUnexpectedProject"
        )
        .withArgs(config.coreB.address, PALETTE_ON_CORE_B_TOKEN_ZERO);
    });
  });

  describe("binding", async function () {
    it("binds both directions and emits Bound", async function () {
      const config = await _withTokens();
      const value = paramValue(
        config.genArt721Core.address,
        PALETTE_TOKEN_ZERO
      );
      await expect(
        bindToken(
          config,
          config.accounts.user,
          FORM_TOKEN_ZERO,
          config.genArt721Core,
          PALETTE_TOKEN_ZERO
        )
      )
        .to.emit(config.hook, "Bound")
        .withArgs(
          FORM_TOKEN_ZERO,
          config.genArt721Core.address,
          PALETTE_TOKEN_ZERO,
          config.accounts.user.address
        );

      const bound = await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      expect(bound.isBound).to.be.true;
      expect(bound.coreContract).to.equal(config.genArt721Core.address);
      expect(bound.paletteTokenId).to.equal(PALETTE_TOKEN_ZERO);
      const [paletteBound, form] = await config.hook.boundFormOf(
        config.genArt721Core.address,
        PALETTE_TOKEN_ZERO
      );
      expect(paletteBound).to.be.true;
      expect(form).to.equal(FORM_TOKEN_ZERO);
    });

    it("binds a palette token on a different core", async function () {
      const config = await _withTokens();
      await registerPalette(
        config,
        config.coreB,
        PALETTE_ON_CORE_B_PROJECT_ID,
        PALETTES_TWO
      );
      await wirePaletteProject(
        config,
        config.coreB,
        PALETTE_ON_CORE_B_PROJECT_ID
      );
      await mint(
        config,
        config.minterB,
        PALETTE_ON_CORE_B_PROJECT_ID,
        config.accounts.user,
        1
      );
      // core B's palette token has token ID 0, the same number as form token 0;
      // slot encoding is what keeps them apart
      await expect(
        bindToken(
          config,
          config.accounts.user,
          FORM_TOKEN_ZERO,
          config.coreB,
          PALETTE_ON_CORE_B_TOKEN_ZERO
        )
      )
        .to.emit(config.hook, "Bound")
        .withArgs(
          FORM_TOKEN_ZERO,
          config.coreB.address,
          PALETTE_ON_CORE_B_TOKEN_ZERO,
          config.accounts.user.address
        );
      const bound = await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      expect(bound.coreContract).to.equal(config.coreB.address);
      const params = await getParams(config, FORM_TOKEN_ZERO);
      expect(
        findParam(params, PARAM_KEY_BOUND_PALETTE_CORE_CONTRACT)?.value
      ).to.equal(config.coreB.address.toLowerCase());
      expect(findParam(params, PARAM_KEY_PALETTE_DATA)?.value).to.equal(
        expectedPalette(
          await config.coreB.tokenIdToHash(PALETTE_ON_CORE_B_TOKEN_ZERO),
          PALETTES_TWO
        )
      );
    });

    it("rejects a palette token held by a different wallet", async function () {
      const config = await loadFixture(_beforeEach);
      await configureAll(config);
      await mint(
        config,
        config.minter,
        FORM_PROJECT_ID,
        config.accounts.user,
        1
      );
      await mint(
        config,
        config.minter,
        PALETTE_PROJECT_ID,
        config.accounts.user2,
        1
      );
      await expect(
        bindToken(
          config,
          config.accounts.user,
          FORM_TOKEN_ZERO,
          config.genArt721Core,
          PALETTE_TOKEN_ZERO
        )
      )
        .to.be.revertedWithCustomError(config.hook, "OwnerMismatch")
        .withArgs(config.accounts.user.address, config.accounts.user2.address);
    });

    it("rejects a palette token already bound to another form token", async function () {
      const config = await _withTokens();
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
        PALETTE_TOKEN_ZERO
      );
      await expect(
        bindToken(
          config,
          config.accounts.user,
          FORM_TOKEN_ONE,
          config.genArt721Core,
          PALETTE_TOKEN_ZERO
        )
      )
        .to.be.revertedWithCustomError(config.hook, "PaletteAlreadyBound")
        .withArgs(
          config.genArt721Core.address,
          PALETTE_TOKEN_ZERO,
          FORM_TOKEN_ZERO
        );
    });

    it("rejects re-pointing a bound form token at a different palette", async function () {
      const config = await _withTokens();
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
        PALETTE_TOKEN_ZERO
      );
      await expect(
        bindToken(
          config,
          config.accounts.user,
          FORM_TOKEN_ZERO,
          config.genArt721Core,
          PALETTE_TOKEN_ONE
        )
      )
        .to.be.revertedWithCustomError(config.hook, "FormAlreadyBound")
        .withArgs(
          FORM_TOKEN_ZERO,
          config.genArt721Core.address,
          PALETTE_TOKEN_ZERO
        );
    });

    it("rejects a value that does not unpack to a registered project", async function () {
      const config = await _withTokens();
      // an unregistered project on a registered core, a registered project on
      // an unregistered core, and a bare token ID mistyped into the field,
      // which unpacks to the zero core rather than binding something real
      for (const value of [
        paramValue(config.genArt721Core.address, OTHER_TOKEN_ZERO),
        paramValue(config.coreB.address, PALETTE_ON_CORE_B_TOKEN_ZERO),
        PALETTE_TOKEN_ZERO,
      ]) {
        await expect(bind(config, config.accounts.user, FORM_TOKEN_ZERO, value))
          .to.be.revertedWithCustomError(
            config.hook,
            "UnknownBindingParamValue"
          )
          .withArgs(value);
      }
    });

    it("rejects an unminted palette token", async function () {
      const config = await _withTokens();
      await expect(
        bind(
          config,
          config.accounts.user,
          FORM_TOKEN_ZERO,
          paramValue(config.genArt721Core.address, PALETTE_TOKEN_ONE.add(500))
        )
      ).to.be.reverted;
    });

    it("rejects a caller who is not the form token owner", async function () {
      const config = await _withTokens();
      await expect(
        bindToken(
          config,
          config.accounts.user2,
          FORM_TOKEN_ZERO,
          config.genArt721Core,
          PALETTE_TOKEN_ZERO
        )
      ).to.be.revertedWith("PMP: token owner and address auth required");
    });

    it("treats a re-write of the current pairing as a no-op", async function () {
      const config = await _withTokens();
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
        PALETTE_TOKEN_ZERO
      );
      await expect(
        bindToken(
          config,
          config.accounts.user,
          FORM_TOKEN_ZERO,
          config.genArt721Core,
          PALETTE_TOKEN_ZERO
        )
      ).to.not.emit(config.hook, "Bound");
      const bound = await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      expect(bound.isBound).to.be.true;
      expect(bound.paletteTokenId).to.equal(PALETTE_TOKEN_ZERO);
    });
  });

  describe("unbinding via the binding param", async function () {
    it("clears both directions and emits Unbound(Configured)", async function () {
      const config = await _withTokens();
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
        PALETTE_TOKEN_ZERO
      );
      await expect(bind(config, config.accounts.user, FORM_TOKEN_ZERO, UNBOUND))
        .to.emit(config.hook, "Unbound")
        .withArgs(
          FORM_TOKEN_ZERO,
          config.genArt721Core.address,
          PALETTE_TOKEN_ZERO,
          UNBIND_REASON.Configured
        );
      const [formBound] = await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      const [paletteBound] = await config.hook.boundFormOf(
        config.genArt721Core.address,
        PALETTE_TOKEN_ZERO
      );
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
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
        PALETTE_TOKEN_ZERO
      );
      const tx = config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(config.genArt721Core.address, FORM_TOKEN_ZERO, [
          bindInput(UNBOUND),
          bindInput(
            paramValue(config.genArt721Core.address, PALETTE_TOKEN_ONE)
          ),
        ]);
      await expect(tx).to.emit(config.hook, "Unbound");
      await expect(tx).to.emit(config.hook, "Bound");
      const receipt = await (await tx).wait();
      const configuredEvents = receipt.events.filter(
        (e: any) =>
          e.address === config.pmp.address &&
          e.event === "TokenParamsConfigured"
      );
      expect(configuredEvents.length).to.equal(1);

      const bound = await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      expect(bound.paletteTokenId).to.equal(PALETTE_TOKEN_ONE);
      const [oldStillBound] = await config.hook.boundFormOf(
        config.genArt721Core.address,
        PALETTE_TOKEN_ZERO
      );
      expect(oldStillBound).to.be.false;
    });

    it("still rejects stealing a bound palette via a two-input write", async function () {
      // the two-input trick does not defeat the strict rule: the protection is
      // on the palette side, and the other form token was never written
      const config = await _withTokens();
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
        PALETTE_TOKEN_ZERO
      );
      await expect(
        config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(config.genArt721Core.address, FORM_TOKEN_ONE, [
            bindInput(UNBOUND),
            bindInput(
              paramValue(config.genArt721Core.address, PALETTE_TOKEN_ZERO)
            ),
          ])
      )
        .to.be.revertedWithCustomError(config.hook, "PaletteAlreadyBound")
        .withArgs(
          config.genArt721Core.address,
          PALETTE_TOKEN_ZERO,
          FORM_TOKEN_ZERO
        );
    });

    it("supports the queued unbind-then-bind move of a palette to another form token", async function () {
      const config = await _withTokens();
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
        PALETTE_TOKEN_ZERO
      );
      // tx 1: unbind, which re-renders form #0
      await bind(config, config.accounts.user, FORM_TOKEN_ZERO, UNBOUND);
      // tx 2: bind, which re-renders form #1
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ONE,
        config.genArt721Core,
        PALETTE_TOKEN_ZERO
      );
      const [, form] = await config.hook.boundFormOf(
        config.genArt721Core.address,
        PALETTE_TOKEN_ZERO
      );
      expect(form).to.equal(FORM_TOKEN_ONE);
      const [zeroBound] = await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      expect(zeroBound).to.be.false;
    });
  });

  describe("augmentation", async function () {
    it("injects the bound palette's identity, hash and entry on a form token", async function () {
      const config = await _withTokens();
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
        PALETTE_TOKEN_ZERO
      );
      const params = await getParams(config, FORM_TOKEN_ZERO);
      const hash = await config.genArt721Core.tokenIdToHash(PALETTE_TOKEN_ZERO);
      expect(
        findParam(params, PARAM_KEY_BOUND_PALETTE_CORE_CONTRACT)?.value
      ).to.equal(config.genArt721Core.address.toLowerCase());
      expect(
        findParam(params, PARAM_KEY_BOUND_PALETTE_TOKEN_ID)?.value
      ).to.equal(PALETTE_TOKEN_ZERO.toString());
      expect(
        findParam(params, PARAM_KEY_BOUND_PALETTE_TOKEN_HASH)?.value
      ).to.equal(hash.toLowerCase());
      expect(findParam(params, PARAM_KEY_PALETTE_DATA)?.value).to.equal(
        expectedPalette(hash, PALETTES_ONE)
      );
    });

    it("always injects a zero-padded 32-byte hash string", async function () {
      // GenArt721GeneratorV0 stringifies hashes unpadded, dropping leading zero
      // bytes; this key is always padded so its spelling is stable
      const config = await _withTokens();
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
        PALETTE_TOKEN_ZERO
      );
      const params = await getParams(config, FORM_TOKEN_ZERO);
      const hash = findParam(params, PARAM_KEY_BOUND_PALETTE_TOKEN_HASH)?.value;
      expect(hash).to.have.lengthOf(66);
      expect(hash).to.match(/^0x[0-9a-f]{64}$/);
    });

    it("injects a palette token's own entry, bound or not", async function () {
      const config = await _withTokens();
      const hash = await config.genArt721Core.tokenIdToHash(PALETTE_TOKEN_ZERO);
      const expected = expectedPalette(hash, PALETTES_ONE);
      // unbound
      let params = await getParams(config, PALETTE_TOKEN_ZERO);
      expect(findParam(params, PARAM_KEY_PALETTE_DATA)?.value).to.equal(
        expected
      );
      expect(findParam(params, PARAM_KEY_BOUND_FORM_TOKEN_ID)?.value).to.equal(
        ""
      );
      // and the same entry once bound - binding does not change a palette
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
        PALETTE_TOKEN_ZERO
      );
      params = await getParams(config, PALETTE_TOKEN_ZERO);
      expect(findParam(params, PARAM_KEY_PALETTE_DATA)?.value).to.equal(
        expected
      );
      expect(findParam(params, PARAM_KEY_BOUND_FORM_TOKEN_ID)?.value).to.equal(
        FORM_TOKEN_ZERO.toString()
      );
      // both scripts read one key and get the same answer
      const formParams = await getParams(config, FORM_TOKEN_ZERO);
      expect(findParam(formParams, PARAM_KEY_PALETTE_DATA)?.value).to.equal(
        expected
      );
      expect(
        await config.hook.paletteDataFor(
          config.genArt721Core.address,
          PALETTE_TOKEN_ZERO
        )
      ).to.equal(expected);
    });

    it("resolves no palette data for an unregistered project", async function () {
      const config = await _withTokens();
      expect(
        await config.hook.paletteDataFor(
          config.genArt721Core.address,
          OTHER_TOKEN_ZERO
        )
      ).to.equal("");
      expect(
        await config.hook.paletteDataFor(
          config.coreB.address,
          PALETTE_ON_CORE_B_TOKEN_ZERO
        )
      ).to.equal("");
    });

    it("injects empty strings when unbound", async function () {
      const config = await _withTokens();
      const formParams = await getParams(config, FORM_TOKEN_ZERO);
      for (const key of [
        PARAM_KEY_BOUND_PALETTE_CORE_CONTRACT,
        PARAM_KEY_BOUND_PALETTE_TOKEN_ID,
        PARAM_KEY_BOUND_PALETTE_TOKEN_HASH,
        PARAM_KEY_PALETTE_DATA,
      ]) {
        expect(findParam(formParams, key)?.value).to.equal("");
      }
    });

    it("strips the raw stored binding param so only canonical state is exposed", async function () {
      const config = await _withTokens();
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
        PALETTE_TOKEN_ZERO
      );
      const params = await getParams(config, FORM_TOKEN_ZERO);
      // exactly one entry for the key, and it is the injected token ID rather
      // than the slot-encoded value the PMP actually stores
      const matches = params.filter(
        (p: any) => p.key === PARAM_KEY_BOUND_PALETTE_TOKEN_ID
      );
      expect(matches.length).to.equal(1);
      expect(matches[0].value).to.equal(PALETTE_TOKEN_ZERO.toString());
      const stored = await config.pmp.getTokenPMPStorage(
        config.genArt721Core.address,
        FORM_TOKEN_ZERO,
        PARAM_KEY_BOUND_PALETTE_TOKEN_ID
      );
      expect(BigNumber.from(stored.configuredValue)).to.equal(
        paramValue(config.genArt721Core.address, PALETTE_TOKEN_ZERO)
      );
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
            toBytes32(PARAM_MAX_RANGE)
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
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
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
      // ...but the render-time backstop refuses to report it, on both sides
      const params = await getParams(config, FORM_TOKEN_ZERO);
      expect(
        findParam(params, PARAM_KEY_BOUND_PALETTE_TOKEN_ID)?.value
      ).to.equal("");
      expect(findParam(params, PARAM_KEY_PALETTE_DATA)?.value).to.equal("");
      const paletteParams = await getParams(config, PALETTE_TOKEN_ZERO);
      expect(
        findParam(paletteParams, PARAM_KEY_BOUND_FORM_TOKEN_ID)?.value
      ).to.equal("");
      // the palette token still carries its own entry; only the pairing hides
      expect(
        findParam(paletteParams, PARAM_KEY_PALETTE_DATA)?.value
      ).to.not.equal("");
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

    it("reverts when the calling core does not have it configured", async function () {
      const config = await _withTokens();
      const spoofingCore = await deployAndGet(config, "MockSpoofingCore", []);
      // configuredHook defaults to address(0), i.e. "this hook is not mine"
      await expect(
        spoofingCore
          .connect(config.accounts.user)
          .callHook(
            config.hook.address,
            FORM_TOKEN_ZERO,
            config.accounts.user.address,
            config.accounts.user2.address,
            config.accounts.user.address
          )
      )
        .to.be.revertedWithCustomError(
          config.hook,
          "HookNotConfiguredForProject"
        )
        .withArgs(
          spoofingCore.address,
          FORM_PROJECT_ID,
          constants.ZERO_ADDRESS
        );
    });

    it("is inert when a spoofing contract names itself as the core", async function () {
      // The one caller AbstractTransferHook cannot reject: a contract passing
      // its own address as coreContract. It can also lie about being the
      // configured hook, so the immutable form project and the registry are the
      // guards that actually hold.
      const config = await _withTokens();
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
        PALETTE_TOKEN_ZERO
      );
      const spoofingCore = await deployAndGet(config, "MockSpoofingCore", []);
      await spoofingCore.setConfiguredHook(config.hook.address);
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
      const bound = await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      expect(bound.isBound).to.be.true;
      expect(bound.paletteTokenId).to.equal(PALETTE_TOKEN_ZERO);
    });

    it("unbinds and writes the binding param when the form token transfers", async function () {
      const config = await _withTokens();
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
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
          config.genArt721Core.address,
          PALETTE_TOKEN_ZERO,
          UNBIND_REASON.FormTransferred
        );
      // the PostParam write is what triggers the off-chain re-render
      await expect(tx).to.emit(config.pmp, "TokenParamsConfigured");

      const [formBound] = await config.hook.boundPaletteOf(FORM_TOKEN_ZERO);
      const [paletteBound] = await config.hook.boundFormOf(
        config.genArt721Core.address,
        PALETTE_TOKEN_ZERO
      );
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
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
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
          config.genArt721Core.address,
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
      expect(findParam(params, PARAM_KEY_PALETTE_DATA)?.value).to.equal("");
    });

    it("breaks a pairing when a palette token moves on another core", async function () {
      const config = await _withTokens();
      await registerPalette(
        config,
        config.coreB,
        PALETTE_ON_CORE_B_PROJECT_ID,
        PALETTES_TWO
      );
      await wirePaletteProject(
        config,
        config.coreB,
        PALETTE_ON_CORE_B_PROJECT_ID
      );
      await mint(
        config,
        config.minterB,
        PALETTE_ON_CORE_B_PROJECT_ID,
        config.accounts.user,
        1
      );
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.coreB,
        PALETTE_ON_CORE_B_TOKEN_ZERO
      );
      const tx = config.coreB
        .connect(config.accounts.user)
        .transferFrom(
          config.accounts.user.address,
          config.accounts.user2.address,
          PALETTE_ON_CORE_B_TOKEN_ZERO
        );
      await expect(tx)
        .to.emit(config.hook, "Unbound")
        .withArgs(
          FORM_TOKEN_ZERO,
          config.coreB.address,
          PALETTE_ON_CORE_B_TOKEN_ZERO,
          UNBIND_REASON.PaletteTransferred
        );
      // the re-render write lands on the FORM core, not the core that moved
      await expect(tx)
        .to.emit(config.pmp, "TokenParamsConfigured")
        .withArgs(
          config.genArt721Core.address,
          FORM_TOKEN_ZERO,
          () => true,
          () => true
        );
    });

    it("keeps the pairing on a self-transfer", async function () {
      const config = await _withTokens();
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
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
      await expect(
        mint(config, config.minter, FORM_PROJECT_ID, config.accounts.user, 1)
      ).to.not.be.reverted;
      await mint(
        config,
        config.minter,
        PALETTE_PROJECT_ID,
        config.accounts.user,
        1
      );
      await expect(
        config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.user.address,
            config.accounts.user2.address,
            FORM_TOKEN_ZERO
          )
      ).to.not.emit(config.hook, "Unbound");
      // and a palette token whose project is registered but which is unbound
      await expect(
        config.genArt721Core
          .connect(config.accounts.user)
          .transferFrom(
            config.accounts.user.address,
            config.accounts.user2.address,
            PALETTE_TOKEN_ZERO
          )
      ).to.not.emit(config.hook, "Unbound");
    });

    it("does nothing when configured on a project it does not serve", async function () {
      const config = await _withTokens();
      await config.genArt721Core
        .connect(config.accounts.artist)
        .configureProjectTransferHook(OTHER_PROJECT_ID, config.hook.address);
      await mint(
        config,
        config.minter,
        OTHER_PROJECT_ID,
        config.accounts.user,
        1
      );
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
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
        PALETTE_TOKEN_ZERO
      );
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
      await expect(
        bindToken(
          config,
          config.accounts.user2,
          FORM_TOKEN_ZERO,
          config.genArt721Core,
          PALETTE_TOKEN_ZERO
        )
      ).to.emit(config.hook, "Bound");
    });

    it("swallows a failed binding param write rather than bricking the transfer", async function () {
      const config = await _withTokens();
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
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
        config.genArt721Core.address,
        PALETTE_TOKEN_ZERO
      );
      expect(allowed).to.be.true;
      expect(blocker).to.equal(BIND_BLOCKER.None);
    });

    it("allows re-writing the pairing that already exists", async function () {
      // the write path treats this as a no-op success, so previewBind must not
      // report FormAlreadyBound and send a front end into a needless unbind
      const config = await _withTokens();
      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
        PALETTE_TOKEN_ZERO
      );
      const [allowed, blocker] = await config.hook.previewBind(
        FORM_TOKEN_ZERO,
        config.genArt721Core.address,
        PALETTE_TOKEN_ZERO
      );
      expect(allowed).to.be.true;
      expect(blocker).to.equal(BIND_BLOCKER.None);
      await expect(
        bindToken(
          config,
          config.accounts.user,
          FORM_TOKEN_ZERO,
          config.genArt721Core,
          PALETTE_TOKEN_ZERO
        )
      ).to.not.be.reverted;
    });

    it("reports each blocker without reverting", async function () {
      const config = await _withTokens();
      const core = config.genArt721Core.address;
      const preview = async (
        formTokenId: BigNumber,
        paletteCore: string,
        paletteTokenId: BigNumber
      ) =>
        (
          await config.hook.previewBind(
            formTokenId,
            paletteCore,
            paletteTokenId
          )
        )[1];

      expect(
        await preview(PALETTE_TOKEN_ZERO, core, PALETTE_TOKEN_ONE)
      ).to.equal(BIND_BLOCKER.FormTokenNotInFormProject);
      expect(await preview(FORM_TOKEN_ZERO, core, OTHER_TOKEN_ZERO)).to.equal(
        BIND_BLOCKER.PaletteProjectNotRegistered
      );
      expect(
        await preview(
          FORM_TOKEN_ZERO,
          config.coreB.address,
          PALETTE_ON_CORE_B_TOKEN_ZERO
        )
      ).to.equal(BIND_BLOCKER.PaletteProjectNotRegistered);
      expect(
        await preview(FORM_TOKEN_ONE.add(50), core, PALETTE_TOKEN_ZERO)
      ).to.equal(BIND_BLOCKER.FormTokenDoesNotExist);
      expect(
        await preview(FORM_TOKEN_ZERO, core, PALETTE_TOKEN_ONE.add(50))
      ).to.equal(BIND_BLOCKER.PaletteTokenDoesNotExist);

      await bindToken(
        config,
        config.accounts.user,
        FORM_TOKEN_ZERO,
        config.genArt721Core,
        PALETTE_TOKEN_ZERO
      );
      expect(await preview(FORM_TOKEN_ZERO, core, PALETTE_TOKEN_ONE)).to.equal(
        BIND_BLOCKER.FormAlreadyBound
      );
      expect(await preview(FORM_TOKEN_ONE, core, PALETTE_TOKEN_ZERO)).to.equal(
        BIND_BLOCKER.PaletteAlreadyBound
      );

      await config.genArt721Core
        .connect(config.accounts.user)
        .transferFrom(
          config.accounts.user.address,
          config.accounts.user2.address,
          PALETTE_TOKEN_ONE
        );
      expect(await preview(FORM_TOKEN_ONE, core, PALETTE_TOKEN_ONE)).to.equal(
        BIND_BLOCKER.OwnerMismatch
      );
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
        bind(
          config,
          config.accounts.user,
          FORM_TOKEN_ZERO,
          paramValue(config.genArt721Core.address, PALETTE_TOKEN_ZERO)
        )
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
    const { genArt721Core, minterFilter } = await deployCoreWithMinterFilter(
      config,
      "GenArt721CoreV3_Engine_Flex",
      "MinterFilterV1"
    );
    const minter = await deployAndGet(config, "MinterSetPriceV2", [
      genArt721Core.address,
      minterFilter.address,
    ]);
    await minterFilter
      .connect(config.accounts.deployer)
      .addApprovedMinter(minter.address);
    for (const projectId of [FORM_PROJECT_ID, PALETTE_PROJECT_ID]) {
      await genArt721Core
        .connect(config.accounts.deployer)
        .addProject(`project ${projectId}`, config.accounts.artist.address);
      await genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(projectId);
      await genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(projectId, config.maxInvocations);
      await minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(projectId, minter.address);
      await minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(projectId, 0);
      await genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(projectId);
    }
    const delegateRegistry = await deployAndGet(config, "DelegateRegistry", []);
    const pmp = await deployAndGet(config, "PMPV1", [delegateRegistry.address]);
    const hook = await deployAndGet(config, "FormPaletteBindingHooks", [
      pmp.address,
      genArt721Core.address,
      FORM_PROJECT_ID,
    ]);

    let registerWrite = BigNumber.from(0);
    if (withHook) {
      const registerTx = await hook
        .connect(config.accounts.artist)
        .registerPaletteProject(
          genArt721Core.address,
          PALETTE_PROJECT_ID,
          PALETTES_ONE
        );
      registerWrite = (await registerTx.wait()).gasUsed;
      await pmp
        .connect(config.accounts.artist)
        .configureProject(genArt721Core.address, FORM_PROJECT_ID, [
          getPMPInputConfig(
            PARAM_KEY_BOUND_PALETTE_TOKEN_ID,
            PMP_AUTH_ENUM.TokenOwnerAndAddress,
            PMP_PARAM_TYPE_ENUM.Uint256Range,
            0,
            hook.address,
            [],
            toBytes32(UNBOUND),
            toBytes32(PARAM_MAX_RANGE)
          ),
        ]);
      await pmp
        .connect(config.accounts.artist)
        .configureProjectHooks(
          genArt721Core.address,
          FORM_PROJECT_ID,
          hook.address,
          hook.address
        );
      await pmp
        .connect(config.accounts.artist)
        .configureProjectHooks(
          genArt721Core.address,
          PALETTE_PROJECT_ID,
          constants.ZERO_ADDRESS,
          hook.address
        );
      for (const projectId of [FORM_PROJECT_ID, PALETTE_PROJECT_ID]) {
        await genArt721Core
          .connect(config.accounts.artist)
          .configureProjectTransferHook(projectId, hook.address);
      }
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
      const tx = await genArt721Core
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
        .configureTokenParams(genArt721Core.address, formTokenId, [
          bindInput(value),
        ]);
      return (await tx.wait()).gasUsed;
    };

    // baseline path, valid with or without the hook
    const unboundTransfer = await move(BigNumber.from(2));

    if (!withHook) {
      const zero = BigNumber.from(0);
      return {
        unboundTransfer,
        boundFormTransfer: zero,
        boundPaletteTransfer: zero,
        bindWrite: zero,
        unbindWrite: zero,
        registerWrite,
      };
    }

    // bind / unbind / re-bind form #0, then transfer the bound form token
    const bindWrite = await write(
      FORM_TOKEN_ZERO,
      paramValue(genArt721Core.address, PALETTE_TOKEN_ZERO)
    );
    const unbindWrite = await write(FORM_TOKEN_ZERO, UNBOUND);
    await write(
      FORM_TOKEN_ZERO,
      paramValue(genArt721Core.address, PALETTE_TOKEN_ZERO)
    );
    const boundFormTransfer = await move(FORM_TOKEN_ZERO);

    // bind form #1, then transfer the bound palette token instead
    await write(
      FORM_TOKEN_ONE,
      paramValue(genArt721Core.address, PALETTE_TOKEN_ONE)
    );
    const boundPaletteTransfer = await move(PALETTE_TOKEN_ONE);

    return {
      unboundTransfer,
      boundFormTransfer,
      boundPaletteTransfer,
      bindWrite,
      unbindWrite,
      registerWrite,
    };
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
    //   unbound transfer +20,553 / bound form +50,154 / bound palette +52,344
    //   bind write 164,475 / unbind write 71,950
    //   registerPaletteProject 198,331 for the 3 short entries used here
    expect(unboundDelta).to.be.within(16_000, 30_000);
    expect(boundFormDelta).to.be.within(40_000, 60_000);
    expect(boundPaletteDelta).to.be.within(40_000, 60_000);
    expect(withHook.bindWrite.toNumber()).to.be.within(140_000, 190_000);
    expect(withHook.unbindWrite.toNumber()).to.be.within(55_000, 90_000);
  });
});
