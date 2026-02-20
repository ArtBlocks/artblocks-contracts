import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterSetPriceOnChainAllowV0";
const TARGET_MINTER_VERSION = "v0.1.0";

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
  {
    core: "GenArt721CoreV3_Explorations",
  },
  {
    core: "GenArt721CoreV3_Engine",
  },
  {
    core: "GenArt721CoreV3_Engine_Flex",
  },
];

runForEach.forEach((params) => {
  describe(`${TARGET_MINTER_NAME} Integration w/ core ${params.core}`, async function () {
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

      config.minter = await deployAndGet(config, TARGET_MINTER_NAME, [
        config.minterFilter.address,
      ]);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .approveMinterGlobally(config.minter.address);

      config.higherPricePerTokenInWei = config.pricePerTokenInWei.add(
        ethers.utils.parseEther("0.1")
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

      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectOne);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectOne);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectZero,
          config.genArt721Core.address,
          config.minter.address
        );
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectOne,
          config.genArt721Core.address,
          config.minter.address
        );

      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectOne,
          config.genArt721Core.address,
          config.pricePerTokenInWei
        );

      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 15);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, 15);

      // add user and artist to allowlist for project zero and one
      await config.minter
        .connect(config.accounts.artist)
        .addAddressesToAllowlist(
          config.projectZero,
          config.genArt721Core.address,
          [config.accounts.user.address, config.accounts.artist.address]
        );
      await config.minter
        .connect(config.accounts.artist)
        .addAddressesToAllowlist(
          config.projectOne,
          config.genArt721Core.address,
          [config.accounts.user.address, config.accounts.artist.address]
        );

      config.isEngine = params.core.includes("Engine");

      return config;
    }

    /**
     * Helper to configure randomizer for hash seed assignment on a project.
     * Only call this in hash seed test describe blocks.
     */
    async function configureHashSeedForProject(config: any, projectId: number) {
      await config.randomizer
        .connect(config.accounts.artist)
        .setHashSeedSetterContract(
          config.genArt721Core.address,
          projectId,
          config.minter.address
        );
      await config.randomizer
        .connect(config.accounts.artist)
        .toggleProjectUseAssignedHashSeed(
          config.genArt721Core.address,
          projectId
        );
    }

    describe("purchase", async function () {
      it("does not allow purchase prior to configuring price", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            }),
          revertMessages.priceNotConfigured
        );
      });

      it("does not allow purchase from non-allowlisted address", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // additional is NOT on allowlist
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            }),
          revertMessages.onlyAllowlistedAddresses
        );
      });

      it("allows purchase from allowlisted address", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // user IS on allowlist
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.pricePerTokenInWei,
          });
      });

      it("does not allow purchase after removal from allowlist", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // remove user from allowlist
        await config.minter
          .connect(config.accounts.artist)
          .removeAddressesFromAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [config.accounts.user.address]
          );
        // user can no longer purchase
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            }),
          revertMessages.onlyAllowlistedAddresses
        );
      });

      it("does not allow purchases even if local max invocations value is returning a false negative", async function () {
        const config = await loadFixture(_beforeEach);
        // set local max invocations to 1
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );

        // switch to different minter
        const setPriceMinter = await deployAndGet(config, "MinterSetPriceV5", [
          config.minterFilter.address,
        ]);

        await config.minterFilter
          .connect(config.accounts.deployer)
          .approveMinterGlobally(setPriceMinter.address);
        await config.minterFilter
          .connect(config.accounts.artist)
          .setMinterForProject(
            0,
            config.genArt721Core.address,
            setPriceMinter.address
          );
        // purchase a token on the new minter
        await setPriceMinter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            ethers.utils.parseEther("0")
          );
        await setPriceMinter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, config.genArt721Core.address);
        // switch back to original minter
        await config.minterFilter
          .connect(config.accounts.artist)
          .setMinterForProject(
            0,
            config.genArt721Core.address,
            config.minter.address
          );
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );

        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            }),
          revertMessages.maximumInvocationsReached
        );
      });

      it("allows purchases through the correct minter", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        for (let i = 0; i < 15; i++) {
          await config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            });
        }
        // switch to different minter for project one
        const setPriceMinter = await deployAndGet(config, "MinterSetPriceV5", [
          config.minterFilter.address,
        ]);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .approveMinterGlobally(setPriceMinter.address);
        await config.minterFilter
          .connect(config.accounts.artist)
          .setMinterForProject(
            1,
            config.genArt721Core.address,
            setPriceMinter.address
          );
        await setPriceMinter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectOne,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        for (let i = 0; i < 15; i++) {
          await setPriceMinter
            .connect(config.accounts.user)
            .purchase(config.projectOne, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            });
        }
      });

      it("blocks purchases through the incorrect minter", async function () {
        const config = await loadFixture(_beforeEach);
        const setPriceMinter = await deployAndGet(
          config,
          TARGET_MINTER_NAME,
          [config.minterFilter.address]
        );
        await config.minterFilter
          .connect(config.accounts.deployer)
          .approveMinterGlobally(setPriceMinter.address);
        // configure price on wrong minter
        await setPriceMinter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // add user to allowlist on wrong minter
        await setPriceMinter
          .connect(config.accounts.artist)
          .addAddressesToAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [config.accounts.user.address]
          );
        await expectRevert(
          setPriceMinter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            }),
          revertMessages.onlyAssignedMinter
        );
      });

      describe("payment splitting", async function () {
        beforeEach(async function () {
          const config = await loadFixture(_beforeEach);
          config.deadReceiver = await deployAndGet(
            config,
            "DeadReceiverMock",
            []
          );
          this.config = config;
        });

        it("requires successful payment to render provider", async function () {
          const config = this.config;
          if (config.isEngine) {
            await config.genArt721Core
              .connect(config.accounts.deployer)
              .updateProviderSalesAddresses(
                config.deadReceiver.address,
                config.accounts.additional.address,
                config.accounts.artist2.address,
                config.accounts.additional2.address
              );
          } else {
            await config.genArt721Core
              .connect(config.accounts.deployer)
              .updateArtblocksPrimarySalesAddress(config.deadReceiver.address);
          }
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .purchase(config.projectZero, config.genArt721Core.address, {
                value: config.pricePerTokenInWei,
              }),
            "Render Provider payment failed"
          );
        });

        it("requires successful payment to platform provider", async function () {
          const config = this.config;
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          if (config.isEngine) {
            await config.genArt721Core
              .connect(config.accounts.deployer)
              .updateProviderSalesAddresses(
                config.accounts.artist.address,
                config.accounts.additional.address,
                config.deadReceiver.address,
                config.accounts.additional2.address
              );
            await expectRevert(
              config.minter
                .connect(config.accounts.user)
                .purchaseTo(
                  config.accounts.additional.address,
                  config.projectZero,
                  config.genArt721Core.address,
                  {
                    value: config.pricePerTokenInWei,
                  }
                ),
              "Platform Provider payment failed"
            );
          } else {
            // @dev no-op for non-engine contracts
          }
        });

        it("requires successful payment to artist", async function () {
          const config = this.config;
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectArtistAddress(
              config.projectZero,
              config.deadReceiver.address
            );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .purchase(config.projectZero, config.genArt721Core.address, {
                value: config.pricePerTokenInWei,
              }),
            "Artist payment failed"
          );
        });

        it("requires successful payment to artist additional payee", async function () {
          const config = this.config;
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          const proposedAddressesAndSplits = [
            config.projectZero,
            config.accounts.artist.address,
            config.deadReceiver.address,
            50,
            config.accounts.additional2.address,
            50,
          ];
          await config.genArt721Core
            .connect(config.accounts.artist)
            .proposeArtistPaymentAddressesAndSplits(
              ...proposedAddressesAndSplits
            );
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .adminAcceptArtistAddressesAndSplits(...proposedAddressesAndSplits);
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .purchase(config.projectZero, config.genArt721Core.address, {
                value: config.pricePerTokenInWei,
              }),
            "Additional Payee payment failed"
          );
        });

        it("handles zero platform and artist payment values", async function () {
          const config = this.config;
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          if (config.isEngine) {
            await config.genArt721Core
              .connect(config.accounts.deployer)
              .updateProviderPrimarySalesPercentages(0, 0);
          } else {
            await config.genArt721Core
              .connect(config.accounts.deployer)
              .updateArtblocksPrimarySalesPercentage(0);
          }
          const proposedAddressesAndSplits = [
            config.projectZero,
            config.accounts.artist.address,
            config.accounts.additional.address,
            100,
            config.accounts.additional2.address,
            50,
          ];
          await config.genArt721Core
            .connect(config.accounts.artist)
            .proposeArtistPaymentAddressesAndSplits(
              ...proposedAddressesAndSplits
            );
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .adminAcceptArtistAddressesAndSplits(...proposedAddressesAndSplits);
          await config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            });
        });
      });

      it("does not allow reentrant purchases", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // deploy reentrancy contract
        const reentrancy = await deployAndGet(
          config,
          "ReentrancyMockShared",
          []
        );
        // add reentrancy contract to allowlist
        await config.minter
          .connect(config.accounts.artist)
          .addAddressesToAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [reentrancy.address]
          );
        // perform attack
        // @dev refund failed error message is expected, because attack occurs during the refund call
        await expectRevert(
          reentrancy.connect(config.accounts.user).attack(
            2, // qty to purchase
            config.minter.address, // minter address
            config.projectZero, // project id
            config.genArt721Core.address, // core address
            config.pricePerTokenInWei.add("1"), // price to pay
            {
              value: config.pricePerTokenInWei.add(1).mul(2),
            }
          ),
          revertMessages.refundFailed
        );

        // does allow single purchase
        await reentrancy.connect(config.accounts.user).attack(
          1, // qty to purchase
          config.minter.address, // minter address
          config.projectZero, // project id
          config.genArt721Core.address, // core address
          config.pricePerTokenInWei.add("1"), // price to pay
          {
            value: config.pricePerTokenInWei.add(1),
          }
        );
      });
    });

    describe("purchaseTo", async function () {
      it("does not allow purchase prior to configuring price", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.additional.address,
              config.projectZero,
              config.genArt721Core.address,
              {
                value: config.pricePerTokenInWei,
              }
            ),
          revertMessages.priceNotConfigured
        );
      });

      it("allows `purchaseTo` by default", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        await config.minter
          .connect(config.accounts.user)
          .purchaseTo(
            config.accounts.additional.address,
            config.projectZero,
            config.genArt721Core.address,
            {
              value: config.pricePerTokenInWei,
            }
          );
      });

      it("enforces allowlist on msg.sender not on recipient", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // additional is NOT on allowlist, but user (sender) IS
        await config.minter
          .connect(config.accounts.user)
          .purchaseTo(
            config.accounts.additional.address,
            config.projectZero,
            config.genArt721Core.address,
            {
              value: config.pricePerTokenInWei,
            }
          );
        // additional (sender) is NOT on allowlist
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            .purchaseTo(
              config.accounts.user.address,
              config.projectZero,
              config.genArt721Core.address,
              {
                value: config.pricePerTokenInWei,
              }
            ),
          revertMessages.onlyAllowlistedAddresses
        );
      });
    });

    describe("purchaseWithHashSeed", async function () {
      it("allows purchase with hash seed", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHashSeedForProject(config, config.projectZero);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        const hashSeed = "0x000000000000000000000001";
        await config.minter
          .connect(config.accounts.user)
          .purchaseWithHashSeed(
            config.projectZero,
            config.genArt721Core.address,
            hashSeed,
            {
              value: config.pricePerTokenInWei,
            }
          );
      });

      it("reverts with zero hash seed", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        const zeroHashSeed = "0x000000000000000000000000";
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseWithHashSeed(
              config.projectZero,
              config.genArt721Core.address,
              zeroHashSeed,
              {
                value: config.pricePerTokenInWei,
              }
            ),
          revertMessages.onlyNonZeroHashSeeds
        );
      });

      it("requires sender to be on allowlist", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        const hashSeed = "0x000000000000000000000001";
        // additional is NOT on allowlist
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            .purchaseWithHashSeed(
              config.projectZero,
              config.genArt721Core.address,
              hashSeed,
              {
                value: config.pricePerTokenInWei,
              }
            ),
          revertMessages.onlyAllowlistedAddresses
        );
      });
    });

    describe("purchaseToWithHashSeed", async function () {
      it("allows purchaseTo with hash seed", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHashSeedForProject(config, config.projectZero);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        const hashSeed = "0x000000000000000000000001";
        await config.minter
          .connect(config.accounts.user)
          .purchaseToWithHashSeed(
            config.accounts.additional.address,
            config.projectZero,
            config.genArt721Core.address,
            hashSeed,
            {
              value: config.pricePerTokenInWei,
            }
          );
      });

      it("validates hash seed is correctly assigned after mint", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHashSeedForProject(config, config.projectZero);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        const hashSeed = "0xabcdef000000000000000001";
        // purchase succeeds means validateAssignedHashSeed passed internally,
        // confirming the hash seed was correctly assigned before minting
        await config.minter
          .connect(config.accounts.user)
          .purchaseToWithHashSeed(
            config.accounts.user.address,
            config.projectZero,
            config.genArt721Core.address,
            hashSeed,
            {
              value: config.pricePerTokenInWei,
            }
          );
        // verify the minted token has a non-zero hash (confirming successful mint)
        const tokenHash = await config.genArt721Core.tokenIdToHash(
          config.projectZeroTokenZero.toNumber()
        );
        expect(tokenHash).to.not.equal(ethers.constants.HashZero);
      });

      it("reverts when randomizer not configured for hash seed assignment", async function () {
        const config = await loadFixture(_beforeEach);
        // configure hash seed setter but do NOT enable useAssignedHashSeed
        await config.randomizer
          .connect(config.accounts.artist)
          .setHashSeedSetterContract(
            config.genArt721Core.address,
            config.projectZero,
            config.minter.address
          );
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        const hashSeed = "0x000000000000000000000001";
        // purchase should revert because hash seed won't be assigned correctly
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseToWithHashSeed(
              config.accounts.user.address,
              config.projectZero,
              config.genArt721Core.address,
              hashSeed,
              {
                value: config.pricePerTokenInWei,
              }
            ),
          revertMessages.unexpectedHashSeed
        );
      });

      it("reverts with zero hash seed", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        const zeroHashSeed = "0x000000000000000000000000";
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseToWithHashSeed(
              config.accounts.user.address,
              config.projectZero,
              config.genArt721Core.address,
              zeroHashSeed,
              {
                value: config.pricePerTokenInWei,
              }
            ),
          revertMessages.onlyNonZeroHashSeeds
        );
      });
    });
  });
});
