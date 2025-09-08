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
import { BigNumber } from "ethers";

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
      it("allows artist to claim token before claiming is configured", async function () {
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
        const token0Price = testValues.basePriceInWei;
        await config.minter
          .connect(config.accounts.artist)
          .claimToken(testValues.tokenNumberZero, {
            value: token0Price,
          });
        // Verify tokens are claimed
        expect(await config.minter.isTokenClaimed(testValues.tokenNumberZero))
          .to.be.true;

        // verify wallet has claimed
        expect(
          await config.minter.walletHasClaimed(config.accounts.artist.address)
        ).to.be.true;

        // Verify tokens are transferred to claimer (artist)
        expect(
          await config.genArt721Core.ownerOf(testValues.tokenIdZero)
        ).to.equal(config.accounts.artist.address);
      });
      it("allows artist to claim token before claiming is configured", async function () {
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
        const token0Price = testValues.basePriceInWei;
        await config.minter
          .connect(config.accounts.deployer)
          .claimToken(testValues.tokenNumberZero, {
            value: token0Price,
          });
        // Verify tokens are claimed
        expect(await config.minter.isTokenClaimed(testValues.tokenNumberZero))
          .to.be.true;

        // verify wallet has claimed
        expect(
          await config.minter.walletHasClaimed(config.accounts.deployer.address)
        ).to.be.true;

        // Verify tokens are transferred to claimer (admin)
        expect(
          await config.genArt721Core.ownerOf(testValues.tokenIdZero)
        ).to.equal(config.accounts.deployer.address);
      });
      it("allows does not allow one wallet to claim multiple tokens", async function () {
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
          .claimToken(testValues.tokenNumberTwo, {
            value: token2Price,
          });

        const token0Price = testValues.basePriceInWei;
        const tx = await config.minter
          .connect(config.accounts.user2)
          .claimToken(testValues.tokenNumberZero, {
            value: token0Price,
          });

        const token1Price = testValues.basePriceInWei.add(
          testValues.priceIncrementInWei
        );
        await config.minter
          .connect(config.accounts.deployer)
          .claimToken(testValues.tokenNumberOne, {
            value: token1Price,
          });

        const token3Price = testValues.basePriceInWei.add(
          testValues.priceIncrementInWei.mul(3)
        );
        // wallet has already claimed token 0
        await expectRevert(
          config.minter
            .connect(config.accounts.user2)
            .claimToken(testValues.tokenNumberThree, {
              value: token3Price,
            }),
          "Wallet has already claimed"
        );
        // Verify tokens are claimed
        expect(await config.minter.isTokenClaimed(testValues.tokenNumberZero))
          .to.be.true;
        expect(await config.minter.isTokenClaimed(testValues.tokenNumberOne)).to
          .be.true;
        expect(await config.minter.isTokenClaimed(testValues.tokenNumberTwo)).to
          .be.true;

        // verify wallets have claimed
        expect(
          await config.minter.walletHasClaimed(config.accounts.user2.address)
        ).to.be.true;
        expect(
          await config.minter.walletHasClaimed(config.accounts.deployer.address)
        ).to.be.true;
        expect(
          await config.minter.walletHasClaimed(config.accounts.user.address)
        ).to.be.true;

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
          .claimToken(testValues.tokenNumberTwo, {
            value: token2Price,
          });

        const token0Price = testValues.basePriceInWei;
        const tx = await config.minter
          .connect(config.accounts.user2)
          .claimToken(testValues.tokenNumberZero, {
            value: token0Price,
          });

        const token1Price = testValues.basePriceInWei.add(
          testValues.priceIncrementInWei
        );
        await config.minter
          .connect(config.accounts.deployer)
          .claimToken(testValues.tokenNumberOne, {
            value: token1Price,
          });
        // Verify tokens are claimed
        expect(await config.minter.isTokenClaimed(testValues.tokenNumberZero))
          .to.be.true;
        expect(await config.minter.isTokenClaimed(testValues.tokenNumberOne)).to
          .be.true;
        expect(await config.minter.isTokenClaimed(testValues.tokenNumberTwo)).to
          .be.true;

        // verify wallets have claimed
        expect(
          await config.minter.walletHasClaimed(config.accounts.user2.address)
        ).to.be.true;
        expect(
          await config.minter.walletHasClaimed(config.accounts.deployer.address)
        ).to.be.true;
        expect(
          await config.minter.walletHasClaimed(config.accounts.user.address)
        ).to.be.true;

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

      // @dev these tests are too memory intensive for coverage tests, succeeds locally
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
      //     // Create a unique wallet for each iteration
      //     const userWallet = ethers.Wallet.createRandom().connect(
      //       ethers.provider
      //     );
      //     // Fund the wallet with ETH
      //     await ethers.provider.send("hardhat_setBalance", [
      //       userWallet.address,
      //       "0x8AC7230489E80000", // 10 ETH
      //     ]);

      //     const tokenPrice = testValues.basePriceInWei.add(
      //       testValues.priceIncrementInWei.mul(i)
      //     );

      //     await config.minter.connect(userWallet).claimToken(i, {
      //       value: tokenPrice,
      //     });

      //     // verify wallet has claimed
      //     expect(await config.minter.walletHasClaimed(userWallet.address)).to.be
      //       .true;
      //   }

      //   // Verify all tokens are claimed
      //   for (let i = 0; i < testValues.maxInvocations; i++) {
      //     expect(await config.minter.isTokenClaimed(i)).to.be.true;
      //   }

      //   // Test that claiming token number 500 reverts
      //   const token501Price = testValues.basePriceInWei.add(
      //     testValues.priceIncrementInWei.mul(testValues.maxInvocations)
      //   );

      //   await expectRevert(
      //     config.minter
      //       .connect(config.accounts.user)
      //       .claimToken(testValues.maxInvocations, {
      //         value: token501Price,
      //       }),
      //     "ERC721NonexistentToken(1000500)"
      //   );
      // });

      // it("allows claiming tokens of 500 tokens in arbitrary order, after artist mints token 0", async function () {
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
      //   // artist claims token 0
      //   await config.minter
      //     .connect(config.accounts.artist)
      //     .claimToken(testValues.tokenNumberZero, {
      //       value: testValues.basePriceInWei,
      //     });

      //   // configure timestamp start
      //   await config.minter
      //     .connect(config.accounts.deployer)
      //     .configureTimestampStart(testValues.timestampPast);

      //   // Claim remaining 499 tokens
      //   for (let i = 1; i < testValues.maxInvocations; i++) {
      //     // Create a unique wallet for each iteration
      //     const userWallet = ethers.Wallet.createRandom().connect(
      //       ethers.provider
      //     );

      //     // Fund the wallet with ETH
      //     await ethers.provider.send("hardhat_setBalance", [
      //       userWallet.address,
      //       "0x8AC7230489E80000", // 10 ETH
      //     ]);

      //     const tokenPrice = testValues.basePriceInWei.add(
      //       testValues.priceIncrementInWei.mul(i)
      //     );

      //     await config.minter.connect(userWallet).claimToken(i, {
      //       value: tokenPrice,
      //     });

      //     // verify wallet has claimed
      //     expect(await config.minter.walletHasClaimed(userWallet.address)).to.be
      //       .true;
      //   }

      //   // Verify all tokens are claimed
      //   for (let i = 0; i < testValues.maxInvocations; i++) {
      //     expect(await config.minter.isTokenClaimed(i)).to.be.true;
      //   }

      //   // Test that claiming token number 500 reverts
      //   const token501Price = testValues.basePriceInWei.add(
      //     testValues.priceIncrementInWei.mul(testValues.maxInvocations)
      //   );

      //   await expectRevert(
      //     config.minter
      //       .connect(config.accounts.user)
      //       .claimToken(testValues.maxInvocations, {
      //         value: token501Price,
      //       }),
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
            .claimToken(testValues.tokenNumberZero, {
              value: testValues.basePriceInWei,
            }),
          "Only Artist or Core Admin ACL"
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
          .claimToken(testValues.tokenNumberZero, {
            value: testValues.basePriceInWei,
          });

        // Try to claim the same token again
        await expectRevert(
          config.minter
            .connect(config.accounts.user2)
            .claimToken(testValues.tokenNumberZero, {
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
            .claimToken(testValues.tokenNumberZero, {
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
            .claimToken(testValues.tokenNumberZero, {
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
          .claimToken(testValues.tokenNumberZero, {
            value: token0Price,
          });

        await config.minter
          .connect(config.accounts.artist)
          .claimToken(testValues.tokenNumberOne, {
            value: token1Price,
          });

        await config.minter
          .connect(config.accounts.user2)
          .claimToken(testValues.tokenNumberTwo, {
            value: token2Price,
          });

        // Verify all tokens are claimed
        expect(await config.minter.isTokenClaimed(testValues.tokenNumberZero))
          .to.be.true;
        expect(await config.minter.isTokenClaimed(testValues.tokenNumberOne)).to
          .be.true;
        expect(await config.minter.isTokenClaimed(testValues.tokenNumberTwo)).to
          .be.true;

        // verify wallets have claimed
        expect(
          await config.minter.walletHasClaimed(config.accounts.user.address)
        ).to.be.true;
        expect(
          await config.minter.walletHasClaimed(config.accounts.artist.address)
        ).to.be.true;
        expect(
          await config.minter.walletHasClaimed(config.accounts.user2.address)
        ).to.be.true;
      });

      it("correctly calculates incremental pricing with a base price of 0", async function () {
        const config = await loadFixture(_beforeEach);
        // Pre-mint tokens
        await config.minter.connect(config.accounts.deployer).preMint(3);

        // Configure pricing and timestamp
        await config.minter
          .connect(config.accounts.deployer)
          .configurePricePerTokenInWei(0, testValues.priceIncrementInWei);
        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(testValues.timestampPast);

        // Claim tokens and verify pricing
        const token0Price = BigNumber.from(0);
        const token1Price = token0Price.add(testValues.priceIncrementInWei);
        const token2Price = token0Price.add(
          testValues.priceIncrementInWei.mul(2)
        );

        await config.minter
          .connect(config.accounts.user)
          .claimToken(testValues.tokenNumberZero, {
            value: token0Price,
          });

        await config.minter
          .connect(config.accounts.artist)
          .claimToken(testValues.tokenNumberOne, {
            value: token1Price,
          });

        await config.minter
          .connect(config.accounts.user2)
          .claimToken(testValues.tokenNumberTwo, {
            value: token2Price,
          });

        // Verify all tokens are claimed
        expect(await config.minter.isTokenClaimed(testValues.tokenNumberZero))
          .to.be.true;
        expect(await config.minter.isTokenClaimed(testValues.tokenNumberOne)).to
          .be.true;
        expect(await config.minter.isTokenClaimed(testValues.tokenNumberTwo)).to
          .be.true;

        // verify wallets have claimed
        expect(
          await config.minter.walletHasClaimed(config.accounts.user.address)
        ).to.be.true;
        expect(
          await config.minter.walletHasClaimed(config.accounts.artist.address)
        ).to.be.true;
        expect(
          await config.minter.walletHasClaimed(config.accounts.user2.address)
        ).to.be.true;
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
            .claimToken(testValues.tokenNumberZero, {
              value: testValues.basePriceInWei,
            })
        ).to.be.revertedWith("Only Artist or Core Admin ACL");
      });
    });

    describe("armadillo_emoji", async function () {
      it("sets armadillo value when called by core admin ACL", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(testValues.timestampStart);
        await config.minter.connect(config.accounts.deployer).armadilloSet(99);

        // mint two tokens to the minter
        await config.minter.connect(config.accounts.deployer).preMint(3);

        // set price to 0.0005 ETH, price increment to 0.0005 ETH
        await config.minter
          .connect(config.accounts.deployer)
          .configurePricePerTokenInWei(
            ethers.utils.parseEther("0.0005"),
            ethers.utils.parseEther("0.0005")
          );
        await config.minter
          .connect(config.accounts.deployer)
          .configureTimestampStart(testValues.timestampPast);

        // claim token 0 with 0.0005 ETH
        await config.minter.connect(config.accounts.deployer).claimToken(0, {
          value: ethers.utils.parseEther("0.0005"),
        });

        // claim token 1 with 0.001 ETH
        await config.minter.connect(config.accounts.user).claimToken(1, {
          value: ethers.utils.parseEther("0.001").add(99),
        });

        // claim token 2 with 0.0015 ETH
        await config.minter.connect(config.accounts.user2).claimToken(2, {
          value: ethers.utils.parseEther("0.0015").add(198),
        });
      });
    });
  });
});
