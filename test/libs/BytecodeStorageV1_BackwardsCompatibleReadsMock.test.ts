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

/**
 * Tests for BytecodeStorageV1 by way of testing the BytecodeV1TextCR_DMock.
 * Note: it is not the intention of these tests to comprehensively test the mock
 *       itself, but rather to achieve full test coverage of the underlying
 *       library under test here, BytecodeStorage.
 */
describe("BytecodeStorageV1 Backwards Compatible Reads Tests", async function () {
  // Helper that validates a write from the SSTORE2 library is readable
  // from the V1 library, for a given string.
  async function validateReadInterop_SSTORE2_V1(
    config: T_Config,
    targetText: string,
    sstore2Mock: Contract,
    bytecodeV1TextCR_DMock: Contract,
    deployer: SignerWithAddress
  ) {
    // Upload the target text via the V0 library.
    const createTextTX = await sstore2Mock
      .connect(deployer)
      .createText(targetText);

    // Retrieve the address of the written target text from the V0 library.
    const textBytecodeAddress = getLatestTextDeploymentAddressSSTORE2(
      config,
      config.sstore2Mock
    );

    // Validate that V1 read of V0 written text is same as original text.
    const text = await bytecodeV1TextCR_DMock.readTextAtAddress(
      textBytecodeAddress
    );
    expect(text).to.equal(targetText);
  }

  // Helper that validates a write from the V0 library is readable
  // from the V1 library, for a given string.
  async function validateReadInterop_V0_V1(
    config: T_Config,
    targetText: string,
    bytecodeV0TextCR_DMock: Contract,
    bytecodeV1TextCR_DMock: Contract,
    deployer: SignerWithAddress
  ) {
    // Upload the target text via the V0 library.
    const createTextTX = await bytecodeV0TextCR_DMock
      .connect(deployer)
      .createText(targetText);

    // Retrieve the address of the written target text from the V0 library.
    const textBytecodeAddress = getLatestTextDeploymentAddressV0(
      config,
      config.bytecodeV0TextCR_DMock
    );

    // Validate that V1 read of V0 written text is same as original text.
    const text = await bytecodeV1TextCR_DMock.readTextAtAddress(
      textBytecodeAddress
    );
    expect(text).to.equal(targetText);
  }

  // Helper that retrieves the address of the most recently deployed contract
  // containing bytecode for storage, from the SSTORE2 library.
  async function getLatestTextDeploymentAddressSSTORE2(
    config: T_Config,
    sstore2Mock: Contract
  ) {
    const nextTextSlotId = await sstore2Mock.nextTextSlotId();
    // decrement from `nextTextSlotId` to get last updated slot
    const textSlotId = nextTextSlotId - 1;
    const textBytecodeAddress = await sstore2Mock.storedTextBytecodeAddresses(
      textSlotId
    );
    return textBytecodeAddress;
  }

  // Helper that retrieves the address of the most recently deployed contract
  // containing bytecode for storage, from the V0 ByteCode storage library.
  async function getLatestTextDeploymentAddressV0(
    config: T_Config,
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
  async function getLatestTextDeploymentAddressV1(
    config: T_Config,
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
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);
    // deploy the V1 library mock
    config.bytecodeV1TextCR_DMock = await deployAndGet(
      config,
      "BytecodeV1TextCR_DMock",
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
      await validateReadInterop_V0_V1(
        config,
        testString,
        config.bytecodeV0TextCR_DMock,
        config.bytecodeV1TextCR_DMock,
        config.accounts.deployer
      );
      await validateReadInterop_SSTORE2_V1(
        config,
        testString,
        config.sstore2Mock,
        config.bytecodeV1TextCR_DMock,
        config.accounts.deployer
      );
    });
    it("validates interop for an short script < 32 bytes", async function () {
      const config = await loadFixture(_beforeEach);
      let testString = "console.log(hello world)";
      await validateReadInterop_V0_V1(
        config,
        testString,
        config.bytecodeV0TextCR_DMock,
        config.bytecodeV1TextCR_DMock,
        config.accounts.deployer
      );
      await validateReadInterop_SSTORE2_V1(
        config,
        testString,
        config.sstore2Mock,
        config.bytecodeV1TextCR_DMock,
        config.accounts.deployer
      );
    });
    it("validates interop for chromie squiggle script", async function () {
      const config = await loadFixture(_beforeEach);
      await validateReadInterop_V0_V1(
        config,
        SQUIGGLE_SCRIPT,
        config.bytecodeV0TextCR_DMock,
        config.bytecodeV1TextCR_DMock,
        config.accounts.deployer
      );
      await validateReadInterop_SSTORE2_V1(
        config,
        SQUIGGLE_SCRIPT,
        config.sstore2Mock,
        config.bytecodeV1TextCR_DMock,
        config.accounts.deployer
      );
    });
    it("validates interop for different script", async function () {
      const config = await loadFixture(_beforeEach);
      await validateReadInterop_V0_V1(
        config,
        SKULPTUUR_SCRIPT_APPROX,
        config.bytecodeV0TextCR_DMock,
        config.bytecodeV1TextCR_DMock,
        config.accounts.deployer
      );
      await validateReadInterop_SSTORE2_V1(
        config,
        SKULPTUUR_SCRIPT_APPROX,
        config.sstore2Mock,
        config.bytecodeV1TextCR_DMock,
        config.accounts.deployer
      );
    });
    it("validates interop for misc. UTF-8 script", async function () {
      const config = await loadFixture(_beforeEach);
      await validateReadInterop_V0_V1(
        config,
        MULTI_BYTE_UTF_EIGHT_SCRIPT,
        config.bytecodeV0TextCR_DMock,
        config.bytecodeV1TextCR_DMock,
        config.accounts.deployer
      );
      await validateReadInterop_SSTORE2_V1(
        config,
        MULTI_BYTE_UTF_EIGHT_SCRIPT,
        config.sstore2Mock,
        config.bytecodeV1TextCR_DMock,
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
        config,
        config.bytecodeV0TextCR_DMock
      );

      // validate read with V1 library
      const textAuthorAddressV1 =
        await config.bytecodeV1TextCR_DMock.readAuthorForTextAtAddress(
          textBytecodeAddress
        );
      const textAuthorAddressV0 =
        await config.bytecodeV0TextCR_DMock.readAuthorForTextAtAddress(
          textBytecodeAddress
        );
      const resolvedMockAddress = await config.bytecodeV0TextCR_DMock
        .resolvedAddress;
      expect(textAuthorAddressV1).to.equal(resolvedMockAddress);
      expect(textAuthorAddressV1).to.equal(textAuthorAddressV0);
    });

    it("getWriterAddressForBytecode is not supported for SSTORE2", async function () {
      const config = await loadFixture(_beforeEach);
      await config.sstore2Mock
        .connect(config.accounts.deployer)
        .createText("zip zipppity zoooop zop");
      const textBytecodeAddress = getLatestTextDeploymentAddressSSTORE2(
        config,
        config.sstore2Mock
      );

      // validate read with V1 library
      await expectRevert(
        config.bytecodeV1TextCR_DMock.readAuthorForTextAtAddress(
          textBytecodeAddress
        ),
        "ContractAsStorage: Unsupported Version"
      );
    });
  });

  describe("validate getLibraryVersionForBytecode works across versions", function () {
    it("read unknown contract from V1 library", async function () {
      const config = await loadFixture(_beforeEach);

      // read the mock contract itself (it _is_ an unknown storage contract)
      // from the V1 library, to validate unknown-reads
      const textLibraryVersionV1 =
        await config.bytecodeV1TextCR_DMock.readLibraryVersionForTextAtAddress(
          config.bytecodeV1TextCR_DMock.address
        );
      // hard-coded expected value
      let textLibraryVersionV1UTF8 =
        ethers.utils.toUtf8String(textLibraryVersionV1);
      expect(textLibraryVersionV1UTF8).to.equal(
        "UNKNOWN_VERSION_STRING_________ "
      );
    });

    it("read V0 version from V1 library", async function () {
      const config = await loadFixture(_beforeEach);
      await config.bytecodeV0TextCR_DMock
        .connect(config.accounts.deployer)
        .createText("zip zipppity zoooop zop");
      const textBytecodeAddress = getLatestTextDeploymentAddressV0(
        config,
        config.bytecodeV0TextCR_DMock
      );

      // read V0 version from V1 library
      const textLibraryVersionV1 =
        await config.bytecodeV1TextCR_DMock.readLibraryVersionForTextAtAddress(
          textBytecodeAddress
        );
      // hard-coded expected value
      let textLibraryVersionV1UTF8 =
        ethers.utils.toUtf8String(textLibraryVersionV1);
      expect(textLibraryVersionV1UTF8).to.equal(
        "BytecodeStorage_V0.0.0_________ "
      );
    });

    it("read V1 version from V1 library", async function () {
      const config = await loadFixture(_beforeEach);
      await config.bytecodeV1TextCR_DMock
        .connect(config.accounts.deployer)
        .createText("zip zipppity zoooop zop");
      const textBytecodeAddress = getLatestTextDeploymentAddressV1(
        config,
        config.bytecodeV1TextCR_DMock
      );

      // read V1 version from V1 library
      const textLibraryVersionV1 =
        await config.bytecodeV1TextCR_DMock.readLibraryVersionForTextAtAddress(
          textBytecodeAddress
        );
      // hard-coded expected value
      let textLibraryVersionV1UTF8 =
        ethers.utils.toUtf8String(textLibraryVersionV1);
      expect(textLibraryVersionV1UTF8).to.equal(
        "BytecodeStorage_V1.0.0_________ "
      );
    });
  });
});
