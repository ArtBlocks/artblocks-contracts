import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../util/fixtures";
import { deployCore, safeAddProject } from "../../util/common";

// randomizer being tested
const RANDOMIZER_NAME = "SharedRandomizerV0";

// helper constants
const ZERO_HASH_SEED = "0x000000000000000000000000";
const NONZERO_HASH_SEED = "0x123456789012345678901234";

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
];

runForEach.forEach((params) => {
  describe(`${RANDOMIZER_NAME} Views w/ core ${params.core}`, async function () {
    async function _beforeEach() {
      // load minter filter V2 fixture
      const config = await loadFixture(setupConfigWitMinterFilterV2Suite);
      // deploy core contract and register on core registry
      ({
        genArt721Core: config.genArt721Core,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCore(
        config,
        params.core,
        config.coreRegistry,
        false,
        RANDOMIZER_NAME
      ));

      // Project setup
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );
      return config;
    }

    it("should test correct contract", async function () {
      // a manually typed test to ensure variable is correct in this file,
      // in case this file is copy-pasted in the future
      expect(RANDOMIZER_NAME).to.equal("SharedRandomizerV0");
    });

    describe("projectUsesHashSeedSetter", async function () {
      it("should return false if project is not polyptych", async function () {
        const config = await loadFixture(_beforeEach);
        const isPolyptych = await config.randomizer.projectUsesHashSeedSetter(
          config.genArt721Core.address,
          config.projectZero
        );
        expect(isPolyptych).to.equal(false);
      });

      it("should return true if project is polyptych", async function () {
        const config = await loadFixture(_beforeEach);
        // set project as polyptych
        await config.randomizer
          .connect(config.accounts.artist)
          .toggleProjectUseAssignedHashSeed(
            config.genArt721Core.address,
            config.projectZero
          );
        const isPolyptych = await config.randomizer.projectUsesHashSeedSetter(
          config.genArt721Core.address,
          config.projectZero
        );
        expect(isPolyptych).to.equal(true);
      });
    });

    describe("hashSeedSetterContracts", async function () {
      it("should return zero address by default", async function () {
        const config = await loadFixture(_beforeEach);
        const hashSeedSetterContract =
          await config.randomizer.hashSeedSetterContracts(
            config.genArt721Core.address,
            config.projectZero
          );
        expect(hashSeedSetterContract).to.equal(constants.ZERO_ADDRESS);
      });

      it("should return assigned address by if assigned", async function () {
        const config = await loadFixture(_beforeEach);
        await config.randomizer
          .connect(config.accounts.artist)
          .setHashSeedSetterContract(
            config.genArt721Core.address,
            config.projectZero,
            config.minter.address
          );
        // verify hash seed setter address
        const hashSeedSetterContract =
          await config.randomizer.hashSeedSetterContracts(
            config.genArt721Core.address,
            config.projectZero
          );
        expect(hashSeedSetterContract).to.equal(config.minter.address);
      });
    });

    describe("preAssignedHashSeed", async function () {
      it("returns zero by default", async function () {
        const config = await loadFixture(_beforeEach);
        const hashSeed = await config.randomizer.preAssignedHashSeed(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
        expect(hashSeed).to.equal(ZERO_HASH_SEED);
      });

      it("returns expected value when assigned", async function () {
        const config = await loadFixture(_beforeEach);
        // set polyptych hash seed
        await config.randomizer
          .connect(config.accounts.artist)
          .setHashSeedSetterContract(
            config.genArt721Core.address,
            config.projectZero,
            config.accounts.artist.address // use EOA for testing purposes
          );
        await config.randomizer
          .connect(config.accounts.artist)
          .preSetHashSeed(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            NONZERO_HASH_SEED
          );
        // verify hash seed
        const hashSeed = await config.randomizer.preAssignedHashSeed(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
        expect(hashSeed).to.equal(NONZERO_HASH_SEED);
      });
    });

    describe("pseudorandomAtomicContract", async function () {
      it("returns expected address", async function () {
        const config = await loadFixture(_beforeEach);
        const atomicContract =
          await config.randomizer.pseudorandomAtomicContract();
        expect(atomicContract).to.not.equal(constants.ZERO_ADDRESS);
      });
    });
  });
});
