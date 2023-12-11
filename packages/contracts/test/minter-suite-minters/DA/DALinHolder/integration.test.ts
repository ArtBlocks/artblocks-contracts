import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import {
  deployAndGet,
  deployCore,
  safeAddProject,
  deployAndGetPBAB,
} from "../../../util/common";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import {
  configureProjectZeroAuction,
  configureProjectZeroAuctionAndAdvanceToStart,
} from "../DALin/helpers";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterDALinHolderV5";
const TARGET_MINTER_VERSION = "v5.0.0";

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

const addressZero = "0x0000000000000000000000000000000000000000";

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

      config.delegationRegistry = await deployAndGet(
        config,
        "DelegationRegistry",
        []
      );

      // update core's minter as the minter filter
      await config.genArt721Core.updateMinterContract(
        config.minterFilter.address
      );

      config.minter = await deployAndGet(config, TARGET_MINTER_NAME, [
        config.minterFilter.address,
        config.delegationRegistry.address,
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

      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, config.maxInvocations);

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      config.endTime = block.timestamp + ONE_DAY;
      config.basePrice = config.pricePerTokenInWei;
      config.startingPrice = config.basePrice.mul(5);

      config.isEngine = params.core.includes("Engine");

      config.minterSetPrice = await deployAndGet(config, "MinterSetPriceV5", [
        config.minterFilter.address,
      ]);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .approveMinterGlobally(config.minterSetPrice.address);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectZero,
          config.genArt721Core.address,
          config.minterSetPrice.address
        );
      await config.minterSetPrice
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.genArt721Core.address,
          config.pricePerTokenInWei
        );
      await config.minterSetPrice
        .connect(config.accounts.artist)
        .purchase(config.projectZero, config.genArt721Core.address, {
          value: config.pricePerTokenInWei,
        });

      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectOne,
          config.genArt721Core.address,
          config.minterSetPrice.address
        );
      await config.minterSetPrice
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectOne,
          config.genArt721Core.address,
          config.pricePerTokenInWei
        );
      await config.minterSetPrice
        .connect(config.accounts.artist)
        .purchase(config.projectOne, config.genArt721Core.address, {
          value: config.pricePerTokenInWei,
        });
      // switch config.projectZero back to MinterHolderV0
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectZero,
          config.genArt721Core.address,
          config.minter.address
        );

      await config.minter
        .connect(config.accounts.artist)
        .allowHoldersOfProjects(
          config.projectZero,
          config.genArt721Core.address,
          [config.genArt721Core.address],
          [config.projectZero]
        );

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
            ["purchase(uint256,address,address,uint256)"](
              config.projectZero,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.startingPrice,
              }
            ),
          revertMessages.maximumInvocationsReached
        );
      });

      it("does not allow purchase prior to configuring price", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            ["purchase(uint256,address,address,uint256)"](
              config.projectZero,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.startingPrice,
              }
            ),
          revertMessages.onlyConfiguredAuctions
        );
      });

      it("allows purchases through the correct minter", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        for (let i = 0; i < 14; i++) {
          await config.minter
            .connect(config.accounts.artist)
            ["purchase(uint256,address,address,uint256)"](
              config.projectZero,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.startingPrice,
              }
            );
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
        for (let i = 0; i < 14; i++) {
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
          await configureProjectZeroAuctionAndAdvanceToStart(config);
          await expectRevert(
            config.minter
              .connect(config.accounts.artist)
              ["purchase(uint256,address,address,uint256)"](
                config.projectZero,
                config.genArt721Core.address,
                config.genArt721Core.address,
                config.projectZeroTokenZero.toNumber(),
                {
                  value: config.startingPrice,
                }
              ),
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
            await configureProjectZeroAuctionAndAdvanceToStart(config);
            await expectRevert(
              config.minter
                .connect(config.accounts.artist)
                ["purchaseTo(address,uint256,address,address,uint256)"](
                  config.accounts.additional.address,
                  config.projectZero,
                  config.genArt721Core.address,
                  config.genArt721Core.address,
                  config.projectZeroTokenZero.toNumber(),
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
          await configureProjectZeroAuctionAndAdvanceToStart(config);
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
              .connect(config.accounts.artist)
              ["purchase(uint256,address,address,uint256)"](
                config.projectZero,
                config.genArt721Core.address,
                config.genArt721Core.address,
                config.projectZeroTokenZero.toNumber(),
                {
                  value: config.startingPrice,
                }
              ),
            "Artist payment failed"
          );
        });

        it("requires successful payment to artist additional payee", async function () {
          // get config from beforeEach
          const config = this.config;
          await configureProjectZeroAuctionAndAdvanceToStart(config);
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
              .connect(config.accounts.artist)
              ["purchase(uint256,address,address,uint256)"](
                config.projectZero,
                config.genArt721Core.address,
                config.genArt721Core.address,
                config.projectZeroTokenZero.toNumber(),
                {
                  value: config.startingPrice,
                }
              ),
            "Additional Payee payment failed"
          );
        });

        it("handles zero platform and artist payment values", async function () {
          // get config from beforeEach
          const config = this.config;
          await configureProjectZeroAuctionAndAdvanceToStart(config);
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
            .connect(config.accounts.artist)
            ["purchase(uint256,address,address,uint256)"](
              config.projectZero,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.startingPrice,
              }
            );
        });
      });

      it("requires min value to mint", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            ["purchase(uint256,address,address,uint256)"](
              config.projectZero,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.startingPrice.mul(95).div(100), // price hasn't gone down by 5% yet
              }
            ),
          revertMessages.needMoreValue
        );
      });

      it("does not allow minting before auction start", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuction(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            ["purchase(uint256,address,address,uint256)"](
              config.projectZero,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.startingPrice,
              }
            ),
          revertMessages.auctionNotStarted
        );
      });

      it("mints token to sender", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,address,uint256)"](
            config.projectZero,
            config.genArt721Core.address,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.startingPrice,
            }
          );
        // note that token 0 is already minted (holder token), hence we are looking at token 1 here
        const ownerOf = await config.genArt721Core.ownerOf(
          config.projectZeroTokenOne.toNumber()
        );
        expect(ownerOf).to.equal(config.accounts.artist.address);
      });

      describe("allows/disallows based on allowed project holder configuration", async function () {
        it("does not allow purchase when using token of unallowed project", async function () {
          const config = await loadFixture(_beforeEach);

          // allow holders of config.projectOne to purchase tokens on config.projectZero
          // unallow holders of config.projectZero to purchase tokens on config.projectZero
          await config.minter
            .connect(config.accounts.artist)
            .allowAndRemoveHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne],
              [config.genArt721Core.address],
              [config.projectZero]
            );
          await configureProjectZeroAuctionAndAdvanceToStart(config);

          // do not allow purchase when holder token in config.projectZero is used as pass
          await expectRevert(
            config.minter
              .connect(config.accounts.artist)
              ["purchase(uint256,address,address,uint256)"](
                config.projectZero,
                config.genArt721Core.address,
                config.genArt721Core.address,
                config.projectZeroTokenZero.toNumber(),
                {
                  value: config.startingPrice,
                }
              ),
            "Only allowlisted NFTs"
          );
        });

        it("does not allow purchase when using token of allowed then unallowed project", async function () {
          const config = await loadFixture(_beforeEach);
          // allow holders of config.projectZero and config.projectOne, then remove config.projectZero
          await config.minter
            .connect(config.accounts.artist)
            .allowAndRemoveHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address, config.genArt721Core.address],
              [config.projectZero, config.projectOne],
              [config.genArt721Core.address],
              [config.projectZero]
            );
          await configureProjectZeroAuctionAndAdvanceToStart(config);

          // do not allow purchase when holder token in config.projectZero is used as pass
          await expectRevert(
            config.minter
              .connect(config.accounts.artist)
              ["purchase(uint256,address,address,uint256)"](
                config.projectZero,
                config.genArt721Core.address,
                config.genArt721Core.address,
                config.projectZeroTokenZero.toNumber(),
                {
                  value: config.startingPrice,
                }
              ),
            "Only allowlisted NFTs"
          );
        });

        it("does allow purchase when using token of allowed project", async function () {
          const config = await loadFixture(_beforeEach);
          // allow holders of config.projectZero to purchase tokens on config.projectTwo
          await config.minter
            .connect(config.accounts.artist)
            .allowHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne]
            );
          await configureProjectZeroAuctionAndAdvanceToStart(config);

          // does allow purchase when holder token in config.projectZero is used as pass
          await config.minter
            .connect(config.accounts.artist)
            ["purchase(uint256,address,address,uint256)"](
              config.projectZero,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectOneTokenZero.toNumber(),
              {
                value: config.startingPrice,
              }
            );
        });

        it("does allow purchase when using token of allowed project (when set in bulk)", async function () {
          const config = await loadFixture(_beforeEach);
          // allow holders of config.projectOne and config.projectZero to purchase tokens on config.projectTwo
          await config.minter
            .connect(config.accounts.artist)
            .allowAndRemoveHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address, config.genArt721Core.address],
              [config.projectOne, config.projectZero],
              [],
              []
            );
          await configureProjectZeroAuctionAndAdvanceToStart(config);

          // does allow purchase when holder token in config.projectZero is used as pass
          await config.minter
            .connect(config.accounts.artist)
            ["purchase(uint256,address,address,uint256)"](
              config.projectZero,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectOneTokenZero.toNumber(),
              {
                value: config.startingPrice,
              }
            );
        });

        it("does not allow purchase when using token not owned", async function () {
          const config = await loadFixture(_beforeEach);
          await configureProjectZeroAuctionAndAdvanceToStart(config);

          await expectRevert(
            config.minter
              .connect(config.accounts.additional)
              ["purchase(uint256,address,address,uint256)"](
                config.projectZero,
                config.genArt721Core.address,
                config.genArt721Core.address,
                config.projectZeroTokenZero.toNumber(),
                {
                  value: config.startingPrice,
                }
              ),
            "Only owner of NFT"
          );
        });

        it("does not allow purchase when using token of an unallowed project on a different contract", async function () {
          const config = await loadFixture(_beforeEach);
          await configureProjectZeroAuctionAndAdvanceToStart(config);

          const { pbabToken, pbabMinter } = await deployAndGetPBAB(config);
          await pbabMinter
            .connect(config.accounts.artist)
            .purchaseTo(
              config.accounts.additional.address,
              0,
              config.pricePerTokenInWei,
              addressZero,
              {
                value: config.pricePerTokenInWei,
              }
            );

          // expect failure when using PBAB token because it is not allowlisted for config.projectTwo
          await expectRevert(
            config.minter
              .connect(config.accounts.additional)
              ["purchase(uint256,address,address,uint256)"](
                config.projectZero,
                config.genArt721Core.address,
                pbabToken.address,
                0,
                {
                  value: config.startingPrice,
                }
              ),
            "Only allowlisted NFTs"
          );
        });

        it("does allow purchase when using token of allowed project on a different contract", async function () {
          const config = await loadFixture(_beforeEach);
          // deploy different contract (for config case, use PBAB contract)
          const { pbabToken, pbabMinter } = await deployAndGetPBAB(config);
          await pbabMinter
            .connect(config.accounts.artist)
            .purchaseTo(
              config.accounts.additional.address,
              0,
              config.pricePerTokenInWei,
              addressZero,
              {
                value: config.pricePerTokenInWei,
              }
            );

          // allow holders of PBAB project 0 to purchase tokens on config.projectTwo
          await config.minter
            .connect(config.accounts.artist)
            .allowHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [pbabToken.address],
              [0]
            );
          await configureProjectZeroAuctionAndAdvanceToStart(config);

          // does allow purchase when holder of token in PBAB config.projectZero is used as pass
          await config.minter
            .connect(config.accounts.additional)
            ["purchase(uint256,address,address,uint256)"](
              config.projectZero,
              config.genArt721Core.address,
              pbabToken.address,
              0,
              {
                value: config.startingPrice,
              }
            );
        });
      });

      it("does not allow reentrant purchases", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // deploy reentrancy contract
        const reentrancy = await deployAndGet(
          config,
          "ReentrancyHolderMockShared",
          []
        );
        // artist sents token zero of project zero to reentrant contract
        await config.genArt721Core
          .connect(config.accounts.artist)
          .transferFrom(
            config.accounts.artist.address,
            reentrancy.address,
            config.projectZeroTokenZero.toNumber()
          );
        // perform attack
        // @dev refund failed error message is expected, because attack occurrs during the refund call
        await expectRevert(
          reentrancy.connect(config.accounts.user).attack(
            2, // qty to purchase
            config.minter.address, // minter address
            config.projectZero, // project id
            config.genArt721Core.address, // core address
            config.startingPrice.add("1"), // price to pay
            config.genArt721Core.address, // held token address
            config.projectZeroTokenZero.toNumber(), // held token id
            {
              value: config.startingPrice.add(1).mul(2),
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
          config.startingPrice.add("1"), // price to pay
          config.genArt721Core.address, // held token address
          config.projectZeroTokenZero.toNumber(), // held token id
          {
            value: config.startingPrice.add(1),
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
            ["purchaseTo(address,uint256,address,address,uint256)"](
              config.accounts.additional.address,
              config.projectZero,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
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
          .connect(config.accounts.artist)
          ["purchaseTo(address,uint256,address,address,uint256)"](
            config.accounts.additional.address,
            config.projectZero,
            config.genArt721Core.address,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.startingPrice,
            }
          );
      });

      it("mints token to _to", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await config.minter
          .connect(config.accounts.artist)
          ["purchaseTo(address,uint256,address,address,uint256)"](
            config.accounts.additional.address,
            config.projectZero,
            config.genArt721Core.address,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.startingPrice,
            }
          );
        const ownerOf = await config.genArt721Core.ownerOf(
          config.projectZeroTokenOne.toNumber()
        );
        expect(ownerOf).to.equal(config.accounts.additional.address);
      });
    });
    describe("Works for different valid delegation levels", async function () {
      ["delegateForAll", "delegateForContract", "delegateForToken"].forEach(
        (delegationType) => {
          describe(`purchaseTo with a VALID vault delegate after ${delegationType}`, async function () {
            beforeEach(async function () {
              const config = await loadFixture(_beforeEach);
              // artist account holds mint #0 for delegating
              config.artistVault = config.accounts.artist;
              config.userVault = config.accounts.additional2;

              // delegate the vault to the user
              let delegationArgs;
              if (delegationType === "delegateForAll") {
                delegationArgs = [config.accounts.user.address, true];
              } else if (delegationType === "delegateForContract") {
                delegationArgs = [
                  config.accounts.user.address,
                  config.genArt721Core.address,
                  true,
                ];
              } else if (delegationType === "delegateForToken") {
                delegationArgs = [
                  config.accounts.user.address, // delegate
                  config.genArt721Core.address, // contract address
                  config.projectZeroTokenZero.toNumber(), // tokenID
                  true,
                ];
              }
              await config.delegationRegistry
                .connect(config.userVault)
                [delegationType](...delegationArgs);
              // pass config to tests in this describe block
              this.config = config;
            });

            it("does allow purchases", async function () {
              // get config from beforeEach
              const config = this.config;
              await configureProjectZeroAuctionAndAdvanceToStart(config);

              // // delegate the vault to the user
              await config.delegationRegistry
                .connect(config.accounts.artist)
                .delegateForToken(
                  config.accounts.user.address, // delegate
                  config.genArt721Core.address, // contract address
                  config.projectZeroTokenZero.toNumber(), // tokenID
                  true
                );

              // expect no revert
              await config.minter
                .connect(config.accounts.user)
                ["purchaseTo(address,uint256,address,address,uint256,address)"](
                  config.userVault.address,
                  config.projectZero,
                  config.genArt721Core.address,
                  config.genArt721Core.address,
                  config.projectZeroTokenZero.toNumber(),
                  config.accounts.artist.address, //  the allowlisted vault address
                  {
                    value: config.startingPrice,
                  }
                );
            });

            it("allows purchases to vault if msg.sender is allowlisted and no vault is provided", async function () {
              // get config from beforeEach
              const config = this.config;
              await configureProjectZeroAuctionAndAdvanceToStart(config);

              await config.minter
                .connect(config.accounts.artist)
                ["purchaseTo(address,uint256,address,address,uint256)"](
                  config.accounts.additional.address,
                  config.projectZero,
                  config.genArt721Core.address,
                  config.genArt721Core.address,
                  config.projectZeroTokenZero.toNumber(),
                  {
                    value: config.startingPrice,
                  }
                );
            });

            it("does not allow purchases with an incorrect token", async function () {
              // get config from beforeEach
              const config = this.config;
              await configureProjectZeroAuctionAndAdvanceToStart(config);

              await expectRevert(
                config.minter
                  .connect(config.accounts.user)
                  [
                    "purchaseTo(address,uint256,address,address,uint256,address)"
                  ](
                    config.userVault.address,
                    config.projectZero,
                    config.genArt721Core.address,
                    config.genArt721Core.address,
                    config.projectOneTokenZero.toNumber(),
                    config.userVault.address, //  the vault address has NOT been delegated
                    {
                      value: config.startingPrice,
                    }
                  ),
                "Only allowlisted NFTs"
              );
            });
          });
        }
      );
    });

    describe("purchaseTo with an INVALID vault delegate", async function () {
      beforeEach(async function () {
        const config = await loadFixture(_beforeEach);
        config.userVault = config.accounts.additional2;
        // intentionally do not add any delegations
        // pass config to tests in this describe block
        this.config = config;
      });

      it("does NOT allow purchases", async function () {
        // get config from beforeEach
        const config = this.config;
        await configureProjectZeroAuctionAndAdvanceToStart(config);

        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            ["purchaseTo(address,uint256,address,address,uint256,address)"](
              config.userVault.address,
              config.projectZero,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              config.userVault.address, //  the address has NOT been delegated
              {
                value: config.startingPrice,
              }
            ),
          "Invalid delegate-vault pairing"
        );
      });
    });
  });
  // TODO: Add more integration tests
});
