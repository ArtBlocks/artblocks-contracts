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
  projectOne: number;
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
        config.projectOne,
        testValues.maxInvocations,
      ]);

      // approve and set minter for project
      await config.minterFilter
        .connect(config.accounts.deployer)
        .approveMinterForContract(
          config.genArt721Core.address,
          config.minter.address
        );
      await config.minterFilter.setMinterForProject(
        config.projectOne,
        config.genArt721Core.address,
        config.minter.address
      );

      // set up project 1
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectOne);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectOne);

      return config as T_ClaimMinterTestConfig;
    }

    describe("Deployment", async function () {
      it("set project id in constructor", async function () {
        const config = await loadFixture(_beforeEach);
        const actualProjectId = await config.minter.projectId();
        expect(actualProjectId).to.equal(config.projectOne);
      });

      it("set max invocations in constructor", async function () {
        const config = await loadFixture(_beforeEach);
        const actualMaxInvocations = await config.minter.maxInvocations();
        expect(actualMaxInvocations).to.equal(testValues.maxInvocations);
      });

      it("reverts when maxInvocations is 512 or greater", async function () {
        const config = await loadFixture(_beforeEach);

        // Test with maxInvocations = 512 (should revert)
        await expectRevert(
          deployAndGet(config, "ClaimMinter", [
            config.minterFilter.address,
            config.genArt721Core.address,
            config.pmpContract.address,
            config.pseudorandomContract.address,
            config.projectOne,
            512, // maxInvocations = 512
          ]),
          "Max invocations must be less than 512 for bitmap support"
        );
      });
    });

    describe("preMint", async function () {
      it("reverts when not core admin ACL", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.connect(config.accounts.artist).preMint(1),
          "Only Core AdminACL allowed"
        );
      });

      it("reverts when amount to premint > max invocations reached", async function () {
        const config = await loadFixture(_beforeEach);
        const amountToPreMint = testValues.maxInvocations + 1;
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .preMint(amountToPreMint),
          "Amount exceeds maximum invocations"
        );
      });

      it("pre-mints tokens when called by core admin ACL", async function () {
        const config = await loadFixture(_beforeEach);
        const initialBalance = await config.genArt721Core.balanceOf(
          config.minter.address
        );

        await config.minter.connect(config.accounts.deployer).preMint(1);

        const finalBalance = await config.genArt721Core.balanceOf(
          config.minter.address
        );
        expect(finalBalance).to.equal(initialBalance.add(1));
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

    describe("armadillo_emoji", async function () {
      it("reverts when not core admin ACL", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.connect(config.accounts.artist).armadilloSet(99),
          "Only Core AdminACL allowed"
        );
      });

      it("reverts when value is gte 100", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.connect(config.accounts.deployer).armadilloSet(100),
          "smoller"
        );
      });

      it("sets armadillo value when called by core admin ACL", async function () {
        const config = await loadFixture(_beforeEach);
        // configure start timestamp
        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(testValues.timestampStart);
        await config.minter.connect(config.accounts.deployer).armadilloSet(99);
      });
    });
  });
});
