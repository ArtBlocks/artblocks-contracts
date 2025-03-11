import { expect } from "chai";
import { ethers } from "hardhat";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  deployWithStorageLibraryAndGet,
} from "../util/common";

import { SSTORE2Mock } from "../../scripts/contracts";
import { BytecodeV2TextCR_DMock } from "../../scripts/contracts";
import { UniversalBytecodeStorageReader } from "../../scripts/contracts";
import { GenArt721CoreV3_Engine } from "../../scripts/contracts";
import { GenArt721CoreV3_Engine_Flex } from "../../scripts/contracts";
import { BytecodeStorageReaderContractV2_Web3Call__factory } from "../../scripts/contracts/factories/contracts/BytecodeStorageReaders/BytecodeStorageReaderContractV2_Web3Call.sol";
import { BytecodeStorageReaderContractV2_Web3Call } from "../../scripts/contracts/contracts/BytecodeStorageReaders/BytecodeStorageReaderContractV2_Web3Call.sol";

interface T_ReaderTest_Config extends T_Config {
  universalReader: UniversalBytecodeStorageReader;
  versionedReader: BytecodeStorageReaderContractV2_Web3Call;
  genArt721Core: GenArt721CoreV3_Engine | GenArt721CoreV3_Engine_Flex;
  projectZero: number;
  projectOne: number;
  sstore2Mock: SSTORE2Mock;
  bytecodeV2TextCR_DMock: BytecodeV2TextCR_DMock;
}

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3_Engine", // V3 core Engine Contract
  // no need to test multiple core versions here, as the reader contract is being tested directly
];

// Helper that retrieves the address of the most recently deployed contract
// containing bytecode for storage, from the V2 ByteCode storage library.
async function getLatestTextDeploymentAddressV2(
  bytecodeV2TextCR_DMock: BytecodeV2TextCR_DMock
) {
  const nextTextSlotId = await bytecodeV2TextCR_DMock.nextTextSlotId();
  // decrement from `nextTextSlotId` to get last updated slot
  const textSlotId = nextTextSlotId.sub(1);
  const textBytecodeAddress =
    await bytecodeV2TextCR_DMock.storedTextBytecodeAddresses(textSlotId);
  return textBytecodeAddress;
}

// Helper that retrieves the address of the most recently deployed contract
// containing bytecode for storage, from the SSTORE2 mock contract.
async function getLatestTextDeploymentAddressSSTORE2(sstore2Mock: SSTORE2Mock) {
  const nextTextSlotId = await sstore2Mock.nextTextSlotId();
  // decrement from `nextTextSlotId` to get last updated slot
  const textSlotId = nextTextSlotId.sub(1);
  const textBytecodeAddress =
    await sstore2Mock.storedTextBytecodeAddresses(textSlotId);
  return textBytecodeAddress;
}

