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

import { getAccounts, deployAndGet } from "../util/common";
import {
  SQUIGGLE_SCRIPT,
  SKULPTUUR_SCRIPT_APPROX,
  CONTRACT_SIZE_LIMIT_SCRIPT,
  GREATER_THAN_CONTRACT_SIZE_LIMIT_SCRIPT,
  MULTI_BYTE_UTF_EIGHT_SCRIPT,
} from "../util/example-scripts";

/**
 * Tests for BytecodeStorage by way of testing the BytecodeTextCR_DMock.
 * Note: it is not the intention of these tests to comprehensively test the mock
 *       itself, but rather to achieve full test coverage of the underlying
 *       library under test here, BytecodeStorage.
 */
describe("BytecodeStorage + BytecodeTextCR_DMock Library Tests", async function () {
  // Helper that validates a Create and subsequent Read operation, ensuring
  // that bytes-in == bytes-out for a given input string.
  async function validateCreateAndRead(
    targetText: string,
    bytecodeTextCR_DMock: Contract,
    deployer: SignerWithAddress
  ) {
    const createTextTX = await bytecodeTextCR_DMock
      .connect(deployer)
      .createText(targetText);
    const textSlotId = createTextTX.value.toNumber();
    const text = await bytecodeTextCR_DMock.readText(textSlotId);
    expect(text).to.equal(targetText);
  }

  // Helper that retrieves the address of the most recently deployed contract
  // containing bytecode for storage.
  async function getLatestTextDeploymentAddress(
    bytecodeTextCR_DMock: Contract
  ) {
    const nextTextSlotId = await bytecodeTextCR_DMock.nextTextSlotId();
    // decrement from `nextTextSlotId` to get last updated slot
    const textSlotId = nextTextSlotId - 1;
    const textBytecodeAddress =
      await bytecodeTextCR_DMock.storedTextBytecodeAddresses(textSlotId);
    return textBytecodeAddress;
  }

  beforeEach(async function () {
    // load standard accounts and constants
    this.accounts = await getAccounts();
    // deploy the library mock
    this.bytecodeTextCR_DMock = await deployAndGet.call(
      this,
      "BytecodeTextCR_DMock",
      [] // no deployment args
    );
  });

  describe("imported scripts are non-empty", function () {
    it("ensure diffs are captured if project scripts are deleted", async function () {
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
      await validateCreateAndRead(
        "0",
        this.bytecodeTextCR_DMock,
        this.accounts.deployer
      );
    });
    it("uploads and recalls an short script < 32 bytes", async function () {
      await validateCreateAndRead(
        "console.log(hello world)",
        this.bytecodeTextCR_DMock,
        this.accounts.deployer
      );
    });
    it("uploads and recalls chromie squiggle script", async function () {
      await validateCreateAndRead(
        SQUIGGLE_SCRIPT,
        this.bytecodeTextCR_DMock,
        this.accounts.deployer
      );
    });
    it("uploads and recalls different script", async function () {
      await validateCreateAndRead(
        SKULPTUUR_SCRIPT_APPROX,
        this.bytecodeTextCR_DMock,
        this.accounts.deployer
      );
    });
    it("uploads and recalls misc. UTF-8 script", async function () {
      await validateCreateAndRead(
        MULTI_BYTE_UTF_EIGHT_SCRIPT,
        this.bytecodeTextCR_DMock,
        this.accounts.deployer
      );
    });

    it("readFromBytecode works in normal conditions", async function () {
      const targetText = "0";
      await validateCreateAndRead(
        targetText,
        this.bytecodeTextCR_DMock,
        this.accounts.deployer
      );
      const textBytecodeAddress = getLatestTextDeploymentAddress(
        this.bytecodeTextCR_DMock
      );
      const text = await this.bytecodeTextCR_DMock.readTextAtAddress(
        textBytecodeAddress
      );
      expect(text).to.equal(targetText);
    });

    it("readFromBytecode fails to read from invalid address", async function () {
      await expectRevert(
        this.bytecodeTextCR_DMock.readTextAtAddress(constants.ZERO_ADDRESS),
        "ContractAsStorage: Read Error"
      );
    });
  });

  describe("validate writeToBytecode behavior at size-limit boundaries", function () {
    // hard-code gas limit because ethers sometimes estimates too high
    const GAS_LIMIT = 30000000;
    it("uploads and recalls 23.95 KB script", async function () {
      const targetText = CONTRACT_SIZE_LIMIT_SCRIPT;
      const createTextTX = await this.bytecodeTextCR_DMock
        .connect(this.accounts.deployer)
        .createText(targetText, { gasLimit: GAS_LIMIT });
      const textSlotId = createTextTX.value.toNumber();
      const text = await this.bytecodeTextCR_DMock.readText(textSlotId);
      expect(text).to.equal(targetText);
    });

    it("fails to upload 26 KB script", async function () {
      await expectRevert(
        this.bytecodeTextCR_DMock
          .connect(this.accounts.deployer)
          .createText(GREATER_THAN_CONTRACT_SIZE_LIMIT_SCRIPT, {
            gasLimit: GAS_LIMIT,
          }),
        "ContractAsStorage: Write Error"
      );
    });
  });

  describe("validate getWriterAddressForBytecode behavior", function () {
    it("author is the mock for valid bytecode contract", async function () {
      const createTextTX = await this.bytecodeTextCR_DMock
        .connect(this.accounts.deployer)
        .createText("cute lil test text hehe");
      const textBytecodeAddress = getLatestTextDeploymentAddress(
        this.bytecodeTextCR_DMock
      );
      const textAuthorAddress =
        await this.bytecodeTextCR_DMock.readAuthorForTextAtAddress(
          textBytecodeAddress
        );
      const resolvedMockAddress = await this.bytecodeTextCR_DMock
        .resolvedAddress;
      expect(textAuthorAddress).to.equal(resolvedMockAddress);
    });

    it("getWriterAddressForBytecode fails to read from invalid address", async function () {
      await expectRevert(
        this.bytecodeTextCR_DMock.readAuthorForTextAtAddress(
          constants.ZERO_ADDRESS
        ),
        "ContractAsStorage: Read Error"
      );
    });
  });

  describe("validate purgeBytecode behavior", function () {
    it("creates text, and then deletes it", async function () {
      const targetText = "silly willy billy dilly dilly";
      await validateCreateAndRead(
        targetText,
        this.bytecodeTextCR_DMock,
        this.accounts.deployer
      );

      const textBytecodeAddress = getLatestTextDeploymentAddress(
        this.bytecodeTextCR_DMock
      );

      const deployedBytecode = await ethers.provider.getCode(
        textBytecodeAddress
      );
      expect(deployedBytecode).to.not.equal("0x");

      const nextTextSlotId = await this.bytecodeTextCR_DMock.nextTextSlotId();
      // decrement from `nextTextSlotId` to get last updated slot
      const textSlotId = nextTextSlotId - 1;
      await this.bytecodeTextCR_DMock
        .connect(this.accounts.deployer)
        .deleteText(textSlotId);

      const removedBytecode = await ethers.provider.getCode(
        textBytecodeAddress
      );
      expect(removedBytecode).to.equal("0x");
    });
  });

  describe("perform SELFDESTRUCT prodding via callWithNonsenseData", function () {
    it("purging via direct call data possible with 0xFF", async function () {
      const targetText = "silly willy billy dilly dilly";
      await validateCreateAndRead(
        targetText,
        this.bytecodeTextCR_DMock,
        this.accounts.deployer
      );

      const textBytecodeAddress = getLatestTextDeploymentAddress(
        this.bytecodeTextCR_DMock
      );

      const deployedBytecode = await ethers.provider.getCode(
        textBytecodeAddress
      );
      expect(deployedBytecode).to.not.equal("0x");

      await this.bytecodeTextCR_DMock
        .connect(this.accounts.deployer)
        .callWithNonsenseData(textBytecodeAddress, "0xFF");

      const removedBytecode = await ethers.provider.getCode(
        textBytecodeAddress
      );
      expect(removedBytecode).to.equal("0x");
    });

    it("purging is not possible via misc. prodding", async function () {
      const targetText = "silly willy billy dilly dilly";
      await validateCreateAndRead(
        targetText,
        this.bytecodeTextCR_DMock,
        this.accounts.deployer
      );

      const textBytecodeAddress = getLatestTextDeploymentAddress(
        this.bytecodeTextCR_DMock
      );

      const deployedBytecode = await ethers.provider.getCode(
        textBytecodeAddress
      );
      expect(deployedBytecode).to.not.equal("0x");

      expectRevert.unspecified(
        this.bytecodeTextCR_DMock
          .connect(this.accounts.deployer)
          .callWithoutData(textBytecodeAddress)
      );
      expectRevert.unspecified(
        this.bytecodeTextCR_DMock
          .connect(this.accounts.deployer)
          .callWithNonsenseData(textBytecodeAddress, "0xFFFF")
      );
      expectRevert.unspecified(
        this.bytecodeTextCR_DMock
          .connect(this.accounts.deployer)
          .callWithNonsenseData(textBytecodeAddress, "0x00FF")
      );
      expectRevert.unspecified(
        this.bytecodeTextCR_DMock
          .connect(this.accounts.deployer)
          .callWithNonsenseData(textBytecodeAddress, "0xFE")
      );
      expectRevert.unspecified(
        this.bytecodeTextCR_DMock
          .connect(this.accounts.deployer)
          .callWithNonsenseData(textBytecodeAddress, "0x00")
      );

      const deployedBytecodePt2 = await ethers.provider.getCode(
        textBytecodeAddress
      );
      expect(deployedBytecodePt2).to.not.equal("0x");
    });
  });

  describe("validate interoperability of multiple library instances", function () {
    // TODO: Add coverage!
  });
});
