import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import {
  deployAndGet,
  deployCore,
  safeAddProject,
  hashAddress,
} from "../../../util/common";
import { expectRevert, constants } from "@openzeppelin/test-helpers";
import { SetPrice_Common_Configure } from "../common.configure";
import { ethers } from "hardhat";
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
import { revertMessages } from "../../constants";

const TARGET_MINTER_NAME = "MinterSetPriceMerkleV5";
const TARGET_MINTER_VERSION = "v5.0.0";

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
  // {
  //   core: "GenArt721CoreV3_Explorations",
  // },
  // {
  //   core: "GenArt721CoreV3_Engine",
  // },
  // {
  //   core: "GenArt721CoreV3_Engine_Flex",
  // },
];

runForEach.forEach((params) => {
  describe(`MinterSetPriceMerkle Configure w/ core ${params.core}`, async function () {
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

      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectOne,
          config.genArt721Core.address,
          config.pricePerTokenInWei
        );

      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 15);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, 15);

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
      // switch config.projectZero back to MinterHolderV0
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

      return config;
    }

    describe("Common Set Price Minter Configure Tests", async function () {
      await SetPrice_Common_Configure(_beforeEach);
    });

    describe("updatePricePerTokenInWei", async function () {
      it("enforces price update", async function () {
        const config = await loadFixture(_beforeEach);
        // artist increases price
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.higherPricePerTokenInWei
          );
        // can purchase token at higher price
        // mint a token
        const userMerkleProofZero = config.merkleTreeZero.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,address,bytes32[])"
          ](config.projectZero, config.genArt721Core.address, userMerkleProofZero, {
            value: config.higherPricePerTokenInWei,
          });

        // cannot purchase token at lower price
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            [
              "purchase(uint256,address,bytes32[])"
            ](config.projectZero, config.genArt721Core.address, userMerkleProofZero, {
              value: config.pricePerTokenInWei,
            }),
          revertMessages.needMoreValue
        );
      });

      it("enforces price update only on desired project", async function () {
        const config = await loadFixture(_beforeEach);
        // artist sets price of project zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );

        // artist increases price of project one
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectOne,
            config.genArt721Core.address,
            config.higherPricePerTokenInWei
          );
        const userMerkleProofOne = config.merkleTreeOne.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        const userMerkleProofZero = config.merkleTreeZero.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        // cannot purchase project one token at lower price
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            [
              "purchase(uint256,address,bytes32[])"
            ](config.projectOne, config.genArt721Core.address, userMerkleProofOne, {
              value: config.pricePerTokenInWei,
            }),
          revertMessages.needMoreValue
        );
        // can purchase project zero token at lower price
        await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,address,bytes32[])"
          ](config.projectZero, config.genArt721Core.address, userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          });
      });
    });

    describe("syncProjectMaxInvocationsToCore", async function () {
      it("resets maxHasBeenInvoked after it's been set to true locally and then max project invocations is synced from the core contract", async function () {
        const config = await loadFixture(_beforeEach);
        const userMerkleProofZero = config.merkleTreeZero.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        // artist sets price of project zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // reduce local maxInvocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        const maxInvocationsProjectConfig = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig.maxInvocations).to.equal(2);

        // mint a token
        await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,address,bytes32[])"
          ](config.projectZero, config.genArt721Core.address, userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          });

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // sync max invocations from core to minter
        await config.minter
          .connect(config.accounts.artist)
          .syncProjectMaxInvocationsToCore(
            config.projectZero,
            config.genArt721Core.address
          );

        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked2).to.be.false;

        // expect maxInvocations on the minter to be 15
        const syncedMaxInvocationsProjectConfig = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(syncedMaxInvocationsProjectConfig.maxInvocations).to.equal(15);
      });
    });

    describe("manuallyLimitProjectMaxInvocations", async function () {
      it("appropriately sets maxHasBeenInvoked after calling manuallyLimitProjectMaxInvocations", async function () {
        const config = await loadFixture(_beforeEach);

        const userMerkleProofZero = config.merkleTreeZero.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        // artist sets price of project zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // reduce local maxInvocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        const localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations.maxInvocations).to.equal(2);

        // mint a token
        await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,address,bytes32[])"
          ](config.projectZero, config.genArt721Core.address, userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          });

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // increase invocations on the minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            3
          );

        // expect maxInvocations on the minter to be 3
        const localMaxInvocations2 = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations2.maxInvocations).to.equal(3);

        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked2).to.be.false;

        // reduce invocations on the minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            2
          );

        // expect maxInvocations on the minter to be 1
        const localMaxInvocations3 = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations3.maxInvocations).to.equal(2);

        // expect projectMaxHasBeenInvoked to now be true
        const hasMaxBeenInvoked3 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked3).to.be.true;
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
            .updateMerkleRoot(
              config.projectZero,
              config.genArt721Core.address,
              newMerkleRoot
            ),
          "Only Artist"
        );
        // additional not allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            .updateMerkleRoot(
              config.projectZero,
              config.genArt721Core.address,
              newMerkleRoot
            ),
          "Only Artist"
        );
        // artist allowed
        await config.minter
          .connect(config.accounts.artist)
          .updateMerkleRoot(
            config.projectZero,
            config.genArt721Core.address,
            newMerkleRoot
          );
      });

      it("does not allow Merkle root of zero", async function () {
        const config = await loadFixture(_beforeEach);
        const newMerkleRoot = constants.ZERO_BYTES32;
        // artist allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updateMerkleRoot(
              config.projectZero,
              config.genArt721Core.address,
              newMerkleRoot
            ),
          "Root must be provided"
        );
      });
    });

    describe("setProjectInvocationsPerAddress", async function () {
      it("only allows artist to setProjectInvocationsPerAddress", async function () {
        const config = await loadFixture(_beforeEach);
        // user not allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .setProjectInvocationsPerAddress(
              config.projectZero,
              config.genArt721Core.address,
              0
            ),
          "Only Artist"
        );
        // additional not allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            .setProjectInvocationsPerAddress(
              config.projectZero,
              config.genArt721Core.address,
              0
            ),
          "Only Artist"
        );
        // artist allowed
        await config.minter
          .connect(config.accounts.artist)
          .setProjectInvocationsPerAddress(
            config.projectZero,
            config.genArt721Core.address,
            0
          );
      });
    });
  });
});
