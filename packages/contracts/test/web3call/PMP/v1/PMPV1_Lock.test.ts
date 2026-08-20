import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { constants } from "ethers";
import {
  PMP_AUTH_ENUM,
  PMP_PARAM_TYPE_ENUM,
  getPMPInput,
  getPMPInputConfig,
  uint256ToBytes32,
} from "../pmpTestUtils";
import { PMPFixtureConfig, setupPMPV1Fixture } from "../pmpFixtures";
import { advanceTimeAndBlock } from "../../../util/common";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const PARAM_LOCKED = "PMP: param is locked";

/**
 * Tests for the PMPV1 value-lock behavior. PMPV1 interprets pmpLockedAfterTimestamp as both a
 * configuration lock (unchanged from PMPV0) AND a value lock: once the timestamp has passed,
 * no party may configure a token's value for that parameter.
 */
describe("PMPV1_Lock", function () {
  async function _beforeEach() {
    const config = await loadFixture(setupPMPV1Fixture);
    return config;
  }

  // helper: configure projectZero with a single TokenOwner Bool param with the given lock ts
  async function configureLockedBool(
    config: PMPFixtureConfig,
    key: string,
    lockedAfterTimestamp: number
  ) {
    const pmpConfig = getPMPInputConfig(
      key,
      PMP_AUTH_ENUM.TokenOwner,
      PMP_PARAM_TYPE_ENUM.Bool,
      lockedAfterTimestamp,
      constants.AddressZero,
      [],
      ZERO_BYTES32,
      ZERO_BYTES32
    );
    await config.pmp
      .connect(config.accounts.artist)
      .configureProject(config.genArt721Core.address, config.projectZero, [
        pmpConfig,
      ]);
  }

  function boolInput(key: string, value: boolean) {
    return getPMPInput(
      key,
      PMP_PARAM_TYPE_ENUM.Bool,
      uint256ToBytes32(value ? 1 : 0),
      false,
      ""
    );
  }

  describe("pmpType getter", function () {
    it("returns the PMPV1 type identifier", async function () {
      const config = await loadFixture(_beforeEach);
      // @dev pmpType is a PMPV1-only getter not present on the shared IPMPV0 typing
      const pmpType = await (
        config.pmp as unknown as {
          pmpType: () => Promise<string>;
        }
      ).pmpType();
      expect(pmpType).to.equal("PMPV1");
    });
  });

  describe("value-lock enforcement in _validatePMPInputAndAuth", function () {
    it("allows configuring a value before the lock timestamp", async function () {
      const config = await loadFixture(_beforeEach);
      const latest = await time.latest();
      await configureLockedBool(config, "lockedBool", latest + 10_000);
      // token owner (user owns token 0) configures value before lock
      await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          [boolInput("lockedBool", true)]
        );
      const tokenParams = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero.toNumber()
      );
      expect(tokenParams[0].key).to.equal("lockedBool");
      expect(tokenParams[0].value).to.equal("true");
    });

    it("reverts configuring a value at or after the lock timestamp", async function () {
      const config = await loadFixture(_beforeEach);
      const latest = await time.latest();
      const lockTime = latest + 1000;
      await configureLockedBool(config, "lockedBool", lockTime);
      // advance past the lock
      await advanceTimeAndBlock(2000);
      expect(await time.latest()).to.be.greaterThan(lockTime);
      await expectRevert(
        config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [boolInput("lockedBool", true)]
          ),
        PARAM_LOCKED
      );
    });

    it("locks exactly at block.timestamp == lockTimestamp (inclusive)", async function () {
      const config = await loadFixture(_beforeEach);
      const latest = await time.latest();
      const lockTime = latest + 1000;
      await configureLockedBool(config, "lockedBool", lockTime);
      // mine the configure tx in a block whose timestamp equals lockTime exactly
      await time.setNextBlockTimestamp(lockTime);
      await expectRevert(
        config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [boolInput("lockedBool", true)]
          ),
        PARAM_LOCKED
      );
    });

    it("allows configuring in the block immediately before the lock (exclusive lower bound)", async function () {
      const config = await loadFixture(_beforeEach);
      const latest = await time.latest();
      const lockTime = latest + 1000;
      await configureLockedBool(config, "lockedBool", lockTime);
      // mine the configure tx one second before the lock
      await time.setNextBlockTimestamp(lockTime - 1);
      await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          [boolInput("lockedBool", true)]
        );
      const tokenParams = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero.toNumber()
      );
      expect(tokenParams[0].value).to.equal("true");
    });

    it("never locks when pmpLockedAfterTimestamp is zero", async function () {
      const config = await loadFixture(_beforeEach);
      await configureLockedBool(config, "freeBool", 0);
      // advance an arbitrarily long time
      await advanceTimeAndBlock(10_000_000);
      await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          [boolInput("freeBool", true)]
        );
      const tokenParams = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero.toNumber()
      );
      expect(tokenParams[0].value).to.equal("true");
    });

    it("applies the value-lock to the artist as well (Artist-auth param)", async function () {
      const config = await loadFixture(_beforeEach);
      const latest = await time.latest();
      const lockTime = latest + 1000;
      const pmpConfig = getPMPInputConfig(
        "artistBool",
        PMP_AUTH_ENUM.Artist,
        PMP_PARAM_TYPE_ENUM.Bool,
        lockTime,
        constants.AddressZero,
        [],
        ZERO_BYTES32,
        ZERO_BYTES32
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          pmpConfig,
        ]);
      await advanceTimeAndBlock(2000);
      await expectRevert(
        config.pmp
          .connect(config.accounts.artist)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [boolInput("artistBool", true)]
          ),
        PARAM_LOCKED
      );
    });

    it("only locks the locked key; other keys remain writable", async function () {
      const config = await loadFixture(_beforeEach);
      const latest = await time.latest();
      const lockTime = latest + 1000;
      const lockedConfig = getPMPInputConfig(
        "lockedBool",
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Bool,
        lockTime,
        constants.AddressZero,
        [],
        ZERO_BYTES32,
        ZERO_BYTES32
      );
      const freeConfig = getPMPInputConfig(
        "freeBool",
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Bool,
        0,
        constants.AddressZero,
        [],
        ZERO_BYTES32,
        ZERO_BYTES32
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          lockedConfig,
          freeConfig,
        ]);
      await advanceTimeAndBlock(2000);
      // locked key reverts
      await expectRevert(
        config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [boolInput("lockedBool", true)]
          ),
        PARAM_LOCKED
      );
      // free key still writable
      await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          [boolInput("freeBool", true)]
        );
    });
  });

  describe("value-lock applies to String params (both value slots)", function () {
    it("allows string writes before the lock and reverts after (non-artist + artist slots)", async function () {
      const config = await loadFixture(_beforeEach);
      const latest = await time.latest();
      const lockTime = latest + 1000;
      // ArtistAndTokenOwner String param so both the artist-string and non-artist-string
      // slots are exercised through the same locked key.
      const stringConfig = getPMPInputConfig(
        "lockedString",
        PMP_AUTH_ENUM.ArtistAndTokenOwner,
        PMP_PARAM_TYPE_ENUM.String,
        lockTime,
        constants.AddressZero,
        [],
        ZERO_BYTES32,
        ZERO_BYTES32
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          stringConfig,
        ]);
      // token owner writes the non-artist string slot before the lock
      await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          [
            getPMPInput(
              "lockedString",
              PMP_PARAM_TYPE_ENUM.String,
              ZERO_BYTES32,
              false,
              "before lock"
            ),
          ]
        );
      const before = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero.toNumber()
      );
      expect(before[0].value).to.equal("before lock");
      // advance past the lock
      await advanceTimeAndBlock(2000);
      // non-artist string slot is locked
      await expectRevert(
        config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [
              getPMPInput(
                "lockedString",
                PMP_PARAM_TYPE_ENUM.String,
                ZERO_BYTES32,
                false,
                "after lock"
              ),
            ]
          ),
        PARAM_LOCKED
      );
      // artist string slot is also locked (same key-level gate, before auth/type checks)
      await expectRevert(
        config.pmp
          .connect(config.accounts.artist)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [
              getPMPInput(
                "lockedString",
                PMP_PARAM_TYPE_ENUM.String,
                ZERO_BYTES32,
                true, // artist string slot
                "artist after lock"
              ),
            ]
          ),
        PARAM_LOCKED
      );
      // value remains cemented at the pre-lock string
      const after = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero.toNumber()
      );
      expect(after[0].value).to.equal("before lock");
    });
  });

  describe("value-lock applies to delegate and address-auth callers", function () {
    it("locks a delegate (token-owner delegation) after the lock timestamp", async function () {
      const config = await loadFixture(_beforeEach);
      const latest = await time.latest();
      const lockTime = latest + 1000;
      await configureLockedBool(config, "lockedBool", lockTime);
      // token owner (user, owns token 0) delegates all to user2
      await config.delegateRegistry
        .connect(config.accounts.user)
        .delegateAll(config.accounts.user2.address, constants.HashZero, true);
      // delegate can write before the lock
      await config.pmp
        .connect(config.accounts.user2)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          [boolInput("lockedBool", true)]
        );
      // advance past the lock; delegate is now blocked
      await advanceTimeAndBlock(2000);
      await expectRevert(
        config.pmp
          .connect(config.accounts.user2)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [boolInput("lockedBool", false)]
          ),
        PARAM_LOCKED
      );
    });

    it("locks the configured auth address after the lock timestamp", async function () {
      const config = await loadFixture(_beforeEach);
      const latest = await time.latest();
      const lockTime = latest + 1000;
      // Address-auth param authorizing user2 as the configuring address
      const addressConfig = getPMPInputConfig(
        "lockedBool",
        PMP_AUTH_ENUM.Address,
        PMP_PARAM_TYPE_ENUM.Bool,
        lockTime,
        config.accounts.user2.address,
        [],
        ZERO_BYTES32,
        ZERO_BYTES32
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          addressConfig,
        ]);
      // auth address can write before the lock
      await config.pmp
        .connect(config.accounts.user2)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          [boolInput("lockedBool", true)]
        );
      // advance past the lock; auth address is now blocked
      await advanceTimeAndBlock(2000);
      await expectRevert(
        config.pmp
          .connect(config.accounts.user2)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [boolInput("lockedBool", false)]
          ),
        PARAM_LOCKED
      );
    });
  });

  describe("config-lock behavior retained from PMPV0", function () {
    it("still prevents the artist from changing a locked param definition", async function () {
      const config = await loadFixture(_beforeEach);
      const latest = await time.latest();
      const lockTime = latest + 1000;
      await configureLockedBool(config, "lockedBool", lockTime);
      await advanceTimeAndBlock(2000);
      // artist attempts to re-configure the locked param -> config lock reverts
      await expectRevert(
        config.pmp
          .connect(config.accounts.artist)
          .configureProject(config.genArt721Core.address, config.projectZero, [
            getPMPInputConfig(
              "lockedBool",
              PMP_AUTH_ENUM.TokenOwner,
              PMP_PARAM_TYPE_ENUM.Bool,
              0, // attempt to unlock
              constants.AddressZero,
              [],
              ZERO_BYTES32,
              ZERO_BYTES32
            ),
          ]),
        "PMP: pmp is locked and cannot be updated"
      );
    });
  });

  describe("locked-key pass-through in configureProject", function () {
    function boolConfig(key: string, lockedAfterTimestamp: number) {
      return getPMPInputConfig(
        key,
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Bool,
        lockedAfterTimestamp,
        constants.AddressZero,
        [],
        ZERO_BYTES32,
        ZERO_BYTES32
      );
    }

    function selectConfig(
      key: string,
      lockedAfterTimestamp: number,
      selectOptions: string[]
    ) {
      return getPMPInputConfig(
        key,
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Select,
        lockedAfterTimestamp,
        constants.AddressZero,
        selectOptions,
        ZERO_BYTES32,
        ZERO_BYTES32
      );
    }

    function uintConfig(
      key: string,
      lockedAfterTimestamp: number,
      minRange: string,
      maxRange: string
    ) {
      return getPMPInputConfig(
        key,
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        lockedAfterTimestamp,
        constants.AddressZero,
        [],
        minRange,
        maxRange
      );
    }

    async function snapshotDefinition(config: PMPFixtureConfig, key: string) {
      const stored = await config.pmp.getProjectPMPConfig(
        config.genArt721Core.address,
        config.projectZero,
        key
      );
      return {
        authOption: stored.authOption,
        paramType: stored.paramType,
        pmpLockedAfterTimestamp: stored.pmpLockedAfterTimestamp,
        authAddress: stored.authAddress,
        selectOptionsLength: stored.selectOptionsLength,
        selectOptions: stored.selectOptions,
        minRange: stored.minRange,
        maxRange: stored.maxRange,
      };
    }

    it("allows restating an identical locked key so unlocked keys can be added", async function () {
      const config = await loadFixture(_beforeEach);
      const latest = await time.latest();
      const lockTime = latest + 1000;
      const locked = boolConfig("lockedBool", lockTime);
      const free = boolConfig("freeBool", 0);
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          locked,
          free,
        ]);
      await advanceTimeAndBlock(2000);
      const beforeLocked = await snapshotDefinition(config, "lockedBool");
      const beforeProject = await config.pmp.getProjectConfig(
        config.genArt721Core.address,
        config.projectZero
      );
      expect(beforeProject.configNonce).to.equal(1);

      const newField = boolConfig("newBool", 0);
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          locked,
          free,
          newField,
        ]);

      const afterProject = await config.pmp.getProjectConfig(
        config.genArt721Core.address,
        config.projectZero
      );
      expect(afterProject.configNonce).to.equal(2);
      expect(afterProject.pmpKeys).to.deep.equal([
        "lockedBool",
        "freeBool",
        "newBool",
      ]);
      const afterLocked = await snapshotDefinition(config, "lockedBool");
      expect(afterLocked).to.deep.equal(beforeLocked);
      const afterLockedFull = await config.pmp.getProjectPMPConfig(
        config.genArt721Core.address,
        config.projectZero,
        "lockedBool"
      );
      expect(afterLockedFull.highestConfigNonce).to.equal(2);
      const afterNew = await config.pmp.getProjectPMPConfig(
        config.genArt721Core.address,
        config.projectZero,
        "newBool"
      );
      expect(afterNew.highestConfigNonce).to.equal(2);
      expect(afterNew.paramType).to.equal(PMP_PARAM_TYPE_ENUM.Bool);
    });

    it("allows restating an identical locked key so a sibling unlocked key can be edited", async function () {
      const config = await loadFixture(_beforeEach);
      const latest = await time.latest();
      const lockTime = latest + 1000;
      const locked = boolConfig("lockedBool", lockTime);
      const free = boolConfig("freeBool", 0);
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          locked,
          free,
        ]);
      await advanceTimeAndBlock(2000);
      const beforeLocked = await snapshotDefinition(config, "lockedBool");

      const editedFree = getPMPInputConfig(
        "freeBool",
        PMP_AUTH_ENUM.Artist,
        PMP_PARAM_TYPE_ENUM.Bool,
        0,
        constants.AddressZero,
        [],
        ZERO_BYTES32,
        ZERO_BYTES32
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          locked,
          editedFree,
        ]);

      const afterLocked = await snapshotDefinition(config, "lockedBool");
      expect(afterLocked).to.deep.equal(beforeLocked);
      const afterFree = await config.pmp.getProjectPMPConfig(
        config.genArt721Core.address,
        config.projectZero,
        "freeBool"
      );
      expect(afterFree.authOption).to.equal(PMP_AUTH_ENUM.Artist);
      expect(afterFree.highestConfigNonce).to.equal(2);
    });

    it("allows omitting a locked key (drops it from the active key list)", async function () {
      const config = await loadFixture(_beforeEach);
      const latest = await time.latest();
      const lockTime = latest + 1000;
      const locked = boolConfig("lockedBool", lockTime);
      const free = boolConfig("freeBool", 0);
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          locked,
          free,
        ]);
      await advanceTimeAndBlock(2000);
      const beforeLocked = await snapshotDefinition(config, "lockedBool");

      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          free,
        ]);

      const afterProject = await config.pmp.getProjectConfig(
        config.genArt721Core.address,
        config.projectZero
      );
      expect(afterProject.pmpKeys).to.deep.equal(["freeBool"]);
      const afterLocked = await snapshotDefinition(config, "lockedBool");
      expect(afterLocked).to.deep.equal(beforeLocked);
      const afterLockedFull = await config.pmp.getProjectPMPConfig(
        config.genArt721Core.address,
        config.projectZero,
        "lockedBool"
      );
      expect(afterLockedFull.highestConfigNonce).to.equal(1);
      await expectRevert(
        config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [boolInput("lockedBool", true)]
          ),
        "PMP: param not part of most recently configured PMP params"
      );
    });

    it("reverts if any artist-configured field of a locked key differs", async function () {
      const config = await loadFixture(_beforeEach);
      const latest = await time.latest();
      const lockTime = latest + 1000;
      const lockedSelect = selectConfig("lockedSelect", lockTime, [
        "red",
        "green",
      ]);
      const lockedUint = uintConfig(
        "lockedUint",
        lockTime,
        uint256ToBytes32(0),
        uint256ToBytes32(100)
      );
      const lockedBool = boolConfig("lockedBool", lockTime);
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          lockedSelect,
          lockedUint,
          lockedBool,
        ]);
      await advanceTimeAndBlock(2000);

      const mutations = [
        getPMPInputConfig(
          "lockedBool",
          PMP_AUTH_ENUM.Artist, // authOption
          PMP_PARAM_TYPE_ENUM.Bool,
          lockTime,
          constants.AddressZero,
          [],
          ZERO_BYTES32,
          ZERO_BYTES32
        ),
        getPMPInputConfig(
          "lockedBool",
          PMP_AUTH_ENUM.TokenOwner,
          PMP_PARAM_TYPE_ENUM.HexColor, // paramType
          lockTime,
          constants.AddressZero,
          [],
          ZERO_BYTES32,
          ZERO_BYTES32
        ),
        getPMPInputConfig(
          "lockedBool",
          PMP_AUTH_ENUM.TokenOwner,
          PMP_PARAM_TYPE_ENUM.Bool,
          0, // pmpLockedAfterTimestamp unlock
          constants.AddressZero,
          [],
          ZERO_BYTES32,
          ZERO_BYTES32
        ),
        boolConfig("lockedBool", lockTime + 50_000), // pmpLockedAfterTimestamp relock
        getPMPInputConfig(
          "lockedBool",
          PMP_AUTH_ENUM.Address,
          PMP_PARAM_TYPE_ENUM.Bool,
          lockTime,
          config.accounts.user2.address, // authAddress (with Address auth)
          [],
          ZERO_BYTES32,
          ZERO_BYTES32
        ),
        selectConfig("lockedSelect", lockTime, ["red", "blue"]), // option string
        selectConfig("lockedSelect", lockTime, ["green", "red"]), // option order
        selectConfig("lockedSelect", lockTime, ["red", "green", "blue"]), // option length
        uintConfig(
          "lockedUint",
          lockTime,
          uint256ToBytes32(1), // minRange
          uint256ToBytes32(100)
        ),
        uintConfig(
          "lockedUint",
          lockTime,
          uint256ToBytes32(0),
          uint256ToBytes32(99) // maxRange
        ),
      ];

      for (const mutated of mutations) {
        await expectRevert(
          config.pmp
            .connect(config.accounts.artist)
            .configureProject(
              config.genArt721Core.address,
              config.projectZero,
              [mutated]
            ),
          "PMP: pmp is locked and cannot be updated"
        );
      }
    });

    it("allows restating an identical locked Select param (options unchanged)", async function () {
      const config = await loadFixture(_beforeEach);
      const latest = await time.latest();
      const lockTime = latest + 1000;
      const lockedSelect = selectConfig("lockedSelect", lockTime, [
        "red",
        "green",
      ]);
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          lockedSelect,
        ]);
      await advanceTimeAndBlock(2000);
      const before = await snapshotDefinition(config, "lockedSelect");

      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          lockedSelect,
          boolConfig("newBool", 0),
        ]);

      const after = await snapshotDefinition(config, "lockedSelect");
      expect(after).to.deep.equal(before);
      expect(after.selectOptions).to.deep.equal(["red", "green"]);
    });
  });

  describe("base configure/read parity smoke test (unlocked params)", function () {
    it("configures and reads back multiple param types like PMPV0", async function () {
      const config = await loadFixture(_beforeEach);
      const selectConfig = getPMPInputConfig(
        "palette",
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Select,
        0,
        constants.AddressZero,
        ["red", "green", "blue"],
        ZERO_BYTES32,
        ZERO_BYTES32
      );
      const uintConfig = getPMPInputConfig(
        "count",
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        0,
        constants.AddressZero,
        [],
        uint256ToBytes32(0),
        uint256ToBytes32(100)
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          selectConfig,
          uintConfig,
        ]);
      await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          [
            getPMPInput(
              "palette",
              PMP_PARAM_TYPE_ENUM.Select,
              uint256ToBytes32(2), // "blue"
              false,
              ""
            ),
            getPMPInput(
              "count",
              PMP_PARAM_TYPE_ENUM.Uint256Range,
              uint256ToBytes32(42),
              false,
              ""
            ),
          ]
        );
      const tokenParams = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero.toNumber()
      );
      const asMap = Object.fromEntries(
        tokenParams.map((p: { key: string; value: string }) => [p.key, p.value])
      );
      expect(asMap["palette"]).to.equal("blue");
      expect(asMap["count"]).to.equal("42");
    });
  });
});
