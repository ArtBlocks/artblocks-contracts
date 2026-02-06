import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { SetPrice_Common_Views } from "../common.views";
import { T_Config } from "../../../util/common";
import { ethers } from "hardhat";
import {
  MinterSlidingScaleV0,
  GenArt721CoreV3_Engine,
  GenArt721CoreV3_Engine_Flex,
  MinterFilterV2,
} from "../../../../scripts/contracts";
import { BigNumber } from "ethers";

const TARGET_MINTER_NAME = "MinterSlidingScaleV0";
const TARGET_MINTER_VERSION = "v0.0.0";

const runForEach = [
  {
    core: "GenArt721CoreV3_Engine",
  },
  {
    core: "GenArt721CoreV3_Engine_Flex",
  },
];

interface T_MinterSlidingScaleTestConfig extends T_Config {
  genArt721Core: GenArt721CoreV3_Engine | GenArt721CoreV3_Engine_Flex;
  minterFilter: MinterFilterV2;
  minter: MinterSlidingScaleV0;
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

      return config as T_MinterSlidingScaleTestConfig;
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
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, config.genArt721Core.address, {
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
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.pricePerTokenInWei,
          });

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

    describe("getTokenPricePaid", async function () {
      it("returns 0 for token not minted via this minter", async function () {
        const config = await loadFixture(_beforeEach);
        // query a token that doesn't exist
        const pricePaid = await config.minter.getTokenPricePaid(
          config.genArt721Core.address,
          0
        );
        expect(pricePaid).to.equal(0);
      });

      it("returns correct price paid at minimum price", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );

        // purchase at minimum price
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.pricePerTokenInWei,
          });

        // token ID for project 0, invocation 0 is 0
        const tokenId = config.projectZero * 1000000;
        const pricePaid = await config.minter.getTokenPricePaid(
          config.genArt721Core.address,
          tokenId
        );
        expect(pricePaid).to.equal(config.pricePerTokenInWei);
      });

      it("returns correct price paid above minimum price", async function () {
        const config = await loadFixture(_beforeEach);
        const higherPrice = config.pricePerTokenInWei.add(
          ethers.utils.parseEther("0.5")
        );
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );

        // purchase at higher price
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: higherPrice,
          });

        // token ID for project 0, invocation 0 is 0
        const tokenId = config.projectZero * 1000000;
        const pricePaid = await config.minter.getTokenPricePaid(
          config.genArt721Core.address,
          tokenId
        );
        expect(pricePaid).to.equal(higherPrice);
      });

      it("tracks different prices for different tokens", async function () {
        const config = await loadFixture(_beforeEach);
        const price1 = config.pricePerTokenInWei;
        const price2 = config.pricePerTokenInWei.add(
          ethers.utils.parseEther("0.25")
        );
        const price3 = config.pricePerTokenInWei.add(
          ethers.utils.parseEther("0.75")
        );

        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );

        // purchase 3 tokens at different prices
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: price1,
          });
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: price2,
          });
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: price3,
          });

        // verify each token has the correct price recorded
        const baseTokenId = config.projectZero * 1000000;
        expect(
          await config.minter.getTokenPricePaid(
            config.genArt721Core.address,
            baseTokenId
          )
        ).to.equal(price1);
        expect(
          await config.minter.getTokenPricePaid(
            config.genArt721Core.address,
            baseTokenId + 1
          )
        ).to.equal(price2);
        expect(
          await config.minter.getTokenPricePaid(
            config.genArt721Core.address,
            baseTokenId + 2
          )
        ).to.equal(price3);
      });
    });
  });
});
