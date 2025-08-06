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
import {
  getPMPInputConfig,
  PMP_AUTH_ENUM,
  PMP_PARAM_TYPE_ENUM,
} from "../../web3call/PMP/pmpTestUtils";

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
  describe(`ClaimMinter Views w/ core ${params.core}`, async function () {
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

      // Project setup
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
        testValues.projectZero,
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
        .toggleProjectIsPaused(testValues.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(testValues.projectZero, 15);
      const pmpConfig1 = getPMPInputConfig(
        "claimHash",
        PMP_AUTH_ENUM.ArtistAndAddress,
        PMP_PARAM_TYPE_ENUM.String,
        0,
        config.minter.address,
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      await config.pmpContract
        .connect(config.accounts.artist)
        .configureProject(
          config.genArt721Core.address,
          testValues.projectZero,
          [pmpConfig1]
        );
      return config as T_ClaimMinterTestConfig;
    }

    describe("isTokenClaimed", async function () {
      it("returns false for unclaimed tokens", async function () {
        const config = await loadFixture(_beforeEach);
        const isClaimed = await config.minter.isTokenClaimed(
          testValues.tokenIdZero
        );
        expect(isClaimed).to.be.false;
      });

      it("returns true for claimed tokens", async function () {
        const config = await loadFixture(_beforeEach);
        // Pre-mint and configure
        await config.minter
          .connect(config.accounts.deployer)
          .syncProjectMaxInvocationsToCore();

        await config.minter.connect(config.accounts.deployer).preMint(1);
        await config.minter
          .connect(config.accounts.deployer)
          .configurePricePerTokenInWei(
            testValues.basePriceInWei,
            testValues.priceIncrementInWei
          );
        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(testValues.timestampPast);

        // Claim token
        await config.minter
          .connect(config.accounts.user)
          .claimToken(testValues.tokenIdZero, {
            value: testValues.basePriceInWei,
          });

        const isClaimed = await config.minter.isTokenClaimed(
          testValues.tokenIdZero
        );
        expect(isClaimed).to.be.true;
      });
    });

    describe("projectBasePriceInWei", async function () {
      it("returns 0 when not configured", async function () {
        const config = await loadFixture(_beforeEach);
        const basePrice = await config.minter.basePriceInWei();
        expect(basePrice).to.equal(0);
      });

      it("returns configured base price", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.deployer)
          .configurePricePerTokenInWei(
            testValues.basePriceInWei,
            testValues.priceIncrementInWei
          );

        const basePrice = await config.minter.basePriceInWei();
        expect(basePrice).to.equal(testValues.basePriceInWei);
        const priceIncrement = await config.minter.priceIncrementInWei();
        expect(priceIncrement).to.equal(testValues.priceIncrementInWei);
      });
    });

    describe("projectTimestampStart", async function () {
      it("returns 0 when not configured", async function () {
        const config = await loadFixture(_beforeEach);
        const timestampStart = await config.minter.timestampStart();
        expect(timestampStart).to.equal(0);
      });

      it("returns configured timestamp start", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(testValues.timestampStart);

        const timestampStart = await config.minter.timestampStart();
        expect(timestampStart).to.equal(testValues.timestampStart);
      });
    });

    describe("minterType", async function () {
      it("returns correct minter type", async function () {
        const config = await loadFixture(_beforeEach);
        const minterType = await config.minter.minterType();
        expect(minterType).to.equal("ClaimMinter");
      });
    });

    describe("DEFAULT_PRICE_INCREMENT_IN_WEI", async function () {
      it("returns correct price increment", async function () {
        const config = await loadFixture(_beforeEach);
        const priceIncrement =
          await config.minter.DEFAULT_PRICE_INCREMENT_IN_WEI();
        expect(priceIncrement).to.equal(testValues.priceIncrementInWei);
      });
    });
  });
});
