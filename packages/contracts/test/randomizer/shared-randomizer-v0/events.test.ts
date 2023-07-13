import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { setupConfigWitMinterFilterV2Suite } from "../../util/fixtures";
import { deployCore, safeAddProject } from "../../util/common";

// randomizer being tested
const RANDOMIZER_NAME = "SharedRandomizerV0";

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
      return config;
    }

    it("should test correct contract", async function () {
      // a manually typed test to ensure variable is correct in this file,
      // in case this file is copy-pasted in the future
      expect(RANDOMIZER_NAME).to.equal("SharedRandomizerV0");
    });

    describe("PseudorandomAtomicContractUpdated", async function () {
      it("emits event during deploy", async function () {
        const config = await loadFixture(_beforeEach);
        const factory = await ethers.getContractFactory(RANDOMIZER_NAME);
        // odd syntax to test events on deployment
        const tx = await factory.connect(config.accounts.deployer).deploy(
          config.accounts.additional.address // dummy EOA address for test simplicity
        );
        const receipt = await tx.deployTransaction.wait();
        const _event = receipt.logs[0];
        // expect target event as first and only log
        console.log(_event.topics[1]);
        console.log(config.accounts.additional.address);
        expect(_event.topics[1]).to.be.equal(
          "0x000000000000000000000000".concat(
            config.accounts.additional.address.substring(2, 42).toLowerCase()
          )
        );
      });
    });

    describe("HashSeedSetterForProjectUpdated", async function () {
      it("emits when updating hash seed setter for contract", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          await config.randomizer
            .connect(config.accounts.artist)
            .setHashSeedSetterContract(
              config.genArt721Core.address,
              config.projectZero,
              config.accounts.artist.address
            )
        )
          .to.emit(config.randomizer, "HashSeedSetterForProjectUpdated")
          .withArgs(
            config.genArt721Core.address,
            config.projectZero,
            config.accounts.artist.address
          );
      });
    });

    describe("toggleProjectIsPolyptych", async function () {
      it("emits when toggling project is polyptych", async function () {
        const config = await loadFixture(_beforeEach);
        // emits true when toggled on
        await expect(
          config.randomizer
            .connect(config.accounts.artist)
            .toggleProjectIsPolyptych(
              config.genArt721Core.address,
              config.projectZero
            )
        )
          .to.emit(config.randomizer, "ProjectIsPolyptychUpdated")
          .withArgs(config.genArt721Core.address, config.projectZero, true);
        // emits false when toggled off
        await expect(
          config.randomizer
            .connect(config.accounts.artist)
            .toggleProjectIsPolyptych(
              config.genArt721Core.address,
              config.projectZero
            )
        )
          .to.emit(config.randomizer, "ProjectIsPolyptychUpdated")
          .withArgs(config.genArt721Core.address, config.projectZero, false);
      });
    });
  });
});
