import { getContractFactory } from "@nomiclabs/hardhat-ethers/types";
import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

/**
 * These tests are intended to check common Minter functionality
 * for minters in our minter suite.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const Minter_Common = async () => {
  describe("constructor", async function () {
    it("returns correct minter type", async function () {
      const returnedMinterType = await this.minter.minterType();
      expect(returnedMinterType).to.equal(this.targetMinterName);
    });

    it("reverts when given incorrect minter filter and core addresses", async function () {
      const artblocksFactory = await ethers.getContractFactory(
        "GenArt721CoreV1"
      );
      const token2 = await artblocksFactory
        .connect(this.accounts.deployer)
        .deploy(this.name, this.symbol, this.randomizer.address);

      const minterFilterFactory = await ethers.getContractFactory(
        "MinterFilterV0"
      );
      const minterFilter = await minterFilterFactory.deploy(token2.address);
      const minterType = await this.minter.minterType();
      const minterFactory = await ethers.getContractFactory(
        // minterType is a function that returns the minter contract name
        minterType
      );
      // fails when combine new minterFilter with the old token in constructor
      const minterConstructorArgs = [
        this.genArt721Core.address,
        minterFilter.address,
      ];
      if (
        minterType == "MinterMerkleV3" ||
        minterType == "MinterHolderV2" ||
        "MinterPolyptychV0"
      ) {
        minterConstructorArgs.push(this.delegationRegistry.address);
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
      // returns zero for unconfigured project price
      const currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.tokenPriceInWei).to.be.equal(0);
    });

    it("reports expected isConfigured", async function () {
      let currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(this.projectZero);
      expect(currencyInfo.isConfigured).to.be.equal(true);
      // false for unconfigured project
      currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.isConfigured).to.be.equal(false);
    });

    it("reports currency as ETH", async function () {
      const priceInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(this.projectZero);
      expect(priceInfo.currencySymbol).to.be.equal("ETH");
    });

    it("reports currency address as null address", async function () {
      const priceInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(this.projectZero);
      expect(priceInfo.currencyAddress).to.be.equal(constants.ZERO_ADDRESS);
    });
  });

  describe("setProjectMaxInvocations", async function () {
    it("allows deployer to call setProjectMaxInvocations", async function () {
      const minterType = await this.minter.minterType();
      if (!minterType.includes("Settlement")) {
        // minters that don't settle on-chain should support this function
        await this.minter
          .connect(this.accounts.deployer)
          .setProjectMaxInvocations(this.projectZero);
      } else {
        // minters that settle on-chain should not support this function
        await expectRevert(
          this.minter
            .connect(this.accounts.deployer)
            .setProjectMaxInvocations(this.projectZero),
          "setProjectMaxInvocations not implemented - updated during every mint"
        );
      }
    });

    it("updates local projectMaxInvocations after syncing to core", async function () {
      const minterType = await this.minter.minterType();
      if (!minterType.includes("Settlement")) {
        // update max invocations to 1 on the core
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectMaxInvocations(this.projectZero, 2);
        // sync max invocations on minter
        await this.minter
          .connect(this.accounts.deployer)
          .setProjectMaxInvocations(this.projectZero);
        // expect max invocations to be 1 on the minter
        expect(
          await this.minter.projectMaxInvocations(this.projectZero)
        ).to.be.equal(2);
      } else {
        console.info(
          "skipping setProjectMaxInvocations test because not implemented on settlement minters"
        );
      }
    });
  });
};
