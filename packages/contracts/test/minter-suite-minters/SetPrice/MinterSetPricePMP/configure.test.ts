import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { SetPrice_Common_Configure } from "../common.configure";
import { ethers } from "hardhat";
import { constants } from "ethers";
import { revertMessages } from "../../constants";
import {
  PMP_AUTH_ENUM,
  PMP_PARAM_TYPE_ENUM,
  getPMPInputConfig,
  uint256ToBytes32,
} from "../../../web3call/PMP/pmpTestUtils";

const TARGET_MINTER_NAME = "MinterSetPricePMPV0";

// revert messages emitted by RequiredPMPLib
const requiredPMPRevertMessages = {
  tooManyKeys: "Only <= 256 req PMP keys",
  duplicateKey: "Duplicate req PMP key",
  keyUnconfigured: "Req PMP key unconfigured",
  keyNotInConfig: "Req PMP key not in config",
  keyNeedsAddrAuth: "Req PMP key needs addr auth",
  keyMustAuthMinter: "Req PMP key must auth minter",
  keyMustNeverLock: "Req PMP key must never lock",
};

// project zero's PMP keys, configured in the fixture below
const PMP_KEY_COLOR = "color"; // auth: TokenOwnerAndAddress (minter)
const PMP_KEY_SIZE = "size"; // auth: Address (minter)
const PMP_KEY_OWNER_ONLY = "ownerOnly"; // auth: TokenOwner - minter not authed
const PMP_KEY_LOCKING = "lockingColor"; // auth: minter, but locks in future

// @dev safely in the future (year 2096), for the locking PMP key
const FUTURE_LOCK_TIMESTAMP = 4000000000;

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

