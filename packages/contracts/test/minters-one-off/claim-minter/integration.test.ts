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
import { revertMessages, testValues } from "./constants";
import {
  getPMPInputConfig,
  PMP_AUTH_ENUM,
  PMP_PARAM_TYPE_ENUM,
} from "../../web3call/PMP/pmpTestUtils";
import { ONE_MINUTE } from "../../util/constants";

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
  describe(`ClaimMinter Integration w/ core ${params.core}`, async function () {
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
        testValues.projectOne,
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

    describe("Complete claiming workflow", async function () {
      it("allows claiming tokens in arbitrary order", async function () {
        const config = await loadFixture(_beforeEach);
        // Pre-mint tokens
        await config.minter.connect(config.accounts.deployer).preMint(3);

        // Configure pricing and timestamp
        await config.minter
          .connect(config.accounts.deployer)
          .configurePricePerTokenInWei(
            testValues.basePriceInWei,
            testValues.priceIncrementInWei
          );
        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(testValues.timestampPast);

        // Claim tokens in arbitrary order: 2, 0, 1
        const token2Price = testValues.basePriceInWei.add(
          testValues.priceIncrementInWei.mul(2)
        );
        await config.minter
          .connect(config.accounts.user)
          .claimToken(testValues.tokenIdTwo, {
            value: token2Price,
          });

        const token0Price = testValues.basePriceInWei;
        const tx = await config.minter
          .connect(config.accounts.user2)
          .claimToken(testValues.tokenIdZero, {
            value: token0Price,
          });

        const token1Price = testValues.basePriceInWei.add(
          testValues.priceIncrementInWei
        );
        await config.minter
          .connect(config.accounts.deployer)
          .claimToken(testValues.tokenIdOne, {
            value: token1Price,
          });
        // Verify tokens are claimed
        expect(await config.minter.isTokenClaimed(testValues.tokenIdZero)).to.be
          .true;
        expect(await config.minter.isTokenClaimed(testValues.tokenIdOne)).to.be
          .true;
        expect(await config.minter.isTokenClaimed(testValues.tokenIdTwo)).to.be
          .true;

        // Verify tokens are transferred to claimants
        expect(
          await config.genArt721Core.ownerOf(testValues.tokenIdZero)
        ).to.equal(config.accounts.user2.address);
        expect(
          await config.genArt721Core.ownerOf(testValues.tokenIdOne)
        ).to.equal(config.accounts.deployer.address);
        expect(
          await config.genArt721Core.ownerOf(testValues.tokenIdTwo)
        ).to.equal(config.accounts.user.address);
      });

      // @dev this test is too memory intensive for coverage tests, succeeds locally
      // it("allows claiming tokens of 500 tokens in arbitrary order", async function () {
      //   const config = await loadFixture(_beforeEach);
      //   // Pre-mint tokens
      //   await config.minter
      //     .connect(config.accounts.deployer)
      //     .preMint(testValues.maxInvocations);

      //   // Configure pricing and timestamp
      //   await config.minter
      //     .connect(config.accounts.deployer)
      //     .configurePricePerTokenInWei(
      //       testValues.basePriceInWei,
      //       testValues.priceIncrementInWei
      //     );
      //   await config.minter
      //     .connect(config.accounts.deployer)
      //     .configureTimestampStart(testValues.timestampPast);

      //   // Claim all 500 tokens
      //   for (let i = 0; i < testValues.maxInvocations; i++) {
      //     const tokenId = testValues.projectOne * 1000000 + i;
      //     const tokenPrice = testValues.basePriceInWei.add(
      //       testValues.priceIncrementInWei.mul(i)
      //     );

      //     await config.minter
      //       .connect(config.accounts.user)
      //       .claimToken(tokenId, {
      //         value: tokenPrice,
      //       });
      //   }

      //   // Verify all tokens are claimed
      //   for (let i = 0; i < testValues.maxInvocations; i++) {
      //     expect(await config.minter.isTokenClaimed(i)).to.be.true;
      //   }

      //   // Test that claiming token number 500 reverts
      //   const token501Id =
      //     testValues.projectOne * 1000000 + testValues.maxInvocations;
      //   const token501Price = testValues.basePriceInWei.add(
      //     testValues.priceIncrementInWei.mul(testValues.maxInvocations)
      //   );

      //   await expectRevert(
      //     config.minter.connect(config.accounts.user).claimToken(token501Id, {
      //       value: token501Price,
      //     }),
      //     "ERC721NonexistentToken(1000500)"
      //   );
      // });

      it("reverts when claiming before timestamp start", async function () {
        const config = await loadFixture(_beforeEach);
        // Pre-mint tokens
        await config.minter.connect(config.accounts.deployer).preMint(1);

        // Configure pricing and future timestamp
        await config.minter
          .connect(config.accounts.deployer)
          .configurePricePerTokenInWei(
            testValues.basePriceInWei,
            testValues.priceIncrementInWei
          );
        const blockNumber = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNumber);
        const startTime = block.timestamp + ONE_MINUTE;
        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(startTime);

        // Try to claim before timestamp start
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .claimToken(testValues.tokenIdZero, {
              value: testValues.basePriceInWei,
            }),
          revertMessages.claimingNotYetStarted
        );
      });

      it("reverts when claiming already claimed token", async function () {
        const config = await loadFixture(_beforeEach);
        // Pre-mint tokens
        await config.minter.connect(config.accounts.deployer).preMint(2);

        // Configure pricing and timestamp
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

        // Try to claim the same token again
        await expectRevert(
          config.minter
            .connect(config.accounts.user2)
            .claimToken(testValues.tokenIdZero, {
              value: testValues.basePriceInWei,
            }),
          revertMessages.tokenAlreadyClaimed
        );
      });

      it("reverts when sending incorrect payment amount", async function () {
        const config = await loadFixture(_beforeEach);
        // Pre-mint tokens
        await config.minter.connect(config.accounts.deployer).preMint(1);

        // Configure pricing and timestamp
        await config.minter
          .connect(config.accounts.deployer)
          .configurePricePerTokenInWei(
            testValues.basePriceInWei,
            testValues.priceIncrementInWei
          );
        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(testValues.timestampPast);

        // Try to claim with incorrect payment
        const incorrectPayment = testValues.basePriceInWei.add(
          ethers.utils.parseEther("0.01")
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .claimToken(testValues.tokenIdZero, {
              value: incorrectPayment,
            }),
          revertMessages.onlySendPricePerToken
        );
      });

      it("reverts when claiming token that wasn't pre-minted", async function () {
        const config = await loadFixture(_beforeEach);
        // Configure pricing and timestamp
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
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            "ERC721NonexistentToken"
          )
          .withArgs(testValues.tokenIdZero);
      });

      it("correctly calculates incremental pricing", async function () {
        const config = await loadFixture(_beforeEach);
        // Pre-mint tokens
        await config.minter.connect(config.accounts.deployer).preMint(3);

        // Configure pricing and timestamp
        await config.minter
          .connect(config.accounts.deployer)
          .configurePricePerTokenInWei(
            testValues.basePriceInWei,
            testValues.priceIncrementInWei
          );
        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(testValues.timestampPast);

        // Claim tokens and verify pricing
        const token0Price = testValues.basePriceInWei;
        const token1Price = testValues.basePriceInWei.add(
          testValues.priceIncrementInWei
        );
        const token2Price = testValues.basePriceInWei.add(
          testValues.priceIncrementInWei.mul(2)
        );

        await config.minter
          .connect(config.accounts.user)
          .claimToken(testValues.tokenIdZero, {
            value: token0Price,
          });

        await config.minter
          .connect(config.accounts.user2)
          .claimToken(testValues.tokenIdOne, {
            value: token1Price,
          });

        await config.minter
          .connect(config.accounts.user2)
          .claimToken(testValues.tokenIdTwo, {
            value: token2Price,
          });

        // Verify all tokens are claimed
        expect(await config.minter.isTokenClaimed(testValues.tokenIdZero)).to.be
          .true;
        expect(await config.minter.isTokenClaimed(testValues.tokenIdOne)).to.be
          .true;
        expect(await config.minter.isTokenClaimed(testValues.tokenIdTwo)).to.be
          .true;
      });

      it("reverts claiming when timestamp is 0 (unconfigured)", async function () {
        const config = await loadFixture(_beforeEach);

        // Pre-mint tokens
        await config.minter.connect(config.accounts.deployer).preMint(1);

        // Configure pricing but leave timestamp unconfigured (0)
        await config.minter
          .connect(config.accounts.deployer)
          .configurePricePerTokenInWei(
            testValues.basePriceInWei,
            testValues.priceIncrementInWei
          );

        // Claim token should revert with "Claiming not configured"
        await expect(
          config.minter
            .connect(config.accounts.user)
            .claimToken(testValues.tokenIdZero, {
              value: testValues.basePriceInWei,
            })
        ).to.be.revertedWith("Claiming not configured");
      });
    });
  });
});
