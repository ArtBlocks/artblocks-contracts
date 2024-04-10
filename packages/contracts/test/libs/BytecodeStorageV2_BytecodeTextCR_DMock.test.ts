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
import { Contract } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  BytecodeV2TextCR_DMock,
  BytecodeV2LibCallsMock,
} from "../../scripts/contracts";

import {
  T_Config,
  getAccounts,
  deployAndGet,
  deployWithStorageLibraryAndGet,
  assignDefaultConstants,
} from "../util/common";

import {
  SQUIGGLE_SCRIPT,
  SKULPTUUR_SCRIPT_APPROX,
  CONTRACT_SIZE_LIMIT_SCRIPT,
  GREATER_THAN_CONTRACT_SIZE_LIMIT_SCRIPT,
  MULTI_BYTE_UTF_EIGHT_SCRIPT,
} from "../util/example-scripts";

interface BytecodeStorageV2TestConfig extends T_Config {
  bytecodeV2TextCR_DMock?: BytecodeV2TextCR_DMock;
  bytecodeV2LibCallsMock?: BytecodeV2LibCallsMock;
}

/**
 * Tests for BytecodeStorageV2 by way of testing the BytecodeV2TextCR_DMock and
 * BytecodeV2LibCallsMock mocks.
 * Note: it is not the intention of these tests to comprehensively test the mocks
 *       themselves, but rather to achieve full test coverage of the underlying
 *       library under test here, BytecodeStorage, and as such not all methods of
 *       the underlying mocks are necessarily tested here.
 */
