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
  BytecodeV1TextCR_DMock,
  BytecodeV1LibCallsMock,
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

interface BytecodeStorageV1TestConfig extends T_Config {
  bytecodeV1TextCR_DMock?: BytecodeV1TextCR_DMock;
  bytecodeV1LibCallsMock?: BytecodeV1LibCallsMock;
}

/**
 * Tests for BytecodeStorageV1 by way of testing the BytecodeV1TextCR_DMock and
 * BytecodeV1LibCallsMock mocks.
 * Note: it is not the intention of these tests to comprehensively test the mocks
 *       themselves, but rather to achieve full test coverage of the underlying
 *       library under test here, BytecodeStorage, and as such not all methods of
 *       the underlying mocks are necessarily tested here.
 */
describe("BytecodeStorageV1 + BytecodeV1TextCR_DMock/BytecodeV1LibCallsMock Library Tests", async function () {
  // Helper that validates a Create and subsequent Read operation, ensuring
  // that bytes-in == bytes-out for a given input string.
  async function validateCreateAndRead(
    config: BytecodeStorageV1TestConfig,
    targetText: string,
    deployer: SignerWithAddress
  ) {
    // First validate w/ BytecodeV1TextCR_DMock read
    const createTextTX = await config.bytecodeV1TextCR_DMock
      .connect(deployer)
      .createText(targetText);
    const textSlotId = createTextTX.value.toNumber();
    const text = await config.bytecodeV1TextCR_DMock.readText(textSlotId);
    expect(text).to.equal(targetText);

    // Then also validate with BytecodeV1LibCallsMock read, reading the same
    // initial creation text
    const textBytecodeAddress =
      await config.bytecodeV1TextCR_DMock.storedTextBytecodeAddresses(
        textSlotId
      );
    const textFromLib =
      await config.bytecodeV1LibCallsMock.readFromBytecode(textBytecodeAddress);
    expect(textFromLib).to.equal(targetText);
  }

  // Helper that retrieves the address of the most recently deployed contract
  // containing bytecode for storage.
  async function getLatestTextDeploymentAddress(
    config: BytecodeStorageV1TestConfig,
    bytecodeV1TextCR_DMock: Contract
  ) {
    const nextTextSlotId = await bytecodeV1TextCR_DMock.nextTextSlotId();
    // decrement from `nextTextSlotId` to get last updated slot
    const textSlotId = nextTextSlotId - 1;
    const textBytecodeAddress =
      await bytecodeV1TextCR_DMock.storedTextBytecodeAddresses(textSlotId);
    return textBytecodeAddress;
  }

  async function _beforeEach() {
    let config: BytecodeStorageV1TestConfig = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);
    // deploy the library mock
    config.bytecodeV1TextCR_DMock = await deployWithStorageLibraryAndGet(
      config,
      "BytecodeV1TextCR_DMock",
      [] // no deployment args
    );
    // note: to ease in testing readabililty, we deploy a new version of the library,
    // but in production we would use the same library if we were using the approach of
    // "CALL instead of DELEGATECALL by way of 'library wrapping'"
    const libraryFactory = await ethers.getContractFactory(
      "BytecodeStorageReader"
    );
    const library = await libraryFactory
      .connect(config.accounts.deployer)
      .deploy(/* no args for library ever */);
    config.bytecodeV1LibCallsMock = await deployAndGet(
      config,
      "BytecodeV1LibCallsMock",
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
        config.bytecodeV1TextCR_DMock
      );
      const text =
        await config.bytecodeV1TextCR_DMock.readTextAtAddress(
          textBytecodeAddress
        );
      expect(text).to.equal(targetText);
    });

    it("readFromBytecode fails to read from invalid address", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.bytecodeV1TextCR_DMock.readTextAtAddress(constants.ZERO_ADDRESS),
        "ContractAsStorage: Read Error"
      );
    });

    it("readFromBytecode is interoperable", async function () {
      const config = await loadFixture(_beforeEach);
      const targetText = "hip hip hippity hop";
      await validateCreateAndRead(config, targetText, config.accounts.deployer);

      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV1TextCR_DMock
      );

      // deploy a second instance of the library mock
      const additionalBytecodeV1TextCR_DMock =
        await deployWithStorageLibraryAndGet(
          config,
          "BytecodeV1TextCR_DMock",
          [] // no deployment args
        );
      const text =
        await additionalBytecodeV1TextCR_DMock.readTextAtAddress(
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
      const createTextTX = await config.bytecodeV1TextCR_DMock
        .connect(config.accounts.deployer)
        .createText(targetText, { gasLimit: GAS_LIMIT });
      const textSlotId = createTextTX.value.toNumber();
      const text = await config.bytecodeV1TextCR_DMock.readText(textSlotId);
      expect(text).to.equal(targetText);
    });

    // skip on coverage because contract max sizes are ignored
    it("fails to upload 26 KB script [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.bytecodeV1TextCR_DMock
          .connect(config.accounts.deployer)
          .createText(GREATER_THAN_CONTRACT_SIZE_LIMIT_SCRIPT, {
            gasLimit: GAS_LIMIT,
          }),
        "ContractAsStorage: Write Error"
      );
    });
  });

  describe("validate getWriterAddressForBytecode behavior", function () {
    it("author is the mock for valid bytecode contract", async function () {
      const config = await loadFixture(_beforeEach);
      await config.bytecodeV1TextCR_DMock
        .connect(config.accounts.deployer)
        .createText("cute lil test text hehe");
      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV1TextCR_DMock
      );
      const resolvedMockAddress =
        await config.bytecodeV1TextCR_DMock.resolvedAddress;

      // First validate w/ BytecodeV1TextCR_DMock read
      const textAuthorAddress =
        await config.bytecodeV1TextCR_DMock.readAuthorForTextAtAddress(
          textBytecodeAddress
        );
      expect(textAuthorAddress).to.equal(resolvedMockAddress);

      // Then also validate with BytecodeV1LibCallsMock read, reading the same
      // initial creation text
      const textAuthorAddressFromLib =
        await config.bytecodeV1LibCallsMock.getWriterAddressForBytecode(
          textBytecodeAddress
        );
      expect(textAuthorAddressFromLib).to.equal(resolvedMockAddress);
    });

    it("getWriterAddressForBytecode fails to read from invalid address", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.bytecodeV1TextCR_DMock.readAuthorForTextAtAddress(
          constants.ZERO_ADDRESS
        ),
        "ContractAsStorage: Read Error"
      );
    });

    it("getWriterAddressForBytecode is interoperable", async function () {
      const config = await loadFixture(_beforeEach);
      await config.bytecodeV1TextCR_DMock
        .connect(config.accounts.deployer)
        .createText("zip zipppity zoooop zop");
      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV1TextCR_DMock
      );

      // deploy a second instance of the library mock
      const additionalBytecodeV1TextCR_DMock =
        await deployWithStorageLibraryAndGet(
          config,
          "BytecodeV1TextCR_DMock",
          [] // no deployment args
        );
      const textAuthorAddress =
        await additionalBytecodeV1TextCR_DMock.readAuthorForTextAtAddress(
          textBytecodeAddress
        );
      const resolvedMockAddress =
        await config.bytecodeV1TextCR_DMock.resolvedAddress;
      expect(textAuthorAddress).to.equal(resolvedMockAddress);
    });
  });

  describe("validate delete behavior (no purges)", function () {
    it("writes text, and then deletes it", async function () {
      const config = await loadFixture(_beforeEach);
      const targetText = "silly willy billy dilly dilly";
      await validateCreateAndRead(config, targetText, config.accounts.deployer);

      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV1TextCR_DMock
      );

      const deployedBytecode =
        await ethers.provider.getCode(textBytecodeAddress);
      expect(deployedBytecode).to.not.equal("0x");

      const nextTextSlotId =
        await config.bytecodeV1TextCR_DMock.nextTextSlotId();
      // decrement from `nextTextSlotId` to get last updated slot
      const textSlotId = nextTextSlotId - 1;
      await config.bytecodeV1TextCR_DMock
        .connect(config.accounts.deployer)
        .deleteText(textSlotId);

      const deletedBytecode =
        await ethers.provider.getCode(textBytecodeAddress);
      // no-purge! bytecode is still there
      expect(deletedBytecode).to.equal(deployedBytecode);
    });
  });
});
