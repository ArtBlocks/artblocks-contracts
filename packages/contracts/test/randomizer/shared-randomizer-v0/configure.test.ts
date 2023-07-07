import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { revertMessages } from "./constants";
import { setupConfigWitMinterFilterV2Suite } from "../../util/fixtures";
import { deployCore, safeAddProject, deployAndGet } from "../../util/common";

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
  describe(`${RANDOMIZER_NAME} Configure w/ core ${params.core}`, async function () {
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

      // deploy dummy shared minter
      // @dev this is a fix to resolve an undetermined issue with tests failing
      // when ran in conjunction with other tests. It is unknown why there
      // is a conflict, but this is a fix that makes the minter being used
      // in this test suite clear and unique.
      config.minter = await deployAndGet(config, "DummySharedMinter", [
        config.minterFilter.address,
      ]);
      // allowlist dummy shared minter on minter filter
      await config.minterFilter.approveMinterGlobally(config.minter.address);

      // update core's minter as the minter filter
      await config.genArt721Core.updateMinterContract(
        config.minterFilter.address
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
      return config;
    }

    it("should test correct contract", async function () {
      // a manually typed test to ensure variable is correct in this file,
      // in case this file is copy-pasted in the future
      expect(RANDOMIZER_NAME).to.equal("SharedRandomizerV0");
    });

    describe("setHashSeedSetterContract", async function () {
      it("reverts when not artist", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.randomizer
            .connect(config.accounts.deployer)
            .setHashSeedSetterContract(
              config.genArt721Core.address,
              config.projectZero,
              config.accounts.artist.address
            ),
          revertMessages.onlyArtist
        );
      });

      it("updates state", async function () {
        const config = await loadFixture(_beforeEach);
        // update hash seed setter contract
        await config.randomizer
          .connect(config.accounts.artist)
          .setHashSeedSetterContract(
            config.genArt721Core.address,
            config.projectZero,
            config.accounts.artist.address // dummy use EOA for this test
          );
        // check state
        const hashSeedSetterContract =
          await config.randomizer.hashSeedSetterContracts(
            config.genArt721Core.address,
            config.projectZero
          );
        expect(hashSeedSetterContract).to.equal(config.accounts.artist.address);
      });
    });

    describe("toggleProjectIsPolyptych", async function () {
      it("reverts when non-artist", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.randomizer
            .connect(config.accounts.deployer)
            .toggleProjectIsPolyptych(
              config.genArt721Core.address,
              config.projectZero
            ),
          revertMessages.onlyArtist
        );
      });

      it("updates state", async function () {
        const config = await loadFixture(_beforeEach);
        // check initial state
        let isPolyptych = await config.randomizer.projectIsPolyptych(
          config.genArt721Core.address,
          config.projectZero
        );
        expect(isPolyptych).to.equal(false);
        // toggle project is polyptych
        await config.randomizer
          .connect(config.accounts.artist)
          .toggleProjectIsPolyptych(
            config.genArt721Core.address,
            config.projectZero
          );
        // check state
        isPolyptych = await config.randomizer.projectIsPolyptych(
          config.genArt721Core.address,
          config.projectZero
        );
        expect(isPolyptych).to.equal(true);
        // toggle project back to non-polyptych
        await config.randomizer
          .connect(config.accounts.artist)
          .toggleProjectIsPolyptych(
            config.genArt721Core.address,
            config.projectZero
          );
        // check state
        isPolyptych = await config.randomizer.projectIsPolyptych(
          config.genArt721Core.address,
          config.projectZero
        );
        expect(isPolyptych).to.equal(false);
      });
    });

    describe("setPolyptychHashSeed", async function () {
      it("reverts when non-hashSeedSetterContract", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.randomizer
            .connect(config.accounts.deployer)
            .setPolyptychHashSeed(
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              NONZERO_HASH_SEED
            ),
          revertMessages.onlyHashSeedSetterContract
        );
      });

      it("updates state", async function () {
        const config = await loadFixture(_beforeEach);
        // verify pre-state
        let hashSeed = await config.randomizer.polyptychHashSeed(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
        expect(hashSeed).to.equal(ZERO_HASH_SEED);
        // update hash seed setter contract
        // @dev update to EOA for test simplicity
        await config.randomizer
          .connect(config.accounts.artist)
          .setHashSeedSetterContract(
            config.genArt721Core.address,
            config.projectZero,
            config.accounts.artist.address
          );
        await config.randomizer
          .connect(config.accounts.artist)
          .setPolyptychHashSeed(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            NONZERO_HASH_SEED
          );
        // verify state
        hashSeed = await config.randomizer.polyptychHashSeed(
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
        expect(hashSeed).to.equal(NONZERO_HASH_SEED);
      });
    });

    describe("assignTokenHash", async function () {
      // define a fixture that enables minting on the core contract
      async function _beforeEachAssignTokenHash() {
        const config = await loadFixture(_beforeEach);
        // update hash seed setter contract
        // @dev update to EOA for test simplicity
        await config.randomizer
          .connect(config.accounts.artist)
          .setHashSeedSetterContract(
            config.genArt721Core.address,
            config.projectZero,
            config.accounts.artist.address
          );
        // assign minter to project zero
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectZero,
            config.genArt721Core.address,
            config.minter.address
          );
        return config;
      }

      it("reverts when hash seed is zero", async function () {
        const config = await loadFixture(_beforeEachAssignTokenHash);
        // toggle project to polyptych
        await config.randomizer
          .connect(config.accounts.artist)
          .toggleProjectIsPolyptych(
            config.genArt721Core.address,
            config.projectZero
          );
        // expect revert when token zero is minted, since no hash seed is set
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .purchase(config.projectZero, config.genArt721Core.address),
          revertMessages.onlyNonZeroHashSeed
        );
      });

      it("assigns valid token when not polyptych", async function () {
        const config = await loadFixture(_beforeEachAssignTokenHash);
        // verify no initial token zero hash
        let tokenZeroHash = await config.genArt721Core.tokenIdToHash(
          config.projectZeroTokenZero.toNumber()
        );
        expect(tokenZeroHash).to.equal(constants.ZERO_BYTES32);
        // mint token zero, which assigns hash seed
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, config.genArt721Core.address);
        // verify token zero hash
        tokenZeroHash = await config.genArt721Core.tokenIdToHash(
          config.projectZeroTokenZero.toNumber()
        );
        expect(tokenZeroHash).to.not.equal(constants.ZERO_BYTES32);
      });

      it("assigns expected token when polyptych", async function () {
        const config = await loadFixture(_beforeEachAssignTokenHash);
        // verify no initial token zero hash
        let tokenZeroHash = await config.genArt721Core.tokenIdToHash(
          config.projectZeroTokenZero.toNumber()
        );
        expect(tokenZeroHash).to.equal(constants.ZERO_BYTES32);
        // toggle project to polyptych
        await config.randomizer
          .connect(config.accounts.artist)
          .toggleProjectIsPolyptych(
            config.genArt721Core.address,
            config.projectZero
          );
        // assign hash seed
        await config.randomizer
          .connect(config.accounts.artist)
          .setHashSeedSetterContract(
            config.genArt721Core.address,
            config.projectZero,
            config.accounts.artist.address
          );
        await config.randomizer
          .connect(config.accounts.artist)
          .setPolyptychHashSeed(
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            NONZERO_HASH_SEED
          );
        // purchase token zero, which assigns hash seed
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, config.genArt721Core.address);
        // verify token zero hash
        tokenZeroHash = await config.genArt721Core.tokenIdToHashSeed(
          config.projectZeroTokenZero.toNumber()
        );
        expect(tokenZeroHash).to.equal(NONZERO_HASH_SEED);
      });
    });
  });
});
