import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
} from "../../util/common";
import {
  SQUIGGLE_SCRIPT,
  SKULPTUUR_SCRIPT_APPROX,
  CONTRACT_SIZE_LIMIT_SCRIPT,
} from "../../util/example-scripts";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const ONCHAIN = 2; // 2 is the enum value for ONCHAIN in the GenArt721CoreV3_Engine_Flex contract

/**
 * Flex on-chain asset Gas tests for V3 Engine Flex core.
 * Used to test the gas cost of uploading on-chain flex assets.
 */
describe("GenArt721CoreV3_Engine_Flex Gas Tests - Script Upload", async function () {
  // increase test timeout from 20s to 40s due to minting numMintsToAverage tokens in beforeEach
  this.timeout(40000);

  async function _beforeEach() {
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);
    // use a higher max invocations to avoid artifically low gas costs
    config.higherMaxInvocationsForGasTests = 1000;
    // make price artifically low to enable more mints to simulate real-world common use cases
    config.pricePerTokenInWei = ethers.utils.parseEther("0.1");

    // deploy and configure minter filter and minter
    ({
      genArt721Core: config.genArt721Core,
      minterFilter: config.minterFilter,
      randomizer: config.randomizer,
    } = await deployCoreWithMinterFilter(
      config,
      "GenArt721CoreV3_Engine_Flex",
      "MinterFilterV1"
    ));

    config.minter = await deployAndGet(config, "MinterSetPriceV2", [
      config.genArt721Core.address,
      config.minterFilter.address,
    ]);

    // add four projects, test on project three to directly compare to V1 core, which starts at projectId = 3
    for (let i = 0; i < 4; i++) {
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );
    }

    // configure project three (to compare directly to V1 core)
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .toggleProjectIsActive(config.projectThree);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .toggleProjectIsPaused(config.projectThree);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectMaxInvocations(
        config.projectThree,
        config.higherMaxInvocationsForGasTests
      );
    return config;
  }

  describe("script upload gas optimization", function () {
    it("test gas cost of uploading Chromie Squiggle script as external flex asset[ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      const tx = await config.genArt721Core
        .connect(config.accounts.artist)
        .addProjectExternalAssetDependency(
          config.projectThree,
          SQUIGGLE_SCRIPT,
          ONCHAIN
        );
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.toNumber();
      console.log("gas used for ONCHAIN upload: ", gasUsed);
      // also report in USD at specific conditions
      const gasCostAt100gwei = receipt.effectiveGasPrice
        .mul(gasUsed)
        .toString();
      const gasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(gasCostAt100gwei, "ether")
      );
      const gasCostAt100gweiAt2kUSDPerETH = gasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${gasCostAt100gweiAt2kUSDPerETH}`
      );
      // ensure value was updated
      const script0 =
        await config.genArt721Core.projectExternalAssetDependencyByIndex(
          config.projectThree,
          0
        );
      // console.info(script0);
      expect(script0.data).to.equal(SQUIGGLE_SCRIPT);
    });

    it("test gas cost of uploading Skulptuur script [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      const tx = await config.genArt721Core
        .connect(config.accounts.artist)
        .addProjectExternalAssetDependency(
          config.projectThree,
          SKULPTUUR_SCRIPT_APPROX,
          ONCHAIN
        );
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.toNumber();
      console.log("gas used for script upload: ", gasUsed);
      // also report in USD at specific conditions
      const gasCostAt100gwei = receipt.effectiveGasPrice
        .mul(gasUsed)
        .toString();
      const gasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(gasCostAt100gwei, "ether")
      );
      const gasCostAt100gweiAt2kUSDPerETH = gasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${gasCostAt100gweiAt2kUSDPerETH}`
      );
      // ensure value was updated
      const script0 =
        await config.genArt721Core.projectExternalAssetDependencyByIndex(
          config.projectThree,
          0
        );
      // console.info(script0);
      expect(script0.data).to.equal(SKULPTUUR_SCRIPT_APPROX);
    });

    it("test gas cost of uploading 23.95 KB script [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      const tx = await config.genArt721Core
        .connect(config.accounts.artist)
        .addProjectExternalAssetDependency(
          config.projectThree,
          CONTRACT_SIZE_LIMIT_SCRIPT,
          ONCHAIN,
          {
            gasLimit: 30000000, // hard-code gas limit because ethers sometimes estimates too high
          }
        );
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.toNumber();
      console.log("gas used for script upload: ", gasUsed);
      // also report in USD at specific conditions
      const gasCostAt100gwei = receipt.effectiveGasPrice
        .mul(gasUsed)
        .toString();
      const gasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(gasCostAt100gwei, "ether")
      );
      const gasCostAt100gweiAt2kUSDPerETH = gasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${gasCostAt100gweiAt2kUSDPerETH}`
      );
      // ensure value was updated
      const script0 =
        await config.genArt721Core.projectExternalAssetDependencyByIndex(
          config.projectThree,
          0
        );
      // console.info(script0);
      expect(script0.data).to.equal(CONTRACT_SIZE_LIMIT_SCRIPT);
    });
  });
});
