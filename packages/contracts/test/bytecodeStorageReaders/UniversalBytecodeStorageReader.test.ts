import { expect } from "chai";
import { ethers } from "hardhat";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../util/common";

import { UniversalBytecodeStorageReader } from "../../scripts/contracts";
import { GenArt721CoreV3_Engine } from "../../scripts/contracts";
import { GenArt721CoreV3_Engine_Flex } from "../../scripts/contracts";
import { BytecodeStorageReaderContractV2__factory } from "../../scripts/contracts/factories/contracts/BytecodeStorageReaders/BytecodeStorageReaderContractV2.sol";
import { BytecodeStorageReaderContractV2 } from "../../scripts/contracts/contracts/BytecodeStorageReaders/BytecodeStorageReaderContractV2.sol";

interface T_ReaderTest_Config extends T_Config {
  universalReader: UniversalBytecodeStorageReader;
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
 * Tests for UniversalBytecodeStorageReader.
 * Note that most functionality is tested in the core contract tests, but this file
 * specifically tests a few important details of the contract.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${coreContractName} UniversalBytecodeStorageReader`, async function () {
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
      return config as T_ReaderTest_Config;
    }

    // @dev note tha most functionality is tested in the core contract tests,
    // but the following test blocks specifically tests a important functionality specific to the reader contract

    describe("updateBytecodeStorageReaderContract", async function () {
      it("reverts when not called by owner", async function () {
        const config = await _beforeEach();
        const newReaderAddress = config.accounts.additional.address; // arbitrary address
        await expect(
          config.universalReader
            .connect(config.accounts.user)
            .updateBytecodeStorageReaderContract(newReaderAddress)
        )
          .to.be.revertedWithCustomError(
            config.universalReader,
            "OwnableUnauthorizedAccount"
          )
          .withArgs(config.accounts.user.address);
      });

      it("updates state", async function () {
        const config = await _beforeEach();
        // update reader contract on the univeral reader
        const newReaderAddress = config.accounts.additional.address; // arbitrary address
        await config.universalReader
          .connect(config.accounts.deployer)
          .updateBytecodeStorageReaderContract(newReaderAddress);
        const readerAddress =
          await config.universalReader.activeBytecodeStorageReaderContract();
        expect(readerAddress).to.be.equal(newReaderAddress);
      });

      it("emits event", async function () {
        const config = await _beforeEach();
        // update to new artist address should create a new splitter
        await expect(
          config.universalReader
            .connect(config.accounts.deployer)
            .updateBytecodeStorageReaderContract(config.accounts.user.address)
        )
          .to.emit(config.universalReader, "ReaderUpdated")
          .withArgs(config.accounts.user.address);
      });
    });

    describe("activeBytecodeStorageReaderContract", async function () {
      it("returns expected value", async function () {
        const config = await _beforeEach();
        const versionedReaderAddress =
          await config.universalReader.activeBytecodeStorageReaderContract();
        // reader address should be a versioned reader, ensuring the address was the expected value
        const versionedReaderContract = new ethers.Contract(
          versionedReaderAddress,
          BytecodeStorageReaderContractV2__factory.abi,
          config.accounts.deployer
        ) as BytecodeStorageReaderContractV2;
        const readerVersion = await versionedReaderContract.VERSION();
        expect(readerVersion).to.be.equal("BytecodeStorageReaderContractV2");
      });
    });
  });
}
