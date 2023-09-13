import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import {
  deployAndGet,
  deployCore,
  safeAddProject,
  hashAddress,
} from "../../../util/common";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const TARGET_MINTER_NAME = "MinterSetPriceMerkleV5";
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
  describe(`MinterSetPriceMerkle Integration w/ core ${params.core}`, async function () {
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
        .updateProjectMaxInvocations(config.projectZero, 16);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, 16);

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
      // switch config.projectZero back
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectZero,
          config.genArt721Core.address,
          config.minter.address
        );

      // populate Merkle elements for projects zero, one, and two
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
        .updateMerkleRoot(
          config.projectZero,
          config.genArt721Core.address,
          merkleRootZero
        );
      await config.minter
        .connect(config.accounts.artist)
        .updateMerkleRoot(
          config.projectOne,
          config.genArt721Core.address,
          merkleRootOne
        );

      config.userVault = config.accounts.additional2;

      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(
          config.projectZero,
          config.genArt721Core.address,
          16
        );
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(
          config.projectOne,
          config.genArt721Core.address,
          16
        );

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
        // await setPriceMinter
        //   .connect(config.accounts.artist)
        //   .purchase(config.projectZero, config.genArt721Core.address);
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

        const userMerkleProofZero = config.merkleTreeZero.getHexProof(
          hashAddress(config.accounts.user.address)
        );

        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            ["purchase(uint256,address,bytes32[])"](
              config.projectZero,
              config.genArt721Core.address,
              userMerkleProofZero,
              {
                value: config.higherPricePerTokenInWei,
              }
            ),
          revertMessages.maximumInvocationsReached
        );
      });

      it("does not allow purchase prior to configuring price", async function () {
        const config = await loadFixture(_beforeEach);
        const userMerkleProofZero = config.merkleTreeZero.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            ["purchase(uint256,address,bytes32[])"](
              config.projectZero,
              config.genArt721Core.address,
              userMerkleProofZero,
              {
                value: config.higherPricePerTokenInWei,
              }
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
        const userMerkleProofZero = config.merkleTreeZero.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        for (let i = 0; i < 15; i++) {
          await config.minter
            .connect(config.accounts.user)
            ["purchase(uint256,address,bytes32[])"](
              config.projectZero,
              config.genArt721Core.address,
              userMerkleProofZero,
              {
                value: config.higherPricePerTokenInWei,
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
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          const userMerkleProofZero = config.merkleTreeZero.getHexProof(
            hashAddress(config.accounts.user.address)
          );
          // expect revert when trying to purchase
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              ["purchase(uint256,address,bytes32[])"](
                config.projectZero,
                config.genArt721Core.address,
                userMerkleProofZero,
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
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectOne,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
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
            await config.delegationRegistry
              .connect(config.userVault)
              .delegateForAll(config.accounts.user.address, true);
            const userMerkleProofOne = config.merkleTreeOne.getHexProof(
              hashAddress(config.userVault.address)
            );
            await expectRevert(
              config.minter
                .connect(config.accounts.user)
                ["purchaseTo(address,uint256,address,bytes32[],address)"](
                  config.userVault.address,
                  config.projectOne,
                  config.genArt721Core.address,
                  userMerkleProofOne,
                  config.userVault.address, //  the allowlisted address
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
          const userMerkleProofZero = config.merkleTreeZero.getHexProof(
            hashAddress(config.accounts.user.address)
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              ["purchase(uint256,address,bytes32[])"](
                config.projectZero,
                config.genArt721Core.address,
                userMerkleProofZero,
                {
                  value: config.higherPricePerTokenInWei,
                }
              ),
            "Artist payment failed"
          );
        });

        it("requires successful payment to artist additional payee", async function () {
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
          const userMerkleProofZero = config.merkleTreeZero.getHexProof(
            hashAddress(config.accounts.user.address)
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              ["purchase(uint256,address,bytes32[])"](
                config.projectZero,
                config.genArt721Core.address,
                userMerkleProofZero,
                {
                  value: config.higherPricePerTokenInWei,
                }
              ),
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
          // expect successful purchase'
          const userMerkleProofZero = config.merkleTreeZero.getHexProof(
            hashAddress(config.accounts.user.address)
          );
          await config.minter
            .connect(config.accounts.user)
            ["purchase(uint256,address,bytes32[])"](
              config.projectZero,
              config.genArt721Core.address,
              userMerkleProofZero,
              {
                value: config.higherPricePerTokenInWei,
              }
            );
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
          "ReentrancyMerkleMockShared",
          []
        );

        // artist generates a Merkle tree that includes malicious contract
        const attackerAddress = reentrancy.address;

        const elementsProjectZeroWithAttacker = [];

        elementsProjectZeroWithAttacker.push(
          config.accounts.deployer.address,
          config.accounts.artist.address,
          attackerAddress,
          config.accounts.user.address,
          config.accounts.user2.address
        );

        // build Merkle trees for projects zero, one, and two
        const merkleTreeZero = new MerkleTree(
          elementsProjectZeroWithAttacker.map((_addr) => hashAddress(_addr)),
          keccak256,
          {
            sortPairs: true,
          }
        );

        // artists updates project Merkle root
        await config.minter
          .connect(config.accounts.artist)
          .updateMerkleRoot(
            config.projectZero,
            config.genArt721Core.address,
            merkleTreeZero.getHexRoot()
          );

        // attacker calculates Merkle proof for malicious contract
        const attackerMerkleProofZero = merkleTreeZero.getHexProof(
          hashAddress(attackerAddress)
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
            attackerMerkleProofZero, // Merkle proof
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
          attackerMerkleProofZero, // Merkle proof
          {
            value: config.pricePerTokenInWei.add(1),
          }
        );
      });
    });

    describe("purchaseTo", async function () {
      it("does not allow purchase prior to configuring price", async function () {
        const config = await loadFixture(_beforeEach);

        await config.delegationRegistry
          .connect(config.userVault)
          .delegateForAll(config.accounts.user.address, true);
        const userMerkleProofOne = config.merkleTreeOne.getHexProof(
          hashAddress(config.userVault.address)
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            ["purchaseTo(address,uint256,address,bytes32[],address)"](
              config.userVault.address,
              config.projectOne,
              config.genArt721Core.address,
              userMerkleProofOne,
              config.userVault.address, //  the allowlisted address
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
            config.projectOne,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        await config.delegationRegistry
          .connect(config.userVault)
          .delegateForAll(config.accounts.user.address, true);
        const userMerkleProofOne = config.merkleTreeOne.getHexProof(
          hashAddress(config.userVault.address)
        );
        await config.minter
          .connect(config.accounts.user)
          ["purchaseTo(address,uint256,address,bytes32[],address)"](
            config.userVault.address,
            config.projectOne,
            config.genArt721Core.address,
            userMerkleProofOne,
            config.userVault.address, //  the allowlisted address
            {
              value: config.pricePerTokenInWei,
            }
          );
      });
    });

    describe("purchase with an INVALID vault delegate", async function () {
      it("does NOT allow purchases when no delegation has been set", async function () {
        // get config from beforeEach
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectOne,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        const userMerkleProofOne = config.merkleTreeOne.getHexProof(
          hashAddress(config.userVault.address)
        );

        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            ["purchaseTo(address,uint256,address,bytes32[],address)"](
              config.userVault.address,
              config.projectOne,
              config.genArt721Core.address,
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
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectOne,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
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
            ["purchaseTo(address,uint256,address,bytes32[],address)"](
              config.userVault.address,
              config.projectOne,
              config.genArt721Core.address,
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
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectOne,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
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
            ["purchaseTo(address,uint256,address,bytes32[],address)"](
              config.userVault.address,
              config.projectOne,
              config.genArt721Core.address,
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
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectOne,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        await config.delegationRegistry
          .connect(config.userVault)
          .delegateForAll(config.accounts.user2.address, true);
        const userMerkleProofOne = config.merkleTreeOne.getHexProof(
          hashAddress(config.userVault.address)
        );

        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            ["purchaseTo(address,uint256,address,bytes32[],address)"](
              config.userVault.address,
              config.projectOne,
              config.genArt721Core.address,
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

    describe("Works for different valid delegation levels", async function () {
      ["delegateForAll", "delegateForContract"].forEach((delegationType) => {
        describe(`purchaseTo with a VALID vault delegate after ${delegationType}`, async function () {
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
            await config.minter
              .connect(config.accounts.artist)
              .updatePricePerTokenInWei(
                config.projectOne,
                config.genArt721Core.address,
                config.pricePerTokenInWei
              );
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
              ["purchaseTo(address,uint256,address,bytes32[],address)"](
                config.userVault.address,
                config.projectOne,
                config.genArt721Core.address,
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
            await config.minter
              .connect(config.accounts.artist)
              .updatePricePerTokenInWei(
                config.projectOne,
                config.genArt721Core.address,
                config.pricePerTokenInWei
              );
            const userMerkleProofOne = config.merkleTreeOne.getHexProof(
              hashAddress(config.accounts.user.address)
            );
            await config.minter
              .connect(config.accounts.user)
              ["purchaseTo(address,uint256,address,bytes32[])"](
                config.userVault.address,
                config.projectOne,
                config.genArt721Core.address,
                userMerkleProofOne,
                {
                  value: config.pricePerTokenInWei,
                }
              );
          });

          it("does not allow purchases with an incorrect proof", async function () {
            // get config from beforeEach
            const config = this.config;
            const userMerkleProofOne = config.merkleTreeOne.getHexProof(
              hashAddress(config.accounts.user.address)
            );
            await config.minter
              .connect(config.accounts.artist)
              .updatePricePerTokenInWei(
                config.projectOne,
                config.genArt721Core.address,
                config.pricePerTokenInWei
              );

            await expectRevert(
              config.minter
                .connect(config.accounts.user)
                ["purchaseTo(address,uint256,address,bytes32[],address)"](
                  config.userVault.address,
                  config.projectOne,
                  config.genArt721Core.address,
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
              .connect(config.accounts.artist)
              .setProjectInvocationsPerAddress(
                config.projectOne,
                config.genArt721Core.address,
                1
              );
            await config.minter
              .connect(config.accounts.artist)
              .updatePricePerTokenInWei(
                config.projectOne,
                config.genArt721Core.address,
                config.pricePerTokenInWei
              );

            await config.minter
              .connect(config.accounts.user)
              ["purchaseTo(address,uint256,address,bytes32[],address)"](
                config.userVault.address,
                config.projectOne,
                config.genArt721Core.address,
                userMerkleProofOne,
                config.userVault.address, //  the allowlisted address
                {
                  value: config.pricePerTokenInWei,
                }
              );

            await expectRevert(
              config.minter
                .connect(config.accounts.user)
                ["purchaseTo(address,uint256,address,bytes32[],address)"](
                  config.userVault.address,
                  config.projectOne,
                  config.genArt721Core.address,
                  userMerkleProofOne,
                  config.userVault.address, //  the allowlisted address
                  {
                    value: config.pricePerTokenInWei,
                  }
                ),
              revertMessages.maximumInvocationsReached
            );
          });
        });
      });
    });
  });
});
