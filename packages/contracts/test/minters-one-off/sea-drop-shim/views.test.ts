import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../util/common";
import { expect } from "chai";

import { T_Config } from "../../util/common";
import {
  GenArt721CoreV3_Engine,
  SeaDropXArtBlocksShim,
} from "../../../scripts/contracts";
import { ZERO_ADDRESS } from "../../../scripts/util/constants";
import { revertMessages } from "./constants";
import { BigNumber } from "ethers";

interface T_SeaDropShimTestConfig extends T_Config {
  genArt721Core: GenArt721CoreV3_Engine;
  minter: SeaDropXArtBlocksShim;
  projectZero: number;
  projectZeroTokenZero: BigNumber;
  projectZeroTokenOne: BigNumber;
}

// @dev testing with V3 engine sufficient - no different logic is tested with flex, etc.
const runForEach = [
  {
    core: "GenArt721CoreV3_Engine",
  },
];

// we don't mock SeaDrop contract, instead rely on end-to-end testing on testnet for SeaDrop integration
// @dev this maintains security via testing our contract logic, but also tests the integration with SeaDrop
// on systems outside of our dev environment and developed by third party teams

runForEach.forEach((params) => {
  describe(`SeaDropXArtBlocksShim Views w/ core ${params.core}`, async function () {
    async function _beforeEach() {
      // load minter filter V2 fixture
      const config = await loadFixture(setupConfigWitMinterFilterV2Suite);
      // deploy core contract and register on core registry
      ({
        genArt721Core: config.genArt721Core,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCore(config, params.core, config.coreRegistry));

      // Project setup (do prior to minter deployment for pre-syncing artist address in constructor test)
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );

      config.minter = await deployAndGet(config, "SeaDropXArtBlocksShim", [
        config.accounts.deployer.address, // IMPORTANT: using deployer wallet as SeaDrop for testing purposes
        config.genArt721Core.address,
        config.projectZero,
      ]);

      // non-standard - set contract's minter as the shim minter directly
      await config.genArt721Core.updateMinterContract(config.minter.address);
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 15);

      // mint some tokens
      await config.minter.mintSeaDrop(config.accounts.user.address, 2);
      await config.minter.mintSeaDrop(config.accounts.user2.address, 1);

      return config as T_SeaDropShimTestConfig;
    }

    // public variable Views
    describe("projectId", async function () {
      it("should return the projectId", async function () {
        const config = await _beforeEach();
        const projectId = await config.minter.projectId();
        expect(projectId).to.equal(config.projectZero);
      });
    });

    describe("allowedSeaDrop", async function () {
      it("should return the allowedSeaDrop", async function () {
        const config = await _beforeEach();
        const allowedSeaDrop = await config.minter.allowedSeaDrop();
        expect(allowedSeaDrop).to.equal(config.accounts.deployer.address);
      });
    });

    describe("genArt721Core", async function () {
      it("should return the genArt721Core", async function () {
        const config = await _beforeEach();
        const genArt721Core = await config.minter.genArt721Core();
        expect(genArt721Core).to.equal(config.genArt721Core.address);
      });
    });

    describe("minterNumMinted", async function () {
      it("should return the minterNumMinted", async function () {
        const config = await _beforeEach();
        const minterNumMinted = await config.minter.minterNumMinted(
          config.accounts.user.address
        );
        expect(minterNumMinted).to.equal(2);
      });
    });

    // view functions
    describe("getMintStats", async function () {
      it("should return correct stats", async function () {
        const config = await _beforeEach();
        const stats = await config.minter.getMintStats(
          config.accounts.user.address
        );
        expect(stats.minterNumMinted_).to.equal(2);
        expect(stats.currentTotalSupply).to.equal(3);
        expect(stats.maxSupply_).to.equal(15);
      });
    });

    describe("baseURI", async function () {
      it("should return the baseURI", async function () {
        const config = await _beforeEach();
        const baseURI = await config.minter.baseURI();
        expect(baseURI).to.equal(
          "https://token.artblocks.io/".concat(
            config.genArt721Core.address.toLowerCase(),
            "/"
          )
        );
      });
    });

    describe("contractURI", async function () {
      it("should revert when getting contractURI", async function () {
        const config = await _beforeEach();
        await expectRevert(
          config.minter.contractURI(),
          revertMessages.setContractURINotSupported
        );
      });
    });

    describe("maxSupply", async function () {
      it("should return the maxSupply", async function () {
        const config = await _beforeEach();
        const maxSupply = await config.minter.maxSupply();
        expect(maxSupply).to.equal(15);
      });
    });

    describe("provenanceHash", async function () {
      it("should revert as unsupported", async function () {
        const config = await _beforeEach();
        await expectRevert(
          config.minter.provenanceHash(),
          revertMessages.setProvenanceHashNotSupported
        );
      });
    });

    describe("royaltyAddress", async function () {
      it("should return the royalty address", async function () {
        const config = await _beforeEach();
        const royaltyAddress = await config.minter.royaltyAddress();
        const coreRoyaltyAddress = await config.genArt721Core.royaltyInfo(
          config.projectZeroTokenZero?.toString(),
          10000
        );
        expect(royaltyAddress).to.equal(coreRoyaltyAddress.receiver);
        expect(royaltyAddress).to.not.equal(ZERO_ADDRESS);
      });
    });

    describe("royaltyBasisPoints", async function () {
      it("should return the royalty basis points", async function () {
        const config = await _beforeEach();
        const royaltyBasisPoints = await config.minter.royaltyBasisPoints();
        const coreRoyaltyBasisPoints = await config.genArt721Core.royaltyInfo(
          config.projectZeroTokenZero?.toString(),
          10000
        );
        expect(royaltyBasisPoints).to.equal(
          coreRoyaltyBasisPoints.royaltyAmount
        );
      });
    });

    describe("royaltyInfo", async function () {
      it("should return the royalty info", async function () {
        const config = await _beforeEach();
        const royaltyInfoArgs = [
          config.projectZeroTokenZero?.toString(),
          10000,
        ];
        const royaltyInfo = await config.minter.royaltyInfo(...royaltyInfoArgs);
        const coreRoyaltyInfo = await config.genArt721Core.royaltyInfo(
          ...royaltyInfoArgs
        );
        expect(royaltyInfo.receiver).to.equal(coreRoyaltyInfo.receiver);
        expect(royaltyInfo.receiver).to.not.equal(ZERO_ADDRESS);
        expect(royaltyInfo.royaltyAmount).to.equal(
          coreRoyaltyInfo.royaltyAmount
        );
        expect(royaltyInfo.royaltyAmount).to.not.equal(0);
      });
    });

    // ERC165 interface support not tested for test simplicity
  });
});
