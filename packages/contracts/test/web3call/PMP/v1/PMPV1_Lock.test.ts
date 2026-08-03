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

  describe("config-lock behavior retained from PMPV0", function () {
    it("still prevents the artist from re-configuring a locked param definition", async function () {
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
        tokenParams.map((p: { key: string; value: string }) => [
          p.key,
          p.value,
        ])
      );
      expect(asMap["palette"]).to.equal("blue");
      expect(asMap["count"]).to.equal("42");
    });
  });
});