runForEach.forEach((params) => {
  describe(`MinterSetPricePMP Configure w/ core ${params.core}`, async function () {
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

      // configure project zero's PMPs, covering each auth shape the required
      // key validation cares about
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
            PMP_AUTH_ENUM.Address,
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
          getPMPInputConfig(
            PMP_KEY_LOCKING,
            PMP_AUTH_ENUM.TokenOwnerAndAddress,
            PMP_PARAM_TYPE_ENUM.HexColor,
            FUTURE_LOCK_TIMESTAMP,
            config.minter.address,
            [],
            uint256ToBytes32(0),
            uint256ToBytes32(0)
          ),
        ]);

      return config;
    }

    describe("Common Set Price Minter Configure Tests", async function () {
      await SetPrice_Common_Configure(_beforeEach);
    });

    describe("setProjectRequiredPMPKeys", async function () {
      it("sets a project's required PMP keys", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .setProjectRequiredPMPKeys(
            config.projectZero,
            config.genArt721Core.address,
            [PMP_KEY_COLOR, PMP_KEY_SIZE]
          );
        expect(
          await config.minter.projectRequiredPMPKeys(
            config.projectZero,
            config.genArt721Core.address
          )
        ).to.deep.equal([PMP_KEY_COLOR, PMP_KEY_SIZE]);
      });

      it("returns an empty array when no keys are required", async function () {
        const config = await loadFixture(_beforeEach);
        expect(
          await config.minter.projectRequiredPMPKeys(
            config.projectZero,
            config.genArt721Core.address
          )
        ).to.deep.equal([]);
      });

      it("replaces previously set keys", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .setProjectRequiredPMPKeys(
            config.projectZero,
            config.genArt721Core.address,
            [PMP_KEY_COLOR, PMP_KEY_SIZE]
          );
        await config.minter
          .connect(config.accounts.artist)
          .setProjectRequiredPMPKeys(
            config.projectZero,
            config.genArt721Core.address,
            [PMP_KEY_SIZE]
          );
        expect(
          await config.minter.projectRequiredPMPKeys(
            config.projectZero,
            config.genArt721Core.address
          )
        ).to.deep.equal([PMP_KEY_SIZE]);
      });

      it("clears keys when passed an empty array", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .setProjectRequiredPMPKeys(
            config.projectZero,
            config.genArt721Core.address,
            [PMP_KEY_COLOR]
          );
        await config.minter
          .connect(config.accounts.artist)
          .setProjectRequiredPMPKeys(
            config.projectZero,
            config.genArt721Core.address,
            []
          );
        expect(
          await config.minter.projectRequiredPMPKeys(
            config.projectZero,
            config.genArt721Core.address
          )
        ).to.deep.equal([]);
      });

      it("only allows the artist to set required PMP keys", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .setProjectRequiredPMPKeys(
              config.projectZero,
              config.genArt721Core.address,
              [PMP_KEY_COLOR]
            ),
          revertMessages.onlyArtist
        );
      });

      it("reverts on duplicate keys", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setProjectRequiredPMPKeys(
              config.projectZero,
              config.genArt721Core.address,
              [PMP_KEY_COLOR, PMP_KEY_SIZE, PMP_KEY_COLOR]
            ),
          requiredPMPRevertMessages.duplicateKey
        );
      });

      // @dev intentionally not tested at the full cap of 256. The duplicate
      // check is O(n^2), and instrumenting ~33k loop iterations exhausts
      // solidity-coverage's heap. 32 keys exercises the same multi-key paths.
      it("accepts a large set of keys", async function () {
        const config = await loadFixture(_beforeEach);
        const maxKeys = Array.from({ length: 32 }, (_, i) => `key${i}`);
        await config.pmp.connect(config.accounts.artist).configureProject(
          config.genArt721Core.address,
          config.projectZero,
          maxKeys.map((key) =>
            getPMPInputConfig(
              key,
              PMP_AUTH_ENUM.Address,
              PMP_PARAM_TYPE_ENUM.Bool,
              0,
              config.minter.address,
              [],
              uint256ToBytes32(0),
              uint256ToBytes32(0)
            )
          )
        );

        await config.minter
          .connect(config.accounts.artist)
          .setProjectRequiredPMPKeys(
            config.projectZero,
            config.genArt721Core.address,
            maxKeys
          );

        expect(
          await config.minter.projectRequiredPMPKeys(
            config.projectZero,
            config.genArt721Core.address
          )
        ).to.deep.equal(maxKeys);
      });

      it("reverts when more than 256 keys are provided", async function () {
        const config = await loadFixture(_beforeEach);
        const tooManyKeys = Array.from({ length: 257 }, (_, i) => `key${i}`);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setProjectRequiredPMPKeys(
              config.projectZero,
              config.genArt721Core.address,
              tooManyKeys
            ),
          requiredPMPRevertMessages.tooManyKeys
        );
      });

      it("reverts when a key is not configured on the project", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setProjectRequiredPMPKeys(
              config.projectZero,
              config.genArt721Core.address,
              ["notAConfiguredKey"]
            ),
          requiredPMPRevertMessages.keyUnconfigured
        );
      });

      it("reverts when the project has no PMPs configured at all", async function () {
        const config = await loadFixture(_beforeEach);
        // @dev project one has never been configured on the PMP contract, so
        // its config nonce is zero - exercises the explicit unconfigured check
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setProjectRequiredPMPKeys(
              config.projectOne,
              config.genArt721Core.address,
              [PMP_KEY_COLOR]
            ),
          requiredPMPRevertMessages.keyUnconfigured
        );
      });

      it("reverts when a key is no longer part of the active config", async function () {
        const config = await loadFixture(_beforeEach);
        // artist reconfigures the project, dropping `color` from the key list
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            getPMPInputConfig(
              PMP_KEY_SIZE,
              PMP_AUTH_ENUM.Address,
              PMP_PARAM_TYPE_ENUM.Uint256Range,
              0,
              config.minter.address,
              [],
              uint256ToBytes32(0),
              uint256ToBytes32(100)
            ),
          ]);
        // `color` storage still holds a param type, but its config nonce is stale
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setProjectRequiredPMPKeys(
              config.projectZero,
              config.genArt721Core.address,
              [PMP_KEY_COLOR]
            ),
          requiredPMPRevertMessages.keyNotInConfig
        );
      });

      it("reverts when a key's auth option does not permit an address", async function () {
        const config = await loadFixture(_beforeEach);
        // @dev `ownerOnly` uses TokenOwner auth, so the minter can never set it
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setProjectRequiredPMPKeys(
              config.projectZero,
              config.genArt721Core.address,
              [PMP_KEY_OWNER_ONLY]
            ),
          requiredPMPRevertMessages.keyNeedsAddrAuth
        );
      });

      // each PMP auth option that permits a configured address to set a value
      const addressAuthOptions = [
        { name: "Address", value: PMP_AUTH_ENUM.Address },
        { name: "ArtistAndAddress", value: PMP_AUTH_ENUM.ArtistAndAddress },
        {
          name: "TokenOwnerAndAddress",
          value: PMP_AUTH_ENUM.TokenOwnerAndAddress,
        },
        {
          name: "ArtistAndTokenOwnerAndAddress",
          value: PMP_AUTH_ENUM.ArtistAndTokenOwnerAndAddress,
        },
      ];
      addressAuthOptions.forEach((authOption) => {
        it(`accepts a key with ${authOption.name} auth`, async function () {
          const config = await loadFixture(_beforeEach);
          await config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [
                getPMPInputConfig(
                  PMP_KEY_COLOR,
                  authOption.value,
                  PMP_PARAM_TYPE_ENUM.HexColor,
                  0,
                  config.minter.address,
                  [],
                  uint256ToBytes32(0),
                  uint256ToBytes32(0)
                ),
              ]
            );
          await config.minter
            .connect(config.accounts.artist)
            .setProjectRequiredPMPKeys(
              config.projectZero,
              config.genArt721Core.address,
              [PMP_KEY_COLOR]
            );
          expect(
            await config.minter.projectRequiredPMPKeys(
              config.projectZero,
              config.genArt721Core.address
            )
          ).to.deep.equal([PMP_KEY_COLOR]);
        });
      });

      it("reverts when a key authenticates an address other than this minter", async function () {
        const config = await loadFixture(_beforeEach);
        // artist reconfigures `color` to authenticate some other address
        await config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            getPMPInputConfig(
              PMP_KEY_COLOR,
              PMP_AUTH_ENUM.TokenOwnerAndAddress,
              PMP_PARAM_TYPE_ENUM.HexColor,
              0,
              config.accounts.user.address,
              [],
              uint256ToBytes32(0),
              uint256ToBytes32(0)
            ),
          ]);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setProjectRequiredPMPKeys(
              config.projectZero,
              config.genArt721Core.address,
              [PMP_KEY_COLOR]
            ),
          requiredPMPRevertMessages.keyMustAuthMinter
        );
      });

      it("reverts when a key has a lock timestamp", async function () {
        const config = await loadFixture(_beforeEach);
        // @dev a key that eventually locks would permanently halt minting
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setProjectRequiredPMPKeys(
              config.projectZero,
              config.genArt721Core.address,
              [PMP_KEY_LOCKING]
            ),
          requiredPMPRevertMessages.keyMustNeverLock
        );
      });
    });

    describe("updatePricePerTokenInWei", async function () {
      it("enforces price update", async function () {
        const config = await loadFixture(_beforeEach);
        // artist increases price
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.higherPricePerTokenInWei
          );

        // cannot purchase token at lower price
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            }),
          revertMessages.needMoreValue
        );

        // can purchase token at higher price
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.higherPricePerTokenInWei,
          });
      });

      it("does not re-sync max invocations once they have been synced", async function () {
        const config = await loadFixture(_beforeEach);
        // first price update syncs local max invocations to the core value
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // artist then intentionally limits max invocations below the core value
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        // a subsequent price update must not clobber the manual limit
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.higherPricePerTokenInWei
          );
        expect(
          await config.minter.projectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address
          )
        ).to.equal(1);
      });

      it("only allows the artist to update the price", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            ),
          revertMessages.onlyArtist
        );
      });
    });
  });
});
