import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { constants } from "ethers";
import {
  PMP_AUTH_ENUM,
  PMP_PARAM_TYPE_ENUM,
  getPMPInput,
  getPMPInputConfig,
  uint256ToBytes32,
} from "../../pmpTestUtils";
import { setupPMPFixture } from "../../pmpFixtures";
import { advanceTimeAndBlock } from "../../../../util/common";
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

// canonical IPMPConfigureHook interfaceId = selector of the single interface function
const CONFIGURE_HOOK_IFACE = new ethers.utils.Interface([
  "function onTokenPMPConfigure(address,uint256,(string,uint8,bytes32,bool,string))",
]);
const IPMP_CONFIGURE_HOOK_ID = CONFIGURE_HOOK_IFACE.getSighash(
  "onTokenPMPConfigure"
);
const ERC165_ID = "0x01ffc9a7";
const INVALID_ID = "0xffffffff";

function keyHash(key: string): string {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(key));
}

async function deployLockHook(keys: string[], timestamps: number[]) {
  const [deployer] = await ethers.getSigners();
  const factory = await ethers.getContractFactory(
    "PMPConfigureLockHook",
    deployer
  );
  return factory.deploy(keys, timestamps);
}

describe("PMPConfigureLockHook", function () {
  describe("constructor", function () {
    it("stores per-key lock timestamps and keys", async function () {
      const t = (await time.latest()) + 1000;
      const hook = await deployLockHook(["a", "b"], [t, t + 5]);
      expect(await hook.lockedAfter(keyHash("a"))).to.equal(t);
      expect(await hook.lockedAfter(keyHash("b"))).to.equal(t + 5);
      expect(await hook.lockedAfter(keyHash("c"))).to.equal(0);
      expect(await hook.lockedKeysLength()).to.equal(2);
      expect(await hook.lockedKeys(0)).to.equal("a");
      expect(await hook.lockedKeys(1)).to.equal("b");
    });

    it("reverts on empty config", async function () {
      await expect(deployLockHook([], [])).to.be.revertedWithCustomError(
        await ethers.getContractFactory("PMPConfigureLockHook"),
        "EmptyConfig"
      );
    });

    it("reverts on length mismatch", async function () {
      await expect(deployLockHook(["a"], [1, 2])).to.be.revertedWithCustomError(
        await ethers.getContractFactory("PMPConfigureLockHook"),
        "LengthMismatch"
      );
    });

    it("reverts on zero timestamp", async function () {
      await expect(deployLockHook(["a"], [0])).to.be.revertedWithCustomError(
        await ethers.getContractFactory("PMPConfigureLockHook"),
        "ZeroTimestamp"
      );
    });

    it("reverts on duplicate key", async function () {
      await expect(
        deployLockHook(["a", "a"], [1, 2])
      ).to.be.revertedWithCustomError(
        await ethers.getContractFactory("PMPConfigureLockHook"),
        "DuplicateKey"
      );
    });
  });

  describe("supportsInterface", function () {
    it("supports IPMPConfigureHook and ERC165, rejects invalid", async function () {
      const hook = await deployLockHook(["a"], [(await time.latest()) + 1000]);
      expect(await hook.supportsInterface(IPMP_CONFIGURE_HOOK_ID)).to.equal(
        true
      );
      expect(await hook.supportsInterface(ERC165_ID)).to.equal(true);
      expect(await hook.supportsInterface(INVALID_ID)).to.equal(false);
    });
  });

  describe("onTokenPMPConfigure", function () {
    function input(key: string) {
      return getPMPInput(
        key,
        PMP_PARAM_TYPE_ENUM.Bool,
        uint256ToBytes32(1),
        false,
        ""
      );
    }

    it("does not revert for keys not in the lock table (any time)", async function () {
      const hook = await deployLockHook(["a"], [(await time.latest()) + 1000]);
      // unknown key always allowed
      await hook.onTokenPMPConfigure(
        constants.AddressZero,
        0,
        input("unknown")
      );
      await advanceTimeAndBlock(10_000);
      await hook.onTokenPMPConfigure(
        constants.AddressZero,
        0,
        input("unknown")
      );
    });

    it("does not revert for a locked key before its deadline", async function () {
      const hook = await deployLockHook(
        ["a"],
        [(await time.latest()) + 10_000]
      );
      await hook.onTokenPMPConfigure(constants.AddressZero, 0, input("a"));
    });

    it("reverts for a locked key at/after its deadline", async function () {
      const t = (await time.latest()) + 1000;
      const hook = await deployLockHook(["a"], [t]);
      await advanceTimeAndBlock(2000);
      await expect(
        hook.onTokenPMPConfigure(constants.AddressZero, 0, input("a"))
      ).to.be.revertedWithCustomError(hook, "ParamLocked");
    });
  });

  describe("integration with PMPV0 (patches the value-lock gap)", function () {
    async function _beforeEach() {
      return loadFixture(setupPMPFixture);
    }

    it("blocks value writes after the deadline, but leaves other keys writable", async function () {
      const config = await _beforeEach();
      const deadline = (await time.latest()) + 1000;

      // configure two TokenOwner params on the PMPV0 project.
      // @dev native pmpLockedAfterTimestamp intentionally left 0 to isolate the hook as the
      // sole enforcer of the value lock (the PMPV0 gap we are patching).
      const lockedConfig = getPMPInputConfig(
        "canonYear",
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        0,
        constants.AddressZero,
        [],
        uint256ToBytes32(0),
        uint256ToBytes32(3000)
      );
      const freeConfig = getPMPInputConfig(
        "mood",
        PMP_AUTH_ENUM.TokenOwner,
        PMP_PARAM_TYPE_ENUM.Uint256Range,
        0,
        constants.AddressZero,
        [],
        uint256ToBytes32(0),
        uint256ToBytes32(10)
      );
      await config.pmp
        .connect(config.accounts.artist)
        .configureProject(config.genArt721Core.address, config.projectZero, [
          lockedConfig,
          freeConfig,
        ]);

      // deploy + register the lock hook for only "canonYear"
      const hook = await deployLockHook(["canonYear"], [deadline]);
      await config.pmp
        .connect(config.accounts.artist)
        .configureProjectHooks(
          config.genArt721Core.address,
          config.projectZero,
          hook.address,
          constants.AddressZero
        );

      // before deadline: owner (user owns token 0) can write canonYear
      await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          [
            getPMPInput(
              "canonYear",
              PMP_PARAM_TYPE_ENUM.Uint256Range,
              uint256ToBytes32(2026),
              false,
              ""
            ),
          ]
        );

      // advance past the deadline
      await advanceTimeAndBlock(2000);

      // after deadline: canonYear write reverts (hook rolls back the whole tx)
      await expect(
        config.pmp
          .connect(config.accounts.user)
          .configureTokenParams(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            [
              getPMPInput(
                "canonYear",
                PMP_PARAM_TYPE_ENUM.Uint256Range,
                uint256ToBytes32(2027),
                false,
                ""
              ),
            ]
          )
      ).to.be.revertedWithCustomError(hook, "ParamLocked");

      // after deadline: non-locked "mood" still writable
      await config.pmp
        .connect(config.accounts.user)
        .configureTokenParams(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          [
            getPMPInput(
              "mood",
              PMP_PARAM_TYPE_ENUM.Uint256Range,
              uint256ToBytes32(7),
              false,
              ""
            ),
          ]
        );

      // canonYear retains its pre-lock value
      const tokenParams = await config.pmp.getTokenParams(
        config.genArt721Core.address,
        config.projectZeroTokenZero.toNumber()
      );
      const asMap = Object.fromEntries(
        tokenParams.map((p: { key: string; value: string }) => [p.key, p.value])
      );
      expect(asMap["canonYear"]).to.equal("2026");
      expect(asMap["mood"]).to.equal("7");
    });
  });
});
