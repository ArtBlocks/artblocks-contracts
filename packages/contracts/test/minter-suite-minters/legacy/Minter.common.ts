import { getContractFactory } from "@nomiclabs/hardhat-ethers/types";
import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { T_Config, deployWithStorageLibraryAndGet } from "../../util/common";

/**
 * These tests are intended to check common Minter functionality
 * for minters in our minter suite.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const Minter_Common = async (_beforeEach: () => Promise<T_Config>) => {
  describe("constructor", async function () {
    it("returns correct minter type", async function () {
      const config = await loadFixture(_beforeEach);
      const returnedMinterType = await config.minter.minterType();
      expect(returnedMinterType).to.equal(config.targetMinterName);
    });

    it("reverts when given incorrect minter filter and core addresses", async function () {
      const config = await loadFixture(_beforeEach);
      const adminACL = await config.genArt721Core.owner();
      const token2 = await deployWithStorageLibraryAndGet(
        config,
        "GenArt721CoreV3",
        [
          config.name,
          config.symbol,
          config.randomizer.address,
          adminACL,
          0,
          config.splitProvider.address,
          false, // allow artist project activation
        ]
      );

      const minterFilterFactory =
        await ethers.getContractFactory("MinterFilterV1");
      const minterFilter = await minterFilterFactory.deploy(token2.address);
      const minterType = await config.minter.minterType();
      const minterFactory = await ethers.getContractFactory(
        // minterType is a function that returns the minter contract name
        minterType
      );
      // fails when combine new minterFilter with the old token in constructor
      const minterConstructorArgs = [
        config.genArt721Core.address,
        minterFilter.address,
      ];
      if (
        minterType == "MinterMerkleV3" ||
        minterType == "MinterMerkleV4" ||
        minterType == "MinterMerkleV5" ||
        minterType == "MinterHolderV2" ||
        minterType == "MinterHolderV3" ||
        minterType == "MinterHolderV4" ||
        minterType == "MinterPolyptychV0"
      ) {
        minterConstructorArgs.push(config.delegationRegistry.address);
      }
      await expectRevert(
        minterFactory.deploy(...minterConstructorArgs),
        "Illegal contract pairing"
      );
    });
  });

  describe("currency info hooks", async function () {
    const unconfiguredProjectNumber = 99;

    it("reports expected price per token", async function () {
      const config = await loadFixture(_beforeEach);
      // returns zero for unconfigured project price
      const currencyInfo = await config.minter
        .connect(config.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.tokenPriceInWei).to.be.equal(0);
    });

    it("reports expected isConfigured", async function () {
      const config = await loadFixture(_beforeEach);
      let currencyInfo = await config.minter
        .connect(config.accounts.artist)
        .getPriceInfo(config.projectZero);
      expect(currencyInfo.isConfigured).to.be.equal(true);
      // false for unconfigured project
      currencyInfo = await config.minter
        .connect(config.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.isConfigured).to.be.equal(false);
    });

    it("reports currency as ETH", async function () {
      const config = await loadFixture(_beforeEach);
      const priceInfo = await config.minter
        .connect(config.accounts.artist)
        .getPriceInfo(config.projectZero);
      expect(priceInfo.currencySymbol).to.be.equal("ETH");
    });

    it("reports currency address as null address", async function () {
      const config = await loadFixture(_beforeEach);
      const priceInfo = await config.minter
        .connect(config.accounts.artist)
        .getPriceInfo(config.projectZero);
      expect(priceInfo.currencyAddress).to.be.equal(constants.ZERO_ADDRESS);
    });
  });

  describe("setProjectMaxInvocations", async function () {
    it("allows artist/deployer to call setProjectMaxInvocations", async function () {
      const config = await loadFixture(_beforeEach);
      const minterType = await config.minter.minterType();
      if (!minterType.startsWith("MinterDAExpSettlementV")) {
        // non-MinterSEA minters above v2 do NOT use onlyCoreWhitelisted modifier for setProjectMaxInvocations
        const accountToTestWith =
          !minterType.startsWith("MinterSEA") &&
          (minterType.includes("V0") || minterType.includes("V1"))
            ? config.accounts.deployer
            : config.accounts.artist;
        // minters that don't settle on-chain should support config function
        await config.minter
          .connect(accountToTestWith)
          .setProjectMaxInvocations(config.projectZero);
      } else {
        // default revert message for DAExpSettlementV2+
        let revertMessage = "Not implemented";
        // minters that settle on-chain should not support config function
        if (
          minterType === "MinterDAExpSettlementV0" ||
          minterType === "MinterDAExpSettlementV1"
        ) {
          revertMessage =
            "setProjectMaxInvocations not implemented - updated during every mint";
        }

        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setProjectMaxInvocations(config.projectZero),
          revertMessage
        );
      }
    });

    it("updates local projectMaxInvocations after syncing to core", async function () {
      const config = await loadFixture(_beforeEach);
      const minterType = await config.minter.minterType();
      if (minterType.startsWith("MinterDAExpSettlementV")) {
        console.log(
          "setProjectMaxInvocations not supported for DAExpSettlement minters"
        );
        return;
      }
      // minters above v2 do NOT use onlyCoreWhitelisted modifier for setProjectMaxInvocations
      const accountToTestWith =
        !minterType.startsWith("MinterSEA") &&
        (minterType.includes("V0") || minterType.includes("V1"))
          ? config.accounts.deployer
          : config.accounts.artist;
      // update max invocations to 1 on the core
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 2);
      // sync max invocations on minter
      await config.minter
        .connect(accountToTestWith)
        .setProjectMaxInvocations(config.projectZero);
      // expect max invocations to be 2 on the minter
      expect(
        await config.minter.projectMaxInvocations(config.projectZero)
      ).to.be.equal(2);
    });
  });
};
