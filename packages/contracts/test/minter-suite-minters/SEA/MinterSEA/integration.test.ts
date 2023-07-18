import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd } from "./helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { revertMessages } from "../../constants";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterSEAV1";
const TARGET_MINTER_VERSION = "v1.0.0";

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
  // {
  //   core: "GenArt721CoreV3_Explorations",
  // },
  // {
  //   core: "GenArt721CoreV3_Engine",
  // },
  // {
  //   core: "GenArt721CoreV3_Engine_Flex",
  // },
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

      // configure project zero
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      config.bidIncrementPercentage = 5; // 5%
      config.basePrice = config.pricePerTokenInWei; // better naming for this minter
      await config.minter
        .connect(config.accounts.artist)
        .configureFutureAuctions(
          config.projectZero,
          config.genArt721Core.address,
          config.startTime,
          config.defaultAuctionLengthSeconds,
          config.pricePerTokenInWei,
          config.bidIncrementPercentage
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
        .updateProjectMaxInvocations(config.projectZero, 15);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, 15);

      config.isEngine = params.core.includes("Engine");

      return config;
    }

    describe("purchase", async function () {
      it("is disabled", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            }),
          revertMessages.inactiveFunction
        );
      });
    });

    describe("purchaseTo", async function () {
      it("is disabled", async function () {
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
          revertMessages.inactiveFunction
        );
      });
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
        // expect revert when settling auction
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .settleAuction(targetToken, config.genArt721Core.address),
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
          // expect revert when settling auction
          await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .settleAuction(targetToken, config.genArt721Core.address),
            "Platform Provider payment failed"
          );
        } else {
          // @dev no-op for non-engine contracts
        }
      });

      it("requires successful payment to artist", async function () {
        // get config from beforeEach
        const config = this.config;
        // update artist address to a contract that reverts on receive
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProjectArtistAddress(
            config.projectZero,
            config.deadReceiver.address
          );
        // expect revert when settling auction
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .settleAuction(targetToken, config.genArt721Core.address),
          "Artist payment failed"
        );
      });

      it("requires successful payment to artist additional payee", async function () {
        // get config from beforeEach
        const config = this.config;
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
        // expect revert when settling auction
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .settleAuction(targetToken, config.genArt721Core.address),
          "Additional Payee payment failed"
        );
      });

      it("handles zero platform and artist payment values", async function () {
        // get config from beforeEach
        const config = this.config;
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
        // expect successful auction settlement
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await config.minter
          .connect(config.accounts.user)
          .settleAuction(targetToken, config.genArt721Core.address);
      });
    });
  });
});
