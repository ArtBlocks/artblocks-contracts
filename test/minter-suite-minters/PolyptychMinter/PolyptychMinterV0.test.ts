import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  compareBN,
  safeAddProject,
} from "../../util/common";

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
    beforeEach(async function () {
      // standard accounts and constants
      this.accounts = await getAccounts();
      await assignDefaultConstants.call(this);
      this.higherPricePerTokenInWei = this.pricePerTokenInWei.add(
        ethers.utils.parseEther("0.1")
      );
      // deploy and configure minter filter and minter
      ({
        genArt721Core: this.genArt721Core,
        minterFilter: this.minterFilter,
        randomizer: this.randomizer,
      } = await deployCoreWithMinterFilter.call(
        this,
        coreContractName,
        "MinterFilterV1",
        false,
        undefined,
        "BasicPolyptychRandomizerV0"
      ));
      ({
        genArt721Core: this.genArt721Core2,
        minterFilter: this.minterFilter2,
        randomizer: this.randomizerBasic,
      } = await deployCoreWithMinterFilter.call(
        this,
        coreContractName,
        "MinterFilterV1",
        false,
        undefined,
        "BasicRandomizerV2"
      ));

      this.delegationRegistry = await deployAndGet.call(
        this,
        "DelegationRegistry",
        []
      );
      this.targetMinterName = TARGET_MINTER_NAME;
      this.minter = await deployAndGet.call(this, this.targetMinterName, [
        this.genArt721Core.address,
        this.minterFilter.address,
        this.delegationRegistry.address,
      ]);

      await safeAddProject(
        this.genArt721Core,
        this.accounts.deployer,
        this.accounts.artist.address
      );
      await safeAddProject(
        this.genArt721Core,
        this.accounts.deployer,
        this.accounts.artist.address
      );
      await safeAddProject(
        this.genArt721Core,
        this.accounts.deployer,
        this.accounts.artist.address
      );
      await safeAddProject(
        this.genArt721Core2,
        this.accounts.deployer,
        this.accounts.artist.address
      );

      await this.genArt721Core
        .connect(this.accounts.deployer)
        .toggleProjectIsActive(this.projectZero);
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .toggleProjectIsActive(this.projectOne);
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .toggleProjectIsActive(this.projectTwo);
      await this.genArt721Core2
        .connect(this.accounts.deployer)
        .toggleProjectIsActive(this.projectZero);

      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectOne, this.maxInvocations);
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectTwo, this.maxInvocations);
      await this.genArt721Core2
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);

      await this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectZero);
      await this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectOne);
      await this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectTwo);
      await this.genArt721Core2
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectZero);

      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectOne, this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectTwo, this.minter.address);

      // set token price for projects zero and one on minter
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectZero, this.pricePerTokenInWei);
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectOne, this.pricePerTokenInWei);

      // artist mints a token on this.projectZero to use as proof of ownership
      const minterFactorySetPrice = await ethers.getContractFactory(
        "MinterSetPriceV2"
      );
      this.minterSetPrice = await minterFactorySetPrice.deploy(
        this.genArt721Core.address,
        this.minterFilter.address
      );
      this.minterSetPrice2 = await minterFactorySetPrice.deploy(
        this.genArt721Core2.address,
        this.minterFilter2.address
      );
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minterSetPrice.address);
      await this.minterFilter2
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minterSetPrice2.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minterSetPrice.address);
      await this.minterFilter2
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minterSetPrice2.address);
      await this.minterSetPrice
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectZero, this.pricePerTokenInWei);
      await this.minterSetPrice2
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectZero, this.pricePerTokenInWei);
      await this.minterSetPrice
        .connect(this.accounts.artist)
        .purchase(this.projectZero, { value: this.pricePerTokenInWei });
      // switch this.projectZero back to MinterPolyptychV0
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minter.address);
      await this.minter
        .connect(this.accounts.deployer)
        .registerNFTAddress(this.genArt721Core.address);
      await this.minter
        .connect(this.accounts.artist)
        .allowHoldersOfProjects(
          this.projectZero,
          [this.genArt721Core.address],
          [this.projectZero]
        );

      await this.randomizer
        .connect(this.accounts.deployer)
        .setHashSeedSetterContract(this.minter.address);
      await this.randomizer
        .connect(this.accounts.artist)
        .toggleProjectIsPolyptych(0);
      await this.randomizer
        .connect(this.accounts.artist)
        .toggleProjectIsPolyptych(1);
      await this.randomizer
        .connect(this.accounts.artist)
        .toggleProjectIsPolyptych(2);

      // mock ERC20 token
      const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
      this.ERC20Mock = await ERC20Factory.connect(this.accounts.artist).deploy(
        ethers.utils.parseEther("100")
      );
    });

    describe("common PolyptychMinter tests", async () => {
      await PolyptychMinter_Common();
    });

    describe("constructor", async function () {
      it("emits an event indicating dependency registry in constructor", async function () {
        const contractFactory = await ethers.getContractFactory(
          this.targetMinterName
        );
        const tx = await contractFactory.deploy(
          this.genArt721Core.address,
          this.minterFilter.address,
          this.delegationRegistry.address
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
          abiCoder.encode(["address"], [this.delegationRegistry.address])
        );
      });
    });

    describe("polyptychPanelMintedWithToken", async function () {
      it("describes the current state of the panel being minted", async function () {
        expect(
          await this.minter
            .connect(this.accounts.artist)
            .polyptychPanelMintedWithToken(
              this.projectZero,
              this.genArt721Core.address,
              this.projectZeroTokenZero.toNumber()
            )
        ).to.be.false;

        // mint a token
        await this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            this.projectZero,
            this.genArt721Core.address,
            this.projectZeroTokenZero.toNumber(),
            {
              value: this.pricePerTokenInWei,
            }
          );

        expect(
          await this.minter
            .connect(this.accounts.artist)
            .polyptychPanelMintedWithToken(
              this.projectZero,
              this.genArt721Core.address,
              this.projectZeroTokenZero.toNumber()
            )
        ).to.be.true;
      });
    });

    describe("setProjectMaxInvocations", async function () {
      it("allows artist to call setProjectMaxInvocations", async function () {
        await this.minter
          .connect(this.accounts.artist)
          .setProjectMaxInvocations(this.projectZero);
      });

      it("resets maxHasBeenInvoked after it's been set to true locally and then max project invocations is synced from the core contract", async function () {
        // reduce local maxInvocations to 2 on minter
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(this.projectZero, 2);
        const localMaxInvocations = await this.minter
          .connect(this.accounts.artist)
          .projectConfig(this.projectZero);
        expect(localMaxInvocations.maxInvocations).to.equal(2);

        // mint a token
        await this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            this.projectZero,
            this.genArt721Core.address,
            this.projectZeroTokenZero.toNumber(),
            {
              value: this.pricePerTokenInWei,
            }
          );

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await this.minter.projectMaxHasBeenInvoked(
          this.projectZero
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // sync max invocations from core to minter
        await this.minter
          .connect(this.accounts.artist)
          .setProjectMaxInvocations(this.projectZero);

        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await this.minter.projectMaxHasBeenInvoked(
          this.projectZero
        );
        expect(hasMaxBeenInvoked2).to.be.false;

        // expect maxInvocations on the minter to be 15
        const syncedMaxInvocations = await this.minter
          .connect(this.accounts.artist)
          .projectConfig(this.projectZero);
        expect(syncedMaxInvocations.maxInvocations).to.equal(15);
      });
    });

    describe("manuallyLimitProjectMaxInvocations", async function () {
      it("allows artist to call manuallyLimitProjectMaxInvocations", async function () {
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            this.projectZero,
            this.maxInvocations - 1
          );
      });
      it("does not support manually setting project max invocations to be greater than the project max invocations set on the core contract", async function () {
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              this.projectZero,
              this.maxInvocations + 1
            ),
          "Cannot increase project max invocations above core contract set project max invocations"
        );
      });
      it("appropriately sets maxHasBeenInvoked after calling manuallyLimitProjectMaxInvocations", async function () {
        // reduce local maxInvocations to 2 on minter
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(this.projectZero, 2);
        const localMaxInvocations = await this.minter
          .connect(this.accounts.artist)
          .projectConfig(this.projectZero);
        expect(localMaxInvocations.maxInvocations).to.equal(2);

        // mint a token
        await this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            this.projectZero,
            this.genArt721Core.address,
            this.projectZeroTokenZero.toNumber(),
            {
              value: this.pricePerTokenInWei,
            }
          );

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await this.minter.projectMaxHasBeenInvoked(
          this.projectZero
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // increase invocations on the minter
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(this.projectZero, 3);

        // expect maxInvocations on the minter to be 3
        const localMaxInvocations2 = await this.minter
          .connect(this.accounts.artist)
          .projectConfig(this.projectZero);
        expect(localMaxInvocations2.maxInvocations).to.equal(3);

        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await this.minter.projectMaxHasBeenInvoked(
          this.projectZero
        );
        expect(hasMaxBeenInvoked2).to.be.false;

        // reduce invocations on the minter
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(this.projectZero, 2);

        // expect maxInvocations on the minter to be 1
        const localMaxInvocations3 = await this.minter
          .connect(this.accounts.artist)
          .projectConfig(this.projectZero);
        expect(localMaxInvocations3.maxInvocations).to.equal(2);

        // expect projectMaxHasBeenInvoked to now be true
        const hasMaxBeenInvoked3 = await this.minter.projectMaxHasBeenInvoked(
          this.projectZero
        );
        expect(hasMaxBeenInvoked3).to.be.true;
      });
    });

    describe("purchase_nnf", async function () {
      it("allows `purchase_nnf` by default", async function () {
        await this.minter
          .connect(this.accounts.artist)
          .purchase_nnf(
            this.projectZero,
            this.genArt721Core.address,
            this.projectZeroTokenZero.toNumber(),
            {
              value: this.pricePerTokenInWei,
            }
          );
      });
    });

    describe("payment splitting", async function () {
      beforeEach(async function () {
        this.deadReceiver = await deployAndGet.call(
          this,
          "DeadReceiverMock",
          []
        );
      });

      it("requires successful payment to render provider", async function () {
        // update platform address to a contract that reverts on receive
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderSalesAddresses(
            this.deadReceiver.address,
            this.accounts.additional2.address,
            this.accounts.additional2.address,
            this.accounts.additional2.address
          );
        // expect revert when trying to purchase
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .purchase_nnf(
              this.projectZero,
              this.genArt721Core.address,
              this.projectZeroTokenZero.toNumber(),
              {
                value: this.pricePerTokenInWei,
              }
            ),
          "Render Provider payment failed"
        );
      });

      it("requires successful payment to platform provider", async function () {
        // update platform address to a contract that reverts on receive
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderSalesAddresses(
            this.accounts.additional2.address,
            this.accounts.additional2.address,
            this.deadReceiver.address,
            this.accounts.additional2.address
          );
        // expect revert when trying to purchase
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .purchase_nnf(
              this.projectZero,
              this.genArt721Core.address,
              this.projectZeroTokenZero.toNumber(),
              {
                value: this.pricePerTokenInWei,
              }
            ),
          "Platform Provider payment failed"
        );
      });

      it("requires successful payment to artist", async function () {
        // update artist address to a contract that reverts on receive
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProjectArtistAddress(
            this.projectZero,
            this.deadReceiver.address
          );
        // expect revert when trying to purchase
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .purchase_nnf(
              this.projectZero,
              this.genArt721Core.address,
              this.projectZeroTokenZero.toNumber(),
              {
                value: this.pricePerTokenInWei,
              }
            ),
          "Artist payment failed"
        );
      });

      it("requires successful payment to artist additional payee", async function () {
        // update artist additional payee to a contract that reverts on receive
        const proposedAddressesAndSplits = [
          this.projectZero,
          this.accounts.artist.address,
          this.deadReceiver.address,
          // @dev 50% to additional, 50% to artist, to ensure additional is paid
          50,
          this.accounts.additional2.address,
          // @dev split for secondary sales doesn't matter for this test
          50,
        ];
        await this.genArt721Core
          .connect(this.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(
            ...proposedAddressesAndSplits
          );
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...proposedAddressesAndSplits);
        // expect revert when trying to purchase
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .purchase_nnf(
              this.projectZero,
              this.genArt721Core.address,
              this.projectZeroTokenZero.toNumber(),
              {
                value: this.pricePerTokenInWei,
              }
            ),
          "Additional Payee payment failed"
        );
      });

      it("handles zero platform and artist payment values", async function () {
        // update artist primary split to zero
        const proposedAddressesAndSplits = [
          this.projectZero,
          this.accounts.artist.address,
          this.accounts.additional.address,
          // @dev 100% to additional, 0% to artist, to induce zero artist payment value
          100,
          this.accounts.additional2.address,
          // @dev split for secondary sales doesn't matter for this test
          50,
        ];
        await this.genArt721Core
          .connect(this.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(
            ...proposedAddressesAndSplits
          );
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...proposedAddressesAndSplits);
        // expect successful purchase
        await this.minter
          .connect(this.accounts.artist)
          .purchase_nnf(
            this.projectZero,
            this.genArt721Core.address,
            this.projectZeroTokenZero.toNumber(),
            {
              value: this.pricePerTokenInWei,
            }
          );
      });
    });

    describe("onlyCoreAdminACL", async function () {
      it("restricts registerNFTAddress to only core admin ACL allowed", async function () {
        await expectRevert(
          this.minter
            .connect(this.accounts.user)
            .registerNFTAddress(this.genArt721Core.address),
          "Only Core AdminACL allowed"
        );
      });
    });

    describe("additional payee payments", async function () {
      it("handles additional payee payments", async function () {
        const valuesToUpdateTo = [
          this.projectZero,
          this.accounts.artist.address,
          this.accounts.additional.address,
          50,
          this.accounts.additional2.address,
          51,
        ];
        await this.genArt721Core
          .connect(this.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo);
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...valuesToUpdateTo);

        await this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            this.projectZero,
            this.genArt721Core.address,
            this.projectZeroTokenZero.toNumber(),
            {
              value: this.pricePerTokenInWei,
            }
          );
      });
    });

    describe("Works for different valid delegation levels", async function () {
      ["delegateForAll", "delegateForContract", "delegateForToken"].forEach(
        (delegationType) => {
          describe(`purchaseTo_dlc with a VALID vault delegate after ${delegationType}`, async function () {
            beforeEach(async function () {
              // artist account holds mint #0 for delegating
              this.artistVault = this.accounts.artist;

              this.userVault = this.accounts.additional2;

              // delegate the vault to the user
              let delegationArgs;
              if (delegationType === "delegateForAll") {
                delegationArgs = [this.accounts.user.address, true];
              } else if (delegationType === "delegateForContract") {
                delegationArgs = [
                  this.accounts.user.address,
                  this.genArt721Core.address,
                  true,
                ];
              } else if (delegationType === "delegateForToken") {
                delegationArgs = [
                  this.accounts.user.address, // delegate
                  this.genArt721Core.address, // contract address
                  this.projectZeroTokenZero.toNumber(), // tokenID
                  true,
                ];
              }
              await this.delegationRegistry
                .connect(this.userVault)
                [delegationType](...delegationArgs);
            });

            it("does allow purchases", async function () {
              // delegate the vault to the user
              await this.delegationRegistry
                .connect(this.artistVault)
                .delegateForToken(
                  this.accounts.user.address, // delegate
                  this.genArt721Core.address, // contract address
                  this.projectZeroTokenZero.toNumber(), // tokenID
                  true
                );

              // expect no revert
              await this.minter
                .connect(this.accounts.user)
                ["purchaseTo(address,uint256,address,uint256,address)"](
                  this.accounts.artist.address,
                  this.projectZero,
                  this.genArt721Core.address,
                  this.projectZeroTokenZero.toNumber(),
                  this.artistVault.address, //  the allowlisted vault address
                  {
                    value: this.pricePerTokenInWei,
                  }
                );
            });

            it("requires the artist to mint to the holder of the previous token", async function () {
              await expectRevert(
                this.minter
                  .connect(this.accounts.artist)
                  ["purchaseTo(address,uint256,address,uint256)"](
                    this.accounts.additional.address,
                    this.projectZero,
                    this.genArt721Core.address,
                    this.projectZeroTokenZero.toNumber(),
                    {
                      value: this.pricePerTokenInWei,
                    }
                  ),
                "Only owner of NFT"
              );
            });

            it("does not allow purchases with an incorrect token", async function () {
              await expectRevert(
                this.minter
                  .connect(this.accounts.user)
                  ["purchaseTo(address,uint256,address,uint256,address)"](
                    this.userVault.address,
                    this.projectOne,
                    this.genArt721Core.address,
                    this.projectZeroTokenOne.toNumber(),
                    this.userVault.address, //  the vault address has NOT been delegated
                    {
                      value: this.pricePerTokenInWei,
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
        // deploy different contract (for this case, use PBAB contract)
        const tokenOwner = this.accounts.additional; // alias for test readability
        const pbabToken = this.genArt721Core2;
        const pbabMinter = this.minterSetPrice2;
        await pbabMinter
          .connect(this.accounts.artist)
          .purchaseTo(tokenOwner.address, 0, {
            value: this.pricePerTokenInWei,
          });
        // register the PBAB token on our minter
        await this.minter
          .connect(this.accounts.deployer)
          .registerNFTAddress(pbabToken.address);
        // allow holders of PBAB project 0 to purchase tokens on this.projectTwo
        await this.minter
          .connect(this.accounts.artist)
          .allowHoldersOfProjects(this.projectTwo, [pbabToken.address], [0]);
        // configure price per token to be zero
        await this.minter
          .connect(this.accounts.artist)
          .updatePricePerTokenInWei(this.projectTwo, 0);
        // additional sets delegate to user2 for the PBAB token
        const delegee = this.accounts.user2; // alias for test readability
        await this.delegationRegistry.connect(tokenOwner).delegateForToken(
          delegee.address, // delegate
          pbabToken.address, // contract address
          0, // tokenID
          true
        );
        // does allow purchase when holder of token in PBAB this.projectZero is used as pass
        await this.minter
          .connect(delegee)
          ["purchaseTo(address,uint256,address,uint256,address)"](
            delegee.address, // address being minted to (irrelevant for this test)
            this.projectTwo, // the project being minted
            pbabToken.address, // the allowlisted token address
            0, // tokenID of the owned token
            tokenOwner.address, // the allowlisted vault address
            {
              value: this.pricePerTokenInWei,
            }
          );
      });
    });

    describe("purchaseTo_dlc with an INVALID vault delegate", async function () {
      it("does NOT allow purchases when no delegation exists", async function () {
        this.userVault = this.accounts.additional2;
        // intentionally do not add any delegations
        await expectRevert(
          this.minter
            .connect(this.accounts.user)
            ["purchaseTo(address,uint256,address,uint256,address)"](
              this.userVault.address,
              this.projectZero,
              this.genArt721Core.address,
              this.projectZeroTokenZero.toNumber(),
              this.userVault.address, //  the address has NOT been delegated
              {
                value: this.pricePerTokenInWei,
              }
            ),
          "Invalid delegate-vault pairing"
        );
      });
    });

    describe("purchase", async function () {
      it("does not allow purchases even if local max invocations value is returning a false negative", async function () {
        // set local max invocations to 2
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(this.projectZero, 2);
        // switch to different minter
        const setPriceFactory = await ethers.getContractFactory(
          "MinterSetPriceV4"
        );
        const setPriceMinter = await setPriceFactory.deploy(
          this.genArt721Core.address,
          this.minterFilter.address
        );
        await this.minterFilter.addApprovedMinter(setPriceMinter.address);
        await this.minterFilter
          .connect(this.accounts.artist)
          .setMinterForProject(0, setPriceMinter.address);
        await this.randomizer
          .connect(this.accounts.artist)
          .toggleProjectIsPolyptych(0);
        // purchase a token on the new minter
        await setPriceMinter
          .connect(this.accounts.artist)
          .updatePricePerTokenInWei(
            this.projectZero,
            ethers.utils.parseEther("0")
          );
        await setPriceMinter
          .connect(this.accounts.artist)
          .purchase(this.projectZero);
        // switch back to original minter
        await this.minterFilter
          .connect(this.accounts.artist)
          .setMinterForProject(0, this.minter.address);
        await this.randomizer
          .connect(this.accounts.artist)
          .toggleProjectIsPolyptych(0);
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .purchase_nnf(
              this.projectZero,
              this.genArt721Core.address,
              this.projectZeroTokenZero.toNumber(),
              {
                value: this.pricePerTokenInWei,
              }
            ),
          "Maximum invocations reached"
        );
      });
    });

    describe("minterVersion", async function () {
      it("correctly reports minterVersion", async function () {
        const minterVersion = await this.minter.minterVersion();
        expect(minterVersion).to.equal(TARGET_MINTER_VERSION);
      });
    });

    describe("calculates gas", async function () {
      it("mints and calculates gas values [ @skip-on-coverage ]", async function () {
        const tx = await this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            this.projectZero,
            this.genArt721Core.address,
            this.projectZeroTokenZero.toNumber(),
            {
              value: this.pricePerTokenInWei,
            }
          );

        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed);

        console.log(
          "Gas cost for a successful mint: ",
          ethers.utils.formatUnits(txCost.toString(), "ether").toString(),
          "ETH"
        );
        expect(compareBN(txCost, ethers.utils.parseEther("0.0187214"), 1)).to.be
          .true;
      });
    });
  });
}
