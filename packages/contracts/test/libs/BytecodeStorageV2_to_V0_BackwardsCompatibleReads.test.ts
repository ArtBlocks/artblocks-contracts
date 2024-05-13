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
  BytecodeV0TextCR_DMock,
  SSTORE2Mock,
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
  MULTI_BYTE_UTF_EIGHT_SCRIPT,
} from "../util/example-scripts";

interface BytecodeStorageBackwardsCompatibleTestConfig extends T_Config {
  bytecodeV2TextCR_DMock?: BytecodeV2TextCR_DMock;
  bytecodeV0TextCR_DMock?: BytecodeV0TextCR_DMock;
  sstore2Mock?: SSTORE2Mock;
}

/**
 * Tests for BytecodeStorageV2 by way of testing the BytecodeV2TextCR_DMock.
 * Note: it is not the intention of these tests to comprehensively test the mock
 *       itself, but rather to achieve full test coverage of the underlying
 *       library under test here, BytecodeStorage.
 */
describe("BytecodeStorageV2 Backwards Compatible Reads Tests", async function () {
  // Helper that validates a write from the SSTORE2 library is readable
  // from the V2 library, for a given string.
  async function validateReadInterop_SSTORE2_V2(
    config: BytecodeStorageBackwardsCompatibleTestConfig,
    targetText: string,
    sstore2Mock: Contract,
    bytecodeV2TextCR_DMock: Contract,
    deployer: SignerWithAddress
  ) {
    // Upload the target text via the SSTORE2 library.
    const createTextTX = await sstore2Mock
      .connect(deployer)
      .createText(targetText);

    // Retrieve the address of the written target text from the SSTORE2 library.
    const textBytecodeAddress = getLatestTextDeploymentAddressSSTORE2(
      config.sstore2Mock
    );

    // Validate that V2 read of SSTORE2 written text is same as original text.
    const text =
      await bytecodeV2TextCR_DMock.readSSTORE2TextAtAddress(
        textBytecodeAddress
      );
    expect(text).to.equal(targetText);
    // Validate that read is the same when using manually provided read-offsets.
    const textManualOffset =
      await bytecodeV2TextCR_DMock.forceReadTextAtAddress(
        textBytecodeAddress,
        1 // for SSTORE2, expected data offset is `1`
      );
    expect(textManualOffset).to.equal(targetText);
  }

  // Helper that validates a write from the V0 library is readable
  // from the V2 library, for a given string.
  async function validateReadInterop_V0_V2(
    config: BytecodeStorageBackwardsCompatibleTestConfig,
    targetText: string,
    bytecodeV0TextCR_DMock: Contract,
    bytecodeV2TextCR_DMock: Contract,
    deployer: SignerWithAddress
  ) {
    // Upload the target text via the V0 library.
    const createTextTX = await bytecodeV0TextCR_DMock
      .connect(deployer)
      .createText(targetText);

    // Retrieve the address of the written target text from the V0 library.
    const textBytecodeAddress = getLatestTextDeploymentAddressV0(
      config.bytecodeV0TextCR_DMock
    );

    // Validate that V2 read of V0 written text is same as original text.
    const text =
      await bytecodeV2TextCR_DMock.readTextAtAddress(textBytecodeAddress);
    expect(text).to.equal(targetText);
    // Validate that read is the same when using manually provided read-offsets.
    const textManualOffset =
      await bytecodeV2TextCR_DMock.forceReadTextAtAddress(
        textBytecodeAddress,
        104 // for V0, expected data offset is `104`
      );
    expect(textManualOffset).to.equal(targetText);
  }

  // Helper that retrieves the address of the most recently deployed contract
  // containing bytecode for storage, from the SSTORE2 library.
  async function getLatestTextDeploymentAddressSSTORE2(sstore2Mock: Contract) {
    const nextTextSlotId = await sstore2Mock.nextTextSlotId();
    // decrement from `nextTextSlotId` to get last updated slot
    const textSlotId = nextTextSlotId - 1;
    const textBytecodeAddress =
      await sstore2Mock.storedTextBytecodeAddresses(textSlotId);
    return textBytecodeAddress;
  }

  // Helper that retrieves the address of the most recently deployed contract
  // containing bytecode for storage, from the V0 ByteCode storage library.
  async function getLatestTextDeploymentAddressV0(
    bytecodeV0TextCR_DMock: Contract
  ) {
    const nextTextSlotId = await bytecodeV0TextCR_DMock.nextTextSlotId();
    // decrement from `nextTextSlotId` to get last updated slot
    const textSlotId = nextTextSlotId - 1;
    const textBytecodeAddress =
      await bytecodeV0TextCR_DMock.storedTextBytecodeAddresses(textSlotId);
    return textBytecodeAddress;
  }

  // Helper that retrieves the address of the most recently deployed contract
  // containing bytecode for storage, from the V0 ByteCode storage library.
  async function getLatestTextDeploymentAddressV2(
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
    let config: BytecodeStorageBackwardsCompatibleTestConfig = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);
    // deploy the V2 library mock
    config.bytecodeV2TextCR_DMock = await deployWithStorageLibraryAndGet(
      config,
      "BytecodeV2TextCR_DMock",
      [] // no deployment args
    );
    // deploy the V0 library mock
    config.bytecodeV0TextCR_DMock = await deployAndGet(
      config,
      "BytecodeV0TextCR_DMock",
      [] // no deployment args
    );
    // deploy the SSTORE2 library mock
    config.sstore2Mock = await deployAndGet(
      config,
      "SSTORE2Mock",
      [] // no deployment args
    );
    return config;
  }

  describe("validate readFromBytecode backwards-compatible interoperability", function () {
    it("validates interop for a single-byte script", async function () {
      const config = await loadFixture(_beforeEach);
      let testString = "0";
      await validateReadInterop_V0_V2(
        config,
        testString,
        config.bytecodeV0TextCR_DMock,
        config.bytecodeV2TextCR_DMock,
        config.accounts.deployer
      );
      await validateReadInterop_SSTORE2_V2(
        config,
        testString,
        config.sstore2Mock,
        config.bytecodeV2TextCR_DMock,
        config.accounts.deployer
      );
    });
    it("validates interop for an short script < 32 bytes", async function () {
      const config = await loadFixture(_beforeEach);
      let testString = "console.log(hello world)";
      await validateReadInterop_V0_V2(
        config,
        testString,
        config.bytecodeV0TextCR_DMock,
        config.bytecodeV2TextCR_DMock,
        config.accounts.deployer
      );
      await validateReadInterop_SSTORE2_V2(
        config,
        testString,
        config.sstore2Mock,
        config.bytecodeV2TextCR_DMock,
        config.accounts.deployer
      );
    });
    it("validates interop for chromie squiggle script", async function () {
      const config = await loadFixture(_beforeEach);
      await validateReadInterop_V0_V2(
        config,
        SQUIGGLE_SCRIPT,
        config.bytecodeV0TextCR_DMock,
        config.bytecodeV2TextCR_DMock,
        config.accounts.deployer
      );
      await validateReadInterop_SSTORE2_V2(
        config,
        SQUIGGLE_SCRIPT,
        config.sstore2Mock,
        config.bytecodeV2TextCR_DMock,
        config.accounts.deployer
      );
    });
    it("validates interop for different script", async function () {
      const config = await loadFixture(_beforeEach);
      await validateReadInterop_V0_V2(
        config,
        SKULPTUUR_SCRIPT_APPROX,
        config.bytecodeV0TextCR_DMock,
        config.bytecodeV2TextCR_DMock,
        config.accounts.deployer
      );
      await validateReadInterop_SSTORE2_V2(
        config,
        SKULPTUUR_SCRIPT_APPROX,
        config.sstore2Mock,
        config.bytecodeV2TextCR_DMock,
        config.accounts.deployer
      );
    });
    it("validates interop for misc. UTF-8 script", async function () {
      const config = await loadFixture(_beforeEach);
      await validateReadInterop_V0_V2(
        config,
        MULTI_BYTE_UTF_EIGHT_SCRIPT,
        config.bytecodeV0TextCR_DMock,
        config.bytecodeV2TextCR_DMock,
        config.accounts.deployer
      );
      await validateReadInterop_SSTORE2_V2(
        config,
        MULTI_BYTE_UTF_EIGHT_SCRIPT,
        config.sstore2Mock,
        config.bytecodeV2TextCR_DMock,
        config.accounts.deployer
      );
    });
  });

  describe("validate getWriterAddressForBytecode backwards-compatible interoperability", function () {
    it("getWriterAddressForBytecode is interoperable", async function () {
      const config = await loadFixture(_beforeEach);
      await config.bytecodeV0TextCR_DMock
        .connect(config.accounts.deployer)
        .createText("zip zipppity zoooop zop");
      const textBytecodeAddress = getLatestTextDeploymentAddressV0(
        config.bytecodeV0TextCR_DMock
      );

      // validate read with V2 library
      const textAuthorAddressV2 =
        await config.bytecodeV2TextCR_DMock.readAuthorForTextAtAddress(
          textBytecodeAddress
        );
      const textAuthorAddressV0 =
        await config.bytecodeV0TextCR_DMock.readAuthorForTextAtAddress(
          textBytecodeAddress
        );
      const resolvedMockAddress =
        await config.bytecodeV0TextCR_DMock.resolvedAddress;
      expect(textAuthorAddressV2).to.equal(resolvedMockAddress);
      expect(textAuthorAddressV2).to.equal(textAuthorAddressV0);
    });

    it("getWriterAddressForBytecode is not supported for SSTORE2", async function () {
      const config = await loadFixture(_beforeEach);
      await config.sstore2Mock
        .connect(config.accounts.deployer)
        .createText("zip zipppity zoooop zop");
      const textBytecodeAddress = getLatestTextDeploymentAddressSSTORE2(
        config.sstore2Mock
      );

      // validate read with V2 library
      await expectRevert(
        config.bytecodeV2TextCR_DMock.readAuthorForTextAtAddress(
          textBytecodeAddress
        ),
        "ContractAsStorage: Unsupported Version"
      );
    });
  });

  describe("validate getLibraryVersionForBytecode works across versions", function () {
    it("read unknown contract from V2 library", async function () {
      const config = await loadFixture(_beforeEach);
      await config.sstore2Mock
        .connect(config.accounts.deployer)
        .createText("zip zipppity zoooop zop");
      const textBytecodeAddress = getLatestTextDeploymentAddressSSTORE2(
        config.sstore2Mock
      );

      // read SSTORE2 version from V2 library
      const textLibraryVersionV2 =
        await config.bytecodeV2TextCR_DMock.readLibraryVersionForTextAtAddress(
          textBytecodeAddress
        );

      // hard-coded expected value
      let textLibraryVersionV2UTF8 =
        ethers.utils.toUtf8String(textLibraryVersionV2);
      expect(textLibraryVersionV2UTF8).to.equal(
        "UNKNOWN_VERSION_STRING_________ "
      );
    });

    it("read V0 version from V2 library", async function () {
      const config = await loadFixture(_beforeEach);
      await config.bytecodeV0TextCR_DMock
        .connect(config.accounts.deployer)
        .createText("zip zipppity zoooop zop");
      const textBytecodeAddress = getLatestTextDeploymentAddressV0(
        config.bytecodeV0TextCR_DMock
      );

      // read V0 version from V2 library
      const textLibraryVersionV2 =
        await config.bytecodeV2TextCR_DMock.readLibraryVersionForTextAtAddress(
          textBytecodeAddress
        );
      // hard-coded expected value
      let textLibraryVersionV2UTF8 =
        ethers.utils.toUtf8String(textLibraryVersionV2);
      expect(textLibraryVersionV2UTF8).to.equal(
        "BytecodeStorage_V0.0.0_________ "
      );
    });

    it("read V2 version from V2 library", async function () {
      const config = await loadFixture(_beforeEach);
      await config.bytecodeV2TextCR_DMock
        .connect(config.accounts.deployer)
        .createText("zip zipppity zoooop zop");
      const textBytecodeAddress = getLatestTextDeploymentAddressV2(
        config.bytecodeV2TextCR_DMock
      );

      // read V2 version from V2 library
      const textLibraryVersionV2 =
        await config.bytecodeV2TextCR_DMock.readLibraryVersionForTextAtAddress(
          textBytecodeAddress
        );
      // hard-coded expected value
      let textLibraryVersionV2UTF8 =
        ethers.utils.toUtf8String(textLibraryVersionV2);
      expect(textLibraryVersionV2UTF8).to.equal(
        "BytecodeStorage_V2.0.0_________ "
      );
    });
  });

  describe("validate getIsCompressedForBytecode works across versions", function () {
    it("reverts on read of unknown contract from V2 library", async function () {
      const config = await loadFixture(_beforeEach);
      await config.sstore2Mock
        .connect(config.accounts.deployer)
        .createText("zip zipppity zoooop zop");
      const textBytecodeAddress = getLatestTextDeploymentAddressSSTORE2(
        config.sstore2Mock
      );

      // reverts on read SSTORE2 isCompressed from V2 library, as it is not supported
      await expectRevert(
        config.bytecodeV2TextCR_DMock?.readIsCompressedForTextAtAddress(
          textBytecodeAddress
        ),
        "ContractAsStorage: Unsupported Version"
      );
    });

    it("read V0 as not compressed from V2 library", async function () {
      const config = await loadFixture(_beforeEach);
      await config.bytecodeV0TextCR_DMock
        .connect(config.accounts.deployer)
        .createText("zip zipppity zoooop zop");
      const textBytecodeAddress = getLatestTextDeploymentAddressV0(
        config.bytecodeV0TextCR_DMock
      );

      // read V0 version from V2 library
      const isCompressed =
        await config.bytecodeV2TextCR_DMock.readIsCompressedForTextAtAddress(
          textBytecodeAddress
        );
      // hard-coded expected value
      expect(isCompressed).to.be.false;
    });

    it("read V2 version from V2 library", async function () {
      const config = await loadFixture(_beforeEach);
      await config.bytecodeV2TextCR_DMock
        .connect(config.accounts.deployer)
        .createText("zip zipppity zoooop zop");
      const textBytecodeAddress = getLatestTextDeploymentAddressV2(
        config.bytecodeV2TextCR_DMock
      );

      // read V2 version from V2 library
      const isCompressed =
        await config.bytecodeV2TextCR_DMock.readIsCompressedForTextAtAddress(
          textBytecodeAddress
        );
      // hard-coded expected value
      expect(isCompressed).to.be.false;
    });
  });
});
