import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { constants } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { Logger } from "@ethersproject/logger";
import { revertMessages } from "../../constants";
import {
  TARGET_MINTER_NAME,
  CURRENCY_SYMBOL,
  runForEach,
  makeBeforeEach,
  approveAndPurchase,
} from "./helpers";

Logger.setLogLevel(Logger.levels.ERROR);

runForEach.forEach((params) => {
  describe(`${TARGET_MINTER_NAME} Configure w/ core ${params.core}`, async function () {
    const _beforeEach = makeBeforeEach(params);

    describe("constructor", async function () {
      it("sets minter filter, allowlist address, and USDC address", async function () {
        const config = await loadFixture(_beforeEach);
        expect(await config.minter.minterFilterAddress()).to.equal(
          config.minterFilter.address
        );
        expect(await config.minter.allowlistAddress()).to.equal(
          config.accounts.user2.address
        );
        expect(await config.minter.usdcAddress()).to.equal(
          config.ERC20.address
        );
      });

      it("reverts when USDC address is zero", async function () {
        const config = await loadFixture(_beforeEach);
        const factory = await ethers.getContractFactory(TARGET_MINTER_NAME);
        await expectRevert(
          factory
            .connect(config.accounts.deployer)
            .deploy(
              config.minterFilter.address,
              config.accounts.user2.address,
              constants.AddressZero
            ),
          "Only non-zero addresses"
        );
      });

      it("reverts when allowlist address is zero", async function () {
        const config = await loadFixture(_beforeEach);
        const factory = await ethers.getContractFactory(TARGET_MINTER_NAME);
        await expectRevert(
          factory
            .connect(config.accounts.deployer)
            .deploy(
              config.minterFilter.address,
              constants.AddressZero,
              config.ERC20.address
            ),
          "Only non-zero addresses"
        );
      });
    });

    describe("updateAllowlistAddress", async function () {
      it("reverts when caller is not minter filter admin", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updateAllowlistAddress(config.accounts.additional.address),
          revertMessages.onlyMinterFilterACL
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .updateAllowlistAddress(config.accounts.additional.address),
          revertMessages.onlyMinterFilterACL
        );
      });

      it("allows minter filter admin to update allowlist address", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.deployer)
          .updateAllowlistAddress(config.accounts.additional.address);
        expect(await config.minter.allowlistAddress()).to.equal(
          config.accounts.additional.address
        );
      });

      it("reverts when updating to zero address", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .updateAllowlistAddress(constants.AddressZero),
          "Only non-zero addresses"
        );
      });
    });

    describe("manuallyLimitProjectMaxInvocations", async function () {
      it("allows artist to call manuallyLimitProjectMaxInvocations", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            config.maxInvocations - 1
          );
      });

      it("does not allow non-artist to call manuallyLimitProjectMaxInvocations", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              config.maxInvocations - 1
            ),
          revertMessages.onlyArtist
        );
      });

      it("does not support manually setting project max invocations greater than core", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              config.maxInvocations + 1
            ),
          "Invalid max invocations"
        );
      });

      it("appropriately sets maxHasBeenInvoked after calling manuallyLimitProjectMaxInvocations", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectOne,
            config.genArt721Core.address,
            1
          );
        const localMaxInvocations =
          await config.minter.maxInvocationsProjectConfig(
            config.projectOne,
            config.genArt721Core.address
          );
        expect(localMaxInvocations.maxInvocations).to.equal(1);

        // public buyer pays public price
        await approveAndPurchase(
          config,
          config.accounts.user,
          config.projectOne
        );

        expect(
          await config.minter.projectMaxHasBeenInvoked(
            config.projectOne,
            config.genArt721Core.address
          )
        ).to.be.true;

        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectOne,
            config.genArt721Core.address,
            2
          );
        expect(
          await config.minter.projectMaxHasBeenInvoked(
            config.projectOne,
            config.genArt721Core.address
          )
        ).to.be.false;
      });
    });

    describe("syncProjectMaxInvocationsToCore", async function () {
      it("allows artist to sync max invocations", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .syncProjectMaxInvocationsToCore(
            config.projectZero,
            config.genArt721Core.address
          );
        const result = await config.minter.maxInvocationsProjectConfig(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result.maxInvocations).to.equal(15);
      });

      it("reverts when called by non-artist", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .syncProjectMaxInvocationsToCore(
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.onlyArtist
        );
      });
    });

    describe("updatePricesPerTokenInWei", async function () {
      it("only allows artist to update prices", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .updatePricesPerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.allowlistPricePerTokenInWei
            ),
          revertMessages.onlyArtist
        );
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
      });

      it("allows setting both prices to zero", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            0,
            0
          );
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.be.true;
        expect(priceInfo.tokenPriceInWei).to.equal(0);
        const allowlistPriceInfo = await config.minter.getAllowlistPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(allowlistPriceInfo.tokenPriceInWei).to.equal(0);
      });

      it("configures SplitFunds USDC currency on first price update", async function () {
        const config = await loadFixture(_beforeEach);
        // project zero not yet priced / currency not configured
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.currencySymbol).to.equal(CURRENCY_SYMBOL);
        expect(priceInfo.currencyAddress).to.equal(config.ERC20.address);

        // subsequent call should succeed without resetting unintended state
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.higherPricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const updated = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(updated.tokenPriceInWei).to.equal(
          config.higherPricePerTokenInWei
        );
      });

      it("syncs local max invocations when previously unconfigured", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const result = await config.minter.maxInvocationsProjectConfig(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result.maxInvocations).to.equal(15);
      });
    });
  });
});
