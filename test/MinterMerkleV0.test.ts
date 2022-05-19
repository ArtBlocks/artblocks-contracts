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
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { SafeTransactionDataPartial } from "@gnosis.pm/safe-core-sdk-types";
import { getGnosisSafe } from "./util/GnosisSafeNetwork";
import { toUtf8CodePoints } from "ethers/lib/utils";
import { ethers } from "hardhat";
// Suppress "Duplicate definition" error logs
ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR);

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

const CONFIG_MERKLE_ROOT = ethers.utils.formatBytes32String("merkleRoot");
const CONFIG_MINT_LIMITER_DISABLED = ethers.utils.formatBytes32String(
  "mintLimiterDisabled"
);

/**
 * These tests intended to ensure Filtered Minter integrates properly with V1
 * core contract.
 */
describe("MinterMerkleV0", async function () {
  const name = "Non Fungible Token";
  const symbol = "NFT";

  const firstTokenId = new BN("30000000");
  const secondTokenId = new BN("3000001");

  const pricePerTokenInWei = ethers.utils.parseEther("1");
  const higherPricePerTokenInWei = pricePerTokenInWei.add(
    ethers.utils.parseEther("0.1")
  );
  const projectZero = 3; // V1 core starts at project 3
  const projectOne = 4;
  const projectTwo = 5;

  const projectMaxInvocations = 15;

  // Merkle trees (populated beforeEach)
  let merkleTreeZero;
  let merkleTreeOne;
  let merkleTreeTwo;

  beforeEach(async function () {
    const [owner, newOwner, artist, additional, deployer] =
      await ethers.getSigners();
    this.accounts = {
      owner: owner,
      newOwner: newOwner,
      artist: artist,
      additional: additional,
      deployer: deployer,
    };
    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();

    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV1");
    this.token = await artblocksFactory
      .connect(this.accounts.deployer)
      .deploy(name, symbol, this.randomizer.address);

    const minterFilterFactory = await ethers.getContractFactory(
      "MinterFilterV0"
    );
    this.minterFilter = await minterFilterFactory.deploy(this.token.address);

    const minterFactory = await ethers.getContractFactory("MinterMerkleV0");
    this.minter = await minterFactory.deploy(
      this.token.address,
      this.minterFilter.address
    );
    this.minter3 = await minterFactory.deploy(
      this.token.address,
      this.minterFilter.address
    );

    await this.token
      .connect(this.accounts.deployer)
      .addProject("project0", this.accounts.artist.address, 0, false);

    await this.token
      .connect(this.accounts.deployer)
      .addProject("project1", this.accounts.artist.address, 0, false);

    await this.token
      .connect(this.accounts.deployer)
      .addProject("project2", this.accounts.artist.address, 0, false);

    await this.token
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(projectZero);
    await this.token
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(projectOne);
    await this.token
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(projectTwo);

    await this.token
      .connect(this.accounts.deployer)
      .addMintWhitelisted(this.minterFilter.address);

    await this.token
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(projectZero, projectMaxInvocations);
    await this.token
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(projectOne, projectMaxInvocations);
    await this.token
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(projectTwo, projectMaxInvocations);

    this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectZero);
    this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectOne);
    this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectTwo);

    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minter.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(projectZero, this.minter.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(projectOne, this.minter.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(projectTwo, this.minter.address);

    // set token price for projects zero and one on minter
    await this.minter
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(projectZero, pricePerTokenInWei);
    await this.minter
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(projectOne, pricePerTokenInWei);

    // populate Merkle elements for projects zero, one, and two
    const elementsProjectZero = [];
    const elementsProjectOne = [];
    const elementsProjectTwo = [];

    elementsProjectZero.push(
      this.accounts.deployer.address,
      this.accounts.artist.address,
      this.accounts.additional.address,
      this.accounts.owner.address,
      this.accounts.newOwner.address
    );
    elementsProjectOne.push(this.accounts.owner.address);
    elementsProjectTwo.push(this.accounts.additional.address);

    // build Merkle trees for projects zero, one, and two
    merkleTreeZero = new MerkleTree(
      elementsProjectZero.map((_addr) => hashAddress(_addr)),
      keccak256,
      {
        sortPairs: true,
      }
    );
    merkleTreeOne = new MerkleTree(
      elementsProjectOne.map((_addr) => hashAddress(_addr)),
      keccak256,
      {
        sortPairs: true,
      }
    );
    merkleTreeTwo = new MerkleTree(
      elementsProjectTwo.map((_addr) => hashAddress(_addr)),
      keccak256,
      {
        sortPairs: true,
      }
    );

    // update Merkle root for projects zero and one on minter
    const merkleRootZero = merkleTreeZero.getHexRoot();
    const merkleRootOne = merkleTreeOne.getHexRoot();
    // Merkle root two intentionally not set
    await this.minter
      .connect(this.accounts.artist)
      .updateMerkleRoot(projectZero, merkleRootZero);
    await this.minter
      .connect(this.accounts.artist)
      .updateMerkleRoot(projectOne, merkleRootOne);

    // mock ERC20 token
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    this.ERC20Mock = await ERC20Factory.deploy(ethers.utils.parseEther("100"));
  });

  describe("constructor", async function () {
    it("reverts when given incorrect minter filter and core addresses", async function () {
      const artblocksFactory = await ethers.getContractFactory(
        "GenArt721CoreV1"
      );
      const token2 = await artblocksFactory
        .connect(this.accounts.deployer)
        .deploy(name, symbol, this.randomizer.address);

      const minterFilterFactory = await ethers.getContractFactory(
        "MinterFilterV0"
      );
      const minterFilter = await minterFilterFactory.deploy(token2.address);

      const minterFactory = await ethers.getContractFactory("MinterMerkleV0");
      // fails when combine new minterFilter with the old token in constructor
      await expectRevert(
        minterFactory.deploy(this.token.address, minterFilter.address),
        "Illegal contract pairing"
      );
    });
  });

  describe("updatePricePerTokenInWei", async function () {
    it("only allows artist to update price", async function () {
      const onlyArtistErrorMessage = "Only Artist";
      // doesn't allow owner
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei),
        onlyArtistErrorMessage
      );
      // doesn't allow deployer
      await expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei),
        onlyArtistErrorMessage
      );
      // does allow artist
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei);
    });

    it("enforces price update", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      const ownerMerkleProofZero = merkleTreeZero.getHexProof(
        hashAddress(this.accounts.owner.address)
      );
      // artist increases price
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei);
      // cannot purchase token at lower price
      // note: purchase function is overloaded, so requires full signature
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          ["purchase(uint256,bytes32[])"](projectZero, ownerMerkleProofZero, {
            value: pricePerTokenInWei,
          }),
        needMoreValueErrorMessage
      );
      // can purchase token at higher price
      await this.minter
        .connect(this.accounts.owner)
        ["purchase(uint256,bytes32[])"](projectZero, ownerMerkleProofZero, {
          value: higherPricePerTokenInWei,
        });
    });

    it("enforces price update only on desired project", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      const ownerMerkleProofZero = merkleTreeZero.getHexProof(
        hashAddress(this.accounts.owner.address)
      );
      const ownerMerkleProofOne = merkleTreeOne.getHexProof(
        hashAddress(this.accounts.owner.address)
      );
      // artist increases price of project zero
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei);
      // cannot purchase project zero token at lower price
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          ["purchase(uint256,bytes32[])"](projectZero, ownerMerkleProofZero, {
            value: pricePerTokenInWei,
          }),
        needMoreValueErrorMessage
      );
      // can purchase project one token at lower price
      await this.minter
        .connect(this.accounts.owner)
        ["purchase(uint256,bytes32[])"](projectOne, ownerMerkleProofOne, {
          value: pricePerTokenInWei,
        });
    });

    it("emits event upon price update", async function () {
      // artist increases price
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei)
      )
        .to.emit(this.minter, "PricePerTokenInWeiUpdated")
        .withArgs(projectZero, higherPricePerTokenInWei);
    });
  });

  describe("toggleProjectMintLimiter", async function () {
    it("only allows artist to toggle mint limiter", async function () {
      // owner not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          .toggleProjectMintLimiter(projectZero),
        "Only Artist"
      );
      // additional not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .toggleProjectMintLimiter(projectZero),
        "Only Artist"
      );
      // artist allowed
      await this.minter
        .connect(this.accounts.artist)
        .toggleProjectMintLimiter(projectZero);
    });
  });

  describe("updateMerkleRoot", async function () {
    it("only allows artist to update merkle root", async function () {
      const newMerkleRoot = merkleTreeZero.getHexRoot();
      // owner not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          .updateMerkleRoot(projectZero, newMerkleRoot),
        "Only Artist"
      );
      // additional not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .updateMerkleRoot(projectZero, newMerkleRoot),
        "Only Artist"
      );
      // artist allowed
      await this.minter
        .connect(this.accounts.artist)
        .updateMerkleRoot(projectZero, newMerkleRoot);
    });

    it("emits event when update merkle root", async function () {
      const newMerkleRoot = merkleTreeZero.getHexRoot();
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .updateMerkleRoot(projectZero, newMerkleRoot)
      )
        .to.emit(this.minter, "ConfigSetValue(uint256,bytes32,bytes32)")
        .withArgs(projectZero, CONFIG_MERKLE_ROOT, newMerkleRoot);
    });
  });

  describe("toggleProjectMintLimiter", async function () {
    it("only allows artist to toggle mint limiter", async function () {
      const newMerkleRoot = merkleTreeZero.getHexRoot();
      // owner not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          .toggleProjectMintLimiter(projectZero),
        "Only Artist"
      );
      // additional not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .toggleProjectMintLimiter(projectZero),
        "Only Artist"
      );
      // artist allowed
      await this.minter
        .connect(this.accounts.artist)
        .toggleProjectMintLimiter(projectZero);
    });

    it("emits event when toggling mint limiter", async function () {
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .toggleProjectMintLimiter(projectZero)
      )
        .to.emit(this.minter, "ConfigSetValue(uint256,bytes32,bool)")
        .withArgs(projectZero, CONFIG_MINT_LIMITER_DISABLED, true);
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .toggleProjectMintLimiter(projectZero)
      )
        .to.emit(this.minter, "ConfigSetValue(uint256,bytes32,bool)")
        .withArgs(projectZero, CONFIG_MINT_LIMITER_DISABLED, false);
    });
  });

  describe("purchase", async function () {
    beforeEach(async function () {
      this.ownerMerkleProofZero = merkleTreeZero.getHexProof(
        hashAddress(this.accounts.owner.address)
      );
      this.ownerMerkleProofOne = merkleTreeOne.getHexProof(
        hashAddress(this.accounts.owner.address)
      );
      this.additionalMerkleProofTwo = merkleTreeTwo.getHexProof(
        hashAddress(this.accounts.additional.address)
      );
    });

    it("does not allow purchase prior to setting Merkle root (results in invalid proof)", async function () {
      // configure price per token
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectTwo, 0);
      // expect revert because Merkle root has not been set
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          ["purchase(uint256,bytes32[])"](
            projectTwo,
            this.additionalMerkleProofTwo,
            {
              value: pricePerTokenInWei,
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
            projectTwo,
            this.additionalMerkleProofTwo,
            {
              value: pricePerTokenInWei,
            }
          ),
        "Price not configured"
      );
    });

    it("does allow purchase with a price of zero when intentionally configured", async function () {
      // calc and update merkle root for project two
      const merkleRootTwo = merkleTreeTwo.getHexRoot();
      await this.minter
        .connect(this.accounts.artist)
        .updateMerkleRoot(projectTwo, merkleRootTwo);
      // configure price per token
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectTwo, 0);
      // allow purchase when intentionally configured price of zero
      await this.minter
        .connect(this.accounts.additional)
        ["purchase(uint256,bytes32[])"](
          projectTwo,
          this.additionalMerkleProofTwo
        );
    });

    it("enforces mint limiter when limiter on", async function () {
      await this.minter
        .connect(this.accounts.owner)
        ["purchase(uint256,bytes32[])"](
          projectZero,
          this.ownerMerkleProofZero,
          {
            value: pricePerTokenInWei,
          }
        );
      // expect revert after account hits minting limit
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          ["purchase(uint256,bytes32[])"](
            projectZero,
            this.ownerMerkleProofZero,
            {
              value: pricePerTokenInWei,
            }
          ),
        "Limit 1 mint per address"
      );
    });

    it("allows multiple mints when limiter off", async function () {
      // toggle mint limiter to be off
      await this.minter
        .connect(this.accounts.artist)
        .toggleProjectMintLimiter(projectZero);
      // mint 15 times from a single address without failure
      for (let i = 0; i < 15; i++) {
        await this.minter
          .connect(this.accounts.owner)
          ["purchase(uint256,bytes32[])"](
            projectZero,
            this.ownerMerkleProofZero,
            {
              value: pricePerTokenInWei,
            }
          );
      }
    });

    it("rejects invalid merkle proofs", async function () {
      // expect revert when providing an invalid proof
      // (e.g. providing proof for valid address, but different tree)
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          ["purchase(uint256,bytes32[])"](
            projectZero,
            this.ownerMerkleProofOne,
            {
              value: pricePerTokenInWei,
            }
          ),
        "Invalid Merkle proof"
      );
    });

    it("does nothing if setProjectMaxInvocations is not called (fails correctly)", async function () {
      await this.minter
        .connect(this.accounts.artist)
        .toggleProjectMintLimiter(projectZero);
      for (let i = 0; i < 15; i++) {
        await this.minter
          .connect(this.accounts.owner)
          ["purchase(uint256,bytes32[])"](
            projectZero,
            this.ownerMerkleProofZero,
            {
              value: pricePerTokenInWei,
            }
          );
      }

      // expect revert after project hits max invocations
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          ["purchase(uint256,bytes32[])"](
            projectZero,
            this.ownerMerkleProofZero,
            {
              value: pricePerTokenInWei,
            }
          ),
        "Must not exceed max invocations"
      );
    });

    it("doesnt add too much gas if setProjectMaxInvocations is set", async function () {
      // Try without setProjectMaxInvocations, store gas cost
      const tx = await this.minter
        .connect(this.accounts.owner)
        ["purchase(uint256,bytes32[])"](
          projectZero,
          this.ownerMerkleProofZero,
          {
            value: pricePerTokenInWei,
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
        .setProjectMaxInvocations(projectOne);
      const maxSetTx = await this.minter
        .connect(this.accounts.owner)
        ["purchase(uint256,bytes32[])"](projectOne, this.ownerMerkleProofOne, {
          value: pricePerTokenInWei,
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

    it("fails more cheaply if setProjectMaxInvocations is set", async function () {
      await this.minter
        .connect(this.accounts.artist)
        .toggleProjectMintLimiter(projectZero);
      // Try without setProjectMaxInvocations, store gas cost
      for (let i = 0; i < 15; i++) {
        await this.minter
          .connect(this.accounts.owner)
          ["purchase(uint256,bytes32[])"](
            projectZero,
            this.ownerMerkleProofZero,
            {
              value: pricePerTokenInWei,
            }
          );
      }
      const ownerBalanceNoMaxSet = await this.accounts.owner.getBalance();
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          ["purchase(uint256,bytes32[])"](
            projectZero,
            this.ownerMerkleProofZero,
            {
              value: pricePerTokenInWei,
            }
          ),
        "Must not exceed max invocations"
      );
      const ownerDeltaNoMaxSet = ownerBalanceNoMaxSet.sub(
        BigNumber.from(await this.accounts.owner.getBalance())
      );

      // Try with setProjectMaxInvocations, store gas cost
      await this.minter
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(projectOne);
      await this.minter
        .connect(this.accounts.artist)
        .toggleProjectMintLimiter(projectOne);
      for (let i = 0; i < 15; i++) {
        await this.minter
          .connect(this.accounts.owner)
          ["purchase(uint256,bytes32[])"](
            projectOne,
            this.ownerMerkleProofOne,
            {
              value: pricePerTokenInWei,
            }
          );
      }
      const ownerBalanceMaxSet = BigNumber.from(
        await this.accounts.owner.getBalance()
      );
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          ["purchase(uint256,bytes32[])"](
            projectOne,
            this.ownerMerkleProofOne,
            {
              value: pricePerTokenInWei,
            }
          ),
        "Maximum number of invocations reached"
      );
      const ownerDeltaMaxSet = ownerBalanceMaxSet.sub(
        BigNumber.from(await this.accounts.owner.getBalance())
      );

      console.log(
        "Gas cost with setProjectMaxInvocations: ",
        ethers.utils.formatUnits(ownerDeltaMaxSet, "ether").toString(),
        "ETH"
      );
      console.log(
        "Gas cost without setProjectMaxInvocations: ",
        ethers.utils.formatUnits(ownerDeltaNoMaxSet, "ether").toString(),
        "ETH"
      );

      expect(ownerDeltaMaxSet.lt(ownerDeltaNoMaxSet)).to.be.true;
    });
  });

  describe("calculates gas", async function () {
    it("mints and calculates gas values", async function () {
      const ownerMerkleProofOne = merkleTreeOne.getHexProof(
        hashAddress(this.accounts.owner.address)
      );
      const tx = await this.minter
        .connect(this.accounts.owner)
        ["purchase(uint256,bytes32[])"](projectOne, ownerMerkleProofOne, {
          value: pricePerTokenInWei,
        });

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed).toString();

      console.log(
        "Gas cost for a successful ERC20 mint: ",
        ethers.utils.formatUnits(txCost, "ether").toString(),
        "ETH"
      );
      expect(txCost.toString()).to.equal(ethers.utils.parseEther("0.0389827"));
    });
  });

  describe("purchaseTo", async function () {
    it("does not allow purchase prior to configuring price", async function () {
      // calc and update merkle root for project two
      const merkleRootTwo = merkleTreeTwo.getHexRoot();
      await this.minter
        .connect(this.accounts.artist)
        .updateMerkleRoot(projectTwo, merkleRootTwo);
      // get merkle proof and try purchasing
      const additionalMerkleProofTwo = merkleTreeTwo.getHexProof(
        hashAddress(this.accounts.additional.address)
      );
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          ["purchaseTo(address,uint256,bytes32[])"](
            this.accounts.additional.address,
            projectTwo,
            additionalMerkleProofTwo,
            {
              value: pricePerTokenInWei,
            }
          ),
        "Price not configured"
      );
    });

    it("allows `purchaseTo` by default", async function () {
      const ownerMerkleProofOne = merkleTreeOne.getHexProof(
        hashAddress(this.accounts.owner.address)
      );
      await this.minter
        .connect(this.accounts.owner)
        ["purchaseTo(address,uint256,bytes32[])"](
          this.accounts.additional.address,
          projectOne,
          ownerMerkleProofOne,
          {
            value: pricePerTokenInWei,
          }
        );
    });

    it("disallows `purchaseTo` if disallowed explicitly", async function () {
      const ownerMerkleProofOne = merkleTreeOne.getHexProof(
        hashAddress(this.accounts.owner.address)
      );
      await this.minter
        .connect(this.accounts.artist)
        .togglePurchaseToDisabled(projectOne);
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          ["purchaseTo(address,uint256,bytes32[])"](
            this.accounts.additional.address,
            projectOne,
            ownerMerkleProofOne,
            {
              value: pricePerTokenInWei,
            }
          ),
        "No `purchaseTo` allowed"
      );
      // still allows `purchaseTo` if destination matches sender.
      await this.minter
        .connect(this.accounts.owner)
        ["purchaseTo(address,uint256,bytes32[])"](
          this.accounts.owner.address,
          projectOne,
          ownerMerkleProofOne,
          {
            value: pricePerTokenInWei,
          }
        );
    });

    it("emits event when `purchaseTo` is toggled", async function () {
      // emits true when changed from initial value of false
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .togglePurchaseToDisabled(projectOne)
      )
        .to.emit(this.minter, "PurchaseToDisabledUpdated")
        .withArgs(projectOne, true);
      // emits false when changed from initial value of true
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .togglePurchaseToDisabled(projectOne)
      )
        .to.emit(this.minter, "PurchaseToDisabledUpdated")
        .withArgs(projectOne, false);
    });
  });

  describe("setProjectMaxInvocations", async function () {
    it("handles getting tokenInfo invocation info with V1 core", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(projectOne);
      // minter should update storage with accurate projectMaxInvocations
      await this.minter
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(projectOne);
      let maxInvocations = await this.minter
        .connect(this.accounts.deployer)
        .projectMaxInvocations(projectOne);
      expect(maxInvocations).to.be.equal(projectMaxInvocations);
      // ensure hasMaxBeenReached did not unexpectedly get set as true
      let hasMaxBeenInvoked = await this.minter
        .connect(this.accounts.deployer)
        .projectMaxHasBeenInvoked(projectOne);
      expect(hasMaxBeenInvoked).to.be.false;
      // should also support unconfigured project projectMaxInvocations
      // e.g. project 99, which does not yet exist
      await this.minter
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(99);
      maxInvocations = await this.minter3
        .connect(this.accounts.deployer)
        .projectMaxInvocations(99);
      expect(maxInvocations).to.be.equal(0);
    });
  });

  describe("currency info hooks", async function () {
    const unconfiguredProjectNumber = 99;

    it("reports expected price per token", async function () {
      let currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(currencyInfo.tokenPriceInWei).to.be.equal(pricePerTokenInWei);
      // returns zero for unconfigured project price
      currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.tokenPriceInWei).to.be.equal(0);
    });

    it("reports expected isConfigured", async function () {
      let currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(currencyInfo.isConfigured).to.be.equal(true);
      // false for unconfigured project
      currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.isConfigured).to.be.equal(false);
    });

    it("reports default currency as ETH", async function () {
      let currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(currencyInfo.currencySymbol).to.be.equal("ETH");
      // should also report ETH for unconfigured project
      currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.currencySymbol).to.be.equal("ETH");
    });

    it("reports default currency address as null address", async function () {
      let currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(currencyInfo.currencyAddress).to.be.equal(constants.ZERO_ADDRESS);
      // should also report ETH for unconfigured project
      currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.currencyAddress).to.be.equal(constants.ZERO_ADDRESS);
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
        this.accounts.owner.address,
        this.accounts.newOwner.address
      );

      // build Merkle trees for projects zero, one, and two
      merkleTreeOne = new MerkleTree(
        elementsProjectOneWithAttacker.map((_addr) => hashAddress(_addr)),
        keccak256,
        {
          sortPairs: true,
        }
      );

      // artists updates project Merkle root
      await this.minter
        .connect(this.accounts.artist)
        .updateMerkleRoot(projectOne, merkleTreeOne.getHexRoot());

      // attacker calculates Merkle proof for malicious contract
      const attackerMerkleProofOne = merkleTreeOne.getHexProof(
        hashAddress(attackerAddress)
      );
      // attacker should see revert when performing reentrancy attack
      let totalTokensToMint = 2;
      let numTokensToMint = BigNumber.from(totalTokensToMint.toString());
      let totalValue = higherPricePerTokenInWei.mul(numTokensToMint);
      await expectRevert(
        reentrancyMock
          .connect(this.accounts.deployer)
          .attack(
            numTokensToMint,
            this.minter.address,
            projectOne,
            higherPricePerTokenInWei,
            attackerMerkleProofOne,
            {
              value: totalValue,
            }
          ),
        // failure message occurs during refund, where attack reentrency occurs
        "Refund failed"
      );
      // attacker should be able to purchase ONE token w/refunds
      totalTokensToMint = 1;
      numTokensToMint = BigNumber.from("1");
      totalValue = higherPricePerTokenInWei.mul(numTokensToMint);
      for (let i = 0; i < totalTokensToMint; i++) {
        await reentrancyMock
          .connect(this.accounts.deployer)
          .attack(
            numTokensToMint,
            this.minter.address,
            projectOne,
            higherPricePerTokenInWei,
            attackerMerkleProofOne,
            {
              value: higherPricePerTokenInWei,
            }
          );
      }
    });

    it("does not allow reentrant purchaseTo, when mint limiter off", async function () {
      await this.minter
        .connect(this.accounts.artist)
        .toggleProjectMintLimiter(projectOne);
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
        this.accounts.owner.address,
        this.accounts.newOwner.address
      );

      // build Merkle trees for projects zero, one, and two
      merkleTreeOne = new MerkleTree(
        elementsProjectOneWithAttacker.map((_addr) => hashAddress(_addr)),
        keccak256,
        {
          sortPairs: true,
        }
      );

      // artists updates project Merkle root
      await this.minter
        .connect(this.accounts.artist)
        .updateMerkleRoot(projectOne, merkleTreeOne.getHexRoot());

      // attacker calculates Merkle proof for malicious contract
      const attackerMerkleProofOne = merkleTreeOne.getHexProof(
        hashAddress(attackerAddress)
      );
      // attacker should see revert when performing reentrancy attack
      const totalTokensToMint = 2;
      let numTokensToMint = BigNumber.from(totalTokensToMint.toString());
      let totalValue = higherPricePerTokenInWei.mul(numTokensToMint);
      await expectRevert(
        reentrancyMock
          .connect(this.accounts.deployer)
          .attack(
            numTokensToMint,
            this.minter.address,
            projectOne,
            higherPricePerTokenInWei,
            attackerMerkleProofOne,
            {
              value: totalValue,
            }
          ),
        // failure message occurs during refund, where attack reentrency occurs
        "Refund failed"
      );
      // attacker should be able to purchase ONE token at a time w/refunds
      numTokensToMint = BigNumber.from("1");
      totalValue = higherPricePerTokenInWei.mul(numTokensToMint);
      for (let i = 0; i < totalTokensToMint; i++) {
        await reentrancyMock
          .connect(this.accounts.deployer)
          .attack(
            numTokensToMint,
            this.minter.address,
            projectOne,
            higherPricePerTokenInWei,
            attackerMerkleProofOne,
            {
              value: higherPricePerTokenInWei,
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
        this.accounts.owner
      );
      const safeAddress = safeSdk.getAddress();

      // build Merkle tree that includes safeAddress, update root
      const _allowlist = [this.accounts.artist.address, safeAddress];
      merkleTreeOne = new MerkleTree(
        _allowlist.map((_addr) => hashAddress(_addr)),
        keccak256,
        {
          sortPairs: true,
        }
      );
      await this.minter
        .connect(this.accounts.artist)
        .updateMerkleRoot(projectOne, merkleTreeOne.getHexRoot());

      // calculate Merkle proof for safeAddress
      const safeMerkleProofOne = merkleTreeOne.getHexProof(
        hashAddress(safeAddress)
      );

      // create a transaction
      const unsignedTx = await this.minter.populateTransaction[
        "purchase(uint256,bytes32[])"
      ](projectOne, safeMerkleProofOne);
      const transaction: SafeTransactionDataPartial = {
        to: this.minter.address,
        data: unsignedTx.data,
        value: pricePerTokenInWei.toHexString(),
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
        value: pricePerTokenInWei,
      });
      const projectTokenInfoBefore = await this.token.projectTokenInfo(
        projectOne
      );
      const executeTxResponse = await safeSdk2.executeTransaction(
        safeTransaction
      );
      await executeTxResponse.transactionResponse?.wait();
      const projectTokenInfoAfter = await this.token.projectTokenInfo(
        projectOne
      );
      expect(projectTokenInfoAfter.invocations).to.be.equal(
        projectTokenInfoBefore.invocations.add(1)
      );
    });
  });
});
