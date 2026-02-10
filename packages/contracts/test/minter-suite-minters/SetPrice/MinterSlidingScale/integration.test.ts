import { expect } from "chai";
import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);
import { T_Config } from "../../../util/common";
import {
  MinterSlidingScaleV0,
  GenArt721CoreV3_Engine,
  GenArt721CoreV3_Engine_Flex,
  MinterFilterV2,
} from "../../../../scripts/contracts";
import { BigNumber } from "ethers";

const TARGET_MINTER_NAME = "MinterSlidingScaleV0";
const TARGET_MINTER_VERSION = "v0.0.0";

const runForEach = [
  {
    core: "GenArt721CoreV3_Engine",
  },
  {
    core: "GenArt721CoreV3_Engine_Flex",
  },
];

interface T_MinterSlidingScaleTestConfig extends T_Config {
  genArt721Core: GenArt721CoreV3_Engine | GenArt721CoreV3_Engine_Flex;
  minterFilter: MinterFilterV2;
  minter: MinterSlidingScaleV0;
  projectZero: number;
  projectOne: number;
  pricePerTokenInWei: BigNumber;
  higherPricePerTokenInWei: BigNumber;
}

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

      config.isEngine = params.core.includes("Engine");

      return config as T_MinterSlidingScaleTestConfig;
    }

    describe("purchase", async function () {
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
        const setPriceMinter = await deployAndGet(config, "MinterSetPriceV5", [
          config.minterFilter.address,
        ]);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .approveMinterGlobally(setPriceMinter.address);
        // project zero on set price minter
        await setPriceMinter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
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
          // pass config to tests in this describe block
          this.config = config;
        });

        it("distributes full payment amount to stakeholders (higher than minimum)", async function () {
          const config = this.config;
          // update artist address to user address to easily track revenue
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectArtistAddress(
              config.projectZero,
              config.accounts.user.address
            );
          await config.minter
            .connect(config.accounts.user)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          // record artist (user) balance before purchase at minimum price
          const userBalanceBeforeMinPurchase = await ethers.provider.getBalance(
            config.accounts.user.address
          );
          // purchase at minimum price
          await config.minter
            .connect(config.accounts.user2)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            });
          const userBalanceAfterMinPurchase = await ethers.provider.getBalance(
            config.accounts.user.address
          );
          const artistRevenueAtMinPrice = userBalanceAfterMinPurchase.sub(
            userBalanceBeforeMinPurchase
          );

          // purchase at higher price
          const userBalanceBeforeHigherPurchase =
            await ethers.provider.getBalance(config.accounts.user.address);
          await config.minter
            .connect(config.accounts.user2)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.higherPricePerTokenInWei,
            });
          const userBalanceAfterHigherPurchase =
            await ethers.provider.getBalance(config.accounts.user.address);
          const artistRevenueAtHigherPrice = userBalanceAfterHigherPurchase.sub(
            userBalanceBeforeHigherPurchase
          );

          // expect artist received more revenue from higher price purchase
          expect(artistRevenueAtHigherPrice).to.be.gt(artistRevenueAtMinPrice);
        });

        it("does NOT refund excess payment to user", async function () {
          const config = this.config;
          // ensure that we send an overpayment
          expect(config.higherPricePerTokenInWei).to.be.gt(
            config.pricePerTokenInWei
          );
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          // record user balance before purchase
          const userBalanceBefore = await ethers.provider.getBalance(
            config.accounts.user.address
          );
          // expect successful purchase
          // set gas price of next transaction to 0 to ensure no gas fees are paid for accurate balance tracking
          await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
            "0x0",
          ]);
          await config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.higherPricePerTokenInWei, // overpayment
              gasPrice: 0,
            });
          // record user balance after purchase
          const userBalanceAfter = await ethers.provider.getBalance(
            config.accounts.user.address
          );
          // expect difference in user balance to be equal to FULL price paid (no refund of excess)
          expect(userBalanceBefore.sub(userBalanceAfter)).to.equal(
            config.higherPricePerTokenInWei
          );
        });

        it("requires successful payment to render provider", async function () {
          // get config from beforeEach
          const config = this.config;
          // update render provider address to a contract that reverts on receive
          // call appropriate core function to update render provider address
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
          // expect revert when trying to purchase
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
          // @dev sliding scale minter distributes all funds, including to platform provider
          // get config from beforeEach
          const config = this.config;
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          // update platform provider address to a contract that reverts on receive
          // only relevant for engine core contracts
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
          // @dev sliding scale minter distributes all funds, including to artist
          // get config from beforeEach
          const config = this.config;
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          // update artist address to a contract that reverts on receive
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectArtistAddress(
              config.projectZero,
              config.deadReceiver.address
            );
          // expect revert when trying to purchase
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
          // @dev sliding scale minter distributes all funds, including to additional payee
          // get config from beforeEach
          const config = this.config;
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          // update artist additional payee to a contract that reverts on receive
          const proposedAddressesAndSplits = [
            config.projectZero,
            config.accounts.artist.address,
            config.deadReceiver.address,
            // @dev 50% to additional, 50% to artist, to ensure additional is paid
            50,
            config.accounts.additional2.address,
            // @dev split for secondary sales doesn't matter for config test
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
          // expect revert when trying to purchase
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
          // get config from beforeEach
          const config = this.config;
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          // update platform to zero percent
          // route to appropriate core function
          if (config.isEngine) {
            await config.genArt721Core
              .connect(config.accounts.deployer)
              .updateProviderPrimarySalesPercentages(0, 0);
          } else {
            await config.genArt721Core
              .connect(config.accounts.deployer)
              .updateArtblocksPrimarySalesPercentage(0);
          }
          // update artist primary split to zero
          const proposedAddressesAndSplits = [
            config.projectZero,
            config.accounts.artist.address,
            config.accounts.additional.address,
            // @dev 100% to additional, 0% to artist, to induce zero artist payment
            100,
            config.accounts.additional2.address,
            // @dev split for secondary sales doesn't matter for config test
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
          // expect successful purchase
          await config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            });
        });
      });

      it("has reentrancy protection via nonReentrant modifier", async function () {
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
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.pricePerTokenInWei,
          });
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
    });

    describe("max price cap (20x minimum)", async function () {
      it("allows purchase at exactly 20x minimum price", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        const maxPrice = config.pricePerTokenInWei.mul(20);
        // should succeed at exactly 20x
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: maxPrice,
          });
      });

      it("reverts when paying more than 20x minimum price", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        const overMaxPrice = config.pricePerTokenInWei.mul(20).add(1);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: overMaxPrice,
            }),
          revertMessages.onlyUpTo20xMinPrice
        );
      });

      it("reverts when paying significantly more than 20x minimum price", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        const wayOverMaxPrice = config.pricePerTokenInWei.mul(100);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: wayOverMaxPrice,
            }),
          revertMessages.onlyUpTo20xMinPrice
        );
      });

      it("enforces max price cap via purchaseTo as well", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        const overMaxPrice = config.pricePerTokenInWei.mul(20).add(1);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.additional.address,
              config.projectZero,
              config.genArt721Core.address,
              {
                value: overMaxPrice,
              }
            ),
          revertMessages.onlyUpTo20xMinPrice
        );
      });

      it("MAX_PRICE_MULTIPLIER constant is 20", async function () {
        const config = await loadFixture(_beforeEach);
        const multiplier = await config.minter.MAX_PRICE_MULTIPLIER();
        expect(multiplier).to.equal(20);
      });
    });

    describe("minimum price enforcement (0.015 ETH)", async function () {
      it("MIN_PRICE_PER_TOKEN constant is 0.015 ETH", async function () {
        const config = await loadFixture(_beforeEach);
        const minPrice = await config.minter.MIN_PRICE_PER_TOKEN();
        expect(minPrice).to.equal(ethers.utils.parseEther("0.015"));
      });

      it("reverts when setting price below MIN_PRICE_PER_TOKEN", async function () {
        const config = await loadFixture(_beforeEach);
        const belowMinPrice = ethers.utils.parseEther("0.014");
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              belowMinPrice
            ),
          revertMessages.priceLtMinAllowed
        );
      });

      it("reverts when setting price to zero", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              0
            ),
          revertMessages.priceLtMinAllowed
        );
      });

      it("allows setting price at exactly MIN_PRICE_PER_TOKEN", async function () {
        const config = await loadFixture(_beforeEach);
        const minPrice = ethers.utils.parseEther("0.015");
        // should succeed at exactly minimum
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            minPrice
          );
        // verify price was set
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.tokenPriceInWei).to.equal(minPrice);
      });

      it("allows setting price above MIN_PRICE_PER_TOKEN", async function () {
        const config = await loadFixture(_beforeEach);
        const aboveMinPrice = ethers.utils.parseEther("0.1");
        // should succeed above minimum
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            aboveMinPrice
          );
        // verify price was set
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.tokenPriceInWei).to.equal(aboveMinPrice);
      });

      it("reverts when setting price just below MIN_PRICE_PER_TOKEN (1 wei below)", async function () {
        const config = await loadFixture(_beforeEach);
        const justBelowMinPrice = ethers.utils.parseEther("0.015").sub(1);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              justBelowMinPrice
            ),
          revertMessages.priceLtMinAllowed
        );
      });
    });
  });
});
