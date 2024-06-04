import { BN, constants } from "@openzeppelin/test-helpers";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../util/fixtures";
const { MerkleTree } = require("merkletreejs");
import { hashAddress } from "../legacy/MinterMerkle/MinterMerkle.common";
const keccak256 = require("keccak256");

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
  deployCore,
} from "../../util/common";

const NUM_INITIAL_MINTS = 10;
const NUM_MINTS_TO_AVERAGE = 25;
const MAX_INVOCATIONS = NUM_INITIAL_MINTS + NUM_MINTS_TO_AVERAGE;
const CORE_NAME = "GenArt721CoreV3";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

/**
 * General Gas tests for V3 core.
 * Used to test the gas cost of different operations on the core, specifically
 * when optimizing for gas to quantify % reductions to aide in decision making.
 */
describe(`${CORE_NAME} Gas Tests`, async function () {
  // increase test timeout from 20s to 40s due to minting NUM_INITIAL_MINTS tokens in beforeEach
  this.timeout(40000);

  async function _beforeEachMinterSuiteLegacy() {
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);

    // make price artifically low to enable more mints to simulate real-world common use cases
    config.pricePerTokenInWei = ethers.utils.parseEther("0.1");

    config.delegationRegistry = await deployAndGet(
      config,
      "DelegationRegistry",
      []
    );

    // deploy and configure minter filter and minter
    ({
      genArt721Core: config.genArt721Core,
      minterFilter: config.minterFilter,
      randomizer: config.randomizer,
    } = await deployCoreWithMinterFilter(config, CORE_NAME, "MinterFilterV1"));

    config.minter = await deployAndGet(config, "MinterMerkleV5", [
      config.genArt721Core.address,
      config.minterFilter.address,
      config.delegationRegistry.address,
    ]);

    // add two projects to perform mints on project one
    for (let i = 0; i < 2; i++) {
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );
    }

    // configure project one
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .toggleProjectIsActive(config.projectOne);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .toggleProjectIsPaused(config.projectOne);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectMaxInvocations(config.projectOne, MAX_INVOCATIONS);
    // configure minter for project one
    await config.minterFilter
      .connect(config.accounts.deployer)
      .addApprovedMinter(config.minter.address);
    await config.minterFilter
      .connect(config.accounts.deployer)
      .setMinterForProject(config.projectOne, config.minter.address);
    await config.minter
      .connect(config.accounts.artist)
      .updatePricePerTokenInWei(config.projectOne, config.pricePerTokenInWei);

    // define Merkle allowlist
    const elementsProjectOne = [];

    elementsProjectOne.push(
      config.accounts.deployer.address,
      config.accounts.artist.address,
      config.accounts.additional.address,
      config.accounts.user.address,
      config.accounts.user2.address
    );

    config.merkleTreeOne = new MerkleTree(
      elementsProjectOne.map((_addr) => hashAddress(_addr)),
      keccak256,
      {
        sortPairs: true,
      }
    );
    const merkleRootOne = config.merkleTreeOne.getHexRoot();
    await config.minter
      .connect(config.accounts.artist)
      .updateMerkleRoot(config.projectOne, merkleRootOne);
    // allow MAX_INVOCATIONS from a single address
    await config.minter
      .connect(config.accounts.artist)
      .setProjectInvocationsPerAddress(config.projectOne, MAX_INVOCATIONS);

    config.userMerkleProofOne = config.merkleTreeOne.getHexProof(
      hashAddress(config.accounts.user.address)
    );

    // mint NUM_INITIAL_MINTS tokens on project one to simulate a typical real-world use case
    for (let i = 0; i < NUM_INITIAL_MINTS; i++) {
      await config.minter
        .connect(config.accounts.user)
        [
          "purchase(uint256,bytes32[])"
        ](config.projectOne, config.userMerkleProofOne, {
          value: config.pricePerTokenInWei,
        });
    }
    return config;
  }

  async function _beforeEachMinterSuiteV2() {
    // load minter filter V2 fixture
    const config = await loadFixture(setupConfigWitMinterFilterV2Suite);
    // deploy core contract and register on core registry
    ({
      genArt721Core: config.genArt721Core,
      randomizer: config.randomizer,
      adminACL: config.adminACL,
    } = await deployCore(config, CORE_NAME, config.coreRegistry));

    config.delegationRegistry = await deployAndGet(
      config,
      "DelegationRegistry",
      []
    );

    // make price artifically low to enable more mints to simulate real-world common use cases
    config.pricePerTokenInWei = ethers.utils.parseEther("0.1");

    // update core's minter as the minter filter
    await config.genArt721Core.updateMinterContract(
      config.minterFilter.address
    );

    config.minter = await deployAndGet(config, "MinterSetPriceMerkleV5", [
      config.minterFilter.address,
      config.delegationRegistry.address,
    ]);

    await config.minterFilter
      .connect(config.accounts.deployer)
      .approveMinterGlobally(config.minter.address);

    // Project setup
    for (let i = 0; i < 2; i++) {
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );
    }

    await config.genArt721Core
      .connect(config.accounts.deployer)
      .toggleProjectIsActive(config.projectOne);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .toggleProjectIsPaused(config.projectOne);

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
      .updateProjectMaxInvocations(config.projectOne, MAX_INVOCATIONS);

    // define Merkle allowlist
    const elementsProjectOne = [];

    elementsProjectOne.push(
      config.accounts.deployer.address,
      config.accounts.artist.address,
      config.accounts.additional.address,
      config.accounts.user.address,
      config.accounts.user2.address
    );

    config.merkleTreeOne = new MerkleTree(
      elementsProjectOne.map((_addr) => hashAddress(_addr)),
      keccak256,
      {
        sortPairs: true,
      }
    );
    const merkleRootOne = config.merkleTreeOne.getHexRoot();
    await config.minter
      .connect(config.accounts.artist)
      .updateMerkleRoot(
        config.projectOne,
        config.genArt721Core.address,
        merkleRootOne
      );
    // allow MAX_INVOCATIONS from a single address
    await config.minter
      .connect(config.accounts.artist)
      .setProjectInvocationsPerAddress(
        config.projectOne,
        config.genArt721Core.address,
        MAX_INVOCATIONS
      );

    config.userMerkleProofOne = config.merkleTreeOne.getHexProof(
      hashAddress(config.accounts.user.address)
    );

    // mint NUM_INITIAL_MINTS tokens on project one to simulate a typical real-world use case
    for (let i = 0; i < NUM_INITIAL_MINTS; i++) {
      await config.minter
        .connect(config.accounts.user)
        [
          "purchase(uint256,address,bytes32[])"
        ](config.projectOne, config.genArt721Core.address, config.userMerkleProofOne, {
          value: config.pricePerTokenInWei,
        });
    }

    return config;
  }

  describe("LEGACY mint gas measurement", function () {
    it("test gas cost of mint on LEGACY Minter Merkle [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEachMinterSuiteLegacy);

      // report gas over an average of NUM_MINTS_TO_AVERAGE purchases
      const receipts = [];
      for (let index = 0; index < NUM_MINTS_TO_AVERAGE; index++) {
        const tx = await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectOne, config.userMerkleProofOne, {
            value: config.pricePerTokenInWei,
          });
        receipts.push(await ethers.provider.getTransactionReceipt(tx.hash));
      }
      const gasUseds = receipts.map((receipt) => receipt.gasUsed);
      const maxGasUsed = Math.max(...gasUseds);
      console.log(`max gas used for all tested mints: ${maxGasUsed}`);
      const avgGasUsed = gasUseds
        .reduce((a, b) => a.add(b))
        .div(gasUseds.length);
      console.log(`average gas used for mint optimization test: ${avgGasUsed}`);
      const avgGasCostAt100gwei = receipts[0].effectiveGasPrice
        .mul(avgGasUsed)
        .toString();

      const avgGasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(avgGasCostAt100gwei, "ether")
      );
      const avgGasCostAt100gweiAt2kUSDPerETH = avgGasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${avgGasCostAt100gweiAt2kUSDPerETH}`
      );
    });
  });

  describe("SHARED MINTER SUITE mint gas measurement", function () {
    it("test gas cost of mint on SHARED MinterSetPriceMerkle [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEachMinterSuiteV2);
      // report gas over an average of NUM_MINTS_TO_AVERAGE purchases
      const receipts = [];
      for (let index = 0; index < NUM_MINTS_TO_AVERAGE; index++) {
        const tx = await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,address,bytes32[])"
          ](config.projectOne, config.genArt721Core.address, config.userMerkleProofOne, {
            value: config.pricePerTokenInWei,
          });
        receipts.push(await ethers.provider.getTransactionReceipt(tx.hash));
      }
      const gasUseds = receipts.map((receipt) => receipt.gasUsed);
      const maxGasUsed = Math.max(...gasUseds);
      console.log(`max gas used for all tested mints: ${maxGasUsed}`);
      const avgGasUsed = gasUseds
        .reduce((a, b) => a.add(b))
        .div(gasUseds.length);
      console.log(`average gas used for mint optimization test: ${avgGasUsed}`);
      const avgGasCostAt100gwei = receipts[0].effectiveGasPrice
        .mul(avgGasUsed)
        .toString();

      const avgGasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(avgGasCostAt100gwei, "ether")
      );
      const avgGasCostAt100gweiAt2kUSDPerETH = avgGasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${avgGasCostAt100gweiAt2kUSDPerETH}`
      );
    });
  });
});