describe("BytecodeStorageV2 + BytecodeV2TextCR_DMock/BytecodeV2LibCallsMock Library Tests", async function () {
  // Helper that validates a Create and subsequent Read operation, ensuring
  // that bytes-in == bytes-out for a given input string.
  async function validateCreateAndRead(
    config: BytecodeStorageV2TestConfig,
    targetText: string,
    deployer: SignerWithAddress
  ) {
    // First validate w/ BytecodeV2TextCR_DMock read
    const createTextTX = await config.bytecodeV2TextCR_DMock
      .connect(deployer)
      .createText(targetText);
    const textSlotId = createTextTX.value.toNumber();
    const text = await config.bytecodeV2TextCR_DMock.readText(textSlotId);
    expect(text).to.equal(targetText);

    // Then also validate with BytecodeV2LibCallsMock read, reading the same
    // initial creation text
    const textBytecodeAddress =
      await config.bytecodeV2TextCR_DMock.storedTextBytecodeAddresses(
        textSlotId
      );
    const textFromLib =
      await config.bytecodeV2LibCallsMock.readFromBytecode(textBytecodeAddress);
    expect(textFromLib).to.equal(targetText);
  }
  // Helper that validates a compressed create and subsequent read operation, ensuring
  // that bytes-in == bytes-out for a given input string.
  async function validateCompressedCreateAndRead(
    config: BytecodeStorageV2TestConfig,
    targetText: string,
    deployer: SignerWithAddress
  ) {
    // First validate w/ BytecodeV2TextCR_DMock read
    const compressedTextBytes =
      await config.bytecodeV2TextCR_DMock.getCompressed(targetText);
    const createTextTX = await config.bytecodeV2TextCR_DMock
      .connect(deployer)
      .createTextCompressed(compressedTextBytes);
    const textSlotId = createTextTX.value.toNumber();
    const text = await config.bytecodeV2TextCR_DMock.readText(textSlotId);
    expect(text).to.equal(targetText);

    // Then also validate with BytecodeV2LibCallsMock read, reading the same
    // initial creation text
    const textBytecodeAddress =
      await config.bytecodeV2TextCR_DMock.storedTextBytecodeAddresses(
        textSlotId
      );
    const textFromLib =
      await config.bytecodeV2LibCallsMock.readFromBytecode(textBytecodeAddress);
    expect(textFromLib).to.equal(targetText);
  }

  // Helper that retrieves the address of the most recently deployed contract
  // containing bytecode for storage.
  async function getLatestTextDeploymentAddress(
    config: BytecodeStorageV2TestConfig,
    bytecodeV2TextCR_DMock: Contract
  ) {
    const nextTextSlotId = await bytecodeV2TextCR_DMock.nextTextSlotId();
    // decrement from `nextTextSlotId` to get last updated slot
    const textSlotId = nextTextSlotId - 1;
    const textBytecodeAddress =
      await bytecodeV2TextCR_DMock.storedTextBytecodeAddresses(textSlotId);
    return textBytecodeAddress;
  }

  async function _beforeEach() {
    let config: BytecodeStorageV2TestConfig = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);
    // deploy the library mock
    config.bytecodeV2TextCR_DMock = await deployWithStorageLibraryAndGet(
      config,
      "BytecodeV2TextCR_DMock",
      [] // no deployment args
    );
    // note: to ease in testing readabililty, we deploy a new version of the library,
    // but in production we would use the same library if we were using the approach of
    // "CALL instead of DELEGATECALL by way of 'library wrapping'"
    const libraryFactory = await ethers.getContractFactory(
      "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader"
    );
    const library = await libraryFactory
      .connect(config.accounts.deployer)
      .deploy(/* no args for library ever */);
    config.bytecodeV2LibCallsMock = await deployAndGet(
      config,
      "BytecodeV2LibCallsMock",
      [library.address] // single constructor arg of the "interface conforming" library address
    );
    return config;
  }

  describe("imported scripts are non-empty", function () {
    it("ensure diffs are captured if project scripts are deleted", async function () {
      const config = await loadFixture(_beforeEach);
      expect(SQUIGGLE_SCRIPT.length).to.be.gt(0);
      expect(SKULPTUUR_SCRIPT_APPROX.length).to.be.gt(0);
      expect(CONTRACT_SIZE_LIMIT_SCRIPT.length).to.be.gt(0);
      expect(GREATER_THAN_CONTRACT_SIZE_LIMIT_SCRIPT.length).to.be.gt(0);
      expect(GREATER_THAN_CONTRACT_SIZE_LIMIT_SCRIPT.length).to.be.gt(
        CONTRACT_SIZE_LIMIT_SCRIPT.length
      );
      expect(MULTI_BYTE_UTF_EIGHT_SCRIPT.length).to.be.gt(0);
    });
  });

  describe("validate writeToBytecode + readFromBytecode write-and-recall", function () {
    it("uploads and recalls a single-byte script", async function () {
      const config = await loadFixture(_beforeEach);
      await validateCreateAndRead(config, "0", config.accounts.deployer);
    });
    it("uploads and recalls an short script < 32 bytes", async function () {
      const config = await loadFixture(_beforeEach);
      await validateCreateAndRead(
        config,
        "console.log(hello world)",
        config.accounts.deployer
      );
    });
    it("uploads and recalls chromie squiggle script", async function () {
      const config = await loadFixture(_beforeEach);
      await validateCreateAndRead(
        config,
        SQUIGGLE_SCRIPT,
        config.accounts.deployer
      );
    });
    it("uploads and recalls different script", async function () {
      const config = await loadFixture(_beforeEach);
      await validateCreateAndRead(
        config,
        SKULPTUUR_SCRIPT_APPROX,
        config.accounts.deployer
      );
    });
    it("uploads and recalls misc. UTF-8 script", async function () {
      const config = await loadFixture(_beforeEach);
      await validateCreateAndRead(
        config,
        MULTI_BYTE_UTF_EIGHT_SCRIPT,
        config.accounts.deployer
      );
    });

    it("readFromBytecode works in normal conditions", async function () {
      const config = await loadFixture(_beforeEach);
      const targetText = "0";
      await validateCreateAndRead(config, targetText, config.accounts.deployer);
      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV2TextCR_DMock
      );
      const text =
        await config.bytecodeV2TextCR_DMock.readTextAtAddress(
          textBytecodeAddress
        );
      expect(text).to.equal(targetText);
    });

    it("readFromBytecode fails to read from invalid address", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.bytecodeV2TextCR_DMock.readTextAtAddress(constants.ZERO_ADDRESS),
        "ContractAsStorage: Read Error"
      );
    });

    it("readFromBytecode is interoperable", async function () {
      const config = await loadFixture(_beforeEach);
      const targetText = "hip hip hippity hop";
      await validateCreateAndRead(config, targetText, config.accounts.deployer);

      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV2TextCR_DMock
      );

      // deploy a second instance of the library mock
      const additionalBytecodeV2TextCR_DMock =
        await deployWithStorageLibraryAndGet(
          config,
          "BytecodeV2TextCR_DMock",
          [] // no deployment args
        );
      const text =
        await additionalBytecodeV2TextCR_DMock.readTextAtAddress(
          textBytecodeAddress
        );
      expect(text).to.equal(targetText);
    });
  });

  describe("validate compressed writeToBytecode + readFromBytecode write-and-recall", function () {
    it("uploads and recalls a single-byte script", async function () {
      const config = await loadFixture(_beforeEach);
      await validateCompressedCreateAndRead(
        config,
        "0",
        config.accounts.deployer
      );
    });
    it("uploads and recalls an short script < 32 bytes", async function () {
      const config = await loadFixture(_beforeEach);
      await validateCompressedCreateAndRead(
        config,
        "console.log(hello world)",
        config.accounts.deployer
      );
    });
    it("uploads and recalls chromie squiggle script", async function () {
      const config = await loadFixture(_beforeEach);
      await validateCompressedCreateAndRead(
        config,
        SQUIGGLE_SCRIPT,
        config.accounts.deployer
      );
    });
    it("uploads and recalls different script", async function () {
      const config = await loadFixture(_beforeEach);
      await validateCompressedCreateAndRead(
        config,
        SKULPTUUR_SCRIPT_APPROX,
        config.accounts.deployer
      );
    });
    it("uploads and recalls misc. UTF-8 script", async function () {
      const config = await loadFixture(_beforeEach);
      await validateCompressedCreateAndRead(
        config,
        MULTI_BYTE_UTF_EIGHT_SCRIPT,
        config.accounts.deployer
      );
    });

    it("readFromBytecode works in normal conditions", async function () {
      const config = await loadFixture(_beforeEach);
      const targetText = "0";
      await validateCompressedCreateAndRead(
        config,
        targetText,
        config.accounts.deployer
      );
      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV2TextCR_DMock
      );
      const text =
        await config.bytecodeV2TextCR_DMock.readTextAtAddress(
          textBytecodeAddress
        );
      expect(text).to.equal(targetText);
    });

    it("readFromBytecode fails to read from invalid address", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.bytecodeV2TextCR_DMock.readTextAtAddress(constants.ZERO_ADDRESS),
        "ContractAsStorage: Read Error"
      );
    });

    it("readFromBytecode is interoperable", async function () {
      const config = await loadFixture(_beforeEach);
      const targetText = "hip hip hippity hop";
      await validateCompressedCreateAndRead(
        config,
        targetText,
        config.accounts.deployer
      );

      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV2TextCR_DMock
      );

      // deploy a second instance of the library mock
      const additionalBytecodeV2TextCR_DMock =
        await deployWithStorageLibraryAndGet(
          config,
          "BytecodeV2TextCR_DMock",
          [] // no deployment args
        );
      const text =
        await additionalBytecodeV2TextCR_DMock.readTextAtAddress(
          textBytecodeAddress
        );
      expect(text).to.equal(targetText);
    });
  });

  describe("validate writeToBytecode behavior at size-limit boundaries", function () {
    // hard-code gas limit because ethers sometimes estimates too high
    const GAS_LIMIT = 30000000;
    it("uploads and recalls 23.95 KB script", async function () {
      const config = await loadFixture(_beforeEach);
      const targetText = CONTRACT_SIZE_LIMIT_SCRIPT;
      const createTextTX = await config.bytecodeV2TextCR_DMock
        .connect(config.accounts.deployer)
        .createText(targetText, { gasLimit: GAS_LIMIT });
      const textSlotId = createTextTX.value.toNumber();
      const text = await config.bytecodeV2TextCR_DMock.readText(textSlotId);
      expect(text).to.equal(targetText);
    });

    // skip on coverage because contract max sizes are ignored
    it("fails to upload 26 KB script [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.bytecodeV2TextCR_DMock
          .connect(config.accounts.deployer)
          .createText(GREATER_THAN_CONTRACT_SIZE_LIMIT_SCRIPT, {
            gasLimit: GAS_LIMIT,
          }),
        "ContractAsStorage: Write Error"
      );
    });
  });

  // @dev skip on coverage due to memory constraints when getting large compressed scripts
  describe("validate compressed writeToBytecode behavior at size-limit boundaries [ @skip-on-coverage ]", function () {
    // hard-code gas limit because ethers sometimes estimates too high
    const GAS_LIMIT = 30000000;
    it("uploads and recalls 2x23.95 KB script", async function () {
      const config = await loadFixture(_beforeEach);
      // exceed contract size limit by doubling large script here, should compress to < 24 kb
      const targetText =
        CONTRACT_SIZE_LIMIT_SCRIPT + CONTRACT_SIZE_LIMIT_SCRIPT;
      const targetTextCompressedBytes =
        await config.bytecodeV2TextCR_DMock.getCompressed(targetText);
      const createTextTX = await config.bytecodeV2TextCR_DMock
        .connect(config.accounts.deployer)
        .createTextCompressed(targetTextCompressedBytes, {
          gasLimit: GAS_LIMIT,
        });
      const textSlotId = createTextTX.value.toNumber();
      const text = await config.bytecodeV2TextCR_DMock.readText(textSlotId);
      expect(text).to.equal(targetText);
    });
  });

  // @dev skip on coverage due to memory constraints when getting large compressed scripts
  describe("measure gas used when getting compressed [ @skip-on-coverage ]", function () {
    it("compresses squiggle script", async function () {
      const config = await loadFixture(_beforeEach);
      const targetText = SQUIGGLE_SCRIPT;
      const getCompressedTX =
        await config.bytecodeV2TextCR_DMock.getCompressedNonView(targetText);
      const receipt = await getCompressedTX.wait();
      console.log("compressed script gas used", receipt.gasUsed.toString());
    });
  });

  // @dev skip on coverage due to memory constraints when getting large compressed scripts
  describe("measure gas used when reading compressed [ @skip-on-coverage ]", function () {
    // hard-code gas limit because ethers sometimes estimates too high
    const GAS_LIMIT = 30000000;
    it("reads 23.95 KB script", async function () {
      const config = await loadFixture(_beforeEach);
      // exceed contract size limit by doubling large script here, should compress to < 24 kb
      const targetText = CONTRACT_SIZE_LIMIT_SCRIPT;
      const targetTextCompressedBytes =
        await config.bytecodeV2TextCR_DMock.getCompressed(targetText);
      const createTextTX = await config.bytecodeV2TextCR_DMock
        .connect(config.accounts.deployer)
        .createTextCompressed(targetTextCompressedBytes, {
          gasLimit: GAS_LIMIT,
        });
      const textSlotId = createTextTX.value.toNumber();
      const readTextTX =
        await config.bytecodeV2TextCR_DMock.readTextNonView(textSlotId);
      const receipt = await readTextTX.wait();
      console.log(
        "compressed script gas used for read",
        receipt.gasUsed.toString()
      );
    });
  });

  describe("measure gas used when reading non-compressed", function () {
    // hard-code gas limit because ethers sometimes estimates too high
    const GAS_LIMIT = 30000000;
    it("reads 23.95 KB script", async function () {
      const config = await loadFixture(_beforeEach);
      // exceed contract size limit by doubling large script here, should compress to < 24 kb
      const targetText = CONTRACT_SIZE_LIMIT_SCRIPT;
      const createTextTX = await config.bytecodeV2TextCR_DMock
        .connect(config.accounts.deployer)
        .createText(targetText, {
          gasLimit: GAS_LIMIT,
        });
      const textSlotId = createTextTX.value.toNumber();
      const readTextTX =
        await config.bytecodeV2TextCR_DMock.readTextNonView(textSlotId);
      const receipt = await readTextTX.wait();
      console.log(
        "non-compressed script gas used for read",
        receipt.gasUsed.toString()
      );
    });
  });

  describe("validate getWriterAddressForBytecode behavior", function () {
    it("author is the mock for valid bytecode contract", async function () {
      const config = await loadFixture(_beforeEach);
      await config.bytecodeV2TextCR_DMock
        .connect(config.accounts.deployer)
        .createText("cute lil test text hehe");
      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV2TextCR_DMock
      );
      const resolvedMockAddress =
        await config.bytecodeV2TextCR_DMock.resolvedAddress;

      // First validate w/ BytecodeV2TextCR_DMock read
      const textAuthorAddress =
        await config.bytecodeV2TextCR_DMock.readAuthorForTextAtAddress(
          textBytecodeAddress
        );
      expect(textAuthorAddress).to.equal(resolvedMockAddress);

      // Then also validate with BytecodeV2LibCallsMock read, reading the same
      // initial creation text
      const textAuthorAddressFromLib =
        await config.bytecodeV2LibCallsMock.getWriterAddressForBytecode(
          textBytecodeAddress
        );
      expect(textAuthorAddressFromLib).to.equal(resolvedMockAddress);
    });

    it("getWriterAddressForBytecode fails to read from invalid address", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.bytecodeV2TextCR_DMock.readAuthorForTextAtAddress(
          constants.ZERO_ADDRESS
        ),
        "ContractAsStorage: Read Error"
      );
    });

    it("getWriterAddressForBytecode is interoperable", async function () {
      const config = await loadFixture(_beforeEach);
      await config.bytecodeV2TextCR_DMock
        .connect(config.accounts.deployer)
        .createText("zip zipppity zoooop zop");
      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV2TextCR_DMock
      );

      // deploy a second instance of the library mock
      const additionalBytecodeV2TextCR_DMock =
        await deployWithStorageLibraryAndGet(
          config,
          "BytecodeV2TextCR_DMock",
          [] // no deployment args
        );
      const textAuthorAddress =
        await additionalBytecodeV2TextCR_DMock.readAuthorForTextAtAddress(
          textBytecodeAddress
        );
      const resolvedMockAddress =
        await config.bytecodeV2TextCR_DMock.resolvedAddress;
      expect(textAuthorAddress).to.equal(resolvedMockAddress);
    });
  });

  describe("validate getIsCompressedForBytecode behavior", function () {
    it("isCompressed is false for uncompressed storage", async function () {
      const config = await loadFixture(_beforeEach);
      await config.bytecodeV2TextCR_DMock
        .connect(config.accounts.deployer)
        .createText("cute lil test text hehe");
      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV2TextCR_DMock
      );
      const resolvedMockAddress =
        await config.bytecodeV2TextCR_DMock.resolvedAddress;

      // First validate w/ BytecodeV2TextCR_DMock read
      const textAuthorAddress =
        await config.bytecodeV2TextCR_DMock.readAuthorForTextAtAddress(
          textBytecodeAddress
        );
      expect(textAuthorAddress).to.equal(resolvedMockAddress);

      // Then also validate with BytecodeV2LibCallsMock read, reading the same
      // initial creation text
      const textIsCompressedFromLib =
        await config.bytecodeV2LibCallsMock.getIsCompressedForBytecode(
          textBytecodeAddress
        );
      expect(textIsCompressedFromLib).to.equal(false);
    });

    it("isCompressed is true for compressed storage", async function () {
      const config = await loadFixture(_beforeEach);
      const compressedTextBytes =
        await config.bytecodeV2TextCR_DMock.getCompressed(
          "cute lil test text hehe"
        );
      await config.bytecodeV2TextCR_DMock
        .connect(config.accounts.deployer)
        .createTextCompressed(compressedTextBytes);
      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV2TextCR_DMock
      );
      const resolvedMockAddress =
        await config.bytecodeV2TextCR_DMock.resolvedAddress;

      // First validate w/ BytecodeV2TextCR_DMock read
      const textAuthorAddress =
        await config.bytecodeV2TextCR_DMock.readAuthorForTextAtAddress(
          textBytecodeAddress
        );
      expect(textAuthorAddress).to.equal(resolvedMockAddress);

      // Then also validate with BytecodeV2LibCallsMock read, reading the same
      // initial creation text
      const textIsCompressedFromLib =
        await config.bytecodeV2LibCallsMock.getIsCompressedForBytecode(
          textBytecodeAddress
        );
      expect(textIsCompressedFromLib).to.equal(true);
    });

    it("getIsCompressedForBytecode returns false for invalid address", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.bytecodeV2TextCR_DMock.readIsCompressedForTextAtAddress(
          constants.ZERO_ADDRESS
        ),
        "ContractAsStorage: Read Error"
      );
    });

    it("getIsCompressedForBytecode is interoperable", async function () {
      const config = await loadFixture(_beforeEach);
      await config.bytecodeV2TextCR_DMock
        .connect(config.accounts.deployer)
        .createText("zip zipppity zoooop zop");
      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV2TextCR_DMock
      );

      // deploy a second instance of the library mock
      const additionalBytecodeV2TextCR_DMock =
        await deployWithStorageLibraryAndGet(
          config,
          "BytecodeV2TextCR_DMock",
          [] // no deployment args
        );
      const textIsCompressed =
        await additionalBytecodeV2TextCR_DMock.readIsCompressedForTextAtAddress(
          textBytecodeAddress
        );

      expect(textIsCompressed).to.equal(false);
    });
  });

  describe("validate delete behavior (no purges)", function () {
    it("writes text, and then deletes it", async function () {
      const config = await loadFixture(_beforeEach);
      const targetText = "silly willy billy dilly dilly";
      await validateCreateAndRead(config, targetText, config.accounts.deployer);

      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV2TextCR_DMock
      );

      const deployedBytecode =
        await ethers.provider.getCode(textBytecodeAddress);
      expect(deployedBytecode).to.not.equal("0x");

      const nextTextSlotId =
        await config.bytecodeV2TextCR_DMock.nextTextSlotId();
      // decrement from `nextTextSlotId` to get last updated slot
      const textSlotId = nextTextSlotId - 1;
      await config.bytecodeV2TextCR_DMock
        .connect(config.accounts.deployer)
        .deleteText(textSlotId);

      const deletedBytecode =
        await ethers.provider.getCode(textBytecodeAddress);
      // no-purge! bytecode is still there
      expect(deletedBytecode).to.equal(deployedBytecode);
    });
  });
});
