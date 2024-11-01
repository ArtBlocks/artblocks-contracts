import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../util/common";
import { ethers } from "hardhat";
import { expect } from "chai";

import { T_Config } from "../../util/common";
import {
  GenArt721CoreV3_Engine,
  MinterFilterV2,
  SeaDropXArtBlocksShim,
} from "../../../scripts/contracts";
import { SeaDropXArtBlocksShim__factory } from "../../../scripts/contracts";

interface T_SeaDropShimTestConfig extends T_Config {
  genArt721Core: GenArt721CoreV3_Engine;
  minterFilter: MinterFilterV2;
  minter: SeaDropXArtBlocksShim;
  projectZero: number;
}

// @dev testing with V3 engine sufficient - no different logic is tested with flex, etc.
const runForEach = [
  {
    core: "GenArt721CoreV3_Engine",
  },
];

// we don't mock SeaDrop contract, instead rely on end-to-end testing on testnet for SeaDrop integration
// @dev this maintains security via testing our contract logic, but also tests the integration with SeaDrop
// on systems outside of our dev environment and developed by third party teams
const SEA_DROP_ADDRESS = ethers.Wallet.createRandom().address;

// we don't mock SeaDrop contract, instead rely on end-to-end testing on testnet for SeaDrop integration
// @dev this maintains security via testing our contract logic, but also tests the integration with SeaDrop
// on systems outside of our dev environment and developed by third party teams

runForEach.forEach((params) => {
  describe(`SeaDropXArtBlocksShim Events w/ core ${params.core}`, async function () {
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

      // Project setup (do prior to minter deployment for pre-syncing artist address in constructor test)
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );

      config.minter = await deployAndGet(config, "SeaDropXArtBlocksShim", [
        config.minterFilter.address,
        SEA_DROP_ADDRESS,
        config.genArt721Core.address,
        config.projectZero,
      ]);

      // set up project 0
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 15);

      return config as T_SeaDropShimTestConfig;
    }

    describe("constructor", async function () {
      it("emits SeaDropTokenDeployed during deployment", async function () {
        const config = await _beforeEach();
        // deploy minter
        const minterFactory = await ethers.getContractFactory(
          "SeaDropXArtBlocksShim"
        );
        const factory = new SeaDropXArtBlocksShim__factory(
          config.accounts.deployer
        );
        let deployTx = factory
          .connect(config.accounts.deployer)
          .getDeployTransaction(
            config.minterFilter.address, // minterFilter
            config.accounts.deployer.address, // allowedSeaDrop
            config.genArt721Core.address, // core
            config.projectZero // projectId
          );
        const tx = await config.accounts.deployer.sendTransaction(deployTx);
        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        // verify log2 event
        const targetLog2 = receipt.logs[2];
        expect(targetLog2.topics[0]).to.be.equal(
          ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes("SeaDropTokenDeployed()")
          )
        );
        // verify log3 event + data
        const targetLog3 = receipt.logs[3];
        expect(targetLog3.topics[0]).to.be.equal(
          ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes("SeaDropShimForContract(address)")
          )
        );
        const currentCoreFromTopic = "0x".concat(
          targetLog3.data.slice(26).toLowerCase()
        );
        // expect field to be address of minter filter
        expect(currentCoreFromTopic).to.be.equal(
          config.genArt721Core.address.toLowerCase()
        );
      });
    });

    describe("LocalMaxSupplyUpdated", async function () {
      it("emits LocalMaxSupplyUpdated when local max supply is updated", async function () {
        const config = await _beforeEach();
        const newSupply = 10;
        await expect(
          config.minter.connect(config.accounts.artist).setMaxSupply(newSupply)
        )
          .to.emit(config.minter, "LocalMaxSupplyUpdated")
          .withArgs(newSupply);
      });
    });
  });
});