/**
 * Tests for BytecodeStorageReaderContractV2_Web3Call.
 * Note that basic read functionality is tested when testing core contract, but
 * additional functionality of the versioned reader is tested here.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${coreContractName} BytecodeStorageReaderContractV2_Web3Call`, async function () {
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

      const versionedReaderAddress =
        await config.universalReader?.activeBytecodeStorageReaderContract();
      config.versionedReader = new ethers.Contract(
        versionedReaderAddress,
        BytecodeStorageReaderContractV2_Web3Call__factory.abi,
        config.accounts.deployer
      ) as BytecodeStorageReaderContractV2_Web3Call;
      // deploy the SSTORE2 library mock
      config.sstore2Mock = await deployAndGet(
        config,
        "SSTORE2Mock",
        [] // no deployment args
      );
      // deploy the V2 library mock for writes
      config.bytecodeV2TextCR_DMock = await deployWithStorageLibraryAndGet(
        config,
        "BytecodeV2TextCR_DMock",
        [] // no deployment args
      );
      return config as T_ReaderTest_Config;
    }

    // @dev note tha most functionality is tested in the core contract tests,
    // but the following test blocks specifically tests a important functionality specific to the reader contract

    // -- ALTERNATE READ METHODS --

    describe("readBytesFromSSTORE2Bytecode", async function () {
      it("reads sstore2 data", async function () {
        const config = await _beforeEach();
        // write via the mock
        const targetText = "hello world!";
        await config.sstore2Mock.createText(targetText);
        // retrieve latest deployment address
        const deploymentAddress = await getLatestTextDeploymentAddressSSTORE2(
          config.sstore2Mock
        );
        // read the data via the reader contract
        const readData =
          await config.versionedReader.readBytesFromSSTORE2Bytecode(
            deploymentAddress
          );
        // validate the read data
        expect(readData).to.be.equal(
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes(targetText))
        );
      });
    });

    describe("readBytesFromBytecode", async function () {
      it("reads specific bytes from bytecode", async function () {
        const config = await _beforeEach();
        // write via the mock
        const targetText = "hello world!";
        await config.bytecodeV2TextCR_DMock.createText(targetText);
        // retrieve latest deployment address
        const deploymentAddress = await getLatestTextDeploymentAddressV2(
          config.bytecodeV2TextCR_DMock
        );
        // read the data via the reader contract
        const readData = await config.versionedReader.readBytesFromBytecode(
          deploymentAddress,
          66 // this is the V2 offset for the text data
        );
        // validate the read data
        expect(readData).to.be.equal(
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes("hello world!"))
        );
      });
    });

    // -- METADATA READERS --
    describe("getWriterAddressForBytecode", async function () {
      it("returns expected value", async function () {
        const config = await _beforeEach();
        // write via the mock
        const targetText = "hello world!";
        await config.bytecodeV2TextCR_DMock.createText(targetText);
        // retrieve latest deployment address
        const deploymentAddress = await getLatestTextDeploymentAddressV2(
          config.bytecodeV2TextCR_DMock
        );
        // read the data via the reader contract
        const writerAddress =
          await config.versionedReader.getWriterAddressForBytecode(
            deploymentAddress
          );
        // validate the read data
        expect(writerAddress).to.be.equal(
          config.bytecodeV2TextCR_DMock.address
        );
      });
    });

    describe("getLibraryVersionForBytecode", async function () {
      it("returns expected value", async function () {
        const config = await _beforeEach();
        // write via the mock
        const targetText = "hello world!";
        await config.bytecodeV2TextCR_DMock.createText(targetText);
        // retrieve latest deployment address
        const deploymentAddress = await getLatestTextDeploymentAddressV2(
          config.bytecodeV2TextCR_DMock
        );
        // read the data via the reader contract
        const libraryVersion =
          await config.versionedReader.getLibraryVersionForBytecode(
            deploymentAddress
          );
        // validate the read data
        expect(libraryVersion).to.be.equal(
          ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes("BytecodeStorage_V2.0.0_________ ")
          )
        );
      });
    });

    describe("getIsCompressedForBytecode", async function () {
      it("returns expected value when compressed", async function () {
        const config = await _beforeEach();
        // write via the mock
        const targetText = "hello world!";
        const targetTextCompressed =
          await config.genArt721Core.getCompressed(targetText);
        await config.bytecodeV2TextCR_DMock.createTextCompressed(
          targetTextCompressed
        );
        // retrieve latest deployment address
        const deploymentAddress = await getLatestTextDeploymentAddressV2(
          config.bytecodeV2TextCR_DMock
        );
        // read the data via the reader contract
        const isCompressed =
          await config.versionedReader.getIsCompressedForBytecode(
            deploymentAddress
          );
        // validate the read data
        expect(isCompressed).to.be.equal(true);
      });

      it("returns expected value when not compressed", async function () {
        const config = await _beforeEach();
        // write via the mock
        const targetText = "hello world!";
        await config.bytecodeV2TextCR_DMock.createText(targetText);
        // retrieve latest deployment address
        const deploymentAddress = await getLatestTextDeploymentAddressV2(
          config.bytecodeV2TextCR_DMock
        );
        // read the data via the reader contract
        const isCompressed =
          await config.versionedReader.getIsCompressedForBytecode(
            deploymentAddress
          );
        // validate the read data
        expect(isCompressed).to.be.equal(false);
      });
    });
  });
}
