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
import { constants } from "ethers";

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
  describe(`ClaimMinter Events w/ core ${params.core}`, async function () {
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
        500, // maxInvocations
      ]);

      // approve and set minter for project
      await config.minterFilter
        .connect(config.accounts.deployer)
        .approveMinterForContract(
          config.genArt721Core.address,
          config.minter.address
        );
      await config.minterFilter.setMinterForProject(
        testValues.projectOne,
        config.genArt721Core.address,
        config.minter.address
      );

      // set up project
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

      // configure PMP
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

    describe("Mint events", async function () {
      it("emits Mint event when pre-minting tokens", async function () {
        const config = await loadFixture(_beforeEach);

        await expect(config.minter.connect(config.accounts.deployer).preMint(1))
          .to.emit(config.genArt721Core, "Mint")
          .withArgs(config.minter.address, testValues.tokenIdOne);
      });
    });

    describe("Transfer events", async function () {
      it("emits Transfer event when claiming tokens", async function () {
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

        await expect(
          config.minter
            .connect(config.accounts.user)
            .claimToken(testValues.tokenIdZero, {
              value: testValues.basePriceInWei,
            })
        )
          .to.emit(config.genArt721Core, "Transfer")
          .withArgs(
            config.minter.address,
            config.accounts.user.address,
            testValues.tokenIdZero
          );
      });

      it("emits Transfer events for multiple claims", async function () {
        const config = await loadFixture(_beforeEach);

        // Pre-mint and configure
        await config.minter.connect(config.accounts.deployer).preMint(2);
        await config.minter
          .connect(config.accounts.deployer)
          .configurePricePerTokenInWei(
            testValues.basePriceInWei,
            testValues.priceIncrementInWei
          );
        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(testValues.timestampPast);

        // Claim first token
        await expect(
          config.minter
            .connect(config.accounts.user)
            .claimToken(testValues.tokenIdZero, {
              value: testValues.basePriceInWei,
            })
        )
          .to.emit(config.genArt721Core, "Transfer")
          .withArgs(
            config.minter.address,
            config.accounts.user.address,
            testValues.tokenIdZero
          );

        // Claim second token
        const token1Price = testValues.basePriceInWei.add(
          testValues.priceIncrementInWei
        );
        await expect(
          config.minter
            .connect(config.accounts.user2)
            .claimToken(testValues.tokenIdOne, {
              value: token1Price,
            })
        )
          .to.emit(config.genArt721Core, "Transfer")
          .withArgs(
            config.minter.address,
            config.accounts.user2.address,
            testValues.tokenIdOne
          );
      });
    });

    describe("Platform events", async function () {
      it("emits PlatformUpdated events when setting minter", async function () {
        const config = await loadFixture(_beforeEach);

        // This event is emitted by the core contract when setting the minter
        // We can verify it was emitted during setup
        const filter = config.genArt721Core.filters.PlatformUpdated();
        const events = await config.genArt721Core.queryFilter(filter);

        // Should have at least one PlatformUpdated event from setting the minter
        expect(events.length).to.be.greaterThan(0);
      });
    });

    describe("ClaimMinter events", async function () {
      it("emits PriceConfigured event when configuring price", async function () {
        const config = await loadFixture(_beforeEach);

        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .configurePricePerTokenInWei(
              testValues.basePriceInWei,
              testValues.priceIncrementInWei
            )
        )
          .to.emit(config.minter, "PriceConfigured")
          .withArgs(testValues.basePriceInWei, testValues.priceIncrementInWei);
      });

      it("emits TimestampStartConfigured event when configuring timestamp", async function () {
        const config = await loadFixture(_beforeEach);

        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .configureTimestampStart(testValues.timestampStart)
        )
          .to.emit(config.minter, "TimestampStartConfigured")
          .withArgs(testValues.timestampStart);
      });

      it("emits TokensPreMinted event when pre-minting tokens", async function () {
        const config = await loadFixture(_beforeEach);

        await expect(config.minter.connect(config.accounts.deployer).preMint(3))
          .to.emit(config.minter, "TokensPreMinted")
          .withArgs(3);
      });

      it("emits TokenClaimed event when claiming a token", async function () {
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

        await expect(
          config.minter
            .connect(config.accounts.user)
            .claimToken(testValues.tokenIdZero, {
              value: testValues.basePriceInWei,
            })
        )
          .to.emit(config.minter, "TokenClaimed")
          .withArgs(
            testValues.tokenIdZero,
            config.accounts.user.address,
            testValues.basePriceInWei
          );
      });

      it("emits TokenClaimed events for multiple claims with different prices", async function () {
        const config = await loadFixture(_beforeEach);

        // Pre-mint and configure
        await config.minter.connect(config.accounts.deployer).preMint(2);
        await config.minter
          .connect(config.accounts.deployer)
          .configurePricePerTokenInWei(
            testValues.basePriceInWei,
            testValues.priceIncrementInWei
          );
        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(testValues.timestampPast);

        // Claim first token (base price)
        await expect(
          config.minter
            .connect(config.accounts.user)
            .claimToken(testValues.tokenIdZero, {
              value: testValues.basePriceInWei,
            })
        )
          .to.emit(config.minter, "TokenClaimed")
          .withArgs(
            testValues.tokenIdZero,
            config.accounts.user.address,
            testValues.basePriceInWei
          );

        // Claim second token (base price + increment)
        const token1Price = testValues.basePriceInWei.add(
          testValues.priceIncrementInWei
        );
        await expect(
          config.minter
            .connect(config.accounts.user2)
            .claimToken(testValues.tokenIdOne, {
              value: token1Price,
            })
        )
          .to.emit(config.minter, "TokenClaimed")
          .withArgs(
            testValues.tokenIdOne,
            config.accounts.user2.address,
            token1Price
          );
      });

      it("emits all expected events in correct order during full workflow", async function () {
        const config = await loadFixture(_beforeEach);

        // Configure price
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .configurePricePerTokenInWei(
              testValues.basePriceInWei,
              testValues.priceIncrementInWei
            )
        )
          .to.emit(config.minter, "PriceConfigured")
          .withArgs(testValues.basePriceInWei, testValues.priceIncrementInWei);

        // Configure timestamp
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .configureTimestampStart(testValues.timestampPast)
        )
          .to.emit(config.minter, "TimestampStartConfigured")
          .withArgs(testValues.timestampPast);

        // Pre-mint tokens
        await expect(config.minter.connect(config.accounts.deployer).preMint(1))
          .to.emit(config.minter, "TokensPreMinted")
          .withArgs(1);

        // Claim token
        await expect(
          config.minter
            .connect(config.accounts.user)
            .claimToken(testValues.tokenIdZero, {
              value: testValues.basePriceInWei,
            })
        )
          .to.emit(config.minter, "TokenClaimed")
          .withArgs(
            testValues.tokenIdZero,
            config.accounts.user.address,
            testValues.basePriceInWei
          );
      });
    });
  });
});
