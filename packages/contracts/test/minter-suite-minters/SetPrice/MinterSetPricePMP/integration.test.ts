import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Contract, constants } from "ethers";
import { ethers } from "hardhat";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import {
  T_Config,
  advanceEVMByTime,
  deployAndGet,
  deployCore,
  safeAddProject,
} from "../../../util/common";
import { revertMessages } from "../../constants";
import {
  PMP_AUTH_ENUM,
  PMP_PARAM_TYPE_ENUM,
  getPMPInput,
  getPMPInputConfig,
  uint256ToBytes32,
} from "../../../web3call/PMP/pmpTestUtils";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterSetPricePMPV0";

// PMP revert messages, emitted by the PMP contract rather than this minter
const pmpRevertMessages = {
  noPMPInputs: "No PMP inputs",
  keyNotInActiveConfig:
    "PMP: param not part of most recently configured PMP params",
  tokenOwnerAuthRequired: "PMP: token owner auth required",
  paramTypeMismatch: "PMP: paramType mismatch",
  paramLocked: "PMP: param is locked",
  valueOutOfBounds: "PMP: param value out of bounds",
  artistStringOnNonStringParam:
    "PMP: artist string cannot be configured for non-string params",
  artistAuthRequiredForArtistString:
    "PMP: artist auth required to configure artist string",
};

// revert messages originating from the minter's reentrancy guard and from an
// artist-configured post-config hook
const hookRevertMessages = {
  reentrantCall: "ReentrancyGuard: reentrant call",
  hookRevert: "MockPMPConfigureHook: Intentional revert",
};

// revert messages emitted by RequiredPMPLib
const requiredPMPRevertMessages = {
  keyNotSet: "Req PMP key not set",
  keyEmptyString: "Req PMP key empty string",
  projectRequiresPMPs: "Project requires PMPs",
};

// project zero's PMP keys, in the order they are configured on the PMP contract
const PMP_KEY_COLOR = "color";
const PMP_KEY_SIZE = "size";
const PMP_KEY_OWNER_ONLY = "ownerOnly";
const PMP_KEY_NOTE = "note";

interface T_MinterSetPricePMPTestConfig extends T_Config {
  pmp: Contract;
}

// @dev testing against flagship and engine cores is sufficient - PMP
// configuration during purchase does not vary by core contract type
const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
  {
    core: "GenArt721CoreV3_Engine",
  },
];

