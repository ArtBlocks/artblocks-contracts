import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
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
  describe(`CoreRegistryV1 Events w/ core ${params.core}`, async function () {
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

    describe("ContractRegistered", function () {
      it("emits when single contract is registered", async function () {
        // one was alreaady registered in the fixture
        const config = await loadFixture(_beforeEach);
        // remove registered contract
        await config.coreRegistry
          .connect(config.accounts.deployer)
          .unregisterContract(config.genArt721Core.address);
        await expect(
          config.coreRegistry
            .connect(config.accounts.deployer)
            .registerContract(
              config.genArt721Core.address,
              ethers.utils.formatBytes32String("DUMMY_VERSION"),
              ethers.utils.formatBytes32String("DUMMY_TYPE")
            )
        )
          .to.emit(config.coreRegistry, "ContractRegistered")
          .withArgs(
            config.genArt721Core.address,
            ethers.utils.formatBytes32String("DUMMY_VERSION"),
            ethers.utils.formatBytes32String("DUMMY_TYPE")
          );
      });

      it("emits when multiple contracts are registered", async function () {
        // one was alreaady registered in the fixture
        const config = await loadFixture(_beforeEach);
        // remove registered contract
        await config.coreRegistry
          .connect(config.accounts.deployer)
          .unregisterContract(config.genArt721Core.address);
        await expect(
          config.coreRegistry
            .connect(config.accounts.deployer)
            .registerContracts(
              [config.genArt721Core.address, constants.ZERO_ADDRESS],
              [
                ethers.utils.formatBytes32String("DUMMY_VERSION"),
                ethers.utils.formatBytes32String("DUMMY_VERSION2"),
              ],
              [
                ethers.utils.formatBytes32String("DUMMY_TYPE"),
                ethers.utils.formatBytes32String("DUMMY_TYPE2"),
              ]
            )
        )
          .to.emit(config.coreRegistry, "ContractRegistered")
          .withArgs(
            config.genArt721Core.address,
            ethers.utils.formatBytes32String("DUMMY_VERSION"),
            ethers.utils.formatBytes32String("DUMMY_TYPE")
          )
          .and.to.emit(config.coreRegistry, "ContractRegistered")
          .withArgs(
            constants.ZERO_ADDRESS,
            ethers.utils.formatBytes32String("DUMMY_VERSION2"),
            ethers.utils.formatBytes32String("DUMMY_TYPE2")
          );
      });
    });

    describe("ContractUnregistered", function () {
      it("emits when single contract is unregistered", async function () {
        // one was alreaady registered in the fixture
        const config = await loadFixture(_beforeEach);
        // remove registered contract
        await expect(
          config.coreRegistry
            .connect(config.accounts.deployer)
            .unregisterContract(config.genArt721Core.address)
        )
          .to.emit(config.coreRegistry, "ContractUnregistered")
          .withArgs(config.genArt721Core.address);
      });

      it("emits when multiple contracts are unregistered", async function () {
        // one was alreaady registered in the fixture
        const config = await loadFixture(_beforeEach);
        // register second contract
        await config.coreRegistry
          .connect(config.accounts.deployer)
          .registerContract(
            constants.ZERO_ADDRESS,
            ethers.utils.formatBytes32String("DUMMY_VERSION"),
            ethers.utils.formatBytes32String("DUMMY_TYPE")
          );
        await expect(
          config.coreRegistry
            .connect(config.accounts.deployer)
            .unregisterContracts([
              config.genArt721Core.address,
              constants.ZERO_ADDRESS,
            ])
        )
          .to.emit(config.coreRegistry, "ContractUnregistered")
          .withArgs(config.genArt721Core.address)
          .and.to.emit(config.coreRegistry, "ContractUnregistered")
          .withArgs(constants.ZERO_ADDRESS);
      });
    });
  });
});
