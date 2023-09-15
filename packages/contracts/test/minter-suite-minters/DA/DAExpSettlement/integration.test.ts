import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import {
  configureProjectZeroAuction,
  configureProjectZeroAuctionAndAdvanceOneDay,
  configureProjectZeroAuctionAndAdvanceOneDayAndWithdrawRevenues,
  configureProjectZeroAuctionAndAdvanceToStart,
  configureProjectZeroAuctionAndSellout,
} from "./helpers";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterDAExpSettlementV3";
const TARGET_MINTER_VERSION = "v3.0.0";

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

      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, config.maxInvocations);

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      config.defaultHalfLife = 60; // seconds
      config.basePrice = config.pricePerTokenInWei;
      config.startingPrice = config.basePrice.mul(5);

      config.isEngine = params.core.includes("Engine");

      return config;
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

        // expect revert when trying to purchase on original minter
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.startingPrice,
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
              value: config.startingPrice,
            }),
          revertMessages.onlyConfiguredAuctions
        );
      });

      it("allows purchases through the correct minter", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        for (let i = 0; i < 15; i++) {
          await config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.startingPrice,
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
        // project one on minter two
        await setPriceMinter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // expect revert
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await expectRevert(
          setPriceMinter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.startingPrice,
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
          // expect revert when trying to purchase
          // @dev advance past end and withdraw revenues to split funds
          // atomically during purchase
          await configureProjectZeroAuctionAndAdvanceOneDayAndWithdrawRevenues(
            config
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .purchase(config.projectZero, config.genArt721Core.address, {
                value: config.startingPrice,
              }),
            "Render Provider payment failed"
          );
        });

        it("requires successful payment to platform provider", async function () {
          // get config from beforeEach
          const config = this.config;
          // update render provider address to a contract that reverts on receive
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
            // @dev advance past end and withdraw revenues to split funds
            // atomically during purchase
            await configureProjectZeroAuctionAndAdvanceOneDayAndWithdrawRevenues(
              config
            );
            await expectRevert(
              config.minter
                .connect(config.accounts.user)
                .purchaseTo(
                  config.accounts.additional.address,
                  config.projectZero,
                  config.genArt721Core.address,
                  {
                    value: config.startingPrice,
                  }
                ),
              "Platform Provider payment failed"
            );
          } else {
            // @dev no-op for non-engine contracts
          }
        });

        it("requires successful payment to artist", async function () {
          // get config from beforeEach
          const config = this.config;
          // @dev advance past end and withdraw revenues to split funds
          // atomically during purchase
          await configureProjectZeroAuctionAndAdvanceOneDayAndWithdrawRevenues(
            config
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
                value: config.startingPrice,
              }),
            "Artist payment failed"
          );
        });

        it("requires successful payment to artist additional payee", async function () {
          // get config from beforeEach
          const config = this.config;
          // @dev advance past end and withdraw revenues to split funds
          // atomically during purchase
          await configureProjectZeroAuctionAndAdvanceOneDayAndWithdrawRevenues(
            config
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
                value: config.startingPrice,
              }),
            "Additional Payee payment failed"
          );
        });

        it("handles zero platform and artist payment values", async function () {
          // get config from beforeEach
          const config = this.config;
          // @dev advance past end and withdraw revenues to split funds
          // atomically during purchase
          await configureProjectZeroAuctionAndAdvanceOneDayAndWithdrawRevenues(
            config
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
              value: config.startingPrice,
            });
        });
      });

      it("requires min value to mint", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.startingPrice.mul(95).div(100), // price hasn't gone down by 5% yet
            }),
          revertMessages.needMoreValue
        );
      });

      it("does not allow minting before auction start", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuction(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.startingPrice,
            }),
          revertMessages.auctionNotStarted
        );
      });

      it("mints token to sender", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        const ownerOf = await config.genArt721Core.ownerOf(
          config.projectZeroTokenZero.toNumber()
        );
        expect(ownerOf).to.equal(config.accounts.user.address);
      });

      it("updates receipt for multiple purchases", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // purchase 1
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        const purchasePrice1 =
          await config.minter.getProjectLatestPurchasePrice(
            config.projectZero,
            config.genArt721Core.address
          );
        const excessSettlementFunds1 =
          await config.minter.getProjectExcessSettlementFunds(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(excessSettlementFunds1).to.be.gt(0);
        expect(excessSettlementFunds1).to.equal(
          config.startingPrice.sub(purchasePrice1)
        );
        // purchase 2
        // advance 1 minute
        await ethers.provider.send("evm_mine", [config.startTime + ONE_MINUTE]);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        const purchasePrice2 =
          await config.minter.getProjectLatestPurchasePrice(
            config.projectZero,
            config.genArt721Core.address
          );
        const excessSettlementFunds2 =
          await config.minter.getProjectExcessSettlementFunds(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(excessSettlementFunds2).to.be.gt(0);
        expect(excessSettlementFunds2).to.equal(
          config.startingPrice.sub(purchasePrice2).mul(2) // two tokens at net purchase price 2
        );
      });

      it("updates numSettleableInvocations before revenues collected", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // purchase 1
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        const numSettleableInvocations1 =
          await config.minter.getNumSettleableInvocations(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(numSettleableInvocations1).to.equal(1);
        // purchase 2
        // advance 1 minute
        await ethers.provider.send("evm_mine", [config.startTime + ONE_MINUTE]);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        const numSettleableInvocations2 =
          await config.minter.getNumSettleableInvocations(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(numSettleableInvocations2).to.equal(2);
      });

      it("does not update numSettleableInvocations after revenues collected", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // purchase 1
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        const numSettleableInvocations1 =
          await config.minter.getNumSettleableInvocations(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(numSettleableInvocations1).to.equal(1);
        // advance to past end of auction and collect revenues
        // advance 1 day
        await ethers.provider.send("evm_mine", [config.startTime + ONE_DAY]);
        await config.minter
          .connect(config.accounts.artist)
          .withdrawArtistAndAdminRevenues(
            config.projectZero,
            config.genArt721Core.address
          );
        // purchase 2
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        const numSettleableInvocations2 =
          await config.minter.getNumSettleableInvocations(
            config.projectZero,
            config.genArt721Core.address
          );
        // expect numSettleableInvocations to be unchanged (i.e. should still be 1)
        expect(numSettleableInvocations2).to.equal(1);
      });

      it("does not distribute revenues before auction end", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // purchase 1
        const artistBalance1 = await config.accounts.artist.getBalance();
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // expect no revenues to be distributed
        const artistBalance2 = await config.accounts.artist.getBalance();
        expect(artistBalance2).to.equal(artistBalance1);
      });

      it("does not distribute revenues before after end before revenues collected", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceOneDay(config);
        // purchase 1
        const artistBalance1 = await config.accounts.artist.getBalance();
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // expect no revenues to be distributed
        const artistBalance2 = await config.accounts.artist.getBalance();
        expect(artistBalance2).to.equal(artistBalance1);
      });

      it("does distribute revenues after reaching base price and revenues collected, NO refunds to purchaser", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceOneDayAndWithdrawRevenues(
          config
        );
        // purchase 1
        const artistBalance1 = await config.accounts.artist.getBalance();
        const userBalance1 = await config.accounts.user.getBalance();
        // set gas price of next transaction to 0 to ensure no gas fees are paid for accurate balance tracking
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        // important - over-paid to ensure excess payment is not refunded
        const excessPaymentValue = config.startingPrice.add(
          ethers.utils.parseEther("1.0")
        );
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: excessPaymentValue,
            gasPrice: 0,
          });
        // expect revenues to have been distributed
        const artistBalance2 = await config.accounts.artist.getBalance();
        const expectedRevenue = config.isEngine
          ? config.basePrice.mul(8).div(10) // 80% to artist
          : config.basePrice.mul(9).div(10); // 90% to artist
        expect(artistBalance2).to.equal(artistBalance1.add(expectedRevenue));
        // expect user's excess payment to NOT have been refunded
        // @dev this is important, as refunds on the settlement minter take place during the
        // settlement call, and distributing a refund here would cause a double-refund and
        // could be used to drain the minter contract of all funds.
        const userBalance2 = await config.accounts.user.getBalance();
        expect(userBalance2).to.equal(userBalance1.sub(excessPaymentValue));
      });

      it("updates latest purchase price", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        const initialLatestPurchasePrice =
          await config.minter.getProjectLatestPurchasePrice(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(initialLatestPurchasePrice).to.equal(0);
        // purchase
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // verify latest purchase price updated
        const latestPurchasePrice1 =
          await config.minter.getProjectLatestPurchasePrice(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(latestPurchasePrice1).to.not.equal(0);
      });

      it("does not allow reentrant purchases", async function () {
        // since refunds are not sent atomically to purchaser on settlement minter,
        // attacker is must be priviliged artist or admin, making config a somewhat
        // silly reentrancy attack. Still worth testing to ensure nonReentrant
        // modifier is working.
        const config = await loadFixture(_beforeEach);
        // withdraw revenues to cause splits to happen atomically during purchase
        await configureProjectZeroAuctionAndAdvanceOneDayAndWithdrawRevenues(
          config
        );
        // deploy reentrancy contract
        const reentrancy = await deployAndGet(
          config,
          "ReentrancyMockShared",
          []
        );
        // set reentrancy contract as provider or artblocks contract
        // update platform payment address to the reentrancy mock contract
        // route to appropriate core function
        if (config.isEngine) {
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProviderSalesAddresses(
              reentrancy.address,
              config.accounts.user.address,
              config.accounts.additional.address,
              config.accounts.additional2.address
            );
        } else {
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArtblocksPrimarySalesAddress(reentrancy.address);
        }

        // perform attack
        // @dev refund failed error message is expected, because attack occurrs during the refund call
        await expectRevert(
          reentrancy.connect(config.accounts.user).attack(
            2, // qty to purchase
            config.minter.address, // minter address
            config.projectZero, // project id
            config.genArt721Core.address, // core address
            config.basePrice.add("1"), // price to pay
            {
              value: config.basePrice.add(1).mul(2),
            }
          ),
          // failure message occurs during payment to render provider, where reentrency
          // attack occurs
          revertMessages.renderProviderPaymentFailed
        );

        // does allow single purchase
        await reentrancy.connect(config.accounts.user).attack(
          1, // qty to purchase
          config.minter.address, // minter address
          config.projectZero, // project id
          config.genArt721Core.address, // core address
          config.basePrice.add("1"), // price to pay
          {
            value: config.basePrice.add(1),
          }
        );
      });
    });

    describe("purchaseTo", async function () {
      it("does not allow purchase prior to configuring auction", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.additional.address,
              config.projectZero,
              config.genArt721Core.address,
              {
                value: config.startingPrice,
              }
            ),
          revertMessages.onlyConfiguredAuctions
        );
      });

      it("allows `purchaseTo` by default", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await config.minter
          .connect(config.accounts.user)
          .purchaseTo(
            config.accounts.additional.address,
            config.projectZero,
            config.genArt721Core.address,
            {
              value: config.startingPrice,
            }
          );
      });

      it("mints token to _to", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await config.minter
          .connect(config.accounts.user)
          .purchaseTo(
            config.accounts.additional.address,
            config.projectZero,
            config.genArt721Core.address,
            {
              value: config.startingPrice,
            }
          );
        const ownerOf = await config.genArt721Core.ownerOf(
          config.projectZeroTokenZero.toNumber()
        );
        expect(ownerOf).to.equal(config.accounts.additional.address);
      });
    });

    describe("reclaimProjectExcessSettlementFunds", async function () {
      it("requires a prior purchase", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .reclaimProjectExcessSettlementFunds(
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.noPurchasesMade
        );
      });

      it("claims all excess settlement funds", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // purchase
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // advance 1 minute
        await ethers.provider.send("evm_mine", [config.startTime + ONE_MINUTE]);
        // purchase
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // ensure excess settlement funds are available
        const excessSettlementFunds1 =
          await config.minter.getProjectExcessSettlementFunds(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(excessSettlementFunds1).to.be.gt(0);
        // reclaim excess settlement funds
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectExcessSettlementFunds(
            config.projectZero,
            config.genArt721Core.address
          );
        // ensure excess settlement funds are no longer available
        const excessSettlementFunds2 =
          await config.minter.getProjectExcessSettlementFunds(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(excessSettlementFunds2).to.equal(0);
      });

      it("sends excess settlement funds to caller", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // purchase
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // advance 1 minute
        await ethers.provider.send("evm_mine", [config.startTime + ONE_MINUTE]);
        // purchase
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // ensure excess settlement funds are available
        const excessSettlementFunds1 =
          await config.minter.getProjectExcessSettlementFunds(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(excessSettlementFunds1).to.be.gt(0);
        // reclaim excess settlement funds
        const userBalance1 = await config.accounts.user.getBalance();
        // @dev gas price to 0 to ensure user balance is not affected by gas costs
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectExcessSettlementFunds(
            config.projectZero,
            config.genArt721Core.address,
            {
              gasPrice: 0,
            }
          );
        const userBalance2 = await config.accounts.user.getBalance();
        // ensure user balance has increased by excess settlement funds
        expect(userBalance2).to.equal(userBalance1.add(excessSettlementFunds1));
      });
    });

    describe("reclaimProjectsExcessSettlementFunds", async function () {
      it("requires a prior purchase", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .reclaimProjectsExcessSettlementFunds(
              [config.projectZero],
              [config.genArt721Core.address]
            ),
          revertMessages.noPurchasesMade
        );
      });

      it("claims all excess settlement funds", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // purchase
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // advance 1 minute
        await ethers.provider.send("evm_mine", [config.startTime + ONE_MINUTE]);
        // purchase
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // ensure excess settlement funds are available
        const excessSettlementFunds1 =
          await config.minter.getProjectExcessSettlementFunds(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(excessSettlementFunds1).to.be.gt(0);
        // reclaim excess settlement funds
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectsExcessSettlementFunds(
            [config.projectZero],
            [config.genArt721Core.address]
          );
        // ensure excess settlement funds are no longer available
        const excessSettlementFunds2 =
          await config.minter.getProjectExcessSettlementFunds(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(excessSettlementFunds2).to.equal(0);
      });

      it("sends excess settlement funds to caller", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // purchase
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // advance 1 minute
        await ethers.provider.send("evm_mine", [config.startTime + ONE_MINUTE]);
        // purchase
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // ensure excess settlement funds are available
        const excessSettlementFunds1 =
          await config.minter.getProjectExcessSettlementFunds(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(excessSettlementFunds1).to.be.gt(0);
        // reclaim excess settlement funds
        const userBalance1 = await config.accounts.user.getBalance();
        // @dev gas price to 0 to ensure user balance is not affected by gas costs
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectsExcessSettlementFunds(
            [config.projectZero],
            [config.genArt721Core.address],
            {
              gasPrice: 0,
            }
          );
        const userBalance2 = await config.accounts.user.getBalance();
        // ensure user balance has increased by excess settlement funds
        expect(userBalance2).to.equal(userBalance1.add(excessSettlementFunds1));
      });

      // @dev multi-project + multi-contract claiming receipt validation is tested in ./events.test.ts
    });

    describe("reclaimProjectExcessSettlementFundsTo", async function () {
      it("doesn't allow reclaiming to zero address", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .reclaimProjectExcessSettlementFundsTo(
              ethers.constants.AddressZero,
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.noClaimToZeroAddress
        );
      });

      it("sends excess settlement funds to _to", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // purchase
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // advance 1 minute
        await ethers.provider.send("evm_mine", [config.startTime + ONE_MINUTE]);
        // purchase
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // ensure excess settlement funds are available
        const excessSettlementFunds1 =
          await config.minter.getProjectExcessSettlementFunds(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(excessSettlementFunds1).to.be.gt(0);
        // reclaim excess settlement funds
        const additionalBalance1 =
          await config.accounts.additional.getBalance();
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectExcessSettlementFundsTo(
            config.accounts.additional.address,
            config.projectZero,
            config.genArt721Core.address
          );
        const additionalBalance2 =
          await config.accounts.additional.getBalance();
        // ensure additional balance has increased by excess settlement funds
        expect(additionalBalance2).to.equal(
          additionalBalance1.add(excessSettlementFunds1)
        );
      });

      it("requires successful payment", async function () {
        const config = await loadFixture(_beforeEach);
        const deadReceiver = await deployAndGet(config, "DeadReceiverMock", []);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // purchase
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // advance 1 minute
        await ethers.provider.send("evm_mine", [config.startTime + ONE_MINUTE]);
        // purchase
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // ensure excess settlement funds are available
        const excessSettlementFunds1 =
          await config.minter.getProjectExcessSettlementFunds(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(excessSettlementFunds1).to.be.gt(0);
        // revert when reclaim excess settlement funds to dead receiver
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .reclaimProjectExcessSettlementFundsTo(
              deadReceiver.address,
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.reclaimingFailed
        );
      });
    });

    describe("reclaimProjectsExcessSettlementFundsTo", async function () {
      it("doesn't allow reclaiming to zero address", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .reclaimProjectsExcessSettlementFundsTo(
              ethers.constants.AddressZero,
              [config.projectZero],
              [config.genArt721Core.address]
            ),
          revertMessages.noClaimToZeroAddress
        );
      });

      it("requires same length projects and core contracts", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .reclaimProjectsExcessSettlementFundsTo(
              config.accounts.user.address,
              [config.projectZero, config.projectOne],
              [config.genArt721Core.address]
            ),
          revertMessages.arrayLengthsMatch
        );
      });

      it("sends excess settlement funds to _to", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // purchase
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // advance 1 minute
        await ethers.provider.send("evm_mine", [config.startTime + ONE_MINUTE]);
        // purchase
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // ensure excess settlement funds are available
        const excessSettlementFunds1 =
          await config.minter.getProjectExcessSettlementFunds(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(excessSettlementFunds1).to.be.gt(0);
        // reclaim excess settlement funds
        const additionalBalance1 =
          await config.accounts.additional.getBalance();
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectsExcessSettlementFundsTo(
            config.accounts.additional.address,
            [config.projectZero],
            [config.genArt721Core.address]
          );
        const additionalBalance2 =
          await config.accounts.additional.getBalance();
        // ensure additional balance has increased by excess settlement funds
        expect(additionalBalance2).to.equal(
          additionalBalance1.add(excessSettlementFunds1)
        );
      });

      it("requires successful payment", async function () {
        const config = await loadFixture(_beforeEach);
        const deadReceiver = await deployAndGet(config, "DeadReceiverMock", []);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // purchase
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // advance 1 minute
        await ethers.provider.send("evm_mine", [config.startTime + ONE_MINUTE]);
        // purchase
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // ensure excess settlement funds are available
        const excessSettlementFunds1 =
          await config.minter.getProjectExcessSettlementFunds(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(excessSettlementFunds1).to.be.gt(0);
        // revert when reclaim excess settlement funds to dead receiver
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .reclaimProjectsExcessSettlementFundsTo(
              deadReceiver.address,
              [config.projectZero],
              [config.genArt721Core.address]
            ),
          revertMessages.reclaimingFailed
        );
      });
    });
  });
});
