const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
import chai, { expect } from "chai";
import { ethers } from "hardhat";
import { Logger } from "@ethersproject/logger";
import { expectRevert } from "@openzeppelin/test-helpers";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  compareBN,
  safeAddProject,
} from "../../util/common";

import { MinterMerkle_Common, hashAddress } from "./MinterMerkle.common";
import { BigNumber } from "ethers";
import { AbiCoder } from "ethers/lib/utils";

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  "GenArt721CoreV3_Explorations", // V3 core explorations contract
];

/**
 * These tests intended to ensure Filtered Minter integrates properly with V3
 * core contract.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`MinterMerkleV3_${coreContractName}`, async function () {
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
        "MinterFilterV1"
      ));

      this.delegationRegistry = await deployAndGet.call(
        this,
        "DelegationRegistry",
        []
      );

      this.minter = await deployAndGet.call(this, "MinterMerkleV3", [
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

      await this.genArt721Core
        .connect(this.accounts.deployer)
        .toggleProjectIsActive(this.projectZero);
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .toggleProjectIsActive(this.projectOne);
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .toggleProjectIsActive(this.projectTwo);

      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectOne, this.maxInvocations);
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectTwo, this.maxInvocations);

      await this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectZero);
      await this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectOne);
      await this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectTwo);

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

      // set genArt721Core price for projects zero and one on minter
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectZero, this.pricePerTokenInWei);
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectOne, this.pricePerTokenInWei);

      // populate Merkle elements for projects zero, one, and two
      const elementsProjectZero = [];
      const elementsProjectOne = [];
      const elementsProjectTwo = [];

      elementsProjectZero.push(
        this.accounts.deployer.address,
        this.accounts.artist.address,
        this.accounts.additional.address,
        this.accounts.user.address,
        this.accounts.user2.address
      );
      elementsProjectOne.push(
        this.accounts.user.address,
        this.accounts.additional2.address
      );
      elementsProjectTwo.push(this.accounts.additional.address);

      // build Merkle trees for projects zero, one, and two
      this.merkleTreeZero = new MerkleTree(
        elementsProjectZero.map((_addr) => hashAddress(_addr)),
        keccak256,
        {
          sortPairs: true,
        }
      );
      this.merkleTreeOne = new MerkleTree(
        elementsProjectOne.map((_addr) => hashAddress(_addr)),
        keccak256,
        {
          sortPairs: true,
        }
      );
      this.merkleTreeTwo = new MerkleTree(
        elementsProjectTwo.map((_addr) => hashAddress(_addr)),
        keccak256,
        {
          sortPairs: true,
        }
      );

      // update Merkle root for projects zero and one on minter
      const merkleRootZero = this.merkleTreeZero.getHexRoot();
      const merkleRootOne = this.merkleTreeOne.getHexRoot();
      // Merkle root two intentionally not set
      await this.minter
        .connect(this.accounts.artist)
        .updateMerkleRoot(this.projectZero, merkleRootZero);
      await this.minter
        .connect(this.accounts.artist)
        .updateMerkleRoot(this.projectOne, merkleRootOne);

      // mock ERC20 genArt721Core
      const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
      this.ERC20Mock = await ERC20Factory.deploy(
        ethers.utils.parseEther("100")
      );
    });

    describe("common MinterMerkle tests", async () => {
      await MinterMerkle_Common();
    });

    describe("constructor", async function () {
      it("emits an event indicating dependency registry in constructor", async function () {
        const contractFactory = await ethers.getContractFactory(
          "MinterMerkleV3"
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

    describe("setProjectMaxInvocations", async function () {
      it("allows artist to call setProjectMaxInvocations", async function () {
        await this.minter
          .connect(this.accounts.artist)
          .setProjectMaxInvocations(this.projectZero);
      });

      it("allows user to call setProjectMaxInvocations", async function () {
        await this.minter
          .connect(this.accounts.user)
          .setProjectMaxInvocations(this.projectZero);
      });
    });

    describe("purchase_gD5", async function () {
      it("allows `purchase_gD5` by default", async function () {
        const userMerkleProofOne = this.merkleTreeOne.getHexProof(
          hashAddress(this.accounts.user.address)
        );
        await this.minter
          .connect(this.accounts.user)
          .purchase_gD5(this.projectOne, userMerkleProofOne, {
            value: this.pricePerTokenInWei,
          });
      });
    });

    describe("payment splitting", async function () {
      beforeEach(async function () {
        this.userMerkleProofZero = this.merkleTreeZero.getHexProof(
          hashAddress(this.accounts.user.address)
        );
        this.userMerkleProofOne = this.merkleTreeOne.getHexProof(
          hashAddress(this.accounts.user.address)
        );
        this.additionalMerkleProofTwo = this.merkleTreeTwo.getHexProof(
          hashAddress(this.accounts.additional.address)
        );
        this.deadReceiver = await deployAndGet.call(
          this,
          "DeadReceiverMock",
          []
        );
      });

      it("requires successful payment to platform", async function () {
        // update platform address to a contract that reverts on receive
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateArtblocksPrimarySalesAddress(this.deadReceiver.address);
        // expect revert when trying to purchase
        await expectRevert(
          this.minter
            .connect(this.accounts.user)
            ["purchase(uint256,bytes32[])"](
              this.projectZero,
              this.userMerkleProofZero,
              {
                value: this.pricePerTokenInWei,
              }
            ),
          "Art Blocks payment failed"
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
            .connect(this.accounts.user)
            ["purchase(uint256,bytes32[])"](
              this.projectZero,
              this.userMerkleProofZero,
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
            .connect(this.accounts.user)
            ["purchase(uint256,bytes32[])"](
              this.projectZero,
              this.userMerkleProofZero,
              {
                value: this.pricePerTokenInWei,
              }
            ),
          "Additional Payee payment failed"
        );
      });

      it("handles zero platform and artist payment values", async function () {
        // update platform to zero percent
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateArtblocksPrimarySalesPercentage(0);
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
          .connect(this.accounts.user)
          ["purchase(uint256,bytes32[])"](
            this.projectZero,
            this.userMerkleProofZero,
            {
              value: this.pricePerTokenInWei,
            }
          );
      });
    });

    describe("additional payee payments", async function () {
      it("handles additional payee payments", async function () {
        const userMerkleProofOne = this.merkleTreeOne.getHexProof(
          hashAddress(this.accounts.user.address)
        );
        const valuesToUpdateTo = [
          this.projectOne,
          this.accounts.artist2.address,
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
          .connect(this.accounts.user)
          ["purchase(uint256,bytes32[])"](this.projectOne, userMerkleProofOne, {
            value: this.pricePerTokenInWei,
          });
      });
    });

    describe("Works for different valid delegation levels", async function () {
      ["delegateForAll", "delegateForContract"].forEach((delegationType) => {
        describe(`purchaseTo_kem with a VALID vault delegate after ${delegationType}`, async function () {
          beforeEach(async function () {
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
            }
            await this.delegationRegistry
              .connect(this.userVault)
              [delegationType](...delegationArgs);
          });

          it("does allow purchases", async function () {
            // delegate the vault to the user
            await this.delegationRegistry
              .connect(this.userVault)
              .delegateForAll(this.accounts.user.address, true);

            const userMerkleProofOne = this.merkleTreeOne.getHexProof(
              hashAddress(this.userVault.address)
            );

            // expect no revert
            await this.minter
              .connect(this.accounts.user)
              ["purchaseTo(address,uint256,bytes32[],address)"](
                this.userVault.address,
                this.projectOne,
                userMerkleProofOne,
                this.userVault.address, //  the allowlisted address
                {
                  value: this.pricePerTokenInWei,
                }
              );
          });

          it("allows purchases to vault if msg.sender is allowlisted and no vault is provided", async function () {
            const userMerkleProofOne = this.merkleTreeOne.getHexProof(
              hashAddress(this.accounts.user.address)
            );
            await this.minter
              .connect(this.accounts.user)
              ["purchaseTo(address,uint256,bytes32[])"](
                this.userVault.address,
                this.projectOne,
                userMerkleProofOne,
                {
                  value: this.pricePerTokenInWei,
                }
              );
          });

          it("does not allow purchases with an incorrect proof", async function () {
            const userMerkleProofOne = this.merkleTreeOne.getHexProof(
              hashAddress(this.accounts.user.address)
            );

            await expectRevert(
              this.minter
                .connect(this.accounts.user)
                ["purchaseTo(address,uint256,bytes32[],address)"](
                  this.userVault.address,
                  this.projectOne,
                  userMerkleProofOne,
                  this.userVault.address, //  the allowlisted address
                  {
                    value: this.pricePerTokenInWei,
                  }
                ),
              "Invalid Merkle proof"
            );
          });

          it("vault cannot exceed mint limit", async function () {
            const userMerkleProofOne = this.merkleTreeOne.getHexProof(
              hashAddress(this.userVault.address)
            );

            await this.minter
              .connect(this.accounts.user)
              ["purchaseTo(address,uint256,bytes32[],address)"](
                this.userVault.address,
                this.projectOne,
                userMerkleProofOne,
                this.userVault.address, //  the allowlisted address
                {
                  value: this.pricePerTokenInWei,
                }
              );

            await expectRevert(
              this.minter
                .connect(this.accounts.user)
                ["purchaseTo(address,uint256,bytes32[],address)"](
                  this.userVault.address,
                  this.projectOne,
                  userMerkleProofOne,
                  this.userVault.address, //  the allowlisted address
                  {
                    value: this.pricePerTokenInWei,
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
        this.userVault = this.accounts.additional2;
        // intentionally do add any delegations
      });

      it("does NOT allow purchases when no delegation has been set", async function () {
        const userMerkleProofOne = this.merkleTreeOne.getHexProof(
          hashAddress(this.userVault.address)
        );

        await expectRevert(
          this.minter
            .connect(this.accounts.user)
            ["purchaseTo(address,uint256,bytes32[],address)"](
              this.userVault.address,
              this.projectOne,
              userMerkleProofOne,
              this.userVault.address, //  the allowlisted address
              {
                value: this.pricePerTokenInWei,
              }
            ),
          "Invalid delegate-vault pairing"
        );
      });

      it("does NOT allow purchases when a token-level delegation has been set", async function () {
        await this.delegationRegistry.connect(this.userVault).delegateForToken(
          this.accounts.user.address,
          this.genArt721Core.address,
          0, // token id zero
          true
        );
        const userMerkleProofOne = this.merkleTreeOne.getHexProof(
          hashAddress(this.userVault.address)
        );

        await expectRevert(
          this.minter
            .connect(this.accounts.user)
            ["purchaseTo(address,uint256,bytes32[],address)"](
              this.userVault.address,
              this.projectOne,
              userMerkleProofOne,
              this.userVault.address, //  the allowlisted address
              {
                value: this.pricePerTokenInWei,
              }
            ),
          "Invalid delegate-vault pairing"
        );
      });

      it("does NOT allow purchases when a contract-level delegation has been set for a different contract", async function () {
        await this.delegationRegistry
          .connect(this.userVault)
          .delegateForContract(
            this.accounts.user.address,
            this.minter.address,
            true
          );
        const userMerkleProofOne = this.merkleTreeOne.getHexProof(
          hashAddress(this.userVault.address)
        );

        await expectRevert(
          this.minter
            .connect(this.accounts.user)
            ["purchaseTo(address,uint256,bytes32[],address)"](
              this.userVault.address,
              this.projectOne,
              userMerkleProofOne,
              this.userVault.address, //  the allowlisted address
              {
                value: this.pricePerTokenInWei,
              }
            ),
          "Invalid delegate-vault pairing"
        );
      });

      it("does NOT allow purchases when a wallet-level delegation has been set for a different hotwallet", async function () {
        await this.delegationRegistry
          .connect(this.userVault)
          .delegateForAll(this.accounts.user2.address, true);
        const userMerkleProofOne = this.merkleTreeOne.getHexProof(
          hashAddress(this.userVault.address)
        );

        await expectRevert(
          this.minter
            .connect(this.accounts.user)
            ["purchaseTo(address,uint256,bytes32[],address)"](
              this.userVault.address,
              this.projectOne,
              userMerkleProofOne,
              this.userVault.address, //  the allowlisted address
              {
                value: this.pricePerTokenInWei,
              }
            ),
          "Invalid delegate-vault pairing"
        );
      });
    });

    describe("calculates gas", async function () {
      it("mints and calculates gas values [ @skip-on-coverage ]", async function () {
        const userMerkleProofOne = this.merkleTreeOne.getHexProof(
          hashAddress(this.accounts.user.address)
        );
        const tx = await this.minter
          .connect(this.accounts.user)
          ["purchase(uint256,bytes32[])"](this.projectOne, userMerkleProofOne, {
            value: this.pricePerTokenInWei,
          });

        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed);

        console.log(
          "Gas cost for a successful mint: ",
          ethers.utils.formatUnits(txCost.toString(), "ether").toString(),
          "ETH"
        );
        expect(compareBN(txCost, ethers.utils.parseEther("0.0157244"), 1)).to.be
          .true;
      });

      it("is gas performant at 1k length allowlist [ @skip-on-coverage ]", async function () {
        // build new Merkle tree from 1k addresses, including user's address
        const _allowlist = [this.accounts.user.address];
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
        await this.minter
          .connect(this.accounts.artist)
          .updateMerkleRoot(this.projectOne, _merkleTree.getRoot());
        // user mint with new Merkle proof
        const userMerkleProof = _merkleTree.getHexProof(
          hashAddress(this.accounts.user.address)
        );
        const tx = await this.minter
          .connect(this.accounts.user)
          ["purchase(uint256,bytes32[])"](this.projectOne, userMerkleProof, {
            value: this.pricePerTokenInWei,
          });

        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed);
        console.log(
          "Gas cost for a successful 1k allowlist mint: ",
          ethers.utils.formatUnits(txCost, "ether").toString(),
          "ETH"
        );
        // the following is not much more than the gas cost with a very small allowlist
        expect(compareBN(txCost, ethers.utils.parseEther("0.0165514"), 1)).to.be
          .true;
      });
    });
  });
}
