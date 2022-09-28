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

    it("readFromBytecode is interoperable", async function () {
      const targetText = "hip hip hippity hop";
      await validateCreateAndRead(
        targetText,
        this.bytecodeTextCR_DMock,
        this.accounts.deployer
      );

      const textBytecodeAddress = getLatestTextDeploymentAddress(
        this.bytecodeTextCR_DMock
      );

      // deploy a second instance of the library mock
      const additionalBytecodeTextCR_DMock = await deployAndGet.call(
        this,
        "BytecodeTextCR_DMock",
        [] // no deployment args
      );
      const text = await additionalBytecodeTextCR_DMock.readTextAtAddress(
        textBytecodeAddress
      );
      expect(text).to.equal(targetText);
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
      await this.bytecodeTextCR_DMock
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

    it("getWriterAddressForBytecode is interoperable", async function () {
      await this.bytecodeTextCR_DMock
        .connect(this.accounts.deployer)
        .createText("zip zipppity zoooop zop");
      const textBytecodeAddress = getLatestTextDeploymentAddress(
        this.bytecodeTextCR_DMock
      );

      // deploy a second instance of the library mock
      const additionalBytecodeTextCR_DMock = await deployAndGet.call(
        this,
        "BytecodeTextCR_DMock",
        [] // no deployment args
      );
      const textAuthorAddress =
        await additionalBytecodeTextCR_DMock.readAuthorForTextAtAddress(
          textBytecodeAddress
        );
      const resolvedMockAddress = await this.bytecodeTextCR_DMock
        .resolvedAddress;
      expect(textAuthorAddress).to.equal(resolvedMockAddress);
    });
  });

  describe("validate purgeBytecode behavior", function () {
    it("writes text, and then purges it", async function () {
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

    it("SELFDESTRUCT via direct call data possible with 0xFF", async function () {
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

    it("SELFDESTRUCT is NOT possible via call-data prodding", async function () {
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

      // Non-writer addresses should **not** be able to purge bytecode storage.
      await expectRevert.unspecified(
        this.accounts.deployer.call({
          to: textBytecodeAddress,
        })
      );
      // And this is still the case when correct `0xFF` bytes are sent along.
      await expectRevert.unspecified(
        this.accounts.deployer.call({
          to: textBytecodeAddress,
          data: "0xFF",
        })
      );
      // The following prodding attempts will not revert in a way caught by
      // hardhat, as the INVALID call is wrapped by the silent failures in
      // `callWithNonsenseData` and `callWithoutData`.
      await this.bytecodeTextCR_DMock
        .connect(this.accounts.deployer)
        .callWithNonsenseData(textBytecodeAddress, "0xFFFF");
      await this.bytecodeTextCR_DMock
        .connect(this.accounts.deployer)
        .callWithNonsenseData(textBytecodeAddress, "0x00FF");
      await this.bytecodeTextCR_DMock
        .connect(this.accounts.deployer)
        .callWithNonsenseData(textBytecodeAddress, "0xFE");
      await this.bytecodeTextCR_DMock
        .connect(this.accounts.deployer)
        .callWithNonsenseData(textBytecodeAddress, "0x00");
      await this.bytecodeTextCR_DMock
        .connect(this.accounts.deployer)
        .callWithoutData(textBytecodeAddress);

      // Deployed bytes are unchanged.
      const notRemovedBytecode = await ethers.provider.getCode(
        textBytecodeAddress
      );
      expect(notRemovedBytecode).to.equal(deployedBytecode);
      expect(notRemovedBytecode).to.not.equal("0x");
    });

    it("purgeBytecode is *not* interoperable", async function () {
      await this.bytecodeTextCR_DMock
        .connect(this.accounts.deployer)
        .createText("beeeep boop bop bop bop beeeep bop");
      const textBytecodeAddress = getLatestTextDeploymentAddress(
        this.bytecodeTextCR_DMock
      );

      const deployedBytecode = await ethers.provider.getCode(
        textBytecodeAddress
      );
      expect(deployedBytecode).to.not.equal("0x");

      // deploy a second instance of the library mock
      const additionalBytecodeTextCR_DMock = await deployAndGet.call(
        this,
        "BytecodeTextCR_DMock",
        [] // no deployment args
      );

      await expectRevert(
        additionalBytecodeTextCR_DMock
          .connect(this.accounts.deployer)
          .deleteTextAtAddress(textBytecodeAddress),
        "ContractAsStorage: Delete Error"
      );

      // Deployed bytes are unchanged.
      const notRemovedBytecode = await ethers.provider.getCode(
        textBytecodeAddress
      );
      expect(notRemovedBytecode).to.equal(deployedBytecode);
      expect(notRemovedBytecode).to.not.equal("0x");
    });
  });
});
