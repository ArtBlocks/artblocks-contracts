import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import {
  deployAndGet,
  deployCore,
  safeAddProject,
  hashAddress,
} from "../../../util/common";
import { SetPrice_Common_Events } from "../common.events";
import { ethers } from "hardhat";
import { expect } from "chai";
import {
  CONFIG_MAX_INVOCATIONS_OVERRIDE,
  CONFIG_MERKLE_ROOT,
  CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE,
} from "../../constants";
import { T_Config } from "../../../util/common";
import {
  GenArt721CoreV3_Engine,
  GenArt721CoreV3_Engine_Flex,
  MinterFilterV2,
  MinterMinPriceV0,
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
  describe(`${TARGET_MINTER_NAME} Events w/ core ${params.core}`, async function () {
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

      return config as T_MinterMinPriceTestConfig;
    }

    describe("Common Set Price Minter Events Tests", async function () {
      await SetPrice_Common_Events(_beforeEach);
    });

    describe("MinMintFeeUpdated", async function () {
      it("should emit MinMintFeeUpdated event", async function () {
        const config = await loadFixture(_beforeEach);
        const newFee = DEFAULT_MIN_MINT_FEE.add(
          ethers.utils.parseEther("0.01")
        );
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .updateMinMintFee(newFee)
        )
          .to.emit(
            await ethers.getContractAt("MinPriceLib", config.minter.address),
            "MinMintFeeUpdated"
          )
          .withArgs(newFee);
      });
    });

    describe("updateMerkleRoot", async function () {
      it("emits event when update merkle root", async function () {
        const config = await loadFixture(_beforeEach);
        const newMerkleRoot = config.merkleTreeZero.getHexRoot();
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .updateMerkleRoot(
              config.projectZero,
              config.genArt721Core.address,
              newMerkleRoot
            )
        )
          .to.emit(
            await ethers.getContractAt(
              "GenericMinterEventsLib",
              config.minter.address
            ),
            "ConfigValueSet(uint256,address,bytes32,bytes32)"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            CONFIG_MERKLE_ROOT,
            newMerkleRoot
          );
      });
    });

    describe("setProjectInvocationsPerAddress", async function () {
      it("emits events when setting project max invocations per address", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .setProjectInvocationsPerAddress(
              config.projectZero,
              config.genArt721Core.address,
              0
            )
        )
          .to.emit(
            await ethers.getContractAt(
              "GenericMinterEventsLib",
              config.minter.address
            ),
            "ConfigValueSet(uint256,address,bytes32,bool)"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE,
            true
          );
        // expect zero value when set to zero
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .setProjectInvocationsPerAddress(
              config.projectZero,
              config.genArt721Core.address,
              0
            )
        )
          .to.emit(
            await ethers.getContractAt(
              "GenericMinterEventsLib",
              config.minter.address
            ),
            "ConfigValueSet(uint256,address,bytes32,uint256)"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            CONFIG_MAX_INVOCATIONS_OVERRIDE,
            0
          );
        // expect true again
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .setProjectInvocationsPerAddress(
              config.projectZero,
              config.genArt721Core.address,
              0
            )
        )
          .to.emit(
            await ethers.getContractAt(
              "GenericMinterEventsLib",
              config.minter.address
            ),
            "ConfigValueSet(uint256,address,bytes32,bool)"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE,
            true
          );
        // expect 999 value when set to 999
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .setProjectInvocationsPerAddress(
              config.projectZero,
              config.genArt721Core.address,
              999
            )
        )
          .to.emit(
            await ethers.getContractAt(
              "GenericMinterEventsLib",
              config.minter.address
            ),
            "ConfigValueSet(uint256,address,bytes32,uint256)"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            CONFIG_MAX_INVOCATIONS_OVERRIDE,
            999
          );
      });
    });
  });
});
