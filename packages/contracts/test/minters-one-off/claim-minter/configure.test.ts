import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../util/common";
import { ethers } from "hardhat";
import { expect } from "chai";

import { T_Config } from "../../util/common";
import {
  GenArt721CoreV3_Engine,
  MinterFilterV2,
  ClaimMinter,
  PMPV0,
  PseudorandomAtomic,
} from "../../../scripts/contracts";
import { testValues } from "./constants";

interface T_ClaimMinterTestConfig extends T_Config {
  genArt721Core: GenArt721CoreV3_Engine;
  minterFilter: MinterFilterV2;
  minter: ClaimMinter;
  pmpContract: PMPV0;
  pseudorandomContract: PseudorandomAtomic;
  projectZero: number;
}

// @dev testing with V3 engine sufficient - no different logic is tested with flex, etc.
const runForEach = [
  {
    core: "GenArt721CoreV3_Engine",
  },
];

runForEach.forEach((params) => {
  describe(`ClaimMinter Configure w/ core ${params.core}`, async function () {
    async function _beforeEach() {
      // load minter filter V2 fixture
      const config = await loadFixture(setupConfigWitMinterFilterV2Suite);
      // deploy core contract and register on core registry
      ({
        genArt721Core: config.genArt721Core,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCore(config, params.core, config.coreRegistry));

      // update core's minter as the minter filter
      await config.genArt721Core.updateMinterContract(
        config.minterFilter.address
      );

      // Project setup (do prior to minter deployment for pre-syncing artist address in constructor test)
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );

      const delegateRegistry = await deployAndGet(
        config,
        "DelegateRegistry",
        []
      );
      // Deploy PMP contract
      config.pmpContract = await deployAndGet(config, "PMPV0", [
        delegateRegistry.address,
      ]);

      // Deploy pseudorandom contract
      config.pseudorandomContract = await deployAndGet(
        config,
        "PseudorandomAtomic",
        []
      );

      config.minter = await deployAndGet(config, "ClaimMinter", [
        config.minterFilter.address,
        config.genArt721Core.address,
        config.pmpContract.address,
        config.pseudorandomContract.address,
        config.projectZero,
      ]);

      // approve and set minter for project
      await config.minterFilter
        .connect(config.accounts.deployer)
        .approveMinterForContract(
          config.genArt721Core.address,
          config.minter.address
        );
      await config.minterFilter.setMinterForProject(
        config.projectZero,
        config.genArt721Core.address,
        config.minter.address
      );

      // set up project 0
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 15);

      return config as T_ClaimMinterTestConfig;
    }

    describe("Deployment", async function () {
      it("set minter filter address in constructor", async function () {
        const config = await loadFixture(_beforeEach);
        const actualMinterFilterAddress =
          await config.minter.minterFilterAddress();
        expect(actualMinterFilterAddress).to.equal(config.minterFilter.address);
      });

      it("set core contract address in constructor", async function () {
        const config = await loadFixture(_beforeEach);
        const actualCoreAddress = await config.minter.coreContractAddress();
        expect(actualCoreAddress).to.equal(config.genArt721Core.address);
      });

      it("set PMP contract address in constructor", async function () {
        const config = await loadFixture(_beforeEach);
        const actualPMPAddress = await config.minter.pmpContractAddress();
        expect(actualPMPAddress).to.equal(config.pmpContract.address);
      });

      it("set pseudorandom atomic contract address in constructor", async function () {
        const config = await loadFixture(_beforeEach);
        const actualPseudorandomAddress =
          await config.minter.pseudorandomAtomicContractAddress();
        expect(actualPseudorandomAddress).to.equal(
          config.pseudorandomContract.address
        );
      });
    });

    describe("preMint", async function () {
      it("reverts when not core admin ACL", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .preMint(testValues.amountToPreMint),
          "Only Core AdminACL allowed"
        );
      });

      it("pre-mints tokens when called by core admin ACL", async function () {
        const config = await loadFixture(_beforeEach);
        const initialBalance = await config.genArt721Core.balanceOf(
          config.minter.address
        );

        await config.minter
          .connect(config.accounts.deployer)
          .syncProjectMaxInvocationsToCore();

        await config.minter
          .connect(config.accounts.deployer)
          .preMint(testValues.amountToPreMint);

        const finalBalance = await config.genArt721Core.balanceOf(
          config.minter.address
        );
        expect(finalBalance).to.equal(
          initialBalance.add(testValues.amountToPreMint)
        );
      });

      it("reverts when max invocations reached", async function () {
        const config = await loadFixture(_beforeEach);
        // Set max invocations to 1
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(testValues.projectZero, 1);

        // Sync max invocations first
        await config.minter
          .connect(config.accounts.deployer)
          .syncProjectMaxInvocationsToCore();

        // Pre-mint 1 token
        await config.minter.connect(config.accounts.deployer).preMint(1);

        // Try to pre-mint another token
        await expectRevert(
          config.minter.connect(config.accounts.deployer).preMint(1),
          "Max invocations reached"
        );
      });
    });

    describe("configurePricePerTokenInWei", async function () {
      it("reverts when not core admin ACL", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .configurePricePerTokenInWei(
              testValues.basePriceInWei,
              testValues.priceIncrementInWei
            ),
          "Only Core AdminACL allowed"
        );
      });

      it("sets base price and price increment when called by core admin ACL", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.deployer)
          .configurePricePerTokenInWei(
            testValues.basePriceInWei,
            testValues.priceIncrementInWei
          );

        const actualPrice = await config.minter.basePriceInWei();
        expect(actualPrice).to.equal(testValues.basePriceInWei);

        const actualPriceIncrement = await config.minter.priceIncrementInWei();
        expect(actualPriceIncrement).to.equal(testValues.priceIncrementInWei);
      });

      it("allows updating base price and price increment", async function () {
        const config = await loadFixture(_beforeEach);
        const newPrice = ethers.utils.parseEther("0.2");

        await config.minter
          .connect(config.accounts.deployer)
          .configurePricePerTokenInWei(
            testValues.basePriceInWei,
            testValues.priceIncrementInWei
          );

        await config.minter
          .connect(config.accounts.deployer)
          .configurePricePerTokenInWei(
            newPrice,
            testValues.priceIncrementInWei
          );

        const actualPrice = await config.minter.basePriceInWei();
        expect(actualPrice).to.equal(newPrice);

        const actualPriceIncrement = await config.minter.priceIncrementInWei();
        expect(actualPriceIncrement).to.equal(testValues.priceIncrementInWei);
      });
    });

    describe("configureTimestampStart", async function () {
      it("reverts when not core admin ACL", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .configureTimestampStart(testValues.timestampStart),
          "Only Core AdminACL allowed"
        );
      });

      it("sets timestamp start when called by core admin ACL", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(testValues.timestampStart);

        const actualTimestamp = await config.minter.timestampStart();
        expect(actualTimestamp).to.equal(testValues.timestampStart);
      });

      it("allows updating timestamp start", async function () {
        const config = await loadFixture(_beforeEach);
        const newTimestamp = testValues.timestampStart + 3600;

        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(testValues.timestampStart);

        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(newTimestamp);

        const actualTimestamp = await config.minter.timestampStart();
        expect(actualTimestamp).to.equal(newTimestamp);
      });

      it("allows setting timestamp to 0", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(0);

        const actualTimestamp = await config.minter.timestampStart();
        expect(actualTimestamp).to.equal(0);
      });
    });
  });
});
