import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import {
  deployAndGet,
  deployCore,
  safeAddProject,
  hashAddress,
} from "../../../util/common";
import { SetPrice_Common_Views } from "../common.views";
import { T_Config } from "../../../util/common";
import {
  MinterMinPriceV0,
  GenArt721CoreV3_Engine,
  GenArt721CoreV3_Engine_Flex,
  MinterFilterV2,
} from "../../../../scripts/contracts";
import { BigNumber } from "ethers";

const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const TARGET_MINTER_NAME = "MinterMinPriceMerkleV0";
const TARGET_MINTER_VERSION = "v0.0.0";

const DEFAULT_MIN_MINT_FEE = ethers.utils.parseEther("0.01");

const runForEach = [
  {
    core: "GenArt721CoreV3_Engine",
  },
  {
    core: "GenArt721CoreV3_Engine_Flex",
  },
];

interface T_MinterMinPriceTestConfig extends T_Config {
  genArt721Core: GenArt721CoreV3_Engine | GenArt721CoreV3_Engine_Flex;
  minterFilter: MinterFilterV2;
  minter: MinterMinPriceV0;
  projectZero: number;
  projectOne: number;
  pricePerTokenInWei: BigNumber;
  higherPricePerTokenInWei: BigNumber;
}

runForEach.forEach((params) => {
  describe(`${TARGET_MINTER_NAME} Views w/ core ${params.core}`, async function () {
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
        DEFAULT_MIN_MINT_FEE,
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

      config.isEngine = params.core.includes("Engine");

      return config as T_MinterMinPriceTestConfig;
    }

    describe("Common Set Price Minter Views Tests", async function () {
      await SetPrice_Common_Views(_beforeEach);
    });

    describe("minterVersion", async function () {
      it("correctly reports minterVersion", async function () {
        const config = await loadFixture(_beforeEach);
        const minterVersion = await config.minter.minterVersion();
        expect(minterVersion).to.equal(TARGET_MINTER_VERSION);
      });
    });

    describe("minterType", async function () {
      it("correctly reports minterType", async function () {
        const config = await loadFixture(_beforeEach);
        const minterVersion = await config.minter.minterType();
        expect(minterVersion).to.equal(TARGET_MINTER_NAME);
      });
    });

    describe("minMintFee", async function () {
      it("correctly reports minMintFee", async function () {
        const config = await loadFixture(_beforeEach);
        const minMintFee = await config.minter.minMintFee();
        expect(minMintFee).to.equal(DEFAULT_MIN_MINT_FEE);
      });
    });

    describe("projectMaxHasBeenInvoked", async function () {
      it("should return true if project has been minted out", async function () {
        const config = await loadFixture(_beforeEach);
        const userMerkleProofZero = config.merkleTreeZero.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,address,bytes32[])"
          ](config.projectZero, config.genArt721Core.address, userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          });
        let result = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result).to.equal(true);
      });
    });

    describe("isEngineView", async function () {
      it("uses cached value when available", async function () {
        const config = await loadFixture(_beforeEach);
        const userMerkleProofZero = config.merkleTreeZero.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        // purchase token to trigger isEngine caching
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,address,bytes32[])"
          ](config.projectZero, config.genArt721Core.address, userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          });
        const isEngineView = await config.minter
          .connect(config.accounts.artist)
          .isEngineView(config.genArt721Core.address);
        expect(isEngineView).to.be.equal(config.isEngine);
      });
    });

    describe("merkleProjectConfig", async function () {
      it("returns correct merkleProjectConfig", async function () {
        const config = await loadFixture(_beforeEach);
        const merkleRootZero = config.merkleTreeZero.getHexRoot();
        const [
          useMaxInvocationsPerAddressOverride,
          maxInvocationsPerAddressOverride,
          merkleRoot,
        ] = await config.minter
          .connect(config.accounts.artist)
          .merkleProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(merkleRoot).to.equal(merkleRootZero);
        expect(useMaxInvocationsPerAddressOverride).to.equal(false);
        expect(maxInvocationsPerAddressOverride).to.equal(0);

        await config.minter
          .connect(config.accounts.artist)
          .setProjectInvocationsPerAddress(
            config.projectZero,
            config.genArt721Core.address,
            999
          );

        const [
          useMaxInvocationsPerAddressOverride2,
          maxInvocationsPerAddressOverride2,
          merkleRoot2,
        ] = await config.minter
          .connect(config.accounts.artist)
          .merkleProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(merkleRoot2).to.equal(merkleRootZero);
        expect(useMaxInvocationsPerAddressOverride2).to.equal(true);
        expect(maxInvocationsPerAddressOverride2).to.equal(999);
      });
    });

    describe("projectUserMintInvocations", async function () {
      it("should return correct number of mint invocations for a given user", async function () {
        const config = await loadFixture(_beforeEach);
        const userMerkleProofZero = config.merkleTreeZero.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );

        const projectUserMintInvocationsNone = await config.minter
          .connect(config.accounts.artist)
          .projectUserMintInvocations(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );

        expect(projectUserMintInvocationsNone.toNumber()).to.equal(0);
        // mint two tokens
        await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,address,bytes32[])"
          ](config.projectZero, config.genArt721Core.address, userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          });
        const projectUserMintInvocations = await config.minter
          .connect(config.accounts.artist)
          .projectUserMintInvocations(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );

        expect(projectUserMintInvocations.toNumber()).to.equal(1);
      });
    });

    describe("projectMaxInvocationsPerAddress", async function () {
      it("is 1 by default", async function () {
        const config = await loadFixture(_beforeEach);
        const projectMaxInvocationsPerAddress_ = await config.minter
          .connect(config.accounts.user)
          .projectMaxInvocationsPerAddress(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(projectMaxInvocationsPerAddress_.toNumber()).to.equal(1);
      });

      it("is 0 by when set to 0", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .setProjectInvocationsPerAddress(
            config.projectZero,
            config.genArt721Core.address,
            0
          );
        const projectMaxInvocationsPerAddress_ = await config.minter
          .connect(config.accounts.user)
          .projectMaxInvocationsPerAddress(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(projectMaxInvocationsPerAddress_.toNumber()).to.equal(0);
      });

      it("is 999 by when set to 999", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .setProjectInvocationsPerAddress(
            config.projectZero,
            config.genArt721Core.address,
            999
          );
        const projectMaxInvocationsPerAddress_ = await config.minter
          .connect(config.accounts.user)
          .projectMaxInvocationsPerAddress(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(projectMaxInvocationsPerAddress_.toNumber()).to.equal(999);
      });

      it("is 999 by when set to 0 then changed to 999", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .setProjectInvocationsPerAddress(
            config.projectZero,
            config.genArt721Core.address,
            0
          );
        await config.minter
          .connect(config.accounts.artist)
          .setProjectInvocationsPerAddress(
            config.projectZero,
            config.genArt721Core.address,
            999
          );
        const projectMaxInvocationsPerAddress_ = await config.minter
          .connect(config.accounts.user)
          .projectMaxInvocationsPerAddress(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(projectMaxInvocationsPerAddress_.toNumber()).to.equal(999);
      });

      it("is 1 by when set to 0 then changed to 1", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .setProjectInvocationsPerAddress(
            config.projectZero,
            config.genArt721Core.address,
            0
          );
        await config.minter
          .connect(config.accounts.artist)
          .setProjectInvocationsPerAddress(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        const projectMaxInvocationsPerAddress_ = await config.minter
          .connect(config.accounts.user)
          .projectMaxInvocationsPerAddress(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(projectMaxInvocationsPerAddress_.toNumber()).to.equal(1);
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
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(
          projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
        ).to.equal(true);
        expect(
          projectRemainingInvocationsForAddress_.mintInvocationsRemaining.toNumber()
        ).to.equal(1);
      });

      it("is (true, 0) after minting a token on default setting", async function () {
        // get config from beforeEach
        const config = this.config;
        const userMerkleProofZero = config.merkleTreeZero.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        //configure price on minter
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // mint a token
        await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,address,bytes32[])"
          ](config.projectZero, config.genArt721Core.address, userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          });
        // user should have 0 remaining invocations
        const projectRemainingInvocationsForAddress_ = await config.minter
          .connect(config.accounts.user)
          .projectRemainingInvocationsForAddress(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(
          projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
        ).to.equal(true);
        expect(
          projectRemainingInvocationsForAddress_.mintInvocationsRemaining.toNumber()
        ).to.equal(0);
      });

      it("is (false, 0) by when set to not limit mints per address", async function () {
        // get config from beforeEach
        const config = this.config;
        const userMerkleProofZero = config.merkleTreeZero.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        //configure price on minter
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        await config.minter
          .connect(config.accounts.artist)
          .setProjectInvocationsPerAddress(
            config.projectZero,
            config.genArt721Core.address,
            0
          );
        // check remaining invocations response
        let projectRemainingInvocationsForAddress_ = await config.minter
          .connect(config.accounts.user)
          .projectRemainingInvocationsForAddress(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(
          projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
        ).to.equal(false);
        expect(
          projectRemainingInvocationsForAddress_.mintInvocationsRemaining.toNumber()
        ).to.equal(0);
        // still false after user mints a token
        await config.minter
          .connect(config.accounts.user)
          [
            "purchase(uint256,address,bytes32[])"
          ](config.projectZero, config.genArt721Core.address, userMerkleProofZero, {
            value: config.pricePerTokenInWei,
          });
        // check remaining invocations response
        projectRemainingInvocationsForAddress_ = await config.minter
          .connect(config.accounts.user)
          .projectRemainingInvocationsForAddress(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(
          projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
        ).to.equal(false);
        expect(
          projectRemainingInvocationsForAddress_.mintInvocationsRemaining.toNumber()
        ).to.equal(0);
      });

      it("is updated when set to limit mints per address", async function () {
        // get config from beforeEach
        const config = this.config;
        const userMerkleProofZero = config.merkleTreeZero.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        //configure price on minter
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        await config.minter
          .connect(config.accounts.artist)
          .setProjectInvocationsPerAddress(
            config.projectZero,
            config.genArt721Core.address,
            5
          );
        // check remaining invocations response
        let projectRemainingInvocationsForAddress_ = await config.minter
          .connect(config.accounts.user)
          .projectRemainingInvocationsForAddress(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(
          projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
        ).to.equal(true);
        expect(
          projectRemainingInvocationsForAddress_.mintInvocationsRemaining.toNumber()
        ).to.equal(5);
        // updates after user mints two tokens
        for (let i = 0; i < 2; i++) {
          await config.minter
            .connect(config.accounts.user)
            [
              "purchase(uint256,address,bytes32[])"
            ](config.projectZero, config.genArt721Core.address, userMerkleProofZero, {
              value: config.pricePerTokenInWei,
            });
        }
        // check remaining invocations response
        projectRemainingInvocationsForAddress_ = await config.minter
          .connect(config.accounts.user)
          .projectRemainingInvocationsForAddress(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(
          projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
        ).to.equal(true);
        expect(
          projectRemainingInvocationsForAddress_.mintInvocationsRemaining.toNumber()
        ).to.equal(3);
        // becomes zero if artist reduces limit to 1
        await config.minter
          .connect(config.accounts.artist)
          .setProjectInvocationsPerAddress(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        // check remaining invocations response
        projectRemainingInvocationsForAddress_ = await config.minter
          .connect(config.accounts.user)
          .projectRemainingInvocationsForAddress(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(
          projectRemainingInvocationsForAddress_.projectLimitsMintInvocationsPerAddress
        ).to.equal(true);
        expect(
          projectRemainingInvocationsForAddress_.mintInvocationsRemaining.toNumber()
        ).to.equal(0);
      });
    });

    describe("processProofForAddress", async function () {
      it("returns valid hash from processing proof", async function () {
        const config = await loadFixture(_beforeEach);
        const userMerkleProofZero = config.merkleTreeZero.getHexProof(
          hashAddress(config.accounts.user.address)
        );
        const hash = await config.minter
          .connect(config.accounts.user)
          .processProofForAddress(
            userMerkleProofZero,
            config.accounts.user.address
          );
        expect(hash).to.equal(config.merkleTreeZero.getHexRoot());
      });
    });

    describe("hashAddress", async function () {
      it("returns valid hash from provided address", async function () {
        const config = await loadFixture(_beforeEach);
        const hash = await config.minter
          .connect(config.accounts.user)
          .hashAddress(config.accounts.user.address);
        expect(hash).to.equal(
          "0x93230d0b2377404a36412e26d231de4c7e1a9fb62e227b420200ee950a5ca9c0"
        );
      });
    });
  });
});
