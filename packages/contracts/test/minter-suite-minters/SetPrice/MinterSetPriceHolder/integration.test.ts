import { expectRevert } from "@openzeppelin/test-helpers";
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
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterSetPriceHolderV5";
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

runForEach.forEach((params) => {
  describe(`MinterSetPriceHolder Integration w/ core ${params.core}`, async function () {
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
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectTwo);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectOne);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectTwo);

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
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectTwo,
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
      it("does not allow purchase prior to configuring price", async function () {
        const config = await loadFixture(_beforeEach);
        // expect revert due to price not being configured
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            ["purchase(uint256,address,address,uint256)"](
              config.projectTwo,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectTwoTokenZero.toNumber(),
              {
                value: config.pricePerTokenInWei,
              }
            ),
          "Price not configured"
        );
      });

      it("does not allow purchase without sending enough funds", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectOne,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // expect revert due when sending zero funds
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            ["purchase(uint256,address,address,uint256)"](
              config.projectOne,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: 0,
              }
            ),
          revertMessages.needMoreValue
        );
        // expect revert due when sending funds less than price
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            ["purchase(uint256,address,address,uint256)"](
              config.projectOne,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.pricePerTokenInWei.sub(1),
              }
            ),
          revertMessages.needMoreValue
        );
      });

      describe("allows/disallows based on allowed project holder configuration", async function () {
        it("does not allow purchase when using token of unallowed project", async function () {
          const config = await loadFixture(_beforeEach);
          // allow holders of config.projectOne to purchase tokens on config.projectTwo
          await config.minter
            .connect(config.accounts.artist)
            .allowHoldersOfProjects(
              config.projectTwo,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne]
            );
          // configure price per token to be zero
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectTwo,
              config.genArt721Core.address,
              0
            );
          // do not allow purchase when holder token in config.projectZero is used as pass
          await expectRevert(
            config.minter
              .connect(config.accounts.additional)
              ["purchase(uint256,address,address,uint256)"](
                config.projectTwo,
                config.genArt721Core.address,
                config.genArt721Core.address,
                config.projectZeroTokenZero.toNumber(),
                {
                  value: config.pricePerTokenInWei,
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
              config.projectTwo,
              config.genArt721Core.address,
              [config.genArt721Core.address, config.genArt721Core.address],
              [config.projectZero, config.projectOne],
              [config.genArt721Core.address],
              [config.projectZero]
            );
          // configure price per token to be zero
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectTwo,
              config.genArt721Core.address,
              0
            );
          // do not allow purchase when holder token in config.projectZero is used as pass
          await expectRevert(
            config.minter
              .connect(config.accounts.additional)
              ["purchase(uint256,address,address,uint256)"](
                config.projectTwo,
                config.genArt721Core.address,
                config.genArt721Core.address,
                config.projectZeroTokenZero.toNumber(),
                {
                  value: config.pricePerTokenInWei,
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
              config.projectTwo,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectZero]
            );
          // configure price per token to be zero
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectTwo,
              config.genArt721Core.address,
              0
            );
          // does allow purchase when holder token in config.projectZero is used as pass
          await config.minter
            .connect(config.accounts.artist)
            ["purchase(uint256,address,address,uint256)"](
              config.projectTwo,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.pricePerTokenInWei,
              }
            );
        });

        it("does allow purchase when using token of allowed project (when set in bulk)", async function () {
          const config = await loadFixture(_beforeEach);
          // allow holders of config.projectOne and config.projectZero to purchase tokens on config.projectTwo
          await config.minter
            .connect(config.accounts.artist)
            .allowAndRemoveHoldersOfProjects(
              config.projectTwo,
              config.genArt721Core.address,
              [config.genArt721Core.address, config.genArt721Core.address],
              [config.projectOne, config.projectZero],
              [],
              []
            );
          // configure price per token to be zero
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectTwo,
              config.genArt721Core.address,
              0
            );
          // does allow purchase when holder token in config.projectZero is used as pass
          await config.minter
            .connect(config.accounts.artist)
            ["purchase(uint256,address,address,uint256)"](
              config.projectTwo,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.pricePerTokenInWei,
              }
            );
        });

        it("does not allow purchase when using token not owned", async function () {
          const config = await loadFixture(_beforeEach);
          // allow holders of config.projectZero to purchase tokens on config.projectTwo
          await config.minter
            .connect(config.accounts.artist)
            .allowHoldersOfProjects(
              config.projectTwo,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectZero]
            );
          // configure price per token to be zero
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectTwo,
              config.genArt721Core.address,
              0
            );
          // does allow purchase when holder token in config.projectZero is used as pass
          await expectRevert(
            config.minter
              .connect(config.accounts.additional)
              ["purchase(uint256,address,address,uint256)"](
                config.projectTwo,
                config.genArt721Core.address,
                config.genArt721Core.address,
                config.projectZeroTokenZero.toNumber(),
                {
                  value: config.pricePerTokenInWei,
                }
              ),
            "Only owner of NFT"
          );
        });

        it("does not allow purchase when using token of an unallowed project on a different contract", async function () {
          const config = await loadFixture(_beforeEach);
          const { pbabToken, pbabMinter } = await deployAndGetPBAB(config);
          await pbabMinter
            .connect(config.accounts.artist)
            .purchaseTo(config.accounts.additional.address, 0, {
              value: config.pricePerTokenInWei,
            });

          // configure price per token to be zero
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectTwo,
              config.genArt721Core.address,
              0
            );
          // expect failure when using PBAB token because it is not allowlisted for config.projectTwo
          await expectRevert(
            config.minter
              .connect(config.accounts.additional)
              ["purchase(uint256,address,address,uint256)"](
                config.projectTwo,
                config.genArt721Core.address,
                pbabToken.address,
                0,
                {
                  value: config.pricePerTokenInWei,
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
            .purchaseTo(config.accounts.additional.address, 0, {
              value: config.pricePerTokenInWei,
            });

          // allow holders of PBAB project 0 to purchase tokens on config.projectTwo
          await config.minter
            .connect(config.accounts.artist)
            .allowHoldersOfProjects(
              config.projectTwo,
              config.genArt721Core.address,
              [pbabToken.address],
              [0]
            );
          // configure price per token to be zero
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectTwo,
              config.genArt721Core.address,
              0
            );
          // does allow purchase when holder of token in PBAB config.projectZero is used as pass
          await config.minter
            .connect(config.accounts.additional)
            ["purchase(uint256,address,address,uint256)"](
              config.projectTwo,
              config.genArt721Core.address,
              pbabToken.address,
              0,
              {
                value: config.pricePerTokenInWei,
              }
            );
        });
      });

      it("does allow purchase with a price of zero when intentionally configured", async function () {
        const config = await loadFixture(_beforeEach);
        // allow holders of config.projectZero to purchase tokens on config.projectTwo
        await config.minter
          .connect(config.accounts.artist)
          .allowHoldersOfProjects(
            config.projectTwo,
            config.genArt721Core.address,
            [config.genArt721Core.address],
            [config.projectZero]
          );
        // configure price per token to be zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectTwo,
            config.genArt721Core.address,
            0
          );
        // allow purchase when intentionally configured price of zero
        await config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,address,uint256)"](
            config.projectTwo,
            config.genArt721Core.address,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.pricePerTokenInWei,
            }
          );
      });

      it("auto-configures if setProjectMaxInvocations is not called (fails correctly)", async function () {
        const config = await loadFixture(_beforeEach);
        // sync to core projext max maxInvocations
        await config.minter
          .connect(config.accounts.artist)
          .syncProjectMaxInvocationsToCore(
            config.projectOne,
            config.genArt721Core.address
          );
        // allow holders of project zero to mint on project one
        await config.minter
          .connect(config.accounts.artist)
          .allowHoldersOfProjects(
            config.projectOne,
            config.genArt721Core.address,
            [config.genArt721Core.address],
            [config.projectZero]
          );
        for (let i = 0; i < config.maxInvocations; i++) {
          await config.minter
            .connect(config.accounts.artist)
            ["purchase(uint256,address,address,uint256)"](
              config.projectOne,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.pricePerTokenInWei,
              }
            );
        }

        // since auto-configured, we should see the minter's revert message
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            ["purchase(uint256,address,address,uint256)"](
              config.projectOne,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.pricePerTokenInWei,
              }
            ),
          revertMessages.maximumInvocationsReached
        );
      });

      it("doesnt add too much gas if setProjectMaxInvocations is set", async function () {
        const config = await loadFixture(_beforeEach);
        // Try without setProjectMaxInvocations, store gas cost
        const minterType = await config.minter.minterType();
        const accountToTestWith =
          minterType.includes("V0") || minterType.includes("V1")
            ? config.accounts.deployer
            : config.accounts.artist;

        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        const tx = await config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,address,uint256)"](
            config.projectZero,
            config.genArt721Core.address,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.pricePerTokenInWei,
            }
          );

        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        let gasCostNoMaxInvocations: any = receipt.effectiveGasPrice
          .mul(receipt.gasUsed)
          .toString();
        gasCostNoMaxInvocations = parseFloat(
          ethers.utils.formatUnits(gasCostNoMaxInvocations, "ether")
        );

        // Try with setProjectMaxInvocations, store gas cost
        await config.minter
          .connect(accountToTestWith)
          .syncProjectMaxInvocationsToCore(
            config.projectZero,
            config.genArt721Core.address
          );
        const maxSetTx = await config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,address,uint256)"](
            config.projectZero,
            config.genArt721Core.address,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.pricePerTokenInWei,
            }
          );
        const receipt2 = await ethers.provider.getTransactionReceipt(
          maxSetTx.hash
        );
        let gasCostMaxInvocations: any = receipt2.effectiveGasPrice
          .mul(receipt2.gasUsed)
          .toString();
        gasCostMaxInvocations = parseFloat(
          ethers.utils.formatUnits(gasCostMaxInvocations, "ether")
        );

        console.log(
          "Gas cost for a successful mint with setProjectMaxInvocations: ",
          gasCostMaxInvocations.toString(),
          "ETH"
        );
        console.log(
          "Gas cost for a successful mint without setProjectMaxInvocations: ",
          gasCostNoMaxInvocations.toString(),
          "ETH"
        );

        // Check that with setProjectMaxInvocations it's not too much moer expensive
        expect(gasCostMaxInvocations < (gasCostNoMaxInvocations * 110) / 100).to
          .be.true;
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
            config.pricePerTokenInWei.add("1"), // price to pay
            config.genArt721Core.address, // held token address
            config.projectZeroTokenZero.toNumber(), // held token id
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
          config.genArt721Core.address, // held token address
          config.projectZeroTokenZero.toNumber(), // held token id
          {
            value: config.pricePerTokenInWei.add(1),
          }
        );
      });
    });

    describe("purchaseTo", async function () {
      it("allows `purchaseTo` by default", async function () {
        const config = await loadFixture(_beforeEach);
        // configures prices on minter
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        await config.minter
          .connect(config.accounts.artist)
          ["purchaseTo(address,uint256,address,address,uint256)"](
            config.accounts.additional.address,
            config.projectZero,
            config.genArt721Core.address,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.pricePerTokenInWei,
            }
          );
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
              await config.minter
                .connect(config.accounts.artist)
                .updatePricePerTokenInWei(
                  config.projectZero,
                  config.genArt721Core.address,
                  config.pricePerTokenInWei
                );
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
                    value: config.pricePerTokenInWei,
                  }
                );
            });

            it("allows purchases to vault if msg.sender is allowlisted and no vault is provided", async function () {
              // get config from beforeEach
              const config = this.config;
              await config.minter
                .connect(config.accounts.artist)
                .updatePricePerTokenInWei(
                  config.projectZero,
                  config.genArt721Core.address,
                  config.pricePerTokenInWei
                );
              await config.minter
                .connect(config.accounts.artist)
                ["purchaseTo(address,uint256,address,address,uint256)"](
                  config.accounts.additional.address,
                  config.projectZero,
                  config.genArt721Core.address,
                  config.genArt721Core.address,
                  config.projectZeroTokenZero.toNumber(),
                  {
                    value: config.pricePerTokenInWei,
                  }
                );
            });

            it("does not allow purchases with an incorrect token", async function () {
              // get config from beforeEach
              const config = this.config;
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
                  [
                    "purchaseTo(address,uint256,address,address,uint256,address)"
                  ](
                    config.userVault.address,
                    config.projectOne,
                    config.genArt721Core.address,
                    config.genArt721Core.address,
                    config.projectZeroTokenOne.toNumber(),
                    config.userVault.address, //  the vault address has NOT been delegated
                    {
                      value: config.pricePerTokenInWei,
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
            ["purchaseTo(address,uint256,address,address,uint256,address)"](
              config.userVault.address,
              config.projectZero,
              config.genArt721Core.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              config.userVault.address, //  the address has NOT been delegated
              {
                value: config.pricePerTokenInWei,
              }
            ),
          "Invalid delegate-vault pairing"
        );
      });
    });
  });
});
