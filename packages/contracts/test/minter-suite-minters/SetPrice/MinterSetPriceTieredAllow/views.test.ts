import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployCoreWithMinterFilter } from "../../../util/common";
import { Logger } from "@ethersproject/logger";
import {
  TARGET_MINTER_NAME,
  TARGET_MINTER_VERSION,
  CURRENCY_SYMBOL,
  runForEach,
  makeBeforeEach,
  approveAndPurchase,
} from "./helpers";

Logger.setLogLevel(Logger.levels.ERROR);

runForEach.forEach((params) => {
  describe(`${TARGET_MINTER_NAME} Views w/ core ${params.core}`, async function () {
    const _beforeEach = makeBeforeEach(params);

    describe("projectMaxHasBeenInvoked", async function () {
      it("should return false if project has not yet been minted out", async function () {
        const config = await loadFixture(_beforeEach);
        expect(
          await config.minter.projectMaxHasBeenInvoked(
            config.projectZero,
            config.genArt721Core.address
          )
        ).to.equal(false);
      });

      it("should return true if project has been minted out", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        await approveAndPurchase(
          config,
          config.accounts.user2,
          config.projectZero,
          config.allowlistPricePerTokenInWei
        );
        expect(
          await config.minter.projectMaxHasBeenInvoked(
            config.projectZero,
            config.genArt721Core.address
          )
        ).to.equal(true);
      });
    });

    describe("projectMaxInvocations", async function () {
      it("should return proper response when not set", async function () {
        const config = await loadFixture(_beforeEach);
        expect(
          await config.minter.projectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address
          )
        ).to.equal(0);
      });

      it("should return proper response when set", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        expect(
          await config.minter.projectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address
          )
        ).to.equal(1);
      });
    });

    describe("getPriceInfo", async function () {
      it("should return proper response when not configured", async function () {
        const config = await loadFixture(_beforeEach);
        const result = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result.isConfigured).to.equal(false);
        expect(result.tokenPriceInWei).to.equal(0);
        expect(result.currencySymbol).to.equal(CURRENCY_SYMBOL);
        expect(result.currencyAddress).to.equal(config.ERC20.address);
      });

      it("should return proper response when configured", async function () {
        const config = await loadFixture(_beforeEach);
        const result = await config.minter.getPriceInfo(
          config.projectOne,
          config.genArt721Core.address
        );
        expect(result.isConfigured).to.equal(true);
        expect(result.tokenPriceInWei).to.equal(config.pricePerTokenInWei);
        expect(result.currencySymbol).to.equal(CURRENCY_SYMBOL);
        expect(result.currencyAddress).to.equal(config.ERC20.address);
      });
    });

    describe("getAllowlistPriceInfo", async function () {
      it("should return zero price when not configured", async function () {
        const config = await loadFixture(_beforeEach);
        const result = await config.minter.getAllowlistPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result.isConfigured).to.equal(false);
        expect(result.tokenPriceInWei).to.equal(0);
        expect(result.currencySymbol).to.equal(CURRENCY_SYMBOL);
        expect(result.currencyAddress).to.equal(config.ERC20.address);
      });

      it("should return correct allowlist price when configured", async function () {
        const config = await loadFixture(_beforeEach);
        const result = await config.minter.getAllowlistPriceInfo(
          config.projectOne,
          config.genArt721Core.address
        );
        expect(result.isConfigured).to.equal(true);
        expect(result.tokenPriceInWei).to.equal(
          config.allowlistPricePerTokenInWei
        );
        expect(result.currencySymbol).to.equal(CURRENCY_SYMBOL);
        expect(result.currencyAddress).to.equal(config.ERC20.address);
      });
    });

    describe("getPriceInfoForAddress", async function () {
      it("returns allowlist price for privileged allowlist address", async function () {
        const config = await loadFixture(_beforeEach);
        const result = await config.minter.getPriceInfoForAddress(
          config.projectOne,
          config.genArt721Core.address,
          config.accounts.user2.address
        );
        expect(result.isConfigured).to.be.true;
        expect(result.tokenPriceInWei).to.equal(
          config.allowlistPricePerTokenInWei
        );
        expect(result.currencySymbol).to.equal(CURRENCY_SYMBOL);
        expect(result.currencyAddress).to.equal(config.ERC20.address);
      });

      it("returns public price for non-allowlisted address", async function () {
        const config = await loadFixture(_beforeEach);
        const result = await config.minter.getPriceInfoForAddress(
          config.projectOne,
          config.genArt721Core.address,
          config.accounts.user.address
        );
        expect(result.isConfigured).to.be.true;
        expect(result.tokenPriceInWei).to.equal(config.pricePerTokenInWei);
      });

      it("reflects allowlist address updates", async function () {
        const config = await loadFixture(_beforeEach);
        let result = await config.minter.getPriceInfoForAddress(
          config.projectOne,
          config.genArt721Core.address,
          config.accounts.user2.address
        );
        expect(result.tokenPriceInWei).to.equal(
          config.allowlistPricePerTokenInWei
        );

        await config.minter
          .connect(config.accounts.deployer)
          .updateAllowlistAddress(config.accounts.additional.address);

        result = await config.minter.getPriceInfoForAddress(
          config.projectOne,
          config.genArt721Core.address,
          config.accounts.user2.address
        );
        expect(result.tokenPriceInWei).to.equal(config.pricePerTokenInWei);

        result = await config.minter.getPriceInfoForAddress(
          config.projectOne,
          config.genArt721Core.address,
          config.accounts.additional.address
        );
        expect(result.tokenPriceInWei).to.equal(
          config.allowlistPricePerTokenInWei
        );
      });
    });

    describe("isAllowlisted", async function () {
      it("returns true only for the privileged allowlist address", async function () {
        const config = await loadFixture(_beforeEach);
        expect(
          await config.minter.isAllowlisted(
            config.projectOne,
            config.genArt721Core.address,
            config.accounts.user2.address
          )
        ).to.be.true;
        expect(
          await config.minter.isAllowlisted(
            config.projectOne,
            config.genArt721Core.address,
            config.accounts.user.address
          )
        ).to.be.false;
        expect(
          await config.minter.isAllowlisted(
            config.projectOne,
            config.genArt721Core.address,
            config.accounts.artist.address
          )
        ).to.be.false;
      });
    });

    describe("projectHashSeedIsUsed", async function () {
      it("returns false for unused hash seeds", async function () {
        const config = await loadFixture(_beforeEach);
        expect(
          await config.minter.projectHashSeedIsUsed(
            config.projectOne,
            config.genArt721Core.address,
            "0x1234567890abcdef12345678"
          )
        ).to.equal(false);
      });
    });

    describe("getYourBalanceOfProjectERC20 / checkYourAllowanceOfProjectERC20", async function () {
      it("reports caller USDC balance and allowance", async function () {
        const config = await loadFixture(_beforeEach);
        const balance = await config.minter
          .connect(config.accounts.user)
          .getYourBalanceOfProjectERC20(
            config.projectOne,
            config.genArt721Core.address
          );
        expect(balance).to.equal(
          await config.ERC20.balanceOf(config.accounts.user.address)
        );

        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.pricePerTokenInWei
        );
        const allowance = await config.minter
          .connect(config.accounts.user)
          .checkYourAllowanceOfProjectERC20(
            config.projectOne,
            config.genArt721Core.address
          );
        expect(allowance).to.equal(config.pricePerTokenInWei);
      });
    });

    describe("setPriceProjectConfig", async function () {
      it("returns configured public price project config", async function () {
        const config = await loadFixture(_beforeEach);
        const result = await config.minter.setPriceProjectConfig(
          config.projectOne,
          config.genArt721Core.address
        );
        expect(result.priceIsConfigured).to.be.true;
        expect(result.pricePerToken).to.equal(config.pricePerTokenInWei);
      });
    });

    describe("isEngineView", async function () {
      it("correctly reports isEngine", async function () {
        const config = await loadFixture(_beforeEach);
        expect(
          await config.minter.isEngineView(config.genArt721Core.address)
        ).to.equal(config.isEngine);
      });

      it("uses cached value when available", async function () {
        const config = await loadFixture(_beforeEach);
        await approveAndPurchase(
          config,
          config.accounts.user,
          config.projectOne
        );
        expect(
          await config.minter.isEngineView(config.genArt721Core.address)
        ).to.equal(config.isEngine);
      });

      it("reverts if invalid core contract", async function () {
        const config = await loadFixture(_beforeEach);
        const { genArt721Core } = await deployCoreWithMinterFilter(
          config,
          "GenArt721CoreV3_Engine_IncorrectCoreType",
          "MinterFilterV1"
        );
        try {
          await config.minter.isEngineView(genArt721Core.address);
          expect.fail("Expected revert");
        } catch (e: any) {
          expect(e.message).to.include("Unexpected revenue split bytes");
        }
      });
    });

    describe("minterVersion / minterType", async function () {
      it("correctly reports minterVersion", async function () {
        const config = await loadFixture(_beforeEach);
        expect(await config.minter.minterVersion()).to.equal(
          TARGET_MINTER_VERSION
        );
      });

      it("correctly reports minterType", async function () {
        const config = await loadFixture(_beforeEach);
        expect(await config.minter.minterType()).to.equal(TARGET_MINTER_NAME);
      });
    });
  });
});
