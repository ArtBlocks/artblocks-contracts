const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
import chai, { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Logger } from "@ethersproject/logger";
import { expectRevert } from "@openzeppelin/test-helpers";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  requireBigNumberIsClose,
  safeAddProject,
} from "../../../util/common";

import { MinterMerkle_Common, hashAddress } from "./MinterMerkle.common";
import { BigNumber } from "ethers";
import { AbiCoder } from "ethers/lib/utils";

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  "GenArt721CoreV3_Explorations", // V3 core explorations contract
  "GenArt721CoreV3_Engine", // V3 core engine contract
  "GenArt721CoreV3_Engine_Flex", // V3 core Engine Flex contract
];

const TARGET_MINTER_NAME = "MinterMerkleV5";
const TARGET_MINTER_VERSION = "v5.1.0";

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
        "MinterFilterV1"
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
      config.isEngine = await config.minter.isEngine();

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
        .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, config.maxInvocations);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectTwo, config.maxInvocations);

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

      // set genArt721Core price for projects zero and one on minter
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.pricePerTokenInWei
        );
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectOne, config.pricePerTokenInWei);

      // populate Merkle elements for projects zero, one, and two
      const elementsProjectZero = [];
      const elementsProjectOne = [];
      const elementsProjectTwo = [];

      elementsProjectZero.push(
        config.accounts.deployer.address,
        config.accounts.artist.address,
        config.accounts.additional.address,
        config.accounts.user.address,
        config.accounts.user2.address
      );
      elementsProjectOne.push(
        config.accounts.user.address,
        config.accounts.additional2.address
      );
      elementsProjectTwo.push(config.accounts.additional.address);

      // build Merkle trees for projects zero, one, and two
      config.merkleTreeZero = new MerkleTree(
        elementsProjectZero.map((_addr) => hashAddress(_addr)),
        keccak256,
        {
          sortPairs: true,
        }
      );
      config.merkleTreeOne = new MerkleTree(
        elementsProjectOne.map((_addr) => hashAddress(_addr)),
        keccak256,
        {
          sortPairs: true,
        }
      );
      config.merkleTreeTwo = new MerkleTree(
        elementsProjectTwo.map((_addr) => hashAddress(_addr)),
        keccak256,
        {
          sortPairs: true,
        }
      );

      // update Merkle root for projects zero and one on minter
      const merkleRootZero = config.merkleTreeZero.getHexRoot();
      const merkleRootOne = config.merkleTreeOne.getHexRoot();
      // Merkle root two intentionally not set
      await config.minter
        .connect(config.accounts.artist)
        .updateMerkleRoot(config.projectZero, merkleRootZero);
      await config.minter
        .connect(config.accounts.artist)
        .updateMerkleRoot(config.projectOne, merkleRootOne);

      // mock ERC20 genArt721Core
      const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
      config.ERC20Mock = await ERC20Factory.deploy(
        ethers.utils.parseEther("100")
      );
      return config;
    }

    describe("common MinterMerkle tests", async () => {
      await MinterMerkle_Common(_beforeEach);
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
        // target event "DelegationRegistryUpdated" is the log at index 0
        const targetLog = receipt.logs[0];
        // expect log 0 to be keccak256 of event signature
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
          .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
        const localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .projectConfig(config.projectZero);
        expect(localMaxInvocations.maxInvocations).to.equal(1);

        // mint a token
        const userMerkleProofZero = config.merkleTreeZero.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectZero, userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          });

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
          .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
        const localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .projectConfig(config.projectZero);
        expect(localMaxInvocations.maxInvocations).to.equal(1);

        const userMerkleProofZero = config.merkleTreeZero.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectZero, userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          });

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
          .manuallyLimitProjectMaxInvocations(config.projectZero, 1);

        // expect maxInvocations on the minter to be 1
        const localMaxInvocations3 = await config.minter
          .connect(config.accounts.artist)
          .projectConfig(config.projectZero);
        expect(localMaxInvocations3.maxInvocations).to.equal(1);

        // expect projectMaxHasBeenInvoked to now be true
        const hasMaxBeenInvoked3 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero
        );
        expect(hasMaxBeenInvoked3).to.be.true;
      });
    });

    describe("purchase_gD5", async function () {
      it("allows `purchase_gD5` by default", async function () {
        const config = await loadFixture(_beforeEach);
        const userMerkleProofOne = config.merkleTreeOne.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        await config.minter
          .connect(config.accounts.user)
          .purchase_gD5(config.projectOne, userMerkleProofOne, {
            value: config.pricePerTokenInWei,
          });
      });
    });

    describe("payment splitting", async function () {
      beforeEach(async function () {
        const config = await loadFixture(_beforeEach);
        config.userMerkleProofZero = config.merkleTreeZero.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        config.userMerkleProofOne = config.merkleTreeOne.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        config.additionalMerkleProofTwo = config.merkleTreeTwo.getHexProof(
          hashAddress(config.accounts.additional.address)
        );
        config.deadReceiver = await deployAndGet(
          config,
          "DeadReceiverMock",
          []
        );
        // pass config to tests in this describe block
        this.config = config;
      });

      it("requires successful payment to platform", async function () {
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
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            [
              "purchase(uint256,bytes32[])"
            ](config.projectZero, config.userMerkleProofZero, {
              value: config.pricePerTokenInWei,
            }),
          "Render Provider payment failed"
        );
      });

      it("requires successful payment to platform provider", async function () {
        // get config from beforeEach
        const config = this.config;
        // update platform provider address to a contract that reverts on receive
        // call appropriate core function to update render provider address
        if (config.isEngine) {
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProviderSalesAddresses(
              config.accounts.artist.address,
              config.accounts.additional.address,
              config.deadReceiver.address,
              config.accounts.additional2.address
            );
          // expect revert when trying to purchase
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              [
                "purchase(uint256,bytes32[])"
              ](config.projectZero, config.userMerkleProofZero, {
                value: config.pricePerTokenInWei,
              }),
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
        // expect revert when trying to purchase
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            [
              "purchase(uint256,bytes32[])"
            ](config.projectZero, config.userMerkleProofZero, {
              value: config.pricePerTokenInWei,
            }),
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
            .connect(config.accounts.user)
            [
              "purchase(uint256,bytes32[])"
            ](config.projectZero, config.userMerkleProofZero, {
              value: config.pricePerTokenInWei,
            }),
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
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectZero, config.userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          });
      });
    });

    describe("additional payee payments", async function () {
      it("handles additional payee payments", async function () {
        const config = await loadFixture(_beforeEach);
        const userMerkleProofOne = config.merkleTreeOne.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        const valuesToUpdateTo = [
          config.projectOne,
          config.accounts.artist2.address,
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
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectOne, userMerkleProofOne, {
            value: config.pricePerTokenInWei,
          });
      });
    });

    describe("Works for different valid delegation levels", async function () {
      ["delegateForAll", "delegateForContract"].forEach((delegationType) => {
        describe(`purchaseTo_kem with a VALID vault delegate after ${delegationType}`, async function () {
          beforeEach(async function () {
            const config = await loadFixture(_beforeEach);
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
              .connect(config.userVault)
              .delegateForAll(config.accounts.user.address, true);

            const userMerkleProofOne = config.merkleTreeOne.getHexProof(
              hashAddress(config.userVault.address)
            );

            // expect no revert
            await config.minter
              .connect(config.accounts.user)
              ["purchaseTo(address,uint256,bytes32[],address)"](
                config.userVault.address,
                config.projectOne,
                userMerkleProofOne,
                config.userVault.address, //  the allowlisted address
                {
                  value: config.pricePerTokenInWei,
                }
              );
          });

          it("allows purchases to vault if msg.sender is allowlisted and no vault is provided", async function () {
            // get config from beforeEach
            const config = this.config;
            const userMerkleProofOne = config.merkleTreeOne.getHexProof(
              hashAddress(config.accounts.user.address)
            );
            await config.minter
              .connect(config.accounts.user)
              [
                "purchaseTo(address,uint256,bytes32[])"
              ](config.userVault.address, config.projectOne, userMerkleProofOne, {
                value: config.pricePerTokenInWei,
              });
          });

          it("does not allow purchases with an incorrect proof", async function () {
            // get config from beforeEach
            const config = this.config;
            const userMerkleProofOne = config.merkleTreeOne.getHexProof(
              hashAddress(config.accounts.user.address)
            );

            await expectRevert(
              config.minter
                .connect(config.accounts.user)
                ["purchaseTo(address,uint256,bytes32[],address)"](
                  config.userVault.address,
                  config.projectOne,
                  userMerkleProofOne,
                  config.userVault.address, //  the allowlisted address
                  {
                    value: config.pricePerTokenInWei,
                  }
                ),
              "Invalid Merkle proof"
            );
          });

          it("vault cannot exceed mint limit", async function () {
            // get config from beforeEach
            const config = this.config;
            const userMerkleProofOne = config.merkleTreeOne.getHexProof(
              hashAddress(config.userVault.address)
            );

            await config.minter
              .connect(config.accounts.user)
              ["purchaseTo(address,uint256,bytes32[],address)"](
                config.userVault.address,
                config.projectOne,
                userMerkleProofOne,
                config.userVault.address, //  the allowlisted address
                {
                  value: config.pricePerTokenInWei,
                }
              );

            await expectRevert(
              config.minter
                .connect(config.accounts.user)
                ["purchaseTo(address,uint256,bytes32[],address)"](
                  config.userVault.address,
                  config.projectOne,
                  userMerkleProofOne,
                  config.userVault.address, //  the allowlisted address
                  {
                    value: config.pricePerTokenInWei,
                  }
                ),
              "Maximum number of invocations per address reached"
            );
          });
        });
      });
    });

    describe("purchaseTo_kem with an INVALID vault delegate", async function () {
      beforeEach(async function () {
        const config = await loadFixture(_beforeEach);
        config.userVault = config.accounts.additional2;
        // intentionally do add any delegations
        // pass config to tests in this describe block
        this.config = config;
      });

      it("does NOT allow purchases when no delegation has been set", async function () {
        // get config from beforeEach
        const config = this.config;
        const userMerkleProofOne = config.merkleTreeOne.getHexProof(
          hashAddress(config.userVault.address)
        );

        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            ["purchaseTo(address,uint256,bytes32[],address)"](
              config.userVault.address,
              config.projectOne,
              userMerkleProofOne,
              config.userVault.address, //  the allowlisted address
              {
                value: config.pricePerTokenInWei,
              }
            ),
          "Invalid delegate-vault pairing"
        );
      });

      it("does NOT allow purchases when a token-level delegation has been set", async function () {
        // get config from beforeEach
        const config = this.config;
        await config.delegationRegistry
          .connect(config.userVault)
          .delegateForToken(
            config.accounts.user.address,
            config.genArt721Core.address,
            0, // token id zero
            true
          );
        const userMerkleProofOne = config.merkleTreeOne.getHexProof(
          hashAddress(config.userVault.address)
        );

        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            ["purchaseTo(address,uint256,bytes32[],address)"](
              config.userVault.address,
              config.projectOne,
              userMerkleProofOne,
              config.userVault.address, //  the allowlisted address
              {
                value: config.pricePerTokenInWei,
              }
            ),
          "Invalid delegate-vault pairing"
        );
      });

      it("does NOT allow purchases when a contract-level delegation has been set for a different contract", async function () {
        // get config from beforeEach
        const config = this.config;
        await config.delegationRegistry
          .connect(config.userVault)
          .delegateForContract(
            config.accounts.user.address,
            config.minter.address,
            true
          );
        const userMerkleProofOne = config.merkleTreeOne.getHexProof(
          hashAddress(config.userVault.address)
        );

        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            ["purchaseTo(address,uint256,bytes32[],address)"](
              config.userVault.address,
              config.projectOne,
              userMerkleProofOne,
              config.userVault.address, //  the allowlisted address
              {
                value: config.pricePerTokenInWei,
              }
            ),
          "Invalid delegate-vault pairing"
        );
      });

      it("does NOT allow purchases when a wallet-level delegation has been set for a different hotwallet", async function () {
        // get config from beforeEach
        const config = this.config;
        await config.delegationRegistry
          .connect(config.userVault)
          .delegateForAll(config.accounts.user2.address, true);
        const userMerkleProofOne = config.merkleTreeOne.getHexProof(
          hashAddress(config.userVault.address)
        );

        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            ["purchaseTo(address,uint256,bytes32[],address)"](
              config.userVault.address,
              config.projectOne,
              userMerkleProofOne,
              config.userVault.address, //  the allowlisted address
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
        // set local max invocations to 1
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectOne, 1);
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
          .setMinterForProject(1, setPriceMinter.address);
        // purchase a token on the new minter
        await setPriceMinter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectOne,
            ethers.utils.parseEther("0")
          );
        await setPriceMinter
          .connect(config.accounts.artist)
          .purchase(config.projectOne);
        // switch back to original minter
        await config.minterFilter
          .connect(config.accounts.artist)
          .setMinterForProject(1, config.minter.address);
        const userMerkleProofOne = config.merkleTreeOne.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase_gD5(config.projectOne, userMerkleProofOne, {
              value: config.pricePerTokenInWei,
            }),
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
        const userMerkleProofOne = config.merkleTreeOne.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        const tx = await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectOne, userMerkleProofOne, {
            value: config.pricePerTokenInWei,
          });

        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed);

        console.log(
          "Gas cost for a successful mint: ",
          ethers.utils.formatUnits(txCost.toString(), "ether").toString(),
          "ETH"
        );
        // assuming a cost of 100 GWEI
        // skip gas tests for engine, flagship is sufficient to identify gas cost changes
        if (!config.isEngine) {
          requireBigNumberIsClose(txCost, ethers.utils.parseEther("0.0155614"));
        }
      });

      it("is gas performant at 1k length allowlist [ @skip-on-coverage ]", async function () {
        const config = await loadFixture(_beforeEach);
        // build new Merkle tree from 1k addresses, including user's address
        const _allowlist = [config.accounts.user.address];
        const crypto = require("crypto");
        for (let i = 1; i < 1000; i++) {
          const _pk = crypto.randomBytes(32).toString("hex");
          const _addr = ethers.utils.computeAddress("0x" + _pk);
          _allowlist.push(_addr);
        }
        const _merkleTree = new MerkleTree(
          _allowlist.map((_addr) => hashAddress(_addr)),
          keccak256,
          {
            sortPairs: true,
          }
        );
        // update Merkle root
        await config.minter
          .connect(config.accounts.artist)
          .updateMerkleRoot(config.projectOne, _merkleTree.getRoot());
        // user mint with new Merkle proof
        const userMerkleProof = _merkleTree.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        const tx = await config.minter
          .connect(config.accounts.user)
          ["purchase(uint256,bytes32[])"](config.projectOne, userMerkleProof, {
            value: config.pricePerTokenInWei,
          });

        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed);
        console.log(
          "Gas cost for a successful 1k allowlist mint: ",
          ethers.utils.formatUnits(txCost, "ether").toString(),
          "ETH"
        );
        // the following is not much more than the gas cost with a very small allowlist
        // assuming a cost of 100 GWEI
        // skip gas tests for engine, flagship is sufficient to identify gas cost changes
        if (!config.isEngine) {
          requireBigNumberIsClose(txCost, ethers.utils.parseEther("0.0165514"));
        }
      });
    });

    describe("isEngine", async function () {
      it("correctly reports isEngine", async function () {
        const config = await loadFixture(_beforeEach);
        const coreType = await config.genArt721Core.coreType();
        expect(coreType === "GenArt721CoreV3").to.be.equal(!config.isEngine);
      });
    });
  });
}

// single-iteration tests with mock core contract(s)
describe(`${TARGET_MINTER_NAME} tests using mock core contract(s)`, async function () {
  async function _beforeEach() {
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);
    return config;
  }

  describe("constructor", async function () {
    it("requires correct quantity of return values from `getPrimaryRevenueSplits`", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy and configure core contract that returns incorrect quanty of return values for coreType response
      const coreContractName = "GenArt721CoreV3_Engine_IncorrectCoreType";
      const { genArt721Core, minterFilter, randomizer } =
        await deployCoreWithMinterFilter(
          config,
          coreContractName,
          "MinterFilterV1"
        );

      const delegationRegistry = await deployAndGet(
        config,
        "DelegationRegistry",
        []
      );
      const minterFactory = await ethers.getContractFactory(TARGET_MINTER_NAME);
      // we should revert during deployment because the core contract returns an incorrect number of return values
      // for the given coreType response
      await expectRevert(
        minterFactory.deploy(
          genArt721Core.address,
          minterFilter.address,
          delegationRegistry.address,
          {
            gasLimit: 30000000,
          }
        ),
        "Unexpected revenue split bytes"
      );
    });
  });
});
