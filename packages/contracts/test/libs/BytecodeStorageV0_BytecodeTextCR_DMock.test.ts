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

import { BytecodeV0TextCR_DMock } from "../../scripts/contracts";

import {
  T_Config,
  getAccounts,
  deployAndGet,
  assignDefaultConstants,
} from "../util/common";

import {
  SQUIGGLE_SCRIPT,
  SKULPTUUR_SCRIPT_APPROX,
  CONTRACT_SIZE_LIMIT_SCRIPT,
  GREATER_THAN_CONTRACT_SIZE_LIMIT_SCRIPT,
  MULTI_BYTE_UTF_EIGHT_SCRIPT,
} from "../util/example-scripts";

interface BytecodeStorageV0TestConfig extends T_Config {
  bytecodeV0TextCR_DMock?: BytecodeV0TextCR_DMock;
}

/**
 * Tests for BytecodeStorageV0 by way of testing the BytecodeV0TextCR_DMock.
 * Note: it is not the intention of these tests to comprehensively test the mock
 *       itself, but rather to achieve full test coverage of the underlying
 *       library under test here, BytecodeStorage.
 */
describe("BytecodeStorageV0 + BytecodeV0TextCR_DMock Library Tests", async function () {
  // Helper that validates a Create and subsequent Read operation, ensuring
  // that bytes-in == bytes-out for a given input string.
  async function validateCreateAndRead(
    config: BytecodeStorageV0TestConfig,
    targetText: string,
    bytecodeV0TextCR_DMock: Contract,
    deployer: SignerWithAddress
  ) {
    const createTextTX = await bytecodeV0TextCR_DMock
      .connect(deployer)
      .createText(targetText);
    const textSlotId = createTextTX.value.toNumber();
    const text = await bytecodeV0TextCR_DMock.readText(textSlotId);
    expect(text).to.equal(targetText);
  }

  // Helper that retrieves the address of the most recently deployed contract
  // containing bytecode for storage.
  async function getLatestTextDeploymentAddress(
    config: BytecodeStorageV0TestConfig,
    bytecodeV0TextCR_DMock: Contract
  ) {
    const nextTextSlotId = await bytecodeV0TextCR_DMock.nextTextSlotId();
    // decrement from `nextTextSlotId` to get last updated slot
    const textSlotId = nextTextSlotId - 1;
    const textBytecodeAddress =
      await bytecodeV0TextCR_DMock.storedTextBytecodeAddresses(textSlotId);
    return textBytecodeAddress;
  }

  async function _beforeEach() {
    let config: BytecodeStorageV0TestConfig = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);
    // deploy the library mock
    config.bytecodeV0TextCR_DMock = await deployAndGet(
      config,
      "BytecodeV0TextCR_DMock",
      [] // no deployment args
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
      await validateCreateAndRead(
        config,
        "0",
        config.bytecodeV0TextCR_DMock,
        config.accounts.deployer
      );
    });
    it("uploads and recalls an short script < 32 bytes", async function () {
      const config = await loadFixture(_beforeEach);
      await validateCreateAndRead(
        config,
        "console.log(hello world)",
        config.bytecodeV0TextCR_DMock,
        config.accounts.deployer
      );
    });
    it("uploads and recalls chromie squiggle script", async function () {
      const config = await loadFixture(_beforeEach);
      await validateCreateAndRead(
        config,
        SQUIGGLE_SCRIPT,
        config.bytecodeV0TextCR_DMock,
        config.accounts.deployer
      );
    });
    it("uploads and recalls different script", async function () {
      const config = await loadFixture(_beforeEach);
      await validateCreateAndRead(
        config,
        SKULPTUUR_SCRIPT_APPROX,
        config.bytecodeV0TextCR_DMock,
        config.accounts.deployer
      );
    });
    it("uploads and recalls misc. UTF-8 script", async function () {
      const config = await loadFixture(_beforeEach);
      await validateCreateAndRead(
        config,
        MULTI_BYTE_UTF_EIGHT_SCRIPT,
        config.bytecodeV0TextCR_DMock,
        config.accounts.deployer
      );
    });

    it("readFromBytecode works in normal conditions", async function () {
      const config = await loadFixture(_beforeEach);
      const targetText = "0";
      await validateCreateAndRead(
        config,
        targetText,
        config.bytecodeV0TextCR_DMock,
        config.accounts.deployer
      );
      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV0TextCR_DMock
      );
      const text =
        await config.bytecodeV0TextCR_DMock.readTextAtAddress(
          textBytecodeAddress
        );
      expect(text).to.equal(targetText);
    });

    it("readFromBytecode fails to read from invalid address", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.bytecodeV0TextCR_DMock.readTextAtAddress(constants.ZERO_ADDRESS),
        "ContractAsStorage: Read Error"
      );
    });

    it("readFromBytecode is interoperable", async function () {
      const config = await loadFixture(_beforeEach);
      const targetText = "hip hip hippity hop";
      await validateCreateAndRead(
        config,
        targetText,
        config.bytecodeV0TextCR_DMock,
        config.accounts.deployer
      );

      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV0TextCR_DMock
      );

      // deploy a second instance of the library mock
      const additionalBytecodeV0TextCR_DMock = await deployAndGet(
        config,
        "BytecodeV0TextCR_DMock",
        [] // no deployment args
      );
      const text =
        await additionalBytecodeV0TextCR_DMock.readTextAtAddress(
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
      const createTextTX = await config.bytecodeV0TextCR_DMock
        .connect(config.accounts.deployer)
        .createText(targetText, { gasLimit: GAS_LIMIT });
      const textSlotId = createTextTX.value.toNumber();
      const text = await config.bytecodeV0TextCR_DMock.readText(textSlotId);
      expect(text).to.equal(targetText);
    });

    // skip on coverage because contract max sizes are ignored
    it("fails to upload 26 KB script [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.bytecodeV0TextCR_DMock
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
      await config.bytecodeV0TextCR_DMock
        .connect(config.accounts.deployer)
        .createText("cute lil test text hehe");
      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV0TextCR_DMock
      );
      const textAuthorAddress =
        await config.bytecodeV0TextCR_DMock.readAuthorForTextAtAddress(
          textBytecodeAddress
        );
      const resolvedMockAddress =
        await config.bytecodeV0TextCR_DMock.resolvedAddress;
      expect(textAuthorAddress).to.equal(resolvedMockAddress);
    });

    it("getWriterAddressForBytecode fails to read from invalid address", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.bytecodeV0TextCR_DMock.readAuthorForTextAtAddress(
          constants.ZERO_ADDRESS
        ),
        "ContractAsStorage: Read Error"
      );
    });

    it("getWriterAddressForBytecode is interoperable", async function () {
      const config = await loadFixture(_beforeEach);
      await config.bytecodeV0TextCR_DMock
        .connect(config.accounts.deployer)
        .createText("zip zipppity zoooop zop");
      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV0TextCR_DMock
      );

      // deploy a second instance of the library mock
      const additionalBytecodeV0TextCR_DMock = await deployAndGet(
        config,
        "BytecodeV0TextCR_DMock",
        [] // no deployment args
      );
      const textAuthorAddress =
        await additionalBytecodeV0TextCR_DMock.readAuthorForTextAtAddress(
          textBytecodeAddress
        );
      const resolvedMockAddress =
        await config.bytecodeV0TextCR_DMock.resolvedAddress;
      expect(textAuthorAddress).to.equal(resolvedMockAddress);
    });
  });

  describe("validate purgeBytecode behavior", function () {
    it("writes text, and then purges it", async function () {
      const config = await loadFixture(_beforeEach);
      const targetText = "silly willy billy dilly dilly";
      await validateCreateAndRead(
        config,
        targetText,
        config.bytecodeV0TextCR_DMock,
        config.accounts.deployer
      );

      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV0TextCR_DMock
      );

      const deployedBytecode =
        await ethers.provider.getCode(textBytecodeAddress);
      expect(deployedBytecode).to.not.equal("0x");

      const nextTextSlotId =
        await config.bytecodeV0TextCR_DMock.nextTextSlotId();
      // decrement from `nextTextSlotId` to get last updated slot
      const textSlotId = nextTextSlotId - 1;
      await config.bytecodeV0TextCR_DMock
        .connect(config.accounts.deployer)
        .deleteText(textSlotId);

      const removedBytecode =
        await ethers.provider.getCode(textBytecodeAddress);
      expect(removedBytecode).to.equal("0x");
    });

    it("SELFDESTRUCT via direct call data possible with 0xFF", async function () {
      const config = await loadFixture(_beforeEach);
      const targetText = "silly willy billy dilly dilly";
      await validateCreateAndRead(
        config,
        targetText,
        config.bytecodeV0TextCR_DMock,
        config.accounts.deployer
      );

      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV0TextCR_DMock
      );

      const deployedBytecode =
        await ethers.provider.getCode(textBytecodeAddress);
      expect(deployedBytecode).to.not.equal("0x");

      await config.bytecodeV0TextCR_DMock
        .connect(config.accounts.deployer)
        .callWithNonsenseData(textBytecodeAddress, "0xFF");

      const removedBytecode =
        await ethers.provider.getCode(textBytecodeAddress);
      expect(removedBytecode).to.equal("0x");
    });

    it("SELFDESTRUCT is NOT possible via call-data prodding", async function () {
      const config = await loadFixture(_beforeEach);
      const targetText = "silly willy billy dilly dilly";
      await validateCreateAndRead(
        config,
        targetText,
        config.bytecodeV0TextCR_DMock,
        config.accounts.deployer
      );

      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV0TextCR_DMock
      );

      const deployedBytecode =
        await ethers.provider.getCode(textBytecodeAddress);
      expect(deployedBytecode).to.not.equal("0x");

      // Non-writer addresses should **not** be able to purge bytecode storage.
      await expectRevert.unspecified(
        config.accounts.deployer.call({
          to: textBytecodeAddress,
        })
      );
      // And config is still the case when correct `0xFF` bytes are sent along.
      await expectRevert.unspecified(
        config.accounts.deployer.call({
          to: textBytecodeAddress,
          data: "0xFF",
        })
      );
      // The following prodding attempts will not revert in a way caught by
      // hardhat, as the INVALID call is wrapped by the silent failures in
      // `callWithNonsenseData` and `callWithoutData`.
      await config.bytecodeV0TextCR_DMock
        .connect(config.accounts.deployer)
        .callWithNonsenseData(textBytecodeAddress, "0xFFFF");
      await config.bytecodeV0TextCR_DMock
        .connect(config.accounts.deployer)
        .callWithNonsenseData(textBytecodeAddress, "0x00FF");
      await config.bytecodeV0TextCR_DMock
        .connect(config.accounts.deployer)
        .callWithNonsenseData(textBytecodeAddress, "0xFE");
      await config.bytecodeV0TextCR_DMock
        .connect(config.accounts.deployer)
        .callWithNonsenseData(textBytecodeAddress, "0x00");
      await config.bytecodeV0TextCR_DMock
        .connect(config.accounts.deployer)
        .callWithoutData(textBytecodeAddress);

      // Deployed bytes are unchanged.
      const notRemovedBytecode =
        await ethers.provider.getCode(textBytecodeAddress);
      expect(notRemovedBytecode).to.equal(deployedBytecode);
      expect(notRemovedBytecode).to.not.equal("0x");
    });

    it("purgeBytecode is *not* interoperable", async function () {
      const config = await loadFixture(_beforeEach);
      await config.bytecodeV0TextCR_DMock
        .connect(config.accounts.deployer)
        .createText("beeeep boop bop bop bop beeeep bop");
      const textBytecodeAddress = getLatestTextDeploymentAddress(
        config,
        config.bytecodeV0TextCR_DMock
      );

      const deployedBytecode =
        await ethers.provider.getCode(textBytecodeAddress);
      expect(deployedBytecode).to.not.equal("0x");

      // deploy a second instance of the library mock
      const additionalBytecodeV0TextCR_DMock = await deployAndGet(
        config,
        "BytecodeV0TextCR_DMock",
        [] // no deployment args
      );

      await expectRevert(
        additionalBytecodeV0TextCR_DMock
          .connect(config.accounts.deployer)
          .deleteTextAtAddress(textBytecodeAddress),
        "ContractAsStorage: Delete Error"
      );

      // Deployed bytes are unchanged.
      const notRemovedBytecode =
        await ethers.provider.getCode(textBytecodeAddress);
      expect(notRemovedBytecode).to.equal(deployedBytecode);
      expect(notRemovedBytecode).to.not.equal("0x");
    });
  });
});
