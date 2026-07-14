import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { Logger } from "@ethersproject/logger";
import { deployAndGet } from "../../../util/common";
import { revertMessages } from "../../constants";
import {
  TARGET_MINTER_NAME,
  runForEach,
  makeBeforeEach,
  approveAndPurchase,
  configureHashSeedForProject,
} from "./helpers";

Logger.setLogLevel(Logger.levels.ERROR);

runForEach.forEach((params) => {
  describe(`${TARGET_MINTER_NAME} Integration w/ core ${params.core}`, async function () {
    const _beforeEach = makeBeforeEach(params);

    describe("purchase", async function () {
      it("reverts if price not configured", async function () {
        const config = await loadFixture(_beforeEach);
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.pricePerTokenInWei
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.ERC20.address
            ),
          revertMessages.priceNotConfigured
        );
      });

      it("reverts if currency address does not match fixed USDC", async function () {
        const config = await loadFixture(_beforeEach);
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.pricePerTokenInWei
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(
              config.projectOne,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.accounts.additional.address
            ),
          revertMessages.currencyAddressMatch
        );
      });

      it("reverts if maxPricePerToken is below effective price", async function () {
        const config = await loadFixture(_beforeEach);
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.pricePerTokenInWei
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(
              config.projectOne,
              config.genArt721Core.address,
              config.pricePerTokenInWei.sub(1),
              config.ERC20.address
            ),
          revertMessages.mustSendCorrectAmount
        );
      });

      it("reverts if insufficient ERC20 allowance", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(
              config.projectOne,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.ERC20.address
            ),
          revertMessages.needMoreAllowance
        );
      });

      it("allows public buyer to mint at public price", async function () {
        const config = await loadFixture(_beforeEach);
        const balanceBefore = await config.ERC20.balanceOf(
          config.accounts.user.address
        );
        await approveAndPurchase(
          config,
          config.accounts.user,
          config.projectOne
        );
        expect(
          await config.genArt721Core.balanceOf(config.accounts.user.address)
        ).to.equal(1);
        expect(
          await config.ERC20.balanceOf(config.accounts.user.address)
        ).to.equal(balanceBefore.sub(config.pricePerTokenInWei));
      });

      it("allows allowlist address to mint at allowlist price", async function () {
        const config = await loadFixture(_beforeEach);
        const balanceBefore = await config.ERC20.balanceOf(
          config.accounts.user2.address
        );
        await approveAndPurchase(
          config,
          config.accounts.user2,
          config.projectOne,
          config.allowlistPricePerTokenInWei
        );
        expect(
          await config.genArt721Core.balanceOf(config.accounts.user2.address)
        ).to.equal(1);
        expect(
          await config.ERC20.balanceOf(config.accounts.user2.address)
        ).to.equal(balanceBefore.sub(config.allowlistPricePerTokenInWei));
      });

      it("allows maxPricePerToken greater than token price", async function () {
        const config = await loadFixture(_beforeEach);
        await approveAndPurchase(
          config,
          config.accounts.user,
          config.projectOne,
          config.higherPricePerTokenInWei
        );
        // only configured price deducted
        expect(
          await config.genArt721Core.balanceOf(config.accounts.user.address)
        ).to.equal(1);
      });

      it("does not allow purchases once max invocations reached", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectOne,
            config.genArt721Core.address,
            1
          );
        await approveAndPurchase(
          config,
          config.accounts.user,
          config.projectOne
        );
        await expectRevert(
          approveAndPurchase(config, config.accounts.user, config.projectOne),
          revertMessages.maximumInvocationsReached
        );
      });
    });

    describe("purchaseTo", async function () {
      it("allows purchasing to a different recipient while pricing by msg.sender", async function () {
        const config = await loadFixture(_beforeEach);
        // allowlist buyer pays allowlist price but recipient is user
        await approveAndPurchase(
          config,
          config.accounts.user2,
          config.projectOne,
          config.allowlistPricePerTokenInWei,
          config.accounts.user.address
        );
        expect(
          await config.genArt721Core.balanceOf(config.accounts.user.address)
        ).to.equal(1);
        expect(
          await config.genArt721Core.balanceOf(config.accounts.user2.address)
        ).to.equal(0);
      });
    });

    describe("purchaseWithHashSeed / purchaseToWithHashSeed", async function () {
      it("reverts for zero hash seed", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHashSeedForProject(config, config.projectOne);
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.pricePerTokenInWei
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseToWithHashSeed(
              config.accounts.user.address,
              config.projectOne,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.ERC20.address,
              "0x000000000000000000000000"
            ),
          revertMessages.onlyNonZeroHashSeeds
        );
      });

      it("assigns hash seed during purchaseWithHashSeed", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHashSeedForProject(config, config.projectOne);
        const hashSeed = "0x1234567890abcdef12345678";
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.pricePerTokenInWei
        );
        const tx = await config.minter
          .connect(config.accounts.user)
          .purchaseWithHashSeed(
            config.projectOne,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.ERC20.address,
            hashSeed
          );
        const receipt = await tx.wait();
        // token minted to user
        expect(
          await config.genArt721Core.balanceOf(config.accounts.user.address)
        ).to.equal(1);
        expect(receipt.status).to.equal(1);
      });
    });

    describe("allowlist address pricing edge cases", async function () {
      it("charges public price after allowlist address is changed away from buyer", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.deployer)
          .updateAllowlistAddress(config.accounts.additional.address);

        // user2 was allowlist, now must pay public price
        await expectRevert(
          approveAndPurchase(
            config,
            config.accounts.user2,
            config.projectOne,
            config.allowlistPricePerTokenInWei
          ),
          revertMessages.mustSendCorrectAmount
        );

        await approveAndPurchase(
          config,
          config.accounts.user2,
          config.projectOne,
          config.pricePerTokenInWei
        );
        expect(
          await config.genArt721Core.balanceOf(config.accounts.user2.address)
        ).to.equal(1);
      });
    });

    describe("payment splitting", async function () {
      it("splits USDC revenues on successful purchase", async function () {
        const config = await loadFixture(_beforeEach);
        const artistBefore = await config.ERC20.balanceOf(
          config.accounts.artist.address
        );
        await approveAndPurchase(
          config,
          config.accounts.user,
          config.projectOne
        );
        const artistAfter = await config.ERC20.balanceOf(
          config.accounts.artist.address
        );
        // artist receives some revenue share (exact split depends on core type)
        expect(artistAfter.gt(artistBefore)).to.be.true;
      });

      it("reverts when ERC20 transfer fails during split", async function () {
        const config = await loadFixture(_beforeEach);
        // ban artist payment address so revenue transfer fails
        await config.ERC20.updateBannedAddress(config.accounts.artist.address);
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.pricePerTokenInWei
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(
              config.projectOne,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.ERC20.address
            ),
          revertMessages.ERC20MockBannedTransfer
        );
      });
    });

    describe("free mints (zero price)", async function () {
      it("allows free public mint when public price is zero", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectOne,
            config.genArt721Core.address,
            0,
            config.allowlistPricePerTokenInWei
          );
        await config.minter
          .connect(config.accounts.user)
          .purchase(
            config.projectOne,
            config.genArt721Core.address,
            0,
            config.ERC20.address
          );
        expect(
          await config.genArt721Core.balanceOf(config.accounts.user.address)
        ).to.equal(1);
      });
    });

    describe("max invocations false-negative protection", async function () {
      it("does not allow purchases even if local max invocations is a false negative", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectOne,
            config.genArt721Core.address,
            1
          );

        // mint one via a different ETH set-price minter
        const setPriceMinter = await deployAndGet(config, "MinterSetPriceV5", [
          config.minterFilter.address,
        ]);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .approveMinterGlobally(setPriceMinter.address);
        await config.minterFilter
          .connect(config.accounts.artist)
          .setMinterForProject(
            config.projectOne,
            config.genArt721Core.address,
            setPriceMinter.address
          );
        await setPriceMinter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectOne,
            config.genArt721Core.address,
            0
          );
        await setPriceMinter
          .connect(config.accounts.artist)
          .purchase(config.projectOne, config.genArt721Core.address);

        // switch back
        await config.minterFilter
          .connect(config.accounts.artist)
          .setMinterForProject(
            config.projectOne,
            config.genArt721Core.address,
            config.minter.address
          );

        await expectRevert(
          approveAndPurchase(config, config.accounts.user, config.projectOne),
          revertMessages.maximumInvocationsReached
        );
      });
    });
  });
});
