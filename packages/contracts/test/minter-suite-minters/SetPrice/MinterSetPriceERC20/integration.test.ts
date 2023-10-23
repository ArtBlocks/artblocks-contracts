import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { constants } from "ethers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterSetPriceERC20V5";

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

      config.isEngine = params.core.includes("Engine");

      // deploy ERC20 token, sending 100e18 tokens to user
      const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
      config.ERC20 = await ERC20Factory.connect(config.accounts.user).deploy(
        ethers.utils.parseEther("100")
      );

      // update currency for project zero, leave project one as unconfigured
      await config.minter
        .connect(config.accounts.artist)
        .updateProjectCurrencyInfo(
          config.projectZero,
          config.genArt721Core.address,
          "ERC20",
          config.ERC20.address
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
            .purchase(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              "ERC20",
              config.ERC20.address
            ),
          revertMessages.maximumInvocationsReached
        );
      });

      it("does not allow purchase prior to configuring price", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              "ERC20",
              config.ERC20.address
            ),
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
          await config.ERC20.approve(
            config.minter.address,
            config.pricePerTokenInWei
          );
          await config.minter
            .connect(config.accounts.user)
            .purchase(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              "ERC20",
              config.ERC20.address
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
        it("handles price of zero", async function () {
          const config = await loadFixture(_beforeEach);
          // record user initial balance
          const userBalance = await config.ERC20.balanceOf(
            config.accounts.user.address
          );
          // update price to zero
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              ethers.utils.parseEther("0")
            );
          // give minter approval to spend user tokens
          await config.ERC20.approve(
            config.minter.address,
            config.pricePerTokenInWei
          );
          // purchase token
          await config.minter
            .connect(config.accounts.user)
            .purchase(
              config.projectZero,
              config.genArt721Core.address,
              ethers.utils.parseEther("0"),
              "ERC20",
              config.ERC20.address
            );
          // check user balance
          const userBalanceAfter = await config.ERC20.balanceOf(
            config.accounts.user.address
          );
          expect(userBalanceAfter.toString()).to.equal(userBalance.toString());
          // remove approval, should still be able to mint
          await config.ERC20.approve(
            config.minter.address,
            ethers.utils.parseEther("0")
          );
          await config.minter
            .connect(config.accounts.user)
            .purchase(
              config.projectZero,
              config.genArt721Core.address,
              ethers.utils.parseEther("0"),
              "ERC20",
              config.ERC20.address
            );
        });

        it("requires successful payment to render provider", async function () {
          const config = await loadFixture(_beforeEach);
          // update render provider address to the banned ERC20 address, that reverts on receive
          await config.ERC20.updateBannedAddress(
            config.accounts.deployer.address
          );
          // call appropriate core function to update render provider address
          if (config.isEngine) {
            await config.genArt721Core
              .connect(config.accounts.deployer)
              .updateProviderSalesAddresses(
                config.accounts.deployer.address,
                config.accounts.additional.address,
                config.accounts.artist2.address,
                config.accounts.additional2.address
              );
          } else {
            await config.genArt721Core
              .connect(config.accounts.deployer)
              // ERC20 doesn't allow transfer to zero address
              .updateArtblocksPrimarySalesAddress(
                config.accounts.deployer.address
              );
          }
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          // expect revert when trying to purchase
          await config.ERC20.connect(config.accounts.user).approve(
            config.minter.address,
            config.pricePerTokenInWei
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .purchase(
                config.projectZero,
                config.genArt721Core.address,
                config.pricePerTokenInWei,
                "ERC20",
                config.ERC20.address
              ),
            revertMessages.ERC20MockBannedTransfer
          );
        });

        it("requires successful payment to platform provider", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          // update platform provider address to the banned ERC20 address, that reverts on receive
          await config.ERC20.updateBannedAddress(
            config.accounts.deployer.address
          );
          // only relevant for engine core contracts
          if (config.isEngine) {
            await config.genArt721Core
              .connect(config.accounts.deployer)
              .updateProviderSalesAddresses(
                config.accounts.artist.address,
                config.accounts.additional.address,
                config.accounts.deployer.address, // banned
                config.accounts.additional2.address
              );
            // expect revert when trying to purchase
            await config.ERC20.connect(config.accounts.user).approve(
              config.minter.address,
              config.pricePerTokenInWei
            );
            await expectRevert(
              config.minter
                .connect(config.accounts.user)
                .purchaseTo(
                  config.accounts.additional.address,
                  config.projectZero,
                  config.genArt721Core.address,
                  config.pricePerTokenInWei,
                  "ERC20",
                  config.ERC20.address
                ),
              revertMessages.ERC20MockBannedTransfer
            );
          } else {
            // @dev no-op for non-engine contracts
          }
        });

        it("requires successful payment to artist", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          // update artist address to the banned ERC20 address, that reverts on receive
          await config.ERC20.updateBannedAddress(
            config.accounts.artist.address
          );
          // expect revert when trying to purchase
          await config.ERC20.connect(config.accounts.user).approve(
            config.minter.address,
            config.pricePerTokenInWei
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .purchase(
                config.projectZero,
                config.genArt721Core.address,
                config.pricePerTokenInWei,
                "ERC20",
                config.ERC20.address
              ),
            revertMessages.ERC20MockBannedTransfer
          );
        });

        it("requires successful payment to artist additional payee", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          // update artist address to the banned ERC20 address, that reverts on receive
          await config.ERC20.updateBannedAddress(
            config.accounts.additional.address
          );
          const proposedAddressesAndSplits = [
            config.projectZero,
            config.accounts.artist.address,
            config.accounts.additional.address,
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
          await config.ERC20.connect(config.accounts.user).approve(
            config.minter.address,
            config.pricePerTokenInWei
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .purchase(
                config.projectZero,
                config.genArt721Core.address,
                config.pricePerTokenInWei,
                "ERC20",
                config.ERC20.address
              ),
            revertMessages.ERC20MockBannedTransfer
          );
        });

        it("handles zero platform and artist payment values", async function () {
          const config = await loadFixture(_beforeEach);
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
          await config.ERC20.connect(config.accounts.user).approve(
            config.minter.address,
            config.pricePerTokenInWei
          );
          await config.minter
            .connect(config.accounts.user)
            .purchase(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              "ERC20",
              config.ERC20.address
            );
        });

        it("requires configured, non-zero currency address", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectOne,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          // expect revert when trying to purchase
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .purchase(
                config.projectOne,
                config.genArt721Core.address,
                config.pricePerTokenInWei,
                "ERC20",
                config.ERC20.address
              ),
            revertMessages.currencyAddressMatch
          );
        });

        it("requires no ETH payment when configured for ERC20", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          // expect revert when trying to purchase while sending ETH
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .purchase(
                config.projectZero,
                config.genArt721Core.address,
                config.pricePerTokenInWei,
                "ERC20",
                config.ERC20.address
              ),
            revertMessages.needMoreAllowance
          );
        });
      });

      // @dev not straightforward to test reentrancy attack, because it requires an ERC20 with pre or post
      // transfer hooks, which we have not built a mock contract for. Instead, we test that the reentrancy
      // guard is working on other minting contracts, and assume that the implementation works here as well.
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
              config.pricePerTokenInWei,
              "ERC20",
              config.ERC20.address
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
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.pricePerTokenInWei
        );
        await config.minter
          .connect(config.accounts.user)
          .purchaseTo(
            config.accounts.additional.address,
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            "ERC20",
            config.ERC20.address
          );
      });
    });
  });
});
