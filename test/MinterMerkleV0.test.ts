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
    const [owner, newOwner, artist, additional, snowfro] =
      await ethers.getSigners();
    this.accounts = {
      owner: owner,
      newOwner: newOwner,
      artist: artist,
      additional: additional,
      snowfro: snowfro,
    };
    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();

    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV1");
    this.token = await artblocksFactory
      .connect(this.accounts.snowfro)
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
      .connect(this.accounts.snowfro)
      .addProject("project0", this.accounts.artist.address, 0, false);

    await this.token
      .connect(this.accounts.snowfro)
      .addProject("project1", this.accounts.artist.address, 0, false);

    await this.token
      .connect(this.accounts.snowfro)
      .addProject("project2", this.accounts.artist.address, 0, false);

    await this.token
      .connect(this.accounts.snowfro)
      .toggleProjectIsActive(projectZero);
    await this.token
      .connect(this.accounts.snowfro)
      .toggleProjectIsActive(projectOne);
    await this.token
      .connect(this.accounts.snowfro)
      .toggleProjectIsActive(projectTwo);

    await this.token
      .connect(this.accounts.snowfro)
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
      .connect(this.accounts.snowfro)
      .addApprovedMinter(this.minter.address);
    await this.minterFilter
      .connect(this.accounts.snowfro)
      .setMinterForProject(projectZero, this.minter.address);
    await this.minterFilter
      .connect(this.accounts.snowfro)
      .setMinterForProject(projectOne, this.minter.address);
    await this.minterFilter
      .connect(this.accounts.snowfro)
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
      this.accounts.snowfro.address,
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

    // set project mint limit for projects zero and one on minter
    await this.minter
      .connect(this.accounts.artist)
      .setProjectMintLimit(projectZero, 20);
    await this.minter
      .connect(this.accounts.artist)
      .setProjectMintLimit(projectOne, 20);

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
        .connect(this.accounts.snowfro)
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
      // doesn't allow snowfro
      await expectRevert(
        this.minter
          .connect(this.accounts.snowfro)
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
      const addrStringToHash = this.accounts.owner.address.toString().slice(2);
      const ownerMerkleProofZero = merkleTreeZero.getHexProof(
        hashAddress(this.accounts.owner.address)
      );
      // artist increases price
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei);
      // cannot purchase token at lower price
      // note: purchase function is overloaded, so require full signature
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

  describe("updateProjectCurrencyInfo", async function () {
    it("only allows artist to update currency info", async function () {
      const onlyArtistErrorMessage = "Only Artist";
      // doesn't allow owner
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          .updateProjectCurrencyInfo(
            projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow snowfro
      await expectRevert(
        this.minter
          .connect(this.accounts.snowfro)
          .updateProjectCurrencyInfo(
            projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .updateProjectCurrencyInfo(
            projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectZero, "ETH", constants.ZERO_ADDRESS);
    });

    it("enforces currency info update and allows purchases", async function () {
      const ownerMerkleProofZero = merkleTreeZero.getHexProof(
        hashAddress(this.accounts.owner.address)
      );
      // artist changes to Mock ERC20 token
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectZero, "MOCK", this.ERC20Mock.address);
      // cannot purchase token with ETH
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          ["purchase(uint256,bytes32[])"](projectZero, ownerMerkleProofZero, {
            value: pricePerTokenInWei,
          }),
        "this project accepts a different currency and cannot accept ETH"
      );
      // approve contract and able to mint with Mock token
      await this.ERC20Mock.connect(this.accounts.owner).approve(
        this.minter.address,
        ethers.utils.parseEther("100")
      );
      await this.minter
        .connect(this.accounts.owner)
        ["purchase(uint256,bytes32[])"](projectZero, ownerMerkleProofZero);
      // cannot purchase token with ERC20 token when insufficient balance
      await this.ERC20Mock.connect(this.accounts.owner).transfer(
        this.accounts.artist.address,
        ethers.utils.parseEther("100").sub(pricePerTokenInWei)
      );
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          ["purchase(uint256,bytes32[])"](projectZero, ownerMerkleProofZero),
        "Insufficient balance"
      );
      // artist changes back to ETH
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectZero, "ETH", constants.ZERO_ADDRESS);
      // able to mint with ETH
      await this.minter
        .connect(this.accounts.owner)
        ["purchase(uint256,bytes32[])"](projectZero, ownerMerkleProofZero, {
          value: pricePerTokenInWei,
        });
    });

    it("enforces currency update only on desired project", async function () {
      const ownerMerkleProofOne = merkleTreeOne.getHexProof(
        hashAddress(this.accounts.owner.address)
      );
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist changes currency info for project zero
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectZero, "MOCK", this.ERC20Mock.address);
      // can purchase project one token with ETH
      await this.minter
        .connect(this.accounts.owner)
        ["purchase(uint256,bytes32[])"](projectOne, ownerMerkleProofOne, {
          value: pricePerTokenInWei,
        });
    });

    it("emits event upon currency update", async function () {
      // artist changes currency info
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .updateProjectCurrencyInfo(
            projectZero,
            "MOCK",
            this.ERC20Mock.address
          )
      )
        .to.emit(this.minter, "ProjectCurrencyInfoUpdated")
        .withArgs(projectZero, this.ERC20Mock.address, "MOCK");
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
      // calc and update merkle root for project two
      const merkleRootTwo = merkleTreeTwo.getHexRoot();
      await this.minter
        .connect(this.accounts.artist)
        .updateMerkleRoot(projectTwo, merkleRootTwo);
      // configure num allowed mints
      await this.minter
        .connect(this.accounts.artist)
        .setProjectMintLimit(projectTwo, 1);
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

    it("does nothing if setProjectMaxInvocations is not called (fails correctly)", async function () {
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

      const ownerBalance = await this.accounts.owner.getBalance();
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
      const ownerBalanceNoMaxSet = await this.accounts.owner.getBalance();
      for (let i = 0; i < 15; i++) {
        await this.minter
          .connect(this.accounts.owner)
          ["purchase(uint256,bytes32[])"](
            projectZero,
            this.ownerMerkleProofZero,
            {
              value: pricePerTokenInWei,
              gasPrice: 1,
            }
          );
      }
      // Add back in mint costs to get only gas costs
      const ownerDeltaNoMaxSet = (await this.accounts.owner.getBalance())
        .sub(ownerBalanceNoMaxSet)
        .add(pricePerTokenInWei.mul(15));

      // Try with setProjectMaxInvocations, store gas cost
      await this.minter
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(projectOne);
      const ownerBalanceMaxSet = await this.accounts.owner.getBalance();
      for (let i = 0; i < 15; i++) {
        await this.minter
          .connect(this.accounts.owner)
          ["purchase(uint256,bytes32[])"](
            projectOne,
            this.ownerMerkleProofOne,
            {
              value: pricePerTokenInWei,
              gasPrice: 1,
            }
          );
      }
      // Add back in mint costs to get only gas costs
      const ownerDeltaMaxSet = (await this.accounts.owner.getBalance())
        .sub(ownerBalanceMaxSet)
        .add(pricePerTokenInWei.mul(15));

      console.log(
        "Gas cost for 15 successful mints with setProjectMaxInvocations: ",
        ownerDeltaMaxSet.toString()
      );
      console.log(
        "Gas cost for 15 successful mints without setProjectMaxInvocations: ",
        ownerDeltaNoMaxSet.toString()
      );

      // Check that with setProjectMaxInvocations it's not too much moer expensive
      expect(
        ownerDeltaMaxSet.abs().lt(ownerDeltaNoMaxSet.abs().mul(110).div(100))
      ).to.be.true;
    });

    it("fails more cheaply if setProjectMaxInvocations is set", async function () {
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
              gasPrice: 1,
            }
          ),
        "Must not exceed max invocations"
      );
      const ownerDeltaNoMaxSet = (await this.accounts.owner.getBalance()).sub(
        ownerBalanceNoMaxSet
      );

      // Try with setProjectMaxInvocations, store gas cost
      await this.minter
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(projectOne);
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
      const ownerBalanceMaxSet = await this.accounts.owner.getBalance();
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          ["purchase(uint256,bytes32[])"](
            projectOne,
            this.ownerMerkleProofOne,
            {
              value: pricePerTokenInWei,
              gasPrice: 1,
            }
          ),
        "Maximum number of invocations reached"
      );
      const ownerDeltaMaxSet = (await this.accounts.owner.getBalance()).sub(
        ownerBalanceMaxSet
      );

      console.log(
        "Gas cost with setProjectMaxInvocations: ",
        ownerDeltaMaxSet.toString()
      );
      console.log(
        "Gas cost without setProjectMaxInvocations: ",
        ownerDeltaNoMaxSet.toString()
      );

      expect(ownerDeltaMaxSet.abs().lt(ownerDeltaNoMaxSet.abs())).to.be.true;
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
        ethers.utils.formatUnits(txCost, "ether").toString()
      );
      expect(txCost.toString()).to.equal(ethers.utils.parseEther("0.0394351"));
    });
  });

  describe("purchaseTo", async function () {
    it("does not allow purchase prior to configuring price", async function () {
      // calc and update merkle root for project two
      const merkleRootTwo = merkleTreeTwo.getHexRoot();
      await this.minter
        .connect(this.accounts.artist)
        .updateMerkleRoot(projectTwo, merkleRootTwo);
      // configure num allowed mints
      await this.minter
        .connect(this.accounts.artist)
        .setProjectMintLimit(projectTwo, 1);
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
        .connect(this.accounts.snowfro)
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
        "No `purchaseTo` Allowed"
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
          .connect(this.accounts.snowfro)
          .togglePurchaseToDisabled(projectOne)
      )
        .to.emit(this.minter, "PurchaseToDisabledUpdated")
        .withArgs(projectOne, true);
      // emits false when changed from initial value of true
      await expect(
        this.minter
          .connect(this.accounts.snowfro)
          .togglePurchaseToDisabled(projectOne)
      )
        .to.emit(this.minter, "PurchaseToDisabledUpdated")
        .withArgs(projectOne, false);
    });
  });

  describe("setProjectMaxInvocations", async function () {
    it("handles getting tokenInfo invocation info with V1 core", async function () {
      await this.minter
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(projectOne);
      // minter should update storage with accurate projectMaxInvocations
      await this.minter
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(projectOne);
      let maxInvocations = await this.minter
        .connect(this.accounts.snowfro)
        .projectMaxInvocations(projectOne);
      expect(maxInvocations).to.be.equal(projectMaxInvocations);
      // ensure hasMaxBeenReached did not unexpectedly get set as true
      let hasMaxBeenInvoked = await this.minter
        .connect(this.accounts.snowfro)
        .projectMaxHasBeenInvoked(projectOne);
      expect(hasMaxBeenInvoked).to.be.false;
      // should also support unconfigured project projectMaxInvocations
      // e.g. project 99, which does not yet exist
      await this.minter
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(99);
      maxInvocations = await this.minter3
        .connect(this.accounts.snowfro)
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

  it("reports ERC20 token symbol and address if set", async function () {
    // artist changes to Mock ERC20 token
    await this.minter
      .connect(this.accounts.artist)
      .updateProjectCurrencyInfo(projectZero, "MOCK", this.ERC20Mock.address);
    // reports ERC20 updated price information
    const currencyInfo = await this.minter
      .connect(this.accounts.artist)
      .getPriceInfo(projectZero);
    expect(currencyInfo.currencySymbol).to.be.equal("MOCK");
    expect(currencyInfo.currencyAddress).to.be.equal(this.ERC20Mock.address);
  });

  describe("reentrancy attack", async function () {
    it("does not allow reentrant purchaseTo", async function () {
      // contract buys are always allowed by default if in merkle tree
      // attacker deploys reentrancy contract specifically for Merkle minter(s)
      const reentrancyMockFactory = await ethers.getContractFactory(
        "ReentrancyMerkleMock"
      );
      const reentrancyMock = await reentrancyMockFactory
        .connect(this.accounts.snowfro)
        .deploy();

      // artist generates a Merkle tree that includes malicious contract
      const attackerAddress = reentrancyMock.address;

      const elementsProjectOneWithAttacker = [];

      elementsProjectOneWithAttacker.push(
        this.accounts.snowfro.address,
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
          .connect(this.accounts.snowfro)
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
          .connect(this.accounts.snowfro)
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
});
