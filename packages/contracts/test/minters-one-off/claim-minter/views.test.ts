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
  projectOne: number;
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
        testValues.projectOne,
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

      // set up project 0
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(testValues.projectOne);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(testValues.projectOne);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(
          testValues.projectOne,
          testValues.maxInvocations
        );
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
        .configureProject(config.genArt721Core.address, testValues.projectOne, [
          pmpConfig1,
        ]);
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

    describe("getAllClaimedBitmaps", async function () {
      it("returns empty binary string when no tokens claimed", async function () {
        const config = await loadFixture(_beforeEach);
        const bitmaps = await config.minter.getAllClaimedBitmaps();
        // Should return 512-character string of all zeros
        expect(bitmaps).to.equal("0".repeat(512));
      });

      it("returns correct binary string when tokens are claimed", async function () {
        const config = await loadFixture(_beforeEach);
        // Pre-mint and claim tokens
        await config.minter.connect(config.accounts.deployer).preMint(3);
        await config.minter
          .connect(config.accounts.deployer)
          .configurePricePerTokenInWei(
            testValues.basePriceInWei,
            testValues.priceIncrementInWei
          );
        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(testValues.timestampPast);

        // Claim tokens 0 and 2
        await config.minter
          .connect(config.accounts.user)
          .claimToken(testValues.tokenIdZero, {
            value: testValues.basePriceInWei,
          });
        await config.minter
          .connect(config.accounts.user2)
          .claimToken(testValues.tokenIdTwo, {
            value: testValues.basePriceInWei.add(
              testValues.priceIncrementInWei.mul(2)
            ),
          });

        const bitmaps = await config.minter.getAllClaimedBitmaps();
        // Should have "1" at positions 0 and 2, "0" elsewhere
        expect(bitmaps[0]).to.equal("1"); // token 0 claimed
        expect(bitmaps[1]).to.equal("0"); // token 1 not claimed
        expect(bitmaps[2]).to.equal("1"); // token 2 claimed
      });
    });

    describe("Immutable state variables", async function () {
      it("returns correct project ID", async function () {
        const config = await loadFixture(_beforeEach);
        const projectId = await config.minter.projectId();
        expect(projectId).to.equal(testValues.projectOne);
      });

      it("returns correct max invocations", async function () {
        const config = await loadFixture(_beforeEach);
        const maxInvocations = await config.minter.maxInvocations();
        expect(maxInvocations).to.equal(testValues.maxInvocations);
      });

      it("returns correct core contract address", async function () {
        const config = await loadFixture(_beforeEach);
        const coreAddress = await config.minter.coreContractAddress();
        expect(coreAddress).to.equal(config.genArt721Core.address);
      });

      it("returns correct minter filter address", async function () {
        const config = await loadFixture(_beforeEach);
        const filterAddress = await config.minter.minterFilterAddress();
        expect(filterAddress).to.equal(config.minterFilter.address);
      });

      it("returns correct PMP contract address", async function () {
        const config = await loadFixture(_beforeEach);
        const pmpAddress = await config.minter.pmpContract();
        expect(pmpAddress).to.equal(config.pmpContract.address);
      });

      it("returns correct pseudorandom contract address", async function () {
        const config = await loadFixture(_beforeEach);
        const pseudorandomAddress =
          await config.minter.pseudorandomAtomicContract();
        expect(pseudorandomAddress).to.equal(
          config.pseudorandomContract.address
        );
      });
    });

    describe("Bitmap storage", async function () {
      it("returns correct bitmap values", async function () {
        const config = await loadFixture(_beforeEach);
        // Claim some tokens and check bitmap storage
        await config.minter.connect(config.accounts.deployer).preMint(3);
        await config.minter
          .connect(config.accounts.deployer)
          .configurePricePerTokenInWei(
            testValues.basePriceInWei,
            testValues.priceIncrementInWei
          );
        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(testValues.timestampPast);

        await config.minter
          .connect(config.accounts.user)
          .claimToken(testValues.tokenIdZero, {
            value: testValues.basePriceInWei,
          });

        const bitmap0 = await config.minter.claimedBitmaps(0);
        // Should have bit 0 set (token 0 claimed)
        expect(bitmap0).to.not.equal(0);
      });

      it("returns zero for unclaimed token bitmaps", async function () {
        const config = await loadFixture(_beforeEach);
        const bitmap0 = await config.minter.claimedBitmaps(0);
        // Should be zero when no tokens are claimed
        expect(bitmap0).to.equal(0);
      });
    });
  });
});
