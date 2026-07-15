import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { Logger } from "@ethersproject/logger";
import { TARGET_MINTER_NAME, runForEach, makeBeforeEach } from "./helpers";

Logger.setLogLevel(Logger.levels.ERROR);

runForEach.forEach((params) => {
  describe(`${TARGET_MINTER_NAME} Events w/ core ${params.core}`, async function () {
    const _beforeEach = makeBeforeEach(params);

    describe("updateAllowlistAddress", async function () {
      it("emits AllowlistAddressUpdated", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .updateAllowlistAddress(config.accounts.additional.address)
        )
          .to.emit(config.minter, "AllowlistAddressUpdated")
          .withArgs(config.accounts.additional.address);
      });
    });

    describe("ProjectMaxInvocationsLimitUpdated", async function () {
      it("emits during syncProjectMaxInvocationsToCore", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .syncProjectMaxInvocationsToCore(
              config.projectZero,
              config.genArt721Core.address
            )
        )
          .to.emit(
            await ethers.getContractAt(
              "MaxInvocationsLib",
              config.minter.address
            ),
            "ProjectMaxInvocationsLimitUpdated"
          )
          .withArgs(config.projectZero, config.genArt721Core.address, 15);
      });

      it("emits during manuallyLimitProjectMaxInvocations", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              5
            )
        )
          .to.emit(
            await ethers.getContractAt(
              "MaxInvocationsLib",
              config.minter.address
            ),
            "ProjectMaxInvocationsLimitUpdated"
          )
          .withArgs(config.projectZero, config.genArt721Core.address, 5);
      });
    });

    describe("updatePricesPerTokenInWei", async function () {
      it("emits PricePerTokenUpdated and ConfigValueSet for allowlist price", async function () {
        const config = await loadFixture(_beforeEach);
        const allowlistPriceKey = ethers.utils.formatBytes32String(
          "allowlistPricePerToken"
        );
        const tx = config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        await expect(tx)
          .to.emit(
            await ethers.getContractAt("SetPriceLib", config.minter.address),
            "PricePerTokenUpdated"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        await expect(tx)
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
            allowlistPriceKey,
            config.allowlistPricePerTokenInWei
          );
      });

      it("emits ProjectCurrencyInfoUpdated when configuring USDC for the first time", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .updatePricesPerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.allowlistPricePerTokenInWei
            )
        )
          .to.emit(
            await ethers.getContractAt("SplitFundsLib", config.minter.address),
            "ProjectCurrencyInfoUpdated"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            config.ERC20.address,
            "USDC"
          );
      });

      it("does not re-emit ProjectCurrencyInfoUpdated when USDC already configured", async function () {
        const config = await loadFixture(_beforeEach);
        // projectOne already configured in fixture
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .updatePricesPerTokenInWei(
              config.projectOne,
              config.genArt721Core.address,
              config.higherPricePerTokenInWei,
              config.allowlistPricePerTokenInWei
            )
        ).to.not.emit(
          await ethers.getContractAt("SplitFundsLib", config.minter.address),
          "ProjectCurrencyInfoUpdated"
        );
      });
    });
  });
});
