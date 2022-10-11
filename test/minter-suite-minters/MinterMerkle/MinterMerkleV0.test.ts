const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
import { expect } from "chai";
import { ethers } from "hardhat";
import { Logger } from "@ethersproject/logger";
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

  describe("common MinterMerkle tests", async () => {
    await MinterMerkle_Common();
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
        "Gas cost for a successful ERC20 mint: ",
        ethers.utils.formatUnits(txCost.toString(), "ether").toString(),
        "ETH"
      );
      expect(compareBN(txCost, ethers.utils.parseEther("0.03874"), 1)).to.be
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
      expect(compareBN(txCost, ethers.utils.parseEther("0.03957"), 1)).to.be
        .true;
    });
  });
});
