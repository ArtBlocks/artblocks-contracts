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
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { isCoreV3, deployAndGet, T_Config } from "../../../util/common";

import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { SafeTransactionDataPartial } from "@gnosis.pm/safe-core-sdk-types";
import { getGnosisSafe } from "../../../util/GnosisSafeNetwork";

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
export const MinterMerkle_Common = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("common minter tests", async () => {
    await Minter_Common(_beforeEach);
  });

  describe("deploy", async () => {
    it("broadcasts default max mints per user during deployment", async function () {
      const config = await loadFixture(_beforeEach);
      const minterType = await config.minter.minterType();
      const minterFactory = await ethers.getContractFactory(
        // minterType is a function that returns the minter contract name
        minterType
      );
      // fails when combine new minterFilter with the old token in constructor
      const minterConstructorArgs = [
        config.genArt721Core.address,
        config.minterFilter.address,
      ];
      if (
        minterType != "MinterMerkleV0" &&
        minterType != "MinterMerkleV1" &&
        minterType != "MinterMerkleV2"
      ) {
        minterConstructorArgs.push(config.delegationRegistry.address);
      }
      const tx = await minterFactory
        .connect(config.accounts.deployer)
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
      const config = await loadFixture(_beforeEach);
      const onlyArtistErrorMessage = "Only Artist";
      // doesn't allow user
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow deployer
      await expectRevert(
        config.minter
          .connect(config.accounts.deployer)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.higherPricePerTokenInWei
        );
    });

    it("enforces price update", async function () {
      const config = await loadFixture(_beforeEach);
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      const userMerkleProofZero = config.merkleTreeZero.getHexProof(
        hashAddress(config.accounts.user.address)
      );
      // artist increases price
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.higherPricePerTokenInWei
        );
      // cannot purchase genArt721Core at lower price
      // note: purchase function is overloaded, so requires full signature
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectZero, userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          }),
        needMoreValueErrorMessage
      );
      // can purchase genArt721Core at higher price
      await config.minter
        .connect(config.accounts.user)
        [
          "purchase(uint256,bytes32[])"
        ](config.projectZero, userMerkleProofZero, {
          value: config.higherPricePerTokenInWei,
        });
    });

    it("enforces price update only on desired project", async function () {
      const config = await loadFixture(_beforeEach);
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      const userMerkleProofZero = config.merkleTreeZero.getHexProof(
        hashAddress(config.accounts.user.address)
      );
      const userMerkleProofOne = config.merkleTreeOne.getHexProof(
        hashAddress(config.accounts.user.address)
      );
      // artist increases price of project zero
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.higherPricePerTokenInWei
        );
      // cannot purchase project zero genArt721Core at lower price
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectZero, userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          }),
        needMoreValueErrorMessage
      );
      // can purchase project one genArt721Core at lower price
      await config.minter
        .connect(config.accounts.user)
        ["purchase(uint256,bytes32[])"](config.projectOne, userMerkleProofOne, {
          value: config.pricePerTokenInWei,
        });
    });

    it("emits event upon price update", async function () {
      const config = await loadFixture(_beforeEach);
      // artist increases price
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          )
      )
        .to.emit(config.minter, "PricePerTokenInWeiUpdated")
        .withArgs(config.projectZero, config.higherPricePerTokenInWei);
    });
  });

  describe("setProjectInvocationsPerAddress", async function () {
    it("only allows artist to set", async function () {
      const config = await loadFixture(_beforeEach);
      // user not allowed
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .setProjectInvocationsPerAddress(config.projectZero, 0),
        "Only Artist"
      );
      // additional not allowed
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .setProjectInvocationsPerAddress(config.projectZero, 0),
        "Only Artist"
      );
      // artist allowed
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 0);
    });
  });

  describe("updateMerkleRoot", async function () {
    it("only allows artist to update merkle root", async function () {
      const config = await loadFixture(_beforeEach);
      const newMerkleRoot = config.merkleTreeZero.getHexRoot();
      // user not allowed
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .updateMerkleRoot(config.projectZero, newMerkleRoot),
        "Only Artist"
      );
      // additional not allowed
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .updateMerkleRoot(config.projectZero, newMerkleRoot),
        "Only Artist"
      );
      // artist allowed
      await config.minter
        .connect(config.accounts.artist)
        .updateMerkleRoot(config.projectZero, newMerkleRoot);
    });

    it("does not allow Merkle root of zero", async function () {
      const config = await loadFixture(_beforeEach);
      const newMerkleRoot = constants.ZERO_BYTES32;
      // artist allowed
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .updateMerkleRoot(config.projectZero, newMerkleRoot),
        "Root must be provided"
      );
    });

    it("emits event when update merkle root", async function () {
      const config = await loadFixture(_beforeEach);
      const newMerkleRoot = config.merkleTreeZero.getHexRoot();
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .updateMerkleRoot(config.projectZero, newMerkleRoot)
      )
        .to.emit(config.minter, "ConfigValueSet(uint256,bytes32,bytes32)")
        .withArgs(config.projectZero, CONFIG_MERKLE_ROOT, newMerkleRoot);
    });
  });

  describe("setProjectInvocationsPerAddress", async function () {
    it("only allows artist to setProjectInvocationsPerAddress", async function () {
      const config = await loadFixture(_beforeEach);
      const newMerkleRoot = config.merkleTreeZero.getHexRoot();
      // user not allowed
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .setProjectInvocationsPerAddress(config.projectZero, 0),
        "Only Artist"
      );
      // additional not allowed
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .setProjectInvocationsPerAddress(config.projectZero, 0),
        "Only Artist"
      );
      // artist allowed
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 0);
    });

    it("emits events when setting project max invocations per address", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .setProjectInvocationsPerAddress(config.projectZero, 0)
      )
        .to.emit(config.minter, "ConfigValueSet(uint256,bytes32,bool)")
        .withArgs(
          config.projectZero,
          CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE,
          true
        );
      // expect zero value when set to zero
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .setProjectInvocationsPerAddress(config.projectZero, 0)
      )
        .to.emit(config.minter, "ConfigValueSet(uint256,bytes32,uint256)")
        .withArgs(config.projectZero, CONFIG_MAX_INVOCATIONS_OVERRIDE, 0);
      // expect true again
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .setProjectInvocationsPerAddress(config.projectZero, 0)
      )
        .to.emit(config.minter, "ConfigValueSet(uint256,bytes32,bool)")
        .withArgs(
          config.projectZero,
          CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE,
          true
        );
      // expect 999 value when set to 999
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .setProjectInvocationsPerAddress(config.projectZero, 999)
      )
        .to.emit(config.minter, "ConfigValueSet(uint256,bytes32,uint256)")
        .withArgs(config.projectZero, CONFIG_MAX_INVOCATIONS_OVERRIDE, 999);
    });
  });

  describe("purchase", async function () {
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
      // pass config to tests in this describe block
      this.config = config;
    });

    it("does not allow purchase without proof arg", async function () {
      // get config from beforeEach
      const config = this.config;
      // expect revert due to price not being configured
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          ["purchase(uint256)"](config.projectZero, {
            value: config.pricePerTokenInWei,
          }),
        "Must provide Merkle proof"
      );
    });

    it("does not allow purchase prior to setting Merkle root (results in invalid proof)", async function () {
      // get config from beforeEach
      const config = this.config;
      // configure price per genArt721Core
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectTwo, 0);
      // expect revert because Merkle root has not been set
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectTwo, config.additionalMerkleProofTwo, {
            value: config.pricePerTokenInWei,
          }),
        "Invalid Merkle proof"
      );
      // expect revert if given an empty proof
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          ["purchase(uint256,bytes32[])"](config.projectTwo, [], {
            value: config.pricePerTokenInWei,
          }),
        "Invalid Merkle proof"
      );
    });

    it("does not allow purchase prior to configuring price", async function () {
      // get config from beforeEach
      const config = this.config;
      // expect revert due to price not being configured
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectTwo, config.additionalMerkleProofTwo, {
            value: config.pricePerTokenInWei,
          }),
        "Price not configured"
      );
    });

    it("does allow purchase with a price of zero when intentionally configured", async function () {
      // get config from beforeEach
      const config = this.config;
      // calc and update merkle root for project two
      const merkleRootTwo = config.merkleTreeTwo.getHexRoot();
      await config.minter
        .connect(config.accounts.artist)
        .updateMerkleRoot(config.projectTwo, merkleRootTwo);
      // configure price per genArt721Core
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectTwo, 0);
      // allow purchase when intentionally configured price of zero
      await config.minter
        .connect(config.accounts.additional)
        [
          "purchase(uint256,bytes32[])"
        ](config.projectTwo, config.additionalMerkleProofTwo);
    });

    it("enforces mint limit per address when default limit of one is used", async function () {
      // get config from beforeEach
      const config = this.config;
      await config.minter
        .connect(config.accounts.user)
        [
          "purchase(uint256,bytes32[])"
        ](config.projectZero, config.userMerkleProofZero, {
          value: config.pricePerTokenInWei,
        });
      // expect revert after account hits default invocations per address limit of one
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectZero, config.userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          }),
        "Maximum number of invocations per address reached"
      );
    });

    it("allows multiple mints when override is set to unlimited", async function () {
      // get config from beforeEach
      const config = this.config;
      // toggle mint limiter to be off
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 0);
      // mint 15 times from a single address without failure
      for (let i = 0; i < 15; i++) {
        await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectZero, config.userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          });
      }
    });

    it("allows only five mints when override is set to five", async function () {
      // get config from beforeEach
      const config = this.config;
      // toggle mint limiter to be off
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 5);
      // mint 5 times from a single address without failure
      for (let i = 0; i < 5; i++) {
        await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectZero, config.userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          });
      }
      // expect revert after account hits >5 invocations
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectZero, config.userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          }),
        "Maximum number of invocations per address reached"
      );
    });

    it("stops allowing mints if artist reduces max invocations per address = current user's project invocations", async function () {
      // get config from beforeEach
      const config = this.config;
      // artist allows unlimited mints per address
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 0);
      // mint 5 times from a single address without failure
      for (let i = 0; i < 5; i++) {
        await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectZero, config.userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          });
      }
      // artist allows five mints per address
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 5);
      // expect revert because account already has 5 invocations
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectZero, config.userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          }),
        "Maximum number of invocations per address reached"
      );
    });

    it("stops allowing mints if artist reduces max invocations per address < current user's project invocations", async function () {
      // get config from beforeEach
      const config = this.config;
      // artist allows unlimited mints per address
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 0);
      // mint 5 times from a single address without failure
      for (let i = 0; i < 5; i++) {
        await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectZero, config.userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          });
      }
      // artist allows one mint per address
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 1);
      // expect revert because account already has >1 invocation
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectZero, config.userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          }),
        "Maximum number of invocations per address reached"
      );
    });

    it("rejects invalid merkle proofs", async function () {
      // get config from beforeEach
      const config = this.config;
      // expect revert when providing an invalid proof
      // (e.g. providing proof for valid address, but different tree)
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectZero, config.userMerkleProofOne, {
            value: config.pricePerTokenInWei,
          }),
        "Invalid Merkle proof"
      );
    });

    it("auto-configures if setProjectMaxInvocations is not called (fails correctly)", async function () {
      // get config from beforeEach
      const config = this.config;
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 0);
      for (let i = 0; i < 15; i++) {
        await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectZero, config.userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          });
      }

      // since auto-configured, we should see the minter's revert message
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectZero, config.userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          }),
        "Maximum number of invocations reached"
      );
    });

    it("doesnt add too much gas if setProjectMaxInvocations is set", async function () {
      // get config from beforeEach
      const config = this.config;
      // Try without setProjectMaxInvocations, store gas cost
      const minterType = await config.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? config.accounts.deployer
          : config.accounts.artist;

      const tx = await config.minter
        .connect(config.accounts.user)
        [
          "purchase(uint256,bytes32[])"
        ](config.projectZero, config.userMerkleProofZero, {
          value: config.pricePerTokenInWei,
        });

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
        .setProjectMaxInvocations(config.projectOne);
      const maxSetTx = await config.minter
        .connect(config.accounts.user)
        [
          "purchase(uint256,bytes32[])"
        ](config.projectOne, config.userMerkleProofOne, {
          value: config.pricePerTokenInWei,
        });
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
  });

  describe("purchaseTo", async function () {
    it("does not allow purchaseTo without proof arg", async function () {
      const config = await loadFixture(_beforeEach);
      // expect revert due to price not being configured
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          [
            "purchaseTo(address,uint256)"
          ](config.accounts.user.address, config.projectZero, {
            value: config.pricePerTokenInWei,
          }),
        "Must provide Merkle proof"
      );
    });

    it("does not allow purchase prior to configuring price", async function () {
      const config = await loadFixture(_beforeEach);
      // calc and update merkle root for project two
      const merkleRootTwo = config.merkleTreeTwo.getHexRoot();
      await config.minter
        .connect(config.accounts.artist)
        .updateMerkleRoot(config.projectTwo, merkleRootTwo);
      // get merkle proof and try purchasing
      const additionalMerkleProofTwo = config.merkleTreeTwo.getHexProof(
        hashAddress(config.accounts.additional.address)
      );
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectTwo, additionalMerkleProofTwo, {
            value: config.pricePerTokenInWei,
          }),
        "Price not configured"
      );
    });

    it("allows `purchaseTo` by default", async function () {
      const config = await loadFixture(_beforeEach);
      const userMerkleProofOne = config.merkleTreeOne.getHexProof(
        hashAddress(config.accounts.user.address)
      );
      await config.minter
        .connect(config.accounts.user)
        [
          "purchaseTo(address,uint256,bytes32[])"
        ](config.accounts.additional.address, config.projectOne, userMerkleProofOne, {
          value: config.pricePerTokenInWei,
        });
    });

    it("does not support toggling of `purchaseTo`", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .togglePurchaseToDisabled(config.projectOne),
        "Action not supported"
      );
    });
  });

  describe("processProofForAddress (pure)", async function () {
    it("returns expected value", async function () {
      const config = await loadFixture(_beforeEach);
      const userMerkleProofOne = config.merkleTreeOne.getHexProof(
        hashAddress(config.accounts.user.address)
      );
      const expectedRoot = config.merkleTreeOne.getHexRoot();
      const receivedRoot = await config.minter
        .connect(config.accounts.user)
        .processProofForAddress(
          userMerkleProofOne,
          config.accounts.user.address
        );
      expect(receivedRoot).to.equal(expectedRoot);
    });
  });

  describe("setProjectMaxInvocations", async function () {
    it("handles getting genArt721CoreInfo invocation info with V1 core", async function () {
      const config = await loadFixture(_beforeEach);
      const minterType = await config.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? config.accounts.deployer
          : config.accounts.artist;

      await config.minter
        .connect(accountToTestWith)
        .setProjectMaxInvocations(config.projectOne);
      // minter should update storage with accurate projectMaxInvocations
      let maxInvocations = await config.minter
        .connect(accountToTestWith)
        .projectMaxInvocations(config.projectOne);
      expect(maxInvocations).to.be.equal(config.maxInvocations);
      // ensure hasMaxBeenReached did not unexpectedly get set as true
      let hasMaxBeenInvoked = await config.minter
        .connect(accountToTestWith)
        .projectMaxHasBeenInvoked(config.projectOne);
      expect(hasMaxBeenInvoked).to.be.false;
    });

    it("reverts for unconfigured/non-existent project", async function () {
      const config = await loadFixture(_beforeEach);
      // trying to set config on unconfigured project (e.g. 99) should cause
      // revert on the underlying CoreContract.
      const minterType = await config.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? config.accounts.deployer
          : config.accounts.artist;

      expectRevert(
        config.minter.connect(accountToTestWith).setProjectMaxInvocations(99),
        "Project ID does not exist"
      );
    });
  });

  describe("projectMaxInvocationsPerAddress", async function () {
    it("is 1 by default", async function () {
      const config = await loadFixture(_beforeEach);
      const projectMaxInvocationsPerAddress_ = await config.minter
        .connect(config.accounts.user)
        .projectMaxInvocationsPerAddress(config.projectZero);
      expect(projectMaxInvocationsPerAddress_).to.equal(1);
    });

    it("is 0 by when set to 0", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 0);
      const projectMaxInvocationsPerAddress_ = await config.minter
        .connect(config.accounts.user)
        .projectMaxInvocationsPerAddress(config.projectZero);
      expect(projectMaxInvocationsPerAddress_).to.equal(0);
    });

    it("is 999 by when set to 999", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 999);
      const projectMaxInvocationsPerAddress_ = await config.minter
        .connect(config.accounts.user)
        .projectMaxInvocationsPerAddress(config.projectZero);
      expect(projectMaxInvocationsPerAddress_).to.equal(999);
    });

    it("is 999 by when set to 0 then changed to 999", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 0);
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 999);
      const projectMaxInvocationsPerAddress_ = await config.minter
        .connect(config.accounts.user)
        .projectMaxInvocationsPerAddress(config.projectZero);
      expect(projectMaxInvocationsPerAddress_).to.equal(999);
    });

    it("is 1 by when set to 0 then changed to 1", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 0);
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 1);
      const projectMaxInvocationsPerAddress_ = await config.minter
        .connect(config.accounts.user)
        .projectMaxInvocationsPerAddress(config.projectZero);
      expect(projectMaxInvocationsPerAddress_).to.equal(1);
    });
  });

  describe("projectRemainingInvocationsForAddress", async function () {
    beforeEach(async function () {
      const config = await loadFixture(_beforeEach);
      config.userMerkleProofZero = config.merkleTreeZero.getHexProof(
        hashAddress(config.accounts.user.address)
      );
      // pass config to tests in this describe block
      this.config = config;
    });

    it("is (true, 1) by default", async function () {
      // get config from beforeEach
      const config = this.config;
      const projectRemainingInvocationsForAddress_ = await config.minter
        .connect(config.accounts.user)
        .projectRemainingInvocationsForAddress(
          config.projectZero,
          config.accounts.user.address
        );
      expect(
        projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
      ).to.equal(true);
      expect(
        projectRemainingInvocationsForAddress_.mintInvocationsRemaining
      ).to.equal(1);
    });

    it("is (true, 0) after minting a token on default setting", async function () {
      // get config from beforeEach
      const config = this.config;
      // mint a token
      await config.minter
        .connect(config.accounts.user)
        [
          "purchase(uint256,bytes32[])"
        ](config.projectZero, config.userMerkleProofZero, {
          value: config.pricePerTokenInWei,
        });
      // user should have 0 remaining invocations
      const projectRemainingInvocationsForAddress_ = await config.minter
        .connect(config.accounts.user)
        .projectRemainingInvocationsForAddress(
          config.projectZero,
          config.accounts.user.address
        );
      expect(
        projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
      ).to.equal(true);
      expect(
        projectRemainingInvocationsForAddress_.mintInvocationsRemaining
      ).to.equal(0);
    });

    it("is (false, 0) by when set to not limit mints per address", async function () {
      // get config from beforeEach
      const config = this.config;
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 0);
      // check remaining invocations response
      let projectRemainingInvocationsForAddress_ = await config.minter
        .connect(config.accounts.user)
        .projectRemainingInvocationsForAddress(
          config.projectZero,
          config.accounts.user.address
        );
      expect(
        projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
      ).to.equal(false);
      expect(
        projectRemainingInvocationsForAddress_.mintInvocationsRemaining
      ).to.equal(0);
      // still false after user mints a token
      await config.minter
        .connect(config.accounts.user)
        [
          "purchase(uint256,bytes32[])"
        ](config.projectZero, config.userMerkleProofZero, {
          value: config.pricePerTokenInWei,
        });
      // check remaining invocations response
      projectRemainingInvocationsForAddress_ = await config.minter
        .connect(config.accounts.user)
        .projectRemainingInvocationsForAddress(
          config.projectZero,
          config.accounts.user.address
        );
      expect(
        projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
      ).to.equal(false);
      expect(
        projectRemainingInvocationsForAddress_.mintInvocationsRemaining
      ).to.equal(0);
    });

    it("is updated when set to limit mints per address", async function () {
      // get config from beforeEach
      const config = this.config;
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 5);
      // check remaining invocations response
      let projectRemainingInvocationsForAddress_ = await config.minter
        .connect(config.accounts.user)
        .projectRemainingInvocationsForAddress(
          config.projectZero,
          config.accounts.user.address
        );
      expect(
        projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
      ).to.equal(true);
      expect(
        projectRemainingInvocationsForAddress_.mintInvocationsRemaining
      ).to.equal(5);
      // updates after user mints two tokens
      for (let i = 0; i < 2; i++) {
        await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,bytes32[])"
          ](config.projectZero, config.userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          });
      }
      // check remaining invocations response
      projectRemainingInvocationsForAddress_ = await config.minter
        .connect(config.accounts.user)
        .projectRemainingInvocationsForAddress(
          config.projectZero,
          config.accounts.user.address
        );
      expect(
        projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
      ).to.equal(true);
      expect(
        projectRemainingInvocationsForAddress_.mintInvocationsRemaining
      ).to.equal(3);
      // becomes zero if artist reduces limit to 1
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectZero, 1);
      // check remaining invocations response
      projectRemainingInvocationsForAddress_ = await config.minter
        .connect(config.accounts.user)
        .projectRemainingInvocationsForAddress(
          config.projectZero,
          config.accounts.user.address
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
      const config = await loadFixture(_beforeEach);
      // contract buys are always allowed by default if in merkle tree
      // attacker deploys reentrancy contract specifically for Merkle minter(s)
      const reentrancyMockFactory = await ethers.getContractFactory(
        "ReentrancyMerkleMock"
      );
      const reentrancyMock = await reentrancyMockFactory
        .connect(config.accounts.deployer)
        .deploy();

      // artist generates a Merkle tree that includes malicious contract
      const attackerAddress = reentrancyMock.address;

      const elementsProjectOneWithAttacker = [];

      elementsProjectOneWithAttacker.push(
        config.accounts.deployer.address,
        config.accounts.artist.address,
        attackerAddress,
        config.accounts.user.address,
        config.accounts.user2.address
      );

      // build Merkle trees for projects zero, one, and two
      const merkleTreeOne = new MerkleTree(
        elementsProjectOneWithAttacker.map((_addr) => hashAddress(_addr)),
        keccak256,
        {
          sortPairs: true,
        }
      );

      // artists updates project Merkle root
      await config.minter
        .connect(config.accounts.artist)
        .updateMerkleRoot(config.projectOne, merkleTreeOne.getHexRoot());

      // attacker calculates Merkle proof for malicious contract
      const attackerMerkleProofOne = merkleTreeOne.getHexProof(
        hashAddress(attackerAddress)
      );
      // attacker should see revert when performing reentrancy attack
      let totalTokensToMint = 2;
      let numTokensToMint = BigNumber.from(totalTokensToMint.toString());
      let totalValue = config.higherPricePerTokenInWei.mul(numTokensToMint);
      await expectRevert(
        reentrancyMock
          .connect(config.accounts.deployer)
          .attack(
            numTokensToMint,
            config.minter.address,
            config.projectOne,
            config.higherPricePerTokenInWei,
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
      totalValue = config.higherPricePerTokenInWei.mul(numTokensToMint);
      for (let i = 0; i < totalTokensToMint; i++) {
        await reentrancyMock
          .connect(config.accounts.deployer)
          .attack(
            numTokensToMint,
            config.minter.address,
            config.projectOne,
            config.higherPricePerTokenInWei,
            attackerMerkleProofOne,
            {
              value: config.higherPricePerTokenInWei,
            }
          );
      }
    });

    it("does not allow reentrant purchaseTo, when mint limiter invocations per address set to 0 (unlimited)", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectOne, 0);
      // contract buys are always allowed by default if in merkle tree
      // attacker deploys reentrancy contract specifically for Merkle minter(s)
      const reentrancyMockFactory = await ethers.getContractFactory(
        "ReentrancyMerkleMock"
      );
      const reentrancyMock = await reentrancyMockFactory
        .connect(config.accounts.deployer)
        .deploy();

      // artist generates a Merkle tree that includes malicious contract
      const attackerAddress = reentrancyMock.address;

      const elementsProjectOneWithAttacker = [];

      elementsProjectOneWithAttacker.push(
        config.accounts.deployer.address,
        config.accounts.artist.address,
        attackerAddress,
        config.accounts.user.address,
        config.accounts.user2.address
      );

      // build Merkle trees for projects zero, one, and two
      const merkleTreeOne = new MerkleTree(
        elementsProjectOneWithAttacker.map((_addr) => hashAddress(_addr)),
        keccak256,
        {
          sortPairs: true,
        }
      );

      // artists updates project Merkle root
      await config.minter
        .connect(config.accounts.artist)
        .updateMerkleRoot(config.projectOne, merkleTreeOne.getHexRoot());

      // attacker calculates Merkle proof for malicious contract
      const attackerMerkleProofOne = merkleTreeOne.getHexProof(
        hashAddress(attackerAddress)
      );
      // attacker should see revert when performing reentrancy attack
      const totalTokensToMint = 2;
      let numTokensToMint = BigNumber.from(totalTokensToMint.toString());
      let totalValue = config.higherPricePerTokenInWei.mul(numTokensToMint);
      await expectRevert(
        reentrancyMock
          .connect(config.accounts.deployer)
          .attack(
            numTokensToMint,
            config.minter.address,
            config.projectOne,
            config.higherPricePerTokenInWei,
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
      totalValue = config.higherPricePerTokenInWei.mul(numTokensToMint);
      for (let i = 0; i < totalTokensToMint; i++) {
        await reentrancyMock
          .connect(config.accounts.deployer)
          .attack(
            numTokensToMint,
            config.minter.address,
            config.projectOne,
            config.higherPricePerTokenInWei,
            attackerMerkleProofOne,
            {
              value: config.higherPricePerTokenInWei,
            }
          );
      }
    });
  });

  describe("gnosis safe", async function () {
    it("allows gnosis safe to purchase in ETH", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy new Gnosis Safe
      const safeSdk: Safe = await getGnosisSafe(
        config.accounts.artist,
        config.accounts.additional,
        config.accounts.user
      );
      const safeAddress = safeSdk.getAddress();

      // build Merkle tree that includes safeAddress, update root
      const _allowlist = [config.accounts.artist.address, safeAddress];
      const merkleTreeOne = new MerkleTree(
        _allowlist.map((_addr) => hashAddress(_addr)),
        keccak256,
        {
          sortPairs: true,
        }
      );
      await config.minter
        .connect(config.accounts.artist)
        .updateMerkleRoot(config.projectOne, merkleTreeOne.getHexRoot());

      // calculate Merkle proof for safeAddress
      const safeMerkleProofOne = merkleTreeOne.getHexProof(
        hashAddress(safeAddress)
      );

      // create a transaction
      const unsignedTx = await config.minter.populateTransaction[
        "purchase(uint256,bytes32[])"
      ](config.projectOne, safeMerkleProofOne);
      const transaction: SafeTransactionDataPartial = {
        to: config.minter.address,
        data: unsignedTx.data,
        value: config.pricePerTokenInWei.toHexString(),
      };
      const safeTransaction = await safeSdk.createTransaction(transaction);

      // signers sign and execute the transaction
      // artist signs
      await safeSdk.signTransaction(safeTransaction);
      // additional signs
      const ethAdapterOwner2 = new EthersAdapter({
        ethers,
        signer: config.accounts.additional,
      });
      const safeSdk2 = await safeSdk.connect({
        ethAdapter: ethAdapterOwner2,
        safeAddress,
      });
      const txHash = await safeSdk2.getTransactionHash(safeTransaction);
      const approveTxResponse = await safeSdk2.approveTransactionHash(txHash);
      await approveTxResponse.transactionResponse?.wait();

      // fund the safe and execute transaction
      await config.accounts.artist.sendTransaction({
        to: safeAddress,
        value: config.pricePerTokenInWei,
      });

      const viewFunctionWithInvocations = (await isCoreV3(config.genArt721Core))
        ? config.genArt721Core.projectStateData
        : config.genArt721Core.projectTokenInfo;
      const projectStateDataBefore = await viewFunctionWithInvocations(
        config.projectOne
      );
      const executeTxResponse =
        await safeSdk2.executeTransaction(safeTransaction);
      await executeTxResponse.transactionResponse?.wait();
      const projectStateDataAfter = await viewFunctionWithInvocations(
        config.projectOne
      );
      expect(projectStateDataAfter.invocations).to.be.equal(
        projectStateDataBefore.invocations.add(1)
      );
    });
  });
};
