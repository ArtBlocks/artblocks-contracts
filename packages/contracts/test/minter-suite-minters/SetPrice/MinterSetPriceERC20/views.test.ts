import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { SetPrice_Common_Views } from "../common.views";
import { ethers } from "hardhat";

const TARGET_MINTER_NAME = "MinterSetPriceERC20V5";
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

      // update core's minter as the minter filter
      await config.genArt721Core.updateMinterContract(
        config.minterFilter.address
      );

      config.minter = await deployAndGet(config, TARGET_MINTER_NAME, [
        config.minterFilter.address,
      ]);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .approveMinterGlobally(config.minter.address);

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
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectZero,
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
      config.isEngine = params.core.includes("Engine");

      // deploy ERC20 token, sending 100e18 tokens to user
      const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
      config.ERC20 = await ERC20Factory.connect(config.accounts.user).deploy(
        ethers.utils.parseEther("100")
      );
      await config.ERC20.transfer(
        config.accounts.artist.address,
        ethers.utils.parseEther("10")
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
            1
          );
        // approve minter to spend user's funds
        await config.ERC20.connect(config.accounts.artist).approve(
          config.minter.address,
          config.pricePerTokenInWei
        );
        await config.minter
          .connect(config.accounts.artist)
          .purchase(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
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
        // approve minter to spend user's funds
        await config.ERC20.connect(config.accounts.artist).approve(
          config.minter.address,
          config.pricePerTokenInWei
        );
        await config.minter
          .connect(config.accounts.artist)
          .purchase(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );

        const isEngineView = await config.minter
          .connect(config.accounts.artist)
          .isEngineView(config.genArt721Core.address);
        expect(isEngineView).to.be.equal(config.isEngine);
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
          .connect(config.accounts.user)
          .getYourBalanceOfProjectERC20(
            config.projectZero,
            config.genArt721Core.address
          );
        const actualBalance = await config.ERC20.balanceOf(
          config.accounts.user.address
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
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          allowanceValue
        );
        const allowance = await config.minter
          .connect(config.accounts.user)
          .checkYourAllowanceOfProjectERC20(
            config.projectZero,
            config.genArt721Core.address
          );
        const actualAllowance = await config.ERC20.allowance(
          config.accounts.user.address,
          config.minter.address
        );
        expect(allowance).to.equal(allowanceValue);
        expect(allowance).to.equal(actualAllowance);
        expect(allowance.gt(0)).to.be.true;
      });
    });
  });
});