runForEach.forEach((params) => {
  describe(`MinterSetPricePMP Integration w/ core ${params.core}`, async function () {
    async function _beforeEach() {
      // load minter filter V2 fixture
      const config = await loadFixture(setupConfigWitMinterFilterV2Suite);
      // deploy core contract and register on core registry
      ({
        genArt721Core: config.genArt721Core,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCore(config, params.core, config.coreRegistry));

      // update core's minter as the minter filter
      await config.genArt721Core.updateMinterContract(
        config.minterFilter.address
      );

      // deploy the PMP contract this minter will configure token params on
      const delegateRegistry = await deployAndGet(
        config,
        "DelegateRegistry",
        []
      );
      config.pmp = await deployAndGet(config, "PMPV1", [
        delegateRegistry.address,
      ]);

      config.minter = await deployAndGet(config, TARGET_MINTER_NAME, [
        config.minterFilter.address,
        config.pmp.address,
      ]);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .approveMinterGlobally(config.minter.address);

      config.higherPricePerTokenInWei = config.pricePerTokenInWei.add(
        ethers.utils.parseEther("0.1")
      );

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

      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectOne);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectOne);

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

      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.genArt721Core.address,
          config.pricePerTokenInWei
        );
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectOne,
          config.genArt721Core.address,
          config.pricePerTokenInWei
        );

      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 15);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, 15);

      // configure project zero's PMPs. `color` and `size` grant address auth
      // to the minter so that they may be configured during purchase, and
      // additionally grant token owner auth so the collector may update them
      // after the mint. `ownerOnly` intentionally does not authenticate the
      // minter.
      // @dev project one intentionally has no PMPs configured
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          getPMPInputConfig(
            PMP_KEY_COLOR,
            PMP_AUTH_ENUM.TokenOwnerAndAddress,
            PMP_PARAM_TYPE_ENUM.HexColor,
            0,
            config.minter.address,
            [],
            uint256ToBytes32(0),
            uint256ToBytes32(0)
          ),
          getPMPInputConfig(
            PMP_KEY_SIZE,
            PMP_AUTH_ENUM.TokenOwnerAndAddress,
            PMP_PARAM_TYPE_ENUM.Uint256Range,
            0,
            config.minter.address,
            [],
            uint256ToBytes32(0),
            uint256ToBytes32(100)
          ),
          getPMPInputConfig(
            PMP_KEY_OWNER_ONLY,
            PMP_AUTH_ENUM.TokenOwner,
            PMP_PARAM_TYPE_ENUM.Bool,
            0,
            constants.AddressZero,
            [],
            uint256ToBytes32(0),
            uint256ToBytes32(0)
          ),
          // @dev string params only support artist+ auth options, so
          // `ArtistAndAddress` is the narrowest option that authenticates
          // the minter
          getPMPInputConfig(
            PMP_KEY_NOTE,
            PMP_AUTH_ENUM.ArtistAndAddress,
            PMP_PARAM_TYPE_ENUM.String,
            0,
            config.minter.address,
            [],
            uint256ToBytes32(0),
            uint256ToBytes32(0)
          ),
        ]);

      config.isEngine = params.core.includes("Engine");

      return config as T_MinterSetPricePMPTestConfig;
    }

    // PMP input for `color` = 0xFF5733
    function colorInput() {
      return getPMPInput(
        PMP_KEY_COLOR,
        PMP_PARAM_TYPE_ENUM.HexColor,
        uint256ToBytes32(0xff5733),
        false,
        ""
      );
    }

    // PMP input for `size` = 42
    function sizeInput() {
      return getPMPInput(
        PMP_KEY_SIZE,
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        uint256ToBytes32(42),
        false,
        ""
      );
    }

    // PMP input for the string param `note`
    function noteInput(value: string) {
      return getPMPInput(
        PMP_KEY_NOTE,
        PMP_PARAM_TYPE_ENUM.String,
        uint256ToBytes32(0),
        false,
        value
      );
    }

    describe("purchaseWithPMPs", async function () {
      it("configures a single PMP in the same transaction as the mint", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.user)
          .purchaseWithPMPs(
            config.projectZero,
            config.genArt721Core.address,
            [colorInput()],
            { value: config.pricePerTokenInWei }
          );

        // token is owned by the purchaser
        expect(
          await config.genArt721Core.ownerOf(
            config.projectZeroTokenZero.toNumber()
          )
        ).to.equal(config.accounts.user.address);

        // PMP value is readable from the PMP contract
        const tokenParams = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
        expect(tokenParams.length).to.equal(1);
        expect(tokenParams[0].key).to.equal(PMP_KEY_COLOR);
        expect(tokenParams[0].value).to.equal("#ff5733");
      });

      it("configures more than one PMP in the same transaction as the mint", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.user)
          .purchaseWithPMPs(
            config.projectZero,
            config.genArt721Core.address,
            [colorInput(), sizeInput()],
            { value: config.pricePerTokenInWei }
          );

        const tokenParams = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
        expect(tokenParams.length).to.equal(2);
        expect(tokenParams[0].key).to.equal(PMP_KEY_COLOR);
        expect(tokenParams[0].value).to.equal("#ff5733");
        expect(tokenParams[1].key).to.equal(PMP_KEY_SIZE);
        expect(tokenParams[1].value).to.equal("42");
      });

      it("reverts when no PMP inputs are provided", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseWithPMPs(
              config.projectZero,
              config.genArt721Core.address,
              [],
              { value: config.pricePerTokenInWei }
            ),
          pmpRevertMessages.noPMPInputs
        );
      });

      it("reverts when the project has no PMPs configured", async function () {
        const config = await loadFixture(_beforeEach);
        // @dev project one has no PMPs configured on the PMP contract. A
        // project that has never been configured has a zero config nonce, so
        // PMP rejects the input on the unconfigured param type rather than on
        // the active key list.
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseWithPMPs(
              config.projectOne,
              config.genArt721Core.address,
              [colorInput()],
              { value: config.pricePerTokenInWei }
            ),
          pmpRevertMessages.paramTypeMismatch
        );
      });

      it("reverts when a PMP key is not part of the project's active config", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseWithPMPs(
              config.projectZero,
              config.genArt721Core.address,
              [
                getPMPInput(
                  "notAConfiguredKey",
                  PMP_PARAM_TYPE_ENUM.Bool,
                  uint256ToBytes32(1),
                  false,
                  ""
                ),
              ],
              { value: config.pricePerTokenInWei }
            ),
          pmpRevertMessages.keyNotInActiveConfig
        );
      });

      it("reverts when the minter is not an authenticated address for the key", async function () {
        const config = await loadFixture(_beforeEach);
        // @dev `ownerOnly` is configured with TokenOwner auth, which the minter
        // cannot satisfy because the token is owned by the purchaser
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseWithPMPs(
              config.projectZero,
              config.genArt721Core.address,
              [
                getPMPInput(
                  PMP_KEY_OWNER_ONLY,
                  PMP_PARAM_TYPE_ENUM.Bool,
                  uint256ToBytes32(1),
                  false,
                  ""
                ),
              ],
              { value: config.pricePerTokenInWei }
            ),
          pmpRevertMessages.tokenOwnerAuthRequired
        );
      });

      it("reverts when a PMP value is outside of the configured range", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseWithPMPs(
              config.projectZero,
              config.genArt721Core.address,
              [
                getPMPInput(
                  PMP_KEY_SIZE,
                  PMP_PARAM_TYPE_ENUM.Uint256Range,
                  uint256ToBytes32(101),
                  false,
                  ""
                ),
              ],
              { value: config.pricePerTokenInWei }
            ),
          pmpRevertMessages.valueOutOfBounds
        );
      });

      it("reverts when a PMP param type does not match the project's config", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseWithPMPs(
              config.projectZero,
              config.genArt721Core.address,
              [
                getPMPInput(
                  PMP_KEY_COLOR,
                  PMP_PARAM_TYPE_ENUM.Bool,
                  uint256ToBytes32(1),
                  false,
                  ""
                ),
              ],
              { value: config.pricePerTokenInWei }
            ),
          pmpRevertMessages.paramTypeMismatch
        );
      });

      it("reverts when the artist string flag is set on a non-string param", async function () {
        const config = await loadFixture(_beforeEach);
        // @dev `color` is a HexColor param, so PMP rejects the input on the
        // param type before any artist auth check is reached
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .purchaseWithPMPs(
              config.projectZero,
              config.genArt721Core.address,
              [
                getPMPInput(
                  PMP_KEY_COLOR,
                  PMP_PARAM_TYPE_ENUM.HexColor,
                  uint256ToBytes32(0xff5733),
                  true,
                  ""
                ),
              ],
              { value: config.pricePerTokenInWei }
            ),
          pmpRevertMessages.artistStringOnNonStringParam
        );
      });

      it("reverts when the artist string flag is set on a string param", async function () {
        const config = await loadFixture(_beforeEach);
        // @dev PMP authenticates the minter, which is never the artist, so the
        // artist string flag can never be satisfied through a purchase - even
        // when the artist is the one calling the minter
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .purchaseWithPMPs(
              config.projectZero,
              config.genArt721Core.address,
              [
                getPMPInput(
                  PMP_KEY_NOTE,
                  PMP_PARAM_TYPE_ENUM.String,
                  uint256ToBytes32(0),
                  true,
                  "hello"
                ),
              ],
              { value: config.pricePerTokenInWei }
            ),
          pmpRevertMessages.artistAuthRequiredForArtistString
        );
      });

      it("does not allow purchase prior to configuring price", async function () {
        const config = await loadFixture(_beforeEach);
        // @dev project two is not configured on this minter
        await safeAddProject(
          config.genArt721Core,
          config.accounts.deployer,
          config.accounts.artist.address
        );
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectTwo,
            config.genArt721Core.address,
            config.minter.address
          );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseWithPMPs(
              config.projectTwo,
              config.genArt721Core.address,
              [colorInput()],
              { value: config.pricePerTokenInWei }
            ),
          revertMessages.priceNotConfigured
        );
      });

      it("requires at least the configured price", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseWithPMPs(
              config.projectZero,
              config.genArt721Core.address,
              [colorInput()],
              { value: config.pricePerTokenInWei.sub(1) }
            ),
          revertMessages.needMoreValue
        );
      });

      it("refunds excess payment", async function () {
        const config = await loadFixture(_beforeEach);
        const excess = ethers.utils.parseEther("0.5");
        const balanceBefore = await config.accounts.user.getBalance();
        const tx = await config.minter
          .connect(config.accounts.user)
          .purchaseWithPMPs(
            config.projectZero,
            config.genArt721Core.address,
            [colorInput()],
            { value: config.pricePerTokenInWei.add(excess) }
          );
        const receipt = await tx.wait();
        const gasCost = receipt.effectiveGasPrice.mul(receipt.gasUsed);
        const balanceAfter = await config.accounts.user.getBalance();
        // only the configured price and gas are spent - the excess is refunded
        expect(balanceBefore.sub(balanceAfter)).to.equal(
          config.pricePerTokenInWei.add(gasCost)
        );
      });

      it("allows the collector to update a minter-configured PMP after the mint", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.user)
          .purchaseWithPMPs(
            config.projectZero,
            config.genArt721Core.address,
            [colorInput()],
            { value: config.pricePerTokenInWei }
          );

        // collector updates the value directly on the PMP contract
        await config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [
              getPMPInput(
                PMP_KEY_COLOR,
                PMP_PARAM_TYPE_ENUM.HexColor,
                uint256ToBytes32(0x00ff00),
                false,
                ""
              ),
            ]
          );

        const tokenParams = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
        expect(tokenParams[0].value).to.equal("#00ff00");
      });

      it("configures PMPs independently for each token", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.user)
          .purchaseWithPMPs(
            config.projectZero,
            config.genArt721Core.address,
            [colorInput()],
            { value: config.pricePerTokenInWei }
          );
        await config.minter
          .connect(config.accounts.user2)
          .purchaseWithPMPs(
            config.projectZero,
            config.genArt721Core.address,
            [
              getPMPInput(
                PMP_KEY_COLOR,
                PMP_PARAM_TYPE_ENUM.HexColor,
                uint256ToBytes32(0x0000ff),
                false,
                ""
              ),
            ],
            { value: config.pricePerTokenInWei }
          );

        const tokenZeroParams = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
        const tokenOneParams = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenOne.toNumber()
        );
        expect(tokenZeroParams[0].value).to.equal("#ff5733");
        expect(tokenOneParams[0].value).to.equal("#0000ff");
      });
    });

    describe("purchaseToWithPMPs", async function () {
      it("mints to `to` and configures the token's PMPs", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.user)
          .purchaseToWithPMPs(
            config.accounts.additional.address,
            config.projectZero,
            config.genArt721Core.address,
            [colorInput(), sizeInput()],
            { value: config.pricePerTokenInWei }
          );

        expect(
          await config.genArt721Core.ownerOf(
            config.projectZeroTokenZero.toNumber()
          )
        ).to.equal(config.accounts.additional.address);

        const tokenParams = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
        expect(tokenParams.length).to.equal(2);
        expect(tokenParams[0].value).to.equal("#ff5733");
        expect(tokenParams[1].value).to.equal("42");
      });

      it("reverts when no PMP inputs are provided", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseToWithPMPs(
              config.accounts.additional.address,
              config.projectZero,
              config.genArt721Core.address,
              [],
              { value: config.pricePerTokenInWei }
            ),
          pmpRevertMessages.noPMPInputs
        );
      });

      it("does not allow reentrant purchases", async function () {
        const config = await loadFixture(_beforeEach);
        // deploy reentrancy contract
        const reentrancy = await deployAndGet(
          config,
          "ReentrancyMockShared",
          []
        );
        // perform attack
        // @dev refund failed error message is expected, because the attack
        // occurs during the refund call, whose low-level call does not bubble
        // up the inner reentrancy guard revert. See the post-config hook tests
        // for assertions on the guard's own revert reason.
        await expectRevert(
          reentrancy.connect(config.accounts.user).attack(
            2, // qty to purchase
            config.minter.address, // minter address
            config.projectZero, // project id
            config.genArt721Core.address, // core address
            config.pricePerTokenInWei.add("1"), // price to pay
            {
              value: config.pricePerTokenInWei.add(1).mul(2),
            }
          ),
          revertMessages.refundFailed
        );
      });

      it("does not allow reentrant purchases through the PMP purchase path", async function () {
        const config = await loadFixture(_beforeEach);
        // deploy reentrancy contract that reenters via purchaseWithPMPs
        const reentrancy = await deployAndGet(
          config,
          "ReentrancyPMPMockShared",
          []
        );
        // perform attack
        // @dev refund failed error message is expected, because the attack
        // occurs during the refund call, whose low-level call does not bubble
        // up the inner reentrancy guard revert. See the post-config hook tests
        // for assertions on the guard's own revert reason.
        await expectRevert(
          reentrancy.connect(config.accounts.user).attack(
            2, // qty to purchase
            config.minter.address, // minter address
            config.projectZero, // project id
            config.genArt721Core.address, // core address
            config.pricePerTokenInWei.add("1"), // price to pay
            PMP_KEY_COLOR,
            PMP_PARAM_TYPE_ENUM.HexColor,
            uint256ToBytes32(0xff5733),
            {
              value: config.pricePerTokenInWei.add(1).mul(2),
            }
          ),
          revertMessages.refundFailed
        );

        // does allow a single purchase
        await reentrancy.connect(config.accounts.user).attack(
          1, // qty to purchase
          config.minter.address, // minter address
          config.projectZero, // project id
          config.genArt721Core.address, // core address
          config.pricePerTokenInWei.add("1"), // price to pay
          PMP_KEY_COLOR,
          PMP_PARAM_TYPE_ENUM.HexColor,
          uint256ToBytes32(0xff5733),
          {
            value: config.pricePerTokenInWei.add(1),
          }
        );
      });
    });

    describe("artist-configured post-config hook", async function () {
      // sets `hook` as project zero's post-config hook
      async function setPostConfigHook(config, hook: string) {
        await config.pmp
          .connect(config.accounts.artist)
          .configureProjectHooks(
            config.genArt721Core.address,
            config.projectZero,
            hook,
            constants.AddressZero
          );
      }

      it("invokes the hook with the configured PMP input", async function () {
        const config = await loadFixture(_beforeEach);
        const hook = await deployAndGet(config, "MockPMPConfigureHook", []);
        await setPostConfigHook(config, hook.address);

        await config.minter
          .connect(config.accounts.user)
          .purchaseWithPMPs(
            config.projectZero,
            config.genArt721Core.address,
            [colorInput()],
            { value: config.pricePerTokenInWei }
          );

        // the hook observed the mint, which makes the tests below meaningful
        expect(await hook.lastTokenId()).to.equal(
          config.projectZeroTokenZero.toNumber()
        );
        expect(await hook.lastPmpKey()).to.equal(PMP_KEY_COLOR);
      });

      it("reverts the entire purchase when the hook reverts", async function () {
        const config = await loadFixture(_beforeEach);
        const hook = await deployAndGet(config, "MockPMPConfigureHook", []);
        await setPostConfigHook(config, hook.address);
        await hook.setShouldRevert(true);

        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseWithPMPs(
              config.projectZero,
              config.genArt721Core.address,
              [colorInput()],
              { value: config.pricePerTokenInWei }
            ),
          hookRevertMessages.hookRevert
        );

        // the mint was rolled back along with the rest of the transaction
        const projectState = await config.genArt721Core.projectStateData(
          config.projectZero
        );
        expect(projectState.invocations).to.equal(0);
      });

      // a hook runs after the mint but before funds are split, so it is the
      // one place arbitrary artist code executes mid-purchase
      const reentrancyCases = [
        { name: "purchase", reenterWithPMPs: false },
        { name: "purchaseWithPMPs", reenterWithPMPs: true },
      ];
      reentrancyCases.forEach((reentrancyCase) => {
        it(`blocks a hook that re-enters \`${reentrancyCase.name}\``, async function () {
          const config = await loadFixture(_beforeEach);
          const hook = await deployAndGet(
            config,
            "MockPMPMinterReentrantConfigureHook",
            [
              config.minter.address,
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              reentrancyCase.reenterWithPMPs,
            ]
          );
          await setPostConfigHook(config, hook.address);
          // fund the hook so the reentrant purchase is fully paid for, leaving
          // the minter's reentrancy guard as the only thing that can stop it
          await config.accounts.user.sendTransaction({
            to: hook.address,
            value: config.pricePerTokenInWei,
          });

          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .purchaseWithPMPs(
                config.projectZero,
                config.genArt721Core.address,
                [colorInput()],
                { value: config.pricePerTokenInWei }
              ),
            hookRevertMessages.reentrantCall
          );
        });
      });
    });

    describe("required PMP keys", async function () {
      // sets project zero's required keys to `keys`
      async function setRequiredKeys(config, keys: string[]) {
        await config.minter
          .connect(config.accounts.artist)
          .setProjectRequiredPMPKeys(
            config.projectZero,
            config.genArt721Core.address,
            keys
          );
      }

      it("allows purchase when all required keys are submitted", async function () {
        const config = await loadFixture(_beforeEach);
        await setRequiredKeys(config, [PMP_KEY_COLOR, PMP_KEY_SIZE]);
        await config.minter
          .connect(config.accounts.user)
          .purchaseWithPMPs(
            config.projectZero,
            config.genArt721Core.address,
            [colorInput(), sizeInput()],
            { value: config.pricePerTokenInWei }
          );
        const tokenParams = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
        expect(tokenParams.length).to.equal(2);
      });

      it("allows additional non-required keys alongside the required ones", async function () {
        const config = await loadFixture(_beforeEach);
        await setRequiredKeys(config, [PMP_KEY_COLOR]);
        // submits the required `color` plus the non-required `size`
        await config.minter
          .connect(config.accounts.user)
          .purchaseWithPMPs(
            config.projectZero,
            config.genArt721Core.address,
            [colorInput(), sizeInput()],
            { value: config.pricePerTokenInWei }
          );
        const tokenParams = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
        expect(tokenParams.length).to.equal(2);
      });

      it("accepts required keys submitted in any order", async function () {
        const config = await loadFixture(_beforeEach);
        await setRequiredKeys(config, [PMP_KEY_COLOR, PMP_KEY_SIZE]);
        await config.minter
          .connect(config.accounts.user)
          .purchaseWithPMPs(
            config.projectZero,
            config.genArt721Core.address,
            [sizeInput(), colorInput()],
            { value: config.pricePerTokenInWei }
          );
        expect(
          await config.genArt721Core.ownerOf(
            config.projectZeroTokenZero.toNumber()
          )
        ).to.equal(config.accounts.user.address);
      });

      it("allows purchase when a required string key is given a value", async function () {
        const config = await loadFixture(_beforeEach);
        await setRequiredKeys(config, [PMP_KEY_NOTE]);
        await config.minter
          .connect(config.accounts.user)
          .purchaseWithPMPs(
            config.projectZero,
            config.genArt721Core.address,
            [noteInput("hello")],
            { value: config.pricePerTokenInWei }
          );
        const tokenParams = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
        expect(tokenParams.length).to.equal(1);
        expect(tokenParams[0].key).to.equal(PMP_KEY_NOTE);
        expect(tokenParams[0].value).to.equal("hello");
      });

      it("reverts when a required string key is given an empty value", async function () {
        const config = await loadFixture(_beforeEach);
        await setRequiredKeys(config, [PMP_KEY_NOTE]);
        // @dev the PMP contract accepts an empty string, but then reports the
        // param as unconfigured, so the minter must reject it itself
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseWithPMPs(
              config.projectZero,
              config.genArt721Core.address,
              [noteInput("")],
              { value: config.pricePerTokenInWei }
            ),
          requiredPMPRevertMessages.keyEmptyString
        );
      });

      it("allows a non-required string key to be submitted empty", async function () {
        const config = await loadFixture(_beforeEach);
        await setRequiredKeys(config, [PMP_KEY_COLOR]);
        // `note` is not required, so the minter does not enforce a value for it
        await config.minter
          .connect(config.accounts.user)
          .purchaseWithPMPs(
            config.projectZero,
            config.genArt721Core.address,
            [colorInput(), noteInput("")],
            { value: config.pricePerTokenInWei }
          );
        const tokenParams = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
        // only `color` is populated - the empty string is not considered
        // configured by the PMP contract
        expect(tokenParams.length).to.equal(1);
        expect(tokenParams[0].key).to.equal(PMP_KEY_COLOR);
      });

      it("reverts when the only required key is missing", async function () {
        const config = await loadFixture(_beforeEach);
        await setRequiredKeys(config, [PMP_KEY_COLOR]);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseWithPMPs(
              config.projectZero,
              config.genArt721Core.address,
              [sizeInput()],
              { value: config.pricePerTokenInWei }
            ),
          requiredPMPRevertMessages.keyNotSet
        );
      });

      it("reverts when only some of the required keys are submitted", async function () {
        const config = await loadFixture(_beforeEach);
        await setRequiredKeys(config, [PMP_KEY_COLOR, PMP_KEY_SIZE]);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseWithPMPs(
              config.projectZero,
              config.genArt721Core.address,
              [colorInput()],
              { value: config.pricePerTokenInWei }
            ),
          requiredPMPRevertMessages.keyNotSet
        );
      });

      it("reverts `purchaseToWithPMPs` when a required key is missing", async function () {
        const config = await loadFixture(_beforeEach);
        await setRequiredKeys(config, [PMP_KEY_COLOR]);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseToWithPMPs(
              config.accounts.additional.address,
              config.projectZero,
              config.genArt721Core.address,
              [sizeInput()],
              { value: config.pricePerTokenInWei }
            ),
          requiredPMPRevertMessages.keyNotSet
        );
      });

      it("reverts plain `purchase` while the project has required keys", async function () {
        const config = await loadFixture(_beforeEach);
        await setRequiredKeys(config, [PMP_KEY_COLOR]);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            }),
          requiredPMPRevertMessages.projectRequiresPMPs
        );
      });

      it("reverts plain `purchaseTo` while the project has required keys", async function () {
        const config = await loadFixture(_beforeEach);
        await setRequiredKeys(config, [PMP_KEY_COLOR]);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.additional.address,
              config.projectZero,
              config.genArt721Core.address,
              { value: config.pricePerTokenInWei }
            ),
          requiredPMPRevertMessages.projectRequiresPMPs
        );
      });

      it("re-allows plain `purchase` once required keys are cleared", async function () {
        const config = await loadFixture(_beforeEach);
        await setRequiredKeys(config, [PMP_KEY_COLOR]);
        await setRequiredKeys(config, []);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.pricePerTokenInWei,
          });
        expect(
          await config.genArt721Core.ownerOf(
            config.projectZeroTokenZero.toNumber()
          )
        ).to.equal(config.accounts.user.address);
      });

      it("does not affect other projects on the minter", async function () {
        const config = await loadFixture(_beforeEach);
        await setRequiredKeys(config, [PMP_KEY_COLOR]);
        // project one has no required keys, so plain purchase still works
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectOne, config.genArt721Core.address, {
            value: config.pricePerTokenInWei,
          });
      });

      // the validation performed when required keys are set is a setup-time
      // guardrail, not a durable guarantee - the artist may reconfigure the
      // project on the PMP contract afterwards. These tests pin down the
      // documented consequence: minting halts until the PMP config or the
      // project's required keys are corrected.
      describe("artist invalidating a required key after the fact", async function () {
        // reconfigures project zero's PMPs, replacing the existing config
        async function reconfigureProjectZero(config, pmpInputConfigs) {
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              pmpInputConfigs
            );
        }

        // project zero's `size` config, unchanged
        function sizeConfig(config) {
          return getPMPInputConfig(
            PMP_KEY_SIZE,
            PMP_AUTH_ENUM.TokenOwnerAndAddress,
            PMP_PARAM_TYPE_ENUM.Uint256Range,
            0,
            config.minter.address,
            [],
            uint256ToBytes32(0),
            uint256ToBytes32(100)
          );
        }

        it("halts minting when a required key is dropped from the PMP config", async function () {
          const config = await loadFixture(_beforeEach);
          await setRequiredKeys(config, [PMP_KEY_COLOR]);
          // artist reconfigures the project without `color`, leaving the
          // minter still requiring it
          await reconfigureProjectZero(config, [sizeConfig(config)]);

          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .purchaseWithPMPs(
                config.projectZero,
                config.genArt721Core.address,
                [colorInput()],
                { value: config.pricePerTokenInWei }
              ),
            pmpRevertMessages.keyNotInActiveConfig
          );

          // and the key cannot simply be omitted instead
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .purchaseWithPMPs(
                config.projectZero,
                config.genArt721Core.address,
                [sizeInput()],
                { value: config.pricePerTokenInWei }
              ),
            requiredPMPRevertMessages.keyNotSet
          );
        });

        it("halts minting once a required key's lock timestamp passes", async function () {
          const config = await loadFixture(_beforeEach);
          await setRequiredKeys(config, [PMP_KEY_COLOR]);
          // artist reconfigures `color` to lock shortly in the future, which
          // `setProjectRequiredPMPKeys` would have rejected up front
          const latestBlock = await ethers.provider.getBlock("latest");
          const lockTimestamp = latestBlock.timestamp + 1000;
          await reconfigureProjectZero(config, [
            getPMPInputConfig(
              PMP_KEY_COLOR,
              PMP_AUTH_ENUM.TokenOwnerAndAddress,
              PMP_PARAM_TYPE_ENUM.HexColor,
              lockTimestamp,
              config.minter.address,
              [],
              uint256ToBytes32(0),
              uint256ToBytes32(0)
            ),
          ]);

          // still mintable before the lock takes effect
          await config.minter
            .connect(config.accounts.user)
            .purchaseWithPMPs(
              config.projectZero,
              config.genArt721Core.address,
              [colorInput()],
              { value: config.pricePerTokenInWei }
            );

          await advanceEVMByTime(2000);

          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .purchaseWithPMPs(
                config.projectZero,
                config.genArt721Core.address,
                [colorInput()],
                { value: config.pricePerTokenInWei }
              ),
            pmpRevertMessages.paramLocked
          );
        });

        it("restores minting once the artist clears the required keys", async function () {
          const config = await loadFixture(_beforeEach);
          await setRequiredKeys(config, [PMP_KEY_COLOR]);
          await reconfigureProjectZero(config, [sizeConfig(config)]);

          // minting is halted
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .purchaseWithPMPs(
                config.projectZero,
                config.genArt721Core.address,
                [colorInput()],
                { value: config.pricePerTokenInWei }
              ),
            pmpRevertMessages.keyNotInActiveConfig
          );

          await setRequiredKeys(config, []);

          // plain purchase works again
          await config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            });
          expect(
            await config.genArt721Core.ownerOf(
              config.projectZeroTokenZero.toNumber()
            )
          ).to.equal(config.accounts.user.address);
        });

        it("restores minting once the artist corrects the PMP config", async function () {
          const config = await loadFixture(_beforeEach);
          await setRequiredKeys(config, [PMP_KEY_COLOR]);
          await reconfigureProjectZero(config, [sizeConfig(config)]);

          // artist restores `color` to the project's active config
          await reconfigureProjectZero(config, [
            getPMPInputConfig(
              PMP_KEY_COLOR,
              PMP_AUTH_ENUM.TokenOwnerAndAddress,
              PMP_PARAM_TYPE_ENUM.HexColor,
              0,
              config.minter.address,
              [],
              uint256ToBytes32(0),
              uint256ToBytes32(0)
            ),
          ]);

          await config.minter
            .connect(config.accounts.user)
            .purchaseWithPMPs(
              config.projectZero,
              config.genArt721Core.address,
              [colorInput()],
              { value: config.pricePerTokenInWei }
            );
          expect(
            await config.genArt721Core.ownerOf(
              config.projectZeroTokenZero.toNumber()
            )
          ).to.equal(config.accounts.user.address);
        });
      });

      describe("required PMP checks run after the standard pre-mint checks", async function () {
        // sells out project zero, which has a manual limit of one invocation
        async function sellOutProjectZero(config) {
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              1
            );
          await config.minter
            .connect(config.accounts.user)
            .purchaseWithPMPs(
              config.projectZero,
              config.genArt721Core.address,
              [colorInput()],
              { value: config.pricePerTokenInWei }
            );
        }

        it("reports max invocations reached rather than a missing required key", async function () {
          const config = await loadFixture(_beforeEach);
          await sellOutProjectZero(config);
          await setRequiredKeys(config, [PMP_KEY_COLOR]);
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .purchaseWithPMPs(
                config.projectZero,
                config.genArt721Core.address,
                [sizeInput()],
                { value: config.pricePerTokenInWei }
              ),
            revertMessages.maximumInvocationsReached
          );
        });

        it("reports max invocations reached rather than the project requiring PMPs", async function () {
          const config = await loadFixture(_beforeEach);
          await sellOutProjectZero(config);
          await setRequiredKeys(config, [PMP_KEY_COLOR]);
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .purchase(config.projectZero, config.genArt721Core.address, {
                value: config.pricePerTokenInWei,
              }),
            revertMessages.maximumInvocationsReached
          );
        });
      });
    });

    describe("purchase and purchaseTo without PMPs", async function () {
      it("allows purchase without configuring any PMPs", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.pricePerTokenInWei,
          });

        expect(
          await config.genArt721Core.ownerOf(
            config.projectZeroTokenZero.toNumber()
          )
        ).to.equal(config.accounts.user.address);

        // no PMPs are configured for the token
        const tokenParams = await config.pmp.getTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
        expect(tokenParams.length).to.equal(0);
      });

      it("allows `purchaseTo` without configuring any PMPs", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.user)
          .purchaseTo(
            config.accounts.additional.address,
            config.projectZero,
            config.genArt721Core.address,
            { value: config.pricePerTokenInWei }
          );
        expect(
          await config.genArt721Core.ownerOf(
            config.projectZeroTokenZero.toNumber()
          )
        ).to.equal(config.accounts.additional.address);
      });

      it("enforces max invocations", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        await config.minter
          .connect(config.accounts.user)
          .purchaseWithPMPs(
            config.projectZero,
            config.genArt721Core.address,
            [colorInput()],
            { value: config.pricePerTokenInWei }
          );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseWithPMPs(
              config.projectZero,
              config.genArt721Core.address,
              [colorInput()],
              { value: config.pricePerTokenInWei }
            ),
          revertMessages.maximumInvocationsReached
        );
      });
    });
  });
});
