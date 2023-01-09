import { Minter_Common } from "../Minter.common";
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import { isCoreV3, deployAndGet } from "../../util/common";

import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { SafeTransactionDataPartial } from "@gnosis.pm/safe-core-sdk-types";
import { getGnosisSafe } from "../../util/GnosisSafeNetwork";

import {
  CONFIG_MERKLE_ROOT,
  CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE,
  CONFIG_MAX_INVOCATIONS_OVERRIDE,
} from "./constants";

/**
 * @notice This returns the same result as solidity:
 * `keccak256(abi.encodePacked(_address));`
 * @dev mirrors `hashAddress` function in MinterMerkleV0 contract
 */
export function hashAddress(_address) {
  return Buffer.from(
    ethers.utils.solidityKeccak256(["address"], [_address]).slice(2),
    "hex"
  );
}

/**
 * These tests are intended to check common MinterMerkle functionality.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterMerkle_Common = async () => {
  describe("common minter tests", async () => {
    await Minter_Common();
  });

  describe("deploy", async () => {
    it("broadcasts default max mints per user during deployment", async function () {
      const minterType = await this.minter.minterType();
      const minterFactory = await ethers.getContractFactory(
        // minterType is a function that returns the minter contract name
        minterType
      );
      // fails when combine new minterFilter with the old token in constructor
      const minterConstructorArgs = [
        this.genArt721Core.address,
        this.minterFilter.address,
      ];
      if (minterType == "MinterMerkleV3" || minterType == "MinterMerkleV4") {
        minterConstructorArgs.push(this.delegationRegistry.address);
      }
      const tx = await minterFactory
        .connect(this.accounts.deployer)
        .deploy(...minterConstructorArgs);
      const receipt = await tx.deployTransaction.wait();
      // check for expected event
      // target event is the last log
      const targetLog = receipt.logs[receipt.logs.length - 1];
      // expect "DefaultMaxInvocationsPerAddress" event as topic 0
      expect(targetLog.topics[0]).to.be.equal(
        ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes("DefaultMaxInvocationsPerAddress(uint256)")
        )
      );
      // expect default max invocations to be 1, as the event data
      expect(targetLog.data).to.be.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
    });
  });

  describe("updatePricePerTokenInWei", async function () {
    it("only allows artist to update price", async function () {
      const onlyArtistErrorMessage = "Only Artist";
      // doesn't allow user
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          .updatePricePerTokenInWei(
            this.projectZero,
            this.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow deployer
      await expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .updatePricePerTokenInWei(
            this.projectZero,
            this.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .updatePricePerTokenInWei(
            this.projectZero,
            this.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(
          this.projectZero,
          this.higherPricePerTokenInWei
        );
    });

    it("enforces price update", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      const userMerkleProofZero = this.merkleTreeZero.getHexProof(
        hashAddress(this.accounts.user.address)
      );
      // artist increases price
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(
          this.projectZero,
          this.higherPricePerTokenInWei
        );
      // cannot purchase genArt721Core at lower price
      // note: purchase function is overloaded, so requires full signature
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchase(uint256,bytes32[])"](
            this.projectZero,
            userMerkleProofZero,
            {
              value: this.pricePerTokenInWei,
            }
          ),
        needMoreValueErrorMessage
      );
      // can purchase genArt721Core at higher price
      await this.minter
        .connect(this.accounts.user)
        ["purchase(uint256,bytes32[])"](this.projectZero, userMerkleProofZero, {
          value: this.higherPricePerTokenInWei,
        });
    });

    it("enforces price update only on desired project", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      const userMerkleProofZero = this.merkleTreeZero.getHexProof(
        hashAddress(this.accounts.user.address)
      );
      const userMerkleProofOne = this.merkleTreeOne.getHexProof(
        hashAddress(this.accounts.user.address)
      );
      // artist increases price of project zero
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(
          this.projectZero,
          this.higherPricePerTokenInWei
        );
      // cannot purchase project zero genArt721Core at lower price
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchase(uint256,bytes32[])"](
            this.projectZero,
            userMerkleProofZero,
            {
              value: this.pricePerTokenInWei,
            }
          ),
        needMoreValueErrorMessage
      );
      // can purchase project one genArt721Core at lower price
      await this.minter
        .connect(this.accounts.user)
        ["purchase(uint256,bytes32[])"](this.projectOne, userMerkleProofOne, {
          value: this.pricePerTokenInWei,
        });
    });

    it("emits event upon price update", async function () {
      // artist increases price
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .updatePricePerTokenInWei(
            this.projectZero,
            this.higherPricePerTokenInWei
          )
      )
        .to.emit(this.minter, "PricePerTokenInWeiUpdated")
        .withArgs(this.projectZero, this.higherPricePerTokenInWei);
    });
  });

  describe("setProjectInvocationsPerAddress", async function () {
    it("only allows artist to set", async function () {
      // user not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          .setProjectInvocationsPerAddress(this.projectZero, 0),
        "Only Artist"
      );
      // additional not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .setProjectInvocationsPerAddress(this.projectZero, 0),
        "Only Artist"
      );
      // artist allowed
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 0);
    });
  });

  describe("updateMerkleRoot", async function () {
    it("only allows artist to update merkle root", async function () {
      const newMerkleRoot = this.merkleTreeZero.getHexRoot();
      // user not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          .updateMerkleRoot(this.projectZero, newMerkleRoot),
        "Only Artist"
      );
      // additional not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .updateMerkleRoot(this.projectZero, newMerkleRoot),
        "Only Artist"
      );
      // artist allowed
      await this.minter
        .connect(this.accounts.artist)
        .updateMerkleRoot(this.projectZero, newMerkleRoot);
    });

    it("does not allow Merkle root of zero", async function () {
      const newMerkleRoot = constants.ZERO_BYTES32;
      // artist allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .updateMerkleRoot(this.projectZero, newMerkleRoot),
        "Root must be provided"
      );
    });

    it("emits event when update merkle root", async function () {
      const newMerkleRoot = this.merkleTreeZero.getHexRoot();
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .updateMerkleRoot(this.projectZero, newMerkleRoot)
      )
        .to.emit(this.minter, "ConfigValueSet(uint256,bytes32,bytes32)")
        .withArgs(this.projectZero, CONFIG_MERKLE_ROOT, newMerkleRoot);
    });
  });

  describe("setProjectInvocationsPerAddress", async function () {
    it("only allows artist to setProjectInvocationsPerAddress", async function () {
      const newMerkleRoot = this.merkleTreeZero.getHexRoot();
      // user not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          .setProjectInvocationsPerAddress(this.projectZero, 0),
        "Only Artist"
      );
      // additional not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .setProjectInvocationsPerAddress(this.projectZero, 0),
        "Only Artist"
      );
      // artist allowed
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 0);
    });

    it("emits events when setting project max invocations per address", async function () {
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .setProjectInvocationsPerAddress(this.projectZero, 0)
      )
        .to.emit(this.minter, "ConfigValueSet(uint256,bytes32,bool)")
        .withArgs(
          this.projectZero,
          CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE,
          true
        );
      // expect zero value when set to zero
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .setProjectInvocationsPerAddress(this.projectZero, 0)
      )
        .to.emit(this.minter, "ConfigValueSet(uint256,bytes32,uint256)")
        .withArgs(this.projectZero, CONFIG_MAX_INVOCATIONS_OVERRIDE, 0);
      // expect true again
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .setProjectInvocationsPerAddress(this.projectZero, 0)
      )
        .to.emit(this.minter, "ConfigValueSet(uint256,bytes32,bool)")
        .withArgs(
          this.projectZero,
          CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE,
          true
        );
      // expect 999 value when set to 999
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .setProjectInvocationsPerAddress(this.projectZero, 999)
      )
        .to.emit(this.minter, "ConfigValueSet(uint256,bytes32,uint256)")
        .withArgs(this.projectZero, CONFIG_MAX_INVOCATIONS_OVERRIDE, 999);
    });
  });

  describe("purchase", async function () {
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
    });

    it("does not allow purchase without proof arg", async function () {
      // expect revert due to price not being configured
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          ["purchase(uint256)"](this.projectZero, {
            value: this.pricePerTokenInWei,
          }),
        "Must provide Merkle proof"
      );
    });

    it("does not allow purchase prior to setting Merkle root (results in invalid proof)", async function () {
      // configure price per genArt721Core
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectTwo, 0);
      // expect revert because Merkle root has not been set
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          ["purchase(uint256,bytes32[])"](
            this.projectTwo,
            this.additionalMerkleProofTwo,
            {
              value: this.pricePerTokenInWei,
            }
          ),
        "Invalid Merkle proof"
      );
      // expect revert if given an empty proof
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          ["purchase(uint256,bytes32[])"](this.projectTwo, [], {
            value: this.pricePerTokenInWei,
          }),
        "Invalid Merkle proof"
      );
    });

    it("does not allow purchase prior to configuring price", async function () {
      // expect revert due to price not being configured
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          ["purchase(uint256,bytes32[])"](
            this.projectTwo,
            this.additionalMerkleProofTwo,
            {
              value: this.pricePerTokenInWei,
            }
          ),
        "Price not configured"
      );
    });

    it("does allow purchase with a price of zero when intentionally configured", async function () {
      // calc and update merkle root for project two
      const merkleRootTwo = this.merkleTreeTwo.getHexRoot();
      await this.minter
        .connect(this.accounts.artist)
        .updateMerkleRoot(this.projectTwo, merkleRootTwo);
      // configure price per genArt721Core
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectTwo, 0);
      // allow purchase when intentionally configured price of zero
      await this.minter
        .connect(this.accounts.additional)
        ["purchase(uint256,bytes32[])"](
          this.projectTwo,
          this.additionalMerkleProofTwo
        );
    });

    it("enforces mint limit per address when default limit of one is used", async function () {
      await this.minter
        .connect(this.accounts.user)
        ["purchase(uint256,bytes32[])"](
          this.projectZero,
          this.userMerkleProofZero,
          {
            value: this.pricePerTokenInWei,
          }
        );
      // expect revert after account hits default invocations per address limit of one
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
        "Maximum number of invocations per address reached"
      );
    });

    it("allows multiple mints when override is set to unlimited", async function () {
      // toggle mint limiter to be off
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 0);
      // mint 15 times from a single address without failure
      for (let i = 0; i < 15; i++) {
        await this.minter
          .connect(this.accounts.user)
          ["purchase(uint256,bytes32[])"](
            this.projectZero,
            this.userMerkleProofZero,
            {
              value: this.pricePerTokenInWei,
            }
          );
      }
    });

    it("allows only five mints when override is set to five", async function () {
      // toggle mint limiter to be off
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 5);
      // mint 5 times from a single address without failure
      for (let i = 0; i < 5; i++) {
        await this.minter
          .connect(this.accounts.user)
          ["purchase(uint256,bytes32[])"](
            this.projectZero,
            this.userMerkleProofZero,
            {
              value: this.pricePerTokenInWei,
            }
          );
      }
      // expect revert after account hits >5 invocations
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
        "Maximum number of invocations per address reached"
      );
    });

    it("stops allowing mints if artist reduces max invocations per address = current user's project invocations", async function () {
      // artist allows unlimited mints per address
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 0);
      // mint 5 times from a single address without failure
      for (let i = 0; i < 5; i++) {
        await this.minter
          .connect(this.accounts.user)
          ["purchase(uint256,bytes32[])"](
            this.projectZero,
            this.userMerkleProofZero,
            {
              value: this.pricePerTokenInWei,
            }
          );
      }
      // artist allows five mints per address
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 5);
      // expect revert because account already has 5 invocations
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
        "Maximum number of invocations per address reached"
      );
    });

    it("stops allowing mints if artist reduces max invocations per address < current user's project invocations", async function () {
      // artist allows unlimited mints per address
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 0);
      // mint 5 times from a single address without failure
      for (let i = 0; i < 5; i++) {
        await this.minter
          .connect(this.accounts.user)
          ["purchase(uint256,bytes32[])"](
            this.projectZero,
            this.userMerkleProofZero,
            {
              value: this.pricePerTokenInWei,
            }
          );
      }
      // artist allows one mint per address
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 1);
      // expect revert because account already has >1 invocation
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
        "Maximum number of invocations per address reached"
      );
    });

    it("rejects invalid merkle proofs", async function () {
      // expect revert when providing an invalid proof
      // (e.g. providing proof for valid address, but different tree)
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchase(uint256,bytes32[])"](
            this.projectZero,
            this.userMerkleProofOne,
            {
              value: this.pricePerTokenInWei,
            }
          ),
        "Invalid Merkle proof"
      );
    });

    it("does nothing if setProjectMaxInvocations is not called (fails correctly)", async function () {
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 0);
      for (let i = 0; i < 15; i++) {
        await this.minter
          .connect(this.accounts.user)
          ["purchase(uint256,bytes32[])"](
            this.projectZero,
            this.userMerkleProofZero,
            {
              value: this.pricePerTokenInWei,
            }
          );
      }

      // expect revert after project hits max invocations
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
        "Must not exceed max invocations"
      );
    });

    it("doesnt add too much gas if setProjectMaxInvocations is set", async function () {
      // Try without setProjectMaxInvocations, store gas cost
      const minterType = await this.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? this.accounts.deployer
          : this.accounts.artist;

      const tx = await this.minter
        .connect(this.accounts.user)
        ["purchase(uint256,bytes32[])"](
          this.projectZero,
          this.userMerkleProofZero,
          {
            value: this.pricePerTokenInWei,
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
      await this.minter
        .connect(accountToTestWith)
        .setProjectMaxInvocations(this.projectOne);
      const maxSetTx = await this.minter
        .connect(this.accounts.user)
        ["purchase(uint256,bytes32[])"](
          this.projectOne,
          this.userMerkleProofOne,
          {
            value: this.pricePerTokenInWei,
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

    it("fails more cheaply if setProjectMaxInvocations is set", async function () {
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 0);
      // Try without setProjectMaxInvocations, store gas cost
      for (let i = 0; i < 15; i++) {
        await this.minter
          .connect(this.accounts.user)
          ["purchase(uint256,bytes32[])"](
            this.projectZero,
            this.userMerkleProofZero,
            {
              value: this.pricePerTokenInWei,
            }
          );
      }
      const userBalanceNoMaxSet = await this.accounts.user.getBalance();
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
        "Must not exceed max invocations"
      );
      const userDeltaNoMaxSet = userBalanceNoMaxSet.sub(
        BigNumber.from(await this.accounts.user.getBalance())
      );

      // Try with setProjectMaxInvocations, store gas cost
      await this.minter
        .connect(this.accounts.artist)
        .setProjectMaxInvocations(this.projectOne);
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectOne, 0);
      for (let i = 0; i < 15; i++) {
        await this.minter
          .connect(this.accounts.user)
          ["purchase(uint256,bytes32[])"](
            this.projectOne,
            this.userMerkleProofOne,
            {
              value: this.pricePerTokenInWei,
            }
          );
      }
      const userBalanceMaxSet = BigNumber.from(
        await this.accounts.user.getBalance()
      );
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          ["purchase(uint256,bytes32[])"](
            this.projectOne,
            this.userMerkleProofOne,
            {
              value: this.pricePerTokenInWei,
            }
          ),
        "Maximum number of invocations reached"
      );
      const userDeltaMaxSet = userBalanceMaxSet.sub(
        BigNumber.from(await this.accounts.user.getBalance())
      );

      console.log(
        "Gas cost with setProjectMaxInvocations: ",
        ethers.utils.formatUnits(userDeltaMaxSet, "ether").toString(),
        "ETH"
      );
      console.log(
        "Gas cost without setProjectMaxInvocations: ",
        ethers.utils.formatUnits(userDeltaNoMaxSet, "ether").toString(),
        "ETH"
      );

      expect(userDeltaMaxSet.lt(userDeltaNoMaxSet)).to.be.true;
    });
  });

  describe("purchaseTo", async function () {
    it("does not allow purchaseTo without proof arg", async function () {
      // expect revert due to price not being configured
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          ["purchaseTo(address,uint256)"](
            this.accounts.user.address,
            this.projectZero,
            {
              value: this.pricePerTokenInWei,
            }
          ),
        "Must provide Merkle proof"
      );
    });

    it("does not allow purchase prior to configuring price", async function () {
      // calc and update merkle root for project two
      const merkleRootTwo = this.merkleTreeTwo.getHexRoot();
      await this.minter
        .connect(this.accounts.artist)
        .updateMerkleRoot(this.projectTwo, merkleRootTwo);
      // get merkle proof and try purchasing
      const additionalMerkleProofTwo = this.merkleTreeTwo.getHexProof(
        hashAddress(this.accounts.additional.address)
      );
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          ["purchase(uint256,bytes32[])"](
            this.projectTwo,
            additionalMerkleProofTwo,
            {
              value: this.pricePerTokenInWei,
            }
          ),
        "Price not configured"
      );
    });

    it("allows `purchaseTo` by default", async function () {
      const userMerkleProofOne = this.merkleTreeOne.getHexProof(
        hashAddress(this.accounts.user.address)
      );
      await this.minter
        .connect(this.accounts.user)
        ["purchaseTo(address,uint256,bytes32[])"](
          this.accounts.additional.address,
          this.projectOne,
          userMerkleProofOne,
          {
            value: this.pricePerTokenInWei,
          }
        );
    });

    it("does not support toggling of `purchaseTo`", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .togglePurchaseToDisabled(this.projectOne),
        "Action not supported"
      );
    });
  });

  describe("processProofForAddress (pure)", async function () {
    it("returns expected value", async function () {
      const userMerkleProofOne = this.merkleTreeOne.getHexProof(
        hashAddress(this.accounts.user.address)
      );
      const expectedRoot = this.merkleTreeOne.getHexRoot();
      const receivedRoot = await this.minter
        .connect(this.accounts.user)
        .processProofForAddress(userMerkleProofOne, this.accounts.user.address);
      expect(receivedRoot).to.equal(expectedRoot);
    });
  });

  describe("setProjectMaxInvocations", async function () {
    it("handles getting genArt721CoreInfo invocation info with V1 core", async function () {
      const minterType = await this.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? this.accounts.deployer
          : this.accounts.artist;

      await this.minter
        .connect(accountToTestWith)
        .setProjectMaxInvocations(this.projectOne);
      // minter should update storage with accurate projectMaxInvocations
      let maxInvocations = await this.minter
        .connect(accountToTestWith)
        .projectMaxInvocations(this.projectOne);
      expect(maxInvocations).to.be.equal(this.maxInvocations);
      // ensure hasMaxBeenReached did not unexpectedly get set as true
      let hasMaxBeenInvoked = await this.minter
        .connect(accountToTestWith)
        .projectMaxHasBeenInvoked(this.projectOne);
      expect(hasMaxBeenInvoked).to.be.false;
    });

    it("reverts for unconfigured/non-existent project", async function () {
      // trying to set this on unconfigured project (e.g. 99) should cause
      // revert on the underlying CoreContract.
      const minterType = await this.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? this.accounts.deployer
          : this.accounts.artist;

      expectRevert(
        this.minter.connect(accountToTestWith).setProjectMaxInvocations(99),
        "Project ID does not exist"
      );
    });
  });

  describe("projectMaxInvocationsPerAddress", async function () {
    it("is 1 by default", async function () {
      const projectMaxInvocationsPerAddress_ = await this.minter
        .connect(this.accounts.user)
        .projectMaxInvocationsPerAddress(this.projectZero);
      expect(projectMaxInvocationsPerAddress_).to.equal(1);
    });

    it("is 0 by when set to 0", async function () {
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 0);
      const projectMaxInvocationsPerAddress_ = await this.minter
        .connect(this.accounts.user)
        .projectMaxInvocationsPerAddress(this.projectZero);
      expect(projectMaxInvocationsPerAddress_).to.equal(0);
    });

    it("is 999 by when set to 999", async function () {
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 999);
      const projectMaxInvocationsPerAddress_ = await this.minter
        .connect(this.accounts.user)
        .projectMaxInvocationsPerAddress(this.projectZero);
      expect(projectMaxInvocationsPerAddress_).to.equal(999);
    });

    it("is 999 by when set to 0 then changed to 999", async function () {
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 0);
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 999);
      const projectMaxInvocationsPerAddress_ = await this.minter
        .connect(this.accounts.user)
        .projectMaxInvocationsPerAddress(this.projectZero);
      expect(projectMaxInvocationsPerAddress_).to.equal(999);
    });

    it("is 1 by when set to 0 then changed to 1", async function () {
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 0);
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 1);
      const projectMaxInvocationsPerAddress_ = await this.minter
        .connect(this.accounts.user)
        .projectMaxInvocationsPerAddress(this.projectZero);
      expect(projectMaxInvocationsPerAddress_).to.equal(1);
    });
  });

  describe("projectRemainingInvocationsForAddress", async function () {
    beforeEach(async function () {
      this.userMerkleProofZero = this.merkleTreeZero.getHexProof(
        hashAddress(this.accounts.user.address)
      );
    });

    it("is (true, 1) by default", async function () {
      const projectRemainingInvocationsForAddress_ = await this.minter
        .connect(this.accounts.user)
        .projectRemainingInvocationsForAddress(
          this.projectZero,
          this.accounts.user.address
        );
      expect(
        projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
      ).to.equal(true);
      expect(
        projectRemainingInvocationsForAddress_.mintInvocationsRemaining
      ).to.equal(1);
    });

    it("is (true, 0) after minting a token on default setting", async function () {
      // mint a token
      await this.minter
        .connect(this.accounts.user)
        ["purchase(uint256,bytes32[])"](
          this.projectZero,
          this.userMerkleProofZero,
          {
            value: this.pricePerTokenInWei,
          }
        );
      // user should have 0 remaining invocations
      const projectRemainingInvocationsForAddress_ = await this.minter
        .connect(this.accounts.user)
        .projectRemainingInvocationsForAddress(
          this.projectZero,
          this.accounts.user.address
        );
      expect(
        projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
      ).to.equal(true);
      expect(
        projectRemainingInvocationsForAddress_.mintInvocationsRemaining
      ).to.equal(0);
    });

    it("is (false, 0) by when set to not limit mints per address", async function () {
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 0);
      // check remaining invocations response
      let projectRemainingInvocationsForAddress_ = await this.minter
        .connect(this.accounts.user)
        .projectRemainingInvocationsForAddress(
          this.projectZero,
          this.accounts.user.address
        );
      expect(
        projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
      ).to.equal(false);
      expect(
        projectRemainingInvocationsForAddress_.mintInvocationsRemaining
      ).to.equal(0);
      // still false after user mints a token
      await this.minter
        .connect(this.accounts.user)
        ["purchase(uint256,bytes32[])"](
          this.projectZero,
          this.userMerkleProofZero,
          {
            value: this.pricePerTokenInWei,
          }
        );
      // check remaining invocations response
      projectRemainingInvocationsForAddress_ = await this.minter
        .connect(this.accounts.user)
        .projectRemainingInvocationsForAddress(
          this.projectZero,
          this.accounts.user.address
        );
      expect(
        projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
      ).to.equal(false);
      expect(
        projectRemainingInvocationsForAddress_.mintInvocationsRemaining
      ).to.equal(0);
    });

    it("is updated when set to limit mints per address", async function () {
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 5);
      // check remaining invocations response
      let projectRemainingInvocationsForAddress_ = await this.minter
        .connect(this.accounts.user)
        .projectRemainingInvocationsForAddress(
          this.projectZero,
          this.accounts.user.address
        );
      expect(
        projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
      ).to.equal(true);
      expect(
        projectRemainingInvocationsForAddress_.mintInvocationsRemaining
      ).to.equal(5);
      // updates after user mints two tokens
      for (let i = 0; i < 2; i++) {
        await this.minter
          .connect(this.accounts.user)
          ["purchase(uint256,bytes32[])"](
            this.projectZero,
            this.userMerkleProofZero,
            {
              value: this.pricePerTokenInWei,
            }
          );
      }
      // check remaining invocations response
      projectRemainingInvocationsForAddress_ = await this.minter
        .connect(this.accounts.user)
        .projectRemainingInvocationsForAddress(
          this.projectZero,
          this.accounts.user.address
        );
      expect(
        projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
      ).to.equal(true);
      expect(
        projectRemainingInvocationsForAddress_.mintInvocationsRemaining
      ).to.equal(3);
      // becomes zero if artist reduces limit to 1
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectZero, 1);
      // check remaining invocations response
      projectRemainingInvocationsForAddress_ = await this.minter
        .connect(this.accounts.user)
        .projectRemainingInvocationsForAddress(
          this.projectZero,
          this.accounts.user.address
        );
      expect(
        projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
      ).to.equal(true);
      expect(
        projectRemainingInvocationsForAddress_.mintInvocationsRemaining
      ).to.equal(0);
    });
  });

  describe("reentrancy attack", async function () {
    it("does not allow reentrant purchaseTo, when invocations per address is default value", async function () {
      // contract buys are always allowed by default if in merkle tree
      // attacker deploys reentrancy contract specifically for Merkle minter(s)
      const reentrancyMockFactory = await ethers.getContractFactory(
        "ReentrancyMerkleMock"
      );
      const reentrancyMock = await reentrancyMockFactory
        .connect(this.accounts.deployer)
        .deploy();

      // artist generates a Merkle tree that includes malicious contract
      const attackerAddress = reentrancyMock.address;

      const elementsProjectOneWithAttacker = [];

      elementsProjectOneWithAttacker.push(
        this.accounts.deployer.address,
        this.accounts.artist.address,
        attackerAddress,
        this.accounts.user.address,
        this.accounts.user2.address
      );

      // build Merkle trees for projects zero, one, and two
      this.merkleTreeOne = new MerkleTree(
        elementsProjectOneWithAttacker.map((_addr) => hashAddress(_addr)),
        keccak256,
        {
          sortPairs: true,
        }
      );

      // artists updates project Merkle root
      await this.minter
        .connect(this.accounts.artist)
        .updateMerkleRoot(this.projectOne, this.merkleTreeOne.getHexRoot());

      // attacker calculates Merkle proof for malicious contract
      const attackerMerkleProofOne = this.merkleTreeOne.getHexProof(
        hashAddress(attackerAddress)
      );
      // attacker should see revert when performing reentrancy attack
      let totalTokensToMint = 2;
      let numTokensToMint = BigNumber.from(totalTokensToMint.toString());
      let totalValue = this.higherPricePerTokenInWei.mul(numTokensToMint);
      await expectRevert(
        reentrancyMock
          .connect(this.accounts.deployer)
          .attack(
            numTokensToMint,
            this.minter.address,
            this.projectOne,
            this.higherPricePerTokenInWei,
            attackerMerkleProofOne,
            {
              value: totalValue,
            }
          ),
        // failure message occurs during refund, where attack reentrency occurs
        "Refund failed"
      );
      // attacker should be able to purchase ONE genArt721Core w/refunds
      totalTokensToMint = 1;
      numTokensToMint = BigNumber.from("1");
      totalValue = this.higherPricePerTokenInWei.mul(numTokensToMint);
      for (let i = 0; i < totalTokensToMint; i++) {
        await reentrancyMock
          .connect(this.accounts.deployer)
          .attack(
            numTokensToMint,
            this.minter.address,
            this.projectOne,
            this.higherPricePerTokenInWei,
            attackerMerkleProofOne,
            {
              value: this.higherPricePerTokenInWei,
            }
          );
      }
    });

    it("does not allow reentrant purchaseTo, when mint limiter invocations per address set to 0 (unlimited)", async function () {
      await this.minter
        .connect(this.accounts.artist)
        .setProjectInvocationsPerAddress(this.projectOne, 0);
      // contract buys are always allowed by default if in merkle tree
      // attacker deploys reentrancy contract specifically for Merkle minter(s)
      const reentrancyMockFactory = await ethers.getContractFactory(
        "ReentrancyMerkleMock"
      );
      const reentrancyMock = await reentrancyMockFactory
        .connect(this.accounts.deployer)
        .deploy();

      // artist generates a Merkle tree that includes malicious contract
      const attackerAddress = reentrancyMock.address;

      const elementsProjectOneWithAttacker = [];

      elementsProjectOneWithAttacker.push(
        this.accounts.deployer.address,
        this.accounts.artist.address,
        attackerAddress,
        this.accounts.user.address,
        this.accounts.user2.address
      );

      // build Merkle trees for projects zero, one, and two
      this.merkleTreeOne = new MerkleTree(
        elementsProjectOneWithAttacker.map((_addr) => hashAddress(_addr)),
        keccak256,
        {
          sortPairs: true,
        }
      );

      // artists updates project Merkle root
      await this.minter
        .connect(this.accounts.artist)
        .updateMerkleRoot(this.projectOne, this.merkleTreeOne.getHexRoot());

      // attacker calculates Merkle proof for malicious contract
      const attackerMerkleProofOne = this.merkleTreeOne.getHexProof(
        hashAddress(attackerAddress)
      );
      // attacker should see revert when performing reentrancy attack
      const totalTokensToMint = 2;
      let numTokensToMint = BigNumber.from(totalTokensToMint.toString());
      let totalValue = this.higherPricePerTokenInWei.mul(numTokensToMint);
      await expectRevert(
        reentrancyMock
          .connect(this.accounts.deployer)
          .attack(
            numTokensToMint,
            this.minter.address,
            this.projectOne,
            this.higherPricePerTokenInWei,
            attackerMerkleProofOne,
            {
              value: totalValue,
            }
          ),
        // failure message occurs during refund, where attack reentrency occurs
        "Refund failed"
      );
      // attacker should be able to purchase ONE genArt721Core at a time w/refunds
      numTokensToMint = BigNumber.from("1");
      totalValue = this.higherPricePerTokenInWei.mul(numTokensToMint);
      for (let i = 0; i < totalTokensToMint; i++) {
        await reentrancyMock
          .connect(this.accounts.deployer)
          .attack(
            numTokensToMint,
            this.minter.address,
            this.projectOne,
            this.higherPricePerTokenInWei,
            attackerMerkleProofOne,
            {
              value: this.higherPricePerTokenInWei,
            }
          );
      }
    });
  });

  describe("gnosis safe", async function () {
    it("allows gnosis safe to purchase in ETH", async function () {
      // deploy new Gnosis Safe
      const safeSdk: Safe = await getGnosisSafe(
        this.accounts.artist,
        this.accounts.additional,
        this.accounts.user
      );
      const safeAddress = safeSdk.getAddress();

      // build Merkle tree that includes safeAddress, update root
      const _allowlist = [this.accounts.artist.address, safeAddress];
      this.merkleTreeOne = new MerkleTree(
        _allowlist.map((_addr) => hashAddress(_addr)),
        keccak256,
        {
          sortPairs: true,
        }
      );
      await this.minter
        .connect(this.accounts.artist)
        .updateMerkleRoot(this.projectOne, this.merkleTreeOne.getHexRoot());

      // calculate Merkle proof for safeAddress
      const safeMerkleProofOne = this.merkleTreeOne.getHexProof(
        hashAddress(safeAddress)
      );

      // create a transaction
      const unsignedTx = await this.minter.populateTransaction[
        "purchase(uint256,bytes32[])"
      ](this.projectOne, safeMerkleProofOne);
      const transaction: SafeTransactionDataPartial = {
        to: this.minter.address,
        data: unsignedTx.data,
        value: this.pricePerTokenInWei.toHexString(),
      };
      const safeTransaction = await safeSdk.createTransaction(transaction);

      // signers sign and execute the transaction
      // artist signs
      await safeSdk.signTransaction(safeTransaction);
      // additional signs
      const ethAdapterOwner2 = new EthersAdapter({
        ethers,
        signer: this.accounts.additional,
      });
      const safeSdk2 = await safeSdk.connect({
        ethAdapter: ethAdapterOwner2,
        safeAddress,
      });
      const txHash = await safeSdk2.getTransactionHash(safeTransaction);
      const approveTxResponse = await safeSdk2.approveTransactionHash(txHash);
      await approveTxResponse.transactionResponse?.wait();

      // fund the safe and execute transaction
      await this.accounts.artist.sendTransaction({
        to: safeAddress,
        value: this.pricePerTokenInWei,
      });

      const viewFunctionWithInvocations = (await isCoreV3(this.genArt721Core))
        ? this.genArt721Core.projectStateData
        : this.genArt721Core.projectTokenInfo;
      const projectStateDataBefore = await viewFunctionWithInvocations(
        this.projectOne
      );
      const executeTxResponse = await safeSdk2.executeTransaction(
        safeTransaction
      );
      await executeTxResponse.transactionResponse?.wait();
      const projectStateDataAfter = await viewFunctionWithInvocations(
        this.projectOne
      );
      expect(projectStateDataAfter.invocations).to.be.equal(
        projectStateDataBefore.invocations.add(1)
      );
    });
  });
};
