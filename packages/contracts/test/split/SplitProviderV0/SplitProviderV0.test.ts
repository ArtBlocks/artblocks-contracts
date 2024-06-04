import { constants } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  deployWithStorageLibraryAndGet,
  GENART721_ERROR_NAME,
  GENART721_ERROR_CODES,
} from "../../util/common";

import { Mock0xSplitsV2Splitter } from "../../../scripts/contracts";
import { SplitProviderV0 } from "../../../scripts/contracts";
import { GenArt721CoreV3_Engine } from "../../../scripts/contracts";
import { GenArt721CoreV3_Engine_Flex } from "../../../scripts/contracts";

interface T_SplitProviderTest_Config extends T_Config {
  splitProvider: SplitProviderV0;
  genArt721Core: GenArt721CoreV3_Engine | GenArt721CoreV3_Engine_Flex;
  projectZero: number;
  projectOne: number;
}

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3_Engine", // V3 core Engine contract
  "GenArt721CoreV3_Engine_Flex", // V3 core Engine Flex contract
];

/**
 * Tests for SplitProviderV0.
 * Note that most functionality is tested in the core contract tests, but this file
 * specifically tests a few important details of the SplitProviderV0 contract.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${coreContractName} Project Configure`, async function () {
    async function _beforeEach() {
      let config: T_Config = {
        accounts: await getAccounts(),
      };
      config = await assignDefaultConstants(config);

      // deploy and configure minter filter and minter
      ({
        genArt721Core: config.genArt721Core,
        minterFilter: config.minterFilter,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCoreWithMinterFilter(
        config,
        coreContractName,
        "MinterFilterV1"
      ));

      config.minter = await deployAndGet(config, "MinterSetPriceV2", [
        config.genArt721Core.address,
        config.minterFilter.address,
      ]);

      // add project zero
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist.address);
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);

      // add project one without setting it to active or setting max invocations
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist2.address);

      // configure minter for project zero
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectZero, 0);
      return config as T_SplitProviderTest_Config;
    }

    // @dev note tha most functionality is tested in the core contract tests,
    // but the following test blocks specifically tests a few important details of
    // the SplitProviderV0 contract.

    describe("emits SplitterCreated event correctly", function () {
      it("should emit event when new splitter is created", async function () {
        const config = await _beforeEach();
        // update to new artist address should create a new splitter
        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectArtistAddress(
              config.projectZero,
              config.accounts.user.address
            )
        ).to.emit(config.splitProvider, "SplitterCreated");
      });

      it("should not emit new event when spliter is not created", async function () {
        const config = await _beforeEach();
        // update to artist2 address should not create a new splitter,
        // because artist2 is artist for project one, and splitter addresses are deterministic
        // based on split config + core contract address
        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectArtistAddress(
              config.projectZero,
              config.accounts.artist2.address
            )
        ).to.not.emit(config.splitProvider, "SplitterCreated");
      });
    });

    describe("getSplitFactoryV2", function () {
      it("should return the correct split factory address", async function () {
        const config = await _beforeEach();
        const splitFactory = await config.splitProvider.getSplitFactoryV2();
        expect(splitFactory).to.not.equal(constants.ZERO_ADDRESS);
      });
    });

    describe("supportsInterface", function () {
      it("should return true for IGenArt721SplitProviderV0", async function () {
        const config = await _beforeEach();
        // @dev manually calculated interface for getOrCreateSplitter(SplitInputs) to be 0x5c60914c
        const supportedInterfaceId = "0x5c60914c";
        const supportsInterface =
          await config.splitProvider.supportsInterface(supportedInterfaceId);
        expect(supportsInterface).to.be.true;
      });

      it("should return false for IGenArt721SplitProviderV1", async function () {
        const config = await _beforeEach();
        const invalidInterfaceId = "0xffffffff";
        const supportsInterface =
          await config.splitProvider.supportsInterface(invalidInterfaceId);
        expect(supportsInterface).to.be.false;
      });
    });

    describe("type_", function () {
      it("should return the correct type", async function () {
        const config = await _beforeEach();
        const type_ = await config.splitProvider.type_();
        expect(type_).to.equal(
          ethers.utils.formatBytes32String("SplitProviderV0")
        );
      });
    });
  });
}
