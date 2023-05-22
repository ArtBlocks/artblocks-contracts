import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Contract } from "ethers";
import { CoreRegistryV1RevertMessages as revertMessages } from "./constants";
import { setupConfigWitMinterFilterV2Suite } from "../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../util/common";
import { ethers } from "hardhat";

const runForEach = [
  {
    core: "GenArt721CoreV3_Engine",
  },
];

runForEach.forEach((params) => {
  describe(`MinterFilterV2 Views w/ core ${params.core}`, async function () {
    async function _beforeEach() {
      // load minter filter V2 fixture
      const config = await loadFixture(setupConfigWitMinterFilterV2Suite);
      // deploy core contract and register on core registry
      ({
        genArt721Core: config.genArt721Core,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCore(config, params.core, config.coreRegistry));

      // Project setup
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );
      return config;
    }

    describe("view functions", function () {
      describe("getNumRegisteredContracts", function () {
        it("returns 1 when one contract is registered", async function () {
          // one was alreaady registered in the fixture
          const config = await loadFixture(_beforeEach);
          const numContracts =
            await config.coreRegistry.getNumRegisteredContracts();
          expect(numContracts).to.equal(1);
        });

        it("returns 0 when no contract is registered", async function () {
          // one was alreaady registered in the fixture
          const config = await loadFixture(_beforeEach);
          // remove registered contract
          await config.coreRegistry
            .connect(config.accounts.deployer)
            .unregisterContract(config.genArt721Core.address);
          const numContracts =
            await config.coreRegistry.getNumRegisteredContracts();
          expect(numContracts).to.equal(0);
        });

        it("returns 2 when two contracts are registered", async function () {
          // one was alreaady registered in the fixture
          const config = await loadFixture(_beforeEach);
          // add registered (dummy) contract
          await config.coreRegistry
            .connect(config.accounts.deployer)
            .registerContract(
              constants.ZERO_ADDRESS,
              ethers.utils.formatBytes32String("DUMMY_VERSION"),
              ethers.utils.formatBytes32String("DUMMY_TYPE")
            );
          const numContracts =
            await config.coreRegistry.getNumRegisteredContracts();
          expect(numContracts).to.equal(2);
        });
      });

      describe("getRegisteredContractAt", function () {
        it("returns out of bounds when index > num registered contracts", async function () {
          // one was alreaady registered in the fixture
          const config = await loadFixture(_beforeEach);
          await expectRevert.unspecified(
            config.coreRegistry.getRegisteredContractAt(1)
          );
        });

        it("returns expected when valid request is made", async function () {
          // one was alreaady registered in the fixture
          const config = await loadFixture(_beforeEach);
          const registeredCore =
            await config.coreRegistry.getRegisteredContractAt(0);
          expect(registeredCore).to.equal(config.genArt721Core.address);
        });
      });

      describe("getAllRegisteredContracts", function () {
        it("returns correct when one contract is registered", async function () {
          // one was alreaady registered in the fixture
          const config = await loadFixture(_beforeEach);
          const allContracts =
            await config.coreRegistry.getAllRegisteredContracts();
          expect(allContracts.length).to.equal(1);
          expect(allContracts[0]).to.equal(config.genArt721Core.address);
        });

        it("returns 0 when no contract is registered", async function () {
          // one was alreaady registered in the fixture
          const config = await loadFixture(_beforeEach);
          // remove registered contract
          await config.coreRegistry
            .connect(config.accounts.deployer)
            .unregisterContract(config.genArt721Core.address);
          const allContracts =
            await config.coreRegistry.getAllRegisteredContracts();
          expect(allContracts.length).to.equal(0);
        });

        it("returns 2 when two contracts are registered", async function () {
          // one was alreaady registered in the fixture
          const config = await loadFixture(_beforeEach);
          // add registered (dummy) contract
          await config.coreRegistry
            .connect(config.accounts.deployer)
            .registerContract(
              constants.ZERO_ADDRESS,
              ethers.utils.formatBytes32String("DUMMY_VERSION"),
              ethers.utils.formatBytes32String("DUMMY_TYPE")
            );
          const allContracts =
            await config.coreRegistry.getAllRegisteredContracts();
          expect(allContracts.length).to.equal(2);
          expect(allContracts[0]).to.equal(config.genArt721Core.address);
          expect(allContracts[1]).to.equal(constants.ZERO_ADDRESS);
        });
      });

      describe("isRegisteredContract", function () {
        it("returns true for registered contract", async function () {
          // one was alreaady registered in the fixture
          const config = await loadFixture(_beforeEach);
          const isRegistered = await config.coreRegistry.isRegisteredContract(
            config.genArt721Core.address
          );
          expect(isRegistered).to.be.true;
        });

        it("returns false for unregistered contract", async function () {
          // one was alreaady registered in the fixture
          const config = await loadFixture(_beforeEach);
          const isRegistered = await config.coreRegistry.isRegisteredContract(
            constants.ZERO_ADDRESS
          );
          expect(isRegistered).to.be.false;
        });
      });
    });
  });
});
