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
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { SafeTransactionDataPartial } from "@gnosis.pm/safe-core-sdk-types";
import { getGnosisSafe } from "../../util/GnosisSafeNetwork";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  compareBN,
} from "../../util/common";
import { CONFIG_MERKLE_ROOT, CONFIG_MINT_LIMITER_DISABLED } from "./constants";

import { MinterMerkle_Common } from "./MinterMerkleV0.common";

/**
 * @notice This returns the same result as solidity:
 * `keccak256(abi.encodePacked(_address));`
 * @dev mirrors `hashAddress` function in MinterMerkleV0 contract
 */
function hashAddress(_address) {
  return Buffer.from(
    ethers.utils.solidityKeccak256(["address"], [_address]).slice(2),
    "hex"
  );
}

/**
 * These tests intended to ensure Filtered Minter integrates properly with V1
 * core contract.
 */
describe("MinterMerkleV0", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this, 3); // this.this.projectZero = 3 on V1 core
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
      "GenArt721CoreV1",
      "MinterFilterV0"
    ));

    this.minter = await deployAndGet.call(this, "MinterMerkleV0", [
      this.genArt721Core.address,
      this.minterFilter.address,
    ]);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("project0", this.accounts.artist.address, 0, false);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("project1", this.accounts.artist.address, 0, false);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("project2", this.accounts.artist.address, 0, false);

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
      .connect(this.accounts.deployer)
      .addMintWhitelisted(this.minterFilter.address);

    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectOne, this.maxInvocations);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectTwo, this.maxInvocations);

    this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectZero);
    this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectOne);
    this.genArt721Core
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
    elementsProjectOne.push(this.accounts.user.address);
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
    this.ERC20Mock = await ERC20Factory.deploy(ethers.utils.parseEther("100"));
  });

  describe("common MinterHolder tests", async () => {
    MinterMerkle_Common();
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

  describe("toggleProjectMintLimiter", async function () {
    it("only allows artist to toggle mint limiter", async function () {
      // user not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          .toggleProjectMintLimiter(this.projectZero),
        "Only Artist"
      );
      // additional not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .toggleProjectMintLimiter(this.projectZero),
        "Only Artist"
      );
      // artist allowed
      await this.minter
        .connect(this.accounts.artist)
        .toggleProjectMintLimiter(this.projectZero);
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

  describe("toggleProjectMintLimiter", async function () {
    it("only allows artist to toggle mint limiter", async function () {
      const newMerkleRoot = this.merkleTreeZero.getHexRoot();
      // user not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          .toggleProjectMintLimiter(this.projectZero),
        "Only Artist"
      );
      // additional not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .toggleProjectMintLimiter(this.projectZero),
        "Only Artist"
      );
      // artist allowed
      await this.minter
        .connect(this.accounts.artist)
        .toggleProjectMintLimiter(this.projectZero);
    });

    it("emits event when toggling mint limiter", async function () {
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .toggleProjectMintLimiter(this.projectZero)
      )
        .to.emit(this.minter, "ConfigValueSet(uint256,bytes32,bool)")
        .withArgs(this.projectZero, CONFIG_MINT_LIMITER_DISABLED, true);
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .toggleProjectMintLimiter(this.projectZero)
      )
        .to.emit(this.minter, "ConfigValueSet(uint256,bytes32,bool)")
        .withArgs(this.projectZero, CONFIG_MINT_LIMITER_DISABLED, false);
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

    it("enforces mint limiter when limiter on", async function () {
      await this.minter
        .connect(this.accounts.user)
        ["purchase(uint256,bytes32[])"](
          this.projectZero,
          this.userMerkleProofZero,
          {
            value: this.pricePerTokenInWei,
          }
        );
      // expect revert after account hits minting limit
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
        "Limit 1 mint per address"
      );
    });

    it("allows multiple mints when limiter off", async function () {
      // toggle mint limiter to be off
      await this.minter
        .connect(this.accounts.artist)
        .toggleProjectMintLimiter(this.projectZero);
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
        .toggleProjectMintLimiter(this.projectZero);
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
        .connect(this.accounts.deployer)
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
        .toggleProjectMintLimiter(this.projectZero);
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
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(this.projectOne);
      await this.minter
        .connect(this.accounts.artist)
        .toggleProjectMintLimiter(this.projectOne);
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

  describe("calculates gas", async function () {
    it("mints and calculates gas values", async function () {
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
        "Gas cost for a successful ERC20 mint: ",
        ethers.utils.formatUnits(txCost.toString(), "ether").toString(),
        "ETH"
      );
      expect(compareBN(txCost, ethers.utils.parseEther("0.03874"), 1)).to.be
        .true;
    });

    it("is gas performant at 1k length allowlist", async function () {
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
      expect(compareBN(txCost, ethers.utils.parseEther("0.03957"), 1)).to.be
        .true;
    });
  });

  describe("purchaseTo", async function () {
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

  describe("setProjectMaxInvocations", async function () {
    it("handles getting genArt721CoreInfo invocation info with V1 core", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(this.projectOne);
      // minter should update storage with accurate projectMaxInvocations
      await this.minter
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(this.projectOne);
      let maxInvocations = await this.minter
        .connect(this.accounts.deployer)
        .projectMaxInvocations(this.projectOne);
      expect(maxInvocations).to.be.equal(this.maxInvocations);
      // ensure hasMaxBeenReached did not unexpectedly get set as true
      let hasMaxBeenInvoked = await this.minter
        .connect(this.accounts.deployer)
        .projectMaxHasBeenInvoked(this.projectOne);
      expect(hasMaxBeenInvoked).to.be.false;
      // should also support unconfigured project projectMaxInvocations
      // e.g. project 99, which does not yet exist
      await this.minter
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(99);
      maxInvocations = await this.minter
        .connect(this.accounts.deployer)
        .projectMaxInvocations(99);
      expect(maxInvocations).to.be.equal(0);
    });
  });

  describe("reentrancy attack", async function () {
    it("does not allow reentrant purchaseTo, when mint limiter on", async function () {
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

    it("does not allow reentrant purchaseTo, when mint limiter off", async function () {
      await this.minter
        .connect(this.accounts.artist)
        .toggleProjectMintLimiter(this.projectOne);
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
      const projectTokenInfoBefore = await this.genArt721Core.projectTokenInfo(
        this.projectOne
      );
      const executeTxResponse = await safeSdk2.executeTransaction(
        safeTransaction
      );
      await executeTxResponse.transactionResponse?.wait();
      const projectTokenInfoAfter = await this.genArt721Core.projectTokenInfo(
        this.projectOne
      );
      expect(projectTokenInfoAfter.invocations).to.be.equal(
        projectTokenInfoBefore.invocations.add(1)
      );
    });
  });
});
