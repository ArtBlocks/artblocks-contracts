import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  requireBigNumberIsClose,
  safeAddProject,
} from "../../../util/common";

import { PolyptychMinter_Common } from "./PolyptychMinter.common";

import { AbiCoder } from "ethers/lib/utils";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3_Engine", // V3 core engine contract
  "GenArt721CoreV3_Engine_Flex", // V3 core Engine Flex contract
];

const TARGET_MINTER_NAME = "MinterPolyptychV0";
const TARGET_MINTER_VERSION = "v0.1.0";

/**
 * These tests intended to ensure Filtered Minter integrates properly with V3
 * core contract.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${TARGET_MINTER_NAME}_${coreContractName}`, async function () {
    async function _beforeEach() {
      let config: T_Config = {
        accounts: await getAccounts(),
      };
      config = await assignDefaultConstants(config);
      config.higherPricePerTokenInWei = config.pricePerTokenInWei.add(
        ethers.utils.parseEther("0.1")
      );
      // deploy and configure minter filter and minter
      ({
        genArt721Core: config.genArt721Core,
        minterFilter: config.minterFilter,
        randomizer: config.randomizer,
      } = await deployCoreWithMinterFilter(
        config,
        coreContractName,
        "MinterFilterV1",
        false,
        undefined,
        "BasicPolyptychRandomizerV0"
      ));
      ({
        genArt721Core: config.genArt721Core2,
        minterFilter: config.minterFilter2,
        randomizer: config.randomizerBasic,
      } = await deployCoreWithMinterFilter(
        config,
        coreContractName,
        "MinterFilterV1",
        false,
        undefined,
        "BasicRandomizerV2"
      ));

      config.delegationRegistry = await deployAndGet(
        config,
        "DelegationRegistry",
        []
      );
      config.targetMinterName = TARGET_MINTER_NAME;
      config.minter = await deployAndGet(config, config.targetMinterName, [
        config.genArt721Core.address,
        config.minterFilter.address,
        config.delegationRegistry.address,
      ]);

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
      await safeAddProject(
        config.genArt721Core2,
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
      await config.genArt721Core2
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectZero);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, config.maxInvocations);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectTwo, config.maxInvocations);
      await config.genArt721Core2
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectOne);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectTwo);
      await config.genArt721Core2
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectOne, config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectTwo, config.minter.address);

      // set token price for projects zero and one on minter
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.pricePerTokenInWei
        );
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectOne, config.pricePerTokenInWei);

      // artist mints a token on config.projectZero to use as proof of ownership
      const minterFactorySetPrice =
        await ethers.getContractFactory("MinterSetPriceV2");
      config.minterSetPrice = await minterFactorySetPrice.deploy(
        config.genArt721Core.address,
        config.minterFilter.address
      );
      config.minterSetPrice2 = await minterFactorySetPrice.deploy(
        config.genArt721Core2.address,
        config.minterFilter2.address
      );
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minterSetPrice.address);
      await config.minterFilter2
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minterSetPrice2.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minterSetPrice.address);
      await config.minterFilter2
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectZero,
          config.minterSetPrice2.address
        );
      await config.minterSetPrice
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.pricePerTokenInWei
        );
      await config.minterSetPrice2
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.pricePerTokenInWei
        );
      await config.minterSetPrice
        .connect(config.accounts.artist)
        .purchase(config.projectZero, { value: config.pricePerTokenInWei });
      // switch config.projectZero back to MinterPolyptychV0
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      await config.minter
        .connect(config.accounts.deployer)
        .registerNFTAddress(config.genArt721Core.address);
      await config.minter
        .connect(config.accounts.artist)
        .allowHoldersOfProjects(
          config.projectZero,
          [config.genArt721Core.address],
          [config.projectZero]
        );

      await config.randomizer
        .connect(config.accounts.deployer)
        .setHashSeedSetterContract(config.minter.address);
      await config.randomizer
        .connect(config.accounts.artist)
        .toggleProjectIsPolyptych(0);
      await config.randomizer
        .connect(config.accounts.artist)
        .toggleProjectIsPolyptych(1);
      await config.randomizer
        .connect(config.accounts.artist)
        .toggleProjectIsPolyptych(2);

      // mock ERC20 token
      const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
      config.ERC20Mock = await ERC20Factory.connect(
        config.accounts.artist
      ).deploy(ethers.utils.parseEther("100"));
      return config;
    }

    describe("common PolyptychMinter tests", async () => {
      await PolyptychMinter_Common(_beforeEach);
    });

    describe("constructor", async function () {
      it("emits an event indicating dependency registry in constructor", async function () {
        const config = await loadFixture(_beforeEach);
        const contractFactory = await ethers.getContractFactory(
          config.targetMinterName
        );
        const tx = await contractFactory.deploy(
          config.genArt721Core.address,
          config.minterFilter.address,
          config.delegationRegistry.address
        );
        const receipt = await tx.deployTransaction.wait();
        // target event is the last log
        const targetLog = receipt.logs[0];
        // expect "PlatformUpdated" event as log 0
        await expect(targetLog.topics[0]).to.be.equal(
          ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes("DelegationRegistryUpdated(address)")
          )
        );
        // expect field to be address of delegation registry as data 1
        // zero-pad address to 32 bytes when checking against event data
        const abiCoder = new AbiCoder();
        expect(targetLog.data).to.be.equal(
          abiCoder.encode(["address"], [config.delegationRegistry.address])
        );
      });
    });

    describe("polyptychPanelMintedWithToken", async function () {
      it("describes the current state of the panel being minted", async function () {
        const config = await loadFixture(_beforeEach);
        expect(
          await config.minter
            .connect(config.accounts.artist)
            .polyptychPanelMintedWithToken(
              config.projectZero,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber()
            )
        ).to.be.false;

        // mint a token
        await config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            config.projectZero,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.pricePerTokenInWei,
            }
          );

        expect(
          await config.minter
            .connect(config.accounts.artist)
            .polyptychPanelMintedWithToken(
              config.projectZero,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber()
            )
        ).to.be.true;
      });
    });

    describe("setProjectMaxInvocations", async function () {
      it("allows artist to call setProjectMaxInvocations", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .setProjectMaxInvocations(config.projectZero);
      });

      it("resets maxHasBeenInvoked after it's been set to true locally and then max project invocations is synced from the core contract", async function () {
        const config = await loadFixture(_beforeEach);
        // reduce local maxInvocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectZero, 2);
        const localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .projectConfig(config.projectZero);
        expect(localMaxInvocations.maxInvocations).to.equal(2);

        // mint a token
        await config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            config.projectZero,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.pricePerTokenInWei,
            }
          );

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // sync max invocations from core to minter
        await config.minter
          .connect(config.accounts.artist)
          .setProjectMaxInvocations(config.projectZero);

        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero
        );
        expect(hasMaxBeenInvoked2).to.be.false;

        // expect maxInvocations on the minter to be 15
        const syncedMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .projectConfig(config.projectZero);
        expect(syncedMaxInvocations.maxInvocations).to.equal(15);
      });
    });

    describe("manuallyLimitProjectMaxInvocations", async function () {
      it("allows artist to call manuallyLimitProjectMaxInvocations", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.maxInvocations - 1
          );
      });
      it("does not support manually setting project max invocations to be greater than the project max invocations set on the core contract", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.maxInvocations + 1
            ),
          "Cannot increase project max invocations above core contract set project max invocations"
        );
      });
      it("appropriately sets maxHasBeenInvoked after calling manuallyLimitProjectMaxInvocations", async function () {
        const config = await loadFixture(_beforeEach);
        // reduce local maxInvocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectZero, 2);
        const localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .projectConfig(config.projectZero);
        expect(localMaxInvocations.maxInvocations).to.equal(2);

        // mint a token
        await config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            config.projectZero,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.pricePerTokenInWei,
            }
          );

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // increase invocations on the minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectZero, 3);

        // expect maxInvocations on the minter to be 3
        const localMaxInvocations2 = await config.minter
          .connect(config.accounts.artist)
          .projectConfig(config.projectZero);
        expect(localMaxInvocations2.maxInvocations).to.equal(3);

        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero
        );
        expect(hasMaxBeenInvoked2).to.be.false;

        // reduce invocations on the minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectZero, 2);

        // expect maxInvocations on the minter to be 1
        const localMaxInvocations3 = await config.minter
          .connect(config.accounts.artist)
          .projectConfig(config.projectZero);
        expect(localMaxInvocations3.maxInvocations).to.equal(2);

        // expect projectMaxHasBeenInvoked to now be true
        const hasMaxBeenInvoked3 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero
        );
        expect(hasMaxBeenInvoked3).to.be.true;
      });
    });

    describe("purchase_nnf", async function () {
      it("allows `purchase_nnf` by default", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .purchase_nnf(
            config.projectZero,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.pricePerTokenInWei,
            }
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
        // update platform address to a contract that reverts on receive
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProviderSalesAddresses(
            config.deadReceiver.address,
            config.accounts.additional2.address,
            config.accounts.additional2.address,
            config.accounts.additional2.address
          );
        // expect revert when trying to purchase
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .purchase_nnf(
              config.projectZero,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.pricePerTokenInWei,
              }
            ),
          "Render Provider payment failed"
        );
      });

      it("requires successful payment to platform provider", async function () {
        // get config from beforeEach
        const config = this.config;
        // update platform address to a contract that reverts on receive
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProviderSalesAddresses(
            config.accounts.additional2.address,
            config.accounts.additional2.address,
            config.deadReceiver.address,
            config.accounts.additional2.address
          );
        // expect revert when trying to purchase
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .purchase_nnf(
              config.projectZero,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.pricePerTokenInWei,
              }
            ),
          "Platform Provider payment failed"
        );
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
        // expect revert when trying to purchase
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .purchase_nnf(
              config.projectZero,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.pricePerTokenInWei,
              }
            ),
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
        // expect revert when trying to purchase
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .purchase_nnf(
              config.projectZero,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.pricePerTokenInWei,
              }
            ),
          "Additional Payee payment failed"
        );
      });

      it("handles zero platform and artist payment values", async function () {
        // get config from beforeEach
        const config = this.config;
        // update artist primary split to zero
        const proposedAddressesAndSplits = [
          config.projectZero,
          config.accounts.artist.address,
          config.accounts.additional.address,
          // @dev 100% to additional, 0% to artist, to induce zero artist payment value
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
          .purchase_nnf(
            config.projectZero,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.pricePerTokenInWei,
            }
          );
      });
    });

    describe("onlyCoreAdminACL", async function () {
      it("restricts registerNFTAddress to only core admin ACL allowed", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .registerNFTAddress(config.genArt721Core.address),
          "Only Core AdminACL allowed"
        );
      });
    });

    describe("additional payee payments", async function () {
      it("handles additional payee payments", async function () {
        const config = await loadFixture(_beforeEach);
        const valuesToUpdateTo = [
          config.projectZero,
          config.accounts.artist.address,
          config.accounts.additional.address,
          50,
          config.accounts.additional2.address,
          51,
        ];
        await config.genArt721Core
          .connect(config.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...valuesToUpdateTo);

        await config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            config.projectZero,
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
          describe(`purchaseTo_dlc with a VALID vault delegate after ${delegationType}`, async function () {
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
              // delegate the vault to the user
              await config.delegationRegistry
                .connect(config.artistVault)
                .delegateForToken(
                  config.accounts.user.address, // delegate
                  config.genArt721Core.address, // contract address
                  config.projectZeroTokenZero.toNumber(), // tokenID
                  true
                );

              // expect no revert
              await config.minter
                .connect(config.accounts.user)
                ["purchaseTo(address,uint256,address,uint256,address)"](
                  config.accounts.artist.address,
                  config.projectZero,
                  config.genArt721Core.address,
                  config.projectZeroTokenZero.toNumber(),
                  config.artistVault.address, //  the allowlisted vault address
                  {
                    value: config.pricePerTokenInWei,
                  }
                );
            });

            it("requires the artist to mint to the holder of the previous token", async function () {
              // get config from beforeEach
              const config = this.config;
              await expectRevert(
                config.minter
                  .connect(config.accounts.artist)
                  ["purchaseTo(address,uint256,address,uint256)"](
                    config.accounts.additional.address,
                    config.projectZero,
                    config.genArt721Core.address,
                    config.projectZeroTokenZero.toNumber(),
                    {
                      value: config.pricePerTokenInWei,
                    }
                  ),
                "Only owner of NFT"
              );
            });

            it("does not allow purchases with an incorrect token", async function () {
              // get config from beforeEach
              const config = this.config;
              await expectRevert(
                config.minter
                  .connect(config.accounts.user)
                  ["purchaseTo(address,uint256,address,uint256,address)"](
                    config.userVault.address,
                    config.projectOne,
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

    describe("Works for delegation with different contract", async function () {
      it("enables delegation when owned token is on different contracts", async function () {
        const config = await loadFixture(_beforeEach);
        // deploy different contract (for config case, use PBAB contract)
        const tokenOwner = config.accounts.additional; // alias for test readability
        const pbabToken = config.genArt721Core2;
        const pbabMinter = config.minterSetPrice2;
        await pbabMinter
          .connect(config.accounts.artist)
          .purchaseTo(tokenOwner.address, 0, {
            value: config.pricePerTokenInWei,
          });
        // register the PBAB token on our minter
        await config.minter
          .connect(config.accounts.deployer)
          .registerNFTAddress(pbabToken.address);
        // allow holders of PBAB project 0 to purchase tokens on config.projectTwo
        await config.minter
          .connect(config.accounts.artist)
          .allowHoldersOfProjects(config.projectTwo, [pbabToken.address], [0]);
        // configure price per token to be zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(config.projectTwo, 0);
        // additional sets delegate to user2 for the PBAB token
        const delegee = config.accounts.user2; // alias for test readability
        await config.delegationRegistry.connect(tokenOwner).delegateForToken(
          delegee.address, // delegate
          pbabToken.address, // contract address
          0, // tokenID
          true
        );
        // does allow purchase when holder of token in PBAB config.projectZero is used as pass
        await config.minter
          .connect(delegee)
          ["purchaseTo(address,uint256,address,uint256,address)"](
            delegee.address, // address being minted to (irrelevant for config test)
            config.projectTwo, // the project being minted
            pbabToken.address, // the allowlisted token address
            0, // tokenID of the owned token
            tokenOwner.address, // the allowlisted vault address
            {
              value: config.pricePerTokenInWei,
            }
          );
      });
    });

    describe("purchaseTo_dlc with an INVALID vault delegate", async function () {
      it("does NOT allow purchases when no delegation exists", async function () {
        const config = await loadFixture(_beforeEach);
        config.userVault = config.accounts.additional2;
        // intentionally do not add any delegations
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            ["purchaseTo(address,uint256,address,uint256,address)"](
              config.userVault.address,
              config.projectZero,
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

    describe("purchase", async function () {
      it("does not allow purchases even if local max invocations value is returning a false negative", async function () {
        const config = await loadFixture(_beforeEach);
        // set local max invocations to 2
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectZero, 2);
        // switch to different minter
        const setPriceFactory =
          await ethers.getContractFactory("MinterSetPriceV4");
        const setPriceMinter = await setPriceFactory.deploy(
          config.genArt721Core.address,
          config.minterFilter.address
        );
        await config.minterFilter.addApprovedMinter(setPriceMinter.address);
        await config.minterFilter
          .connect(config.accounts.artist)
          .setMinterForProject(0, setPriceMinter.address);
        await config.randomizer
          .connect(config.accounts.artist)
          .toggleProjectIsPolyptych(0);
        // purchase a token on the new minter
        await setPriceMinter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            ethers.utils.parseEther("0")
          );
        await setPriceMinter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        // switch back to original minter
        await config.minterFilter
          .connect(config.accounts.artist)
          .setMinterForProject(0, config.minter.address);
        await config.randomizer
          .connect(config.accounts.artist)
          .toggleProjectIsPolyptych(0);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .purchase_nnf(
              config.projectZero,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.pricePerTokenInWei,
              }
            ),
          "Maximum invocations reached"
        );
      });
    });

    describe("minterVersion", async function () {
      it("correctly reports minterVersion", async function () {
        const config = await loadFixture(_beforeEach);
        const minterVersion = await config.minter.minterVersion();
        expect(minterVersion).to.equal(TARGET_MINTER_VERSION);
      });
    });

    describe("calculates gas", async function () {
      it("mints and calculates gas values [ @skip-on-coverage ]", async function () {
        const config = await loadFixture(_beforeEach);
        const tx = await config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            config.projectZero,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.pricePerTokenInWei,
            }
          );

        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed);

        console.log(
          "Gas cost for a successful mint: ",
          ethers.utils.formatUnits(txCost.toString(), "ether").toString(),
          "ETH"
        );
        requireBigNumberIsClose(txCost, ethers.utils.parseEther("0.0187214"));
      });
    });
  });
}
