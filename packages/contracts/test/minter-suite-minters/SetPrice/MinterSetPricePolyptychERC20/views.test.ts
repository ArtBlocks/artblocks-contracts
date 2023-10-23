import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { SetPrice_Common_Views } from "../common.views";

const TARGET_MINTER_NAME = "MinterSetPricePolyptychERC20V5";
const TARGET_MINTER_VERSION = "v5.0.0";

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
  {
    core: "GenArt721CoreV3_Explorations",
  },
  {
    core: "GenArt721CoreV3_Engine",
  },
  {
    core: "GenArt721CoreV3_Engine_Flex",
  },
];

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
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectTwo);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectOne);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectTwo);

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
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectTwo,
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

      // mint a token on project zero to be used as test "holder" token
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
      // switch config.projectZero back to tested minter
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectZero,
          config.genArt721Core.address,
          config.minter.address
        );

      await config.minter
        .connect(config.accounts.artist)
        .allowHoldersOfProjects(
          config.projectZero,
          config.genArt721Core.address,
          [config.genArt721Core.address],
          [config.projectZero]
        );

      config.isEngine = params.core.includes("Engine");

      // set randomizer's hash seed setter contract
      await config.randomizer
        .connect(config.accounts.artist)
        .setHashSeedSetterContract(
          config.genArt721Core.address,
          config.projectZero,
          config.minter.address
        );
      // toggle project zero to be polyptych
      await config.randomizer
        .connect(config.accounts.artist)
        .toggleProjectUseAssignedHashSeed(
          config.genArt721Core.address,
          config.projectZero
        );

      // deploy ERC20 token, sending 100e18 tokens to artist
      const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
      config.ERC20 = await ERC20Factory.connect(config.accounts.artist).deploy(
        ethers.utils.parseEther("100")
      );
      // artist approve the minter for effectively infinite tokens to simplify tests
      await config.ERC20.connect(config.accounts.artist).approve(
        config.minter.address,
        ethers.utils.parseEther("100")
      );

      // update currency for project zero
      await config.minter
        .connect(config.accounts.artist)
        .updateProjectCurrencyInfo(
          config.projectZero,
          config.genArt721Core.address,
          "ERC20",
          config.ERC20.address
        );

      return config;
    }

    describe("Common Set Price Minter Views Tests", async function () {
      await SetPrice_Common_Views(_beforeEach);
    });

    describe("projectMaxHasBeenInvoked", async function () {
      it("should return true if project has been minted out", async function () {
        const config = await loadFixture(_beforeEach);
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
          .connect(config.accounts.artist)
          ["purchase(uint256,address,address,uint256,uint256,address)"](
            config.projectZero,
            config.genArt721Core.address,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            config.pricePerTokenInWei,
            config.ERC20.address
          );
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

        // purchase token to trigger isEngine caching
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        await config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,address,uint256,uint256,address)"](
            config.projectZero,
            config.genArt721Core.address,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            config.pricePerTokenInWei,
            config.ERC20.address
          );
        const isEngineView = await config.minter
          .connect(config.accounts.artist)
          .isEngineView(config.genArt721Core.address);
        expect(isEngineView).to.be.equal(config.isEngine);
      });
    });

    describe("allowedProjectHolders", async function () {
      it("should return true for a valid NFT project holding for the given project", async function () {
        const config = await loadFixture(_beforeEach);
        const allowedProjectHoldersResponse =
          await config.minter.allowedProjectHolders(
            config.projectZero,
            config.genArt721Core.address,
            config.genArt721Core.address,
            config.projectZero
          );
        expect(allowedProjectHoldersResponse).to.equal(true);
      });

      it("should return false for an invalid NFT project holding for the given project", async function () {
        const config = await loadFixture(_beforeEach);
        const allowedProjectHoldersResponse =
          await config.minter.allowedProjectHolders(
            config.projectZero,
            config.genArt721Core.address,
            config.genArt721Core.address,
            config.projectOne
          );
        expect(allowedProjectHoldersResponse).to.equal(false);
      });
    });

    describe("isAllowlistedNFT", async function () {
      it("should return true for a token that is allowlisted", async function () {
        const config = await loadFixture(_beforeEach);
        const isAllowlistedNFTResponse = await config.minter.isAllowlistedNFT(
          config.projectZero,
          config.genArt721Core.address,
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
        expect(isAllowlistedNFTResponse).to.equal(true);
      });

      it("should return false for a token that is not allowlisted", async function () {
        const config = await loadFixture(_beforeEach);
        const isAllowlistedNFTResponse = await config.minter.isAllowlistedNFT(
          config.projectZero,
          config.genArt721Core.address,
          config.genArt721Core.address,
          config.projectThreeTokenZero.toNumber()
        );
        expect(isAllowlistedNFTResponse).to.equal(false);
      });
    });

    describe("getCurrentPolyptychPanelId", async function () {
      it("returns expected values", async function () {
        const config = await loadFixture(_beforeEach);
        const initialPanelId = await config.minter.getCurrentPolyptychPanelId(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(initialPanelId).to.equal(0);
        await config.minter
          .connect(config.accounts.artist)
          .incrementPolyptychProjectPanelId(
            config.projectZero,
            config.genArt721Core.address
          );
        const incrementedPanelId =
          await config.minter.getCurrentPolyptychPanelId(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(incrementedPanelId).to.equal(1);
      });
    });

    describe("getPolyptychPanelHashSeedIsMinted", async function () {
      it("returns expected values", async function () {
        const config = await loadFixture(_beforeEach);
        const tokenZeroHashSeed = await config.genArt721Core.tokenIdToHashSeed(
          config.projectZeroTokenZero.toNumber()
        );
        const resultBefore =
          await config.minter.getPolyptychPanelHashSeedIsMinted(
            config.projectZero,
            config.genArt721Core.address,
            0,
            tokenZeroHashSeed
          );
        expect(resultBefore).to.be.false;
        // configure price and purchase token
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        await config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,address,uint256,uint256,address)"](
            config.projectZero,
            config.genArt721Core.address,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            config.pricePerTokenInWei,
            config.ERC20.address
          );
        // validate view response after hash seed is used
        const resultAfter =
          await config.minter.getPolyptychPanelHashSeedIsMinted(
            config.projectZero,
            config.genArt721Core.address,
            0,
            tokenZeroHashSeed
          );
        expect(resultAfter).to.be.true;
        // unused panel ID should remain false
        const resultUnusedPanel =
          await config.minter.getPolyptychPanelHashSeedIsMinted(
            config.projectZero,
            config.genArt721Core.address,
            1, // unused panel ID
            tokenZeroHashSeed
          );
        expect(resultUnusedPanel).to.be.false;
      });
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

    describe("getYourBalanceOfProjectERC20", async function () {
      it("should return zero when balance is zero", async function () {
        const config = await loadFixture(_beforeEach);
        const balance = await config.minter
          .connect(config.accounts.deployer)
          .getYourBalanceOfProjectERC20(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(balance).to.equal(0);
      });

      it("should return accurate and non-zero when balance is gt zero", async function () {
        const config = await loadFixture(_beforeEach);
        const balance = await config.minter
          .connect(config.accounts.artist)
          .getYourBalanceOfProjectERC20(
            config.projectZero,
            config.genArt721Core.address
          );
        const actualBalance = await config.ERC20.balanceOf(
          config.accounts.artist.address
        );
        expect(balance).to.equal(actualBalance);
        expect(balance.gt(0)).to.be.true;
      });
    });

    describe("checkYourAllowanceOfProjectERC20", async function () {
      it("should return zero when allowance is zero", async function () {
        const config = await loadFixture(_beforeEach);
        const allowance = await config.minter
          .connect(config.accounts.deployer)
          .checkYourAllowanceOfProjectERC20(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(allowance).to.equal(0);
      });

      it("should return accurate and non-zero when allowance is gt zero", async function () {
        const config = await loadFixture(_beforeEach);
        const allowanceValue = 100; // small, easy number
        await config.ERC20.connect(config.accounts.artist).approve(
          config.minter.address,
          allowanceValue
        );
        const allowance = await config.minter
          .connect(config.accounts.artist)
          .checkYourAllowanceOfProjectERC20(
            config.projectZero,
            config.genArt721Core.address
          );
        const actualAllowance = await config.ERC20.allowance(
          config.accounts.artist.address,
          config.minter.address
        );
        expect(allowance).to.equal(allowanceValue);
        expect(allowance).to.equal(actualAllowance);
        expect(allowance.gt(0)).to.be.true;
      });
    });
  });
});
