import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterSetPriceTieredOnChainAllowV0";
const TARGET_MINTER_VERSION = "v0.1.0";

const runForEach = [
  { core: "GenArt721CoreV3" },
  { core: "GenArt721CoreV3_Explorations" },
  { core: "GenArt721CoreV3_Engine" },
  { core: "GenArt721CoreV3_Engine_Flex" },
];

runForEach.forEach((params) => {
  describe(`${TARGET_MINTER_NAME} Integration w/ core ${params.core}`, async function () {
    async function _beforeEach() {
      const config = await loadFixture(setupConfigWitMinterFilterV2Suite);
      ({
        genArt721Core: config.genArt721Core,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCore(config, params.core, config.coreRegistry));

      await config.genArt721Core.updateMinterContract(
        config.minterFilter.address
      );

      config.minter = await deployAndGet(config, TARGET_MINTER_NAME, [
        config.minterFilter.address,
      ]);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .approveMinterGlobally(config.minter.address);

      config.higherPricePerTokenInWei = config.pricePerTokenInWei.add(
        ethers.utils.parseEther("0.1")
      );

      // allowlist price: half the public price
      config.allowlistPricePerTokenInWei = config.pricePerTokenInWei.div(2);

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

      // configure prices for project one (public + allowlist)
      await config.minter
        .connect(config.accounts.artist)
        .updatePricesPerTokenInWei(
          config.projectOne,
          config.genArt721Core.address,
          config.pricePerTokenInWei,
          config.allowlistPricePerTokenInWei
        );

      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 15);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, 15);

      // add user and artist to allowlist for project zero and one
      await config.minter
        .connect(config.accounts.artist)
        .addAddressesToAllowlist(
          config.projectZero,
          config.genArt721Core.address,
          [config.accounts.user.address, config.accounts.artist.address]
        );
      await config.minter
        .connect(config.accounts.artist)
        .addAddressesToAllowlist(
          config.projectOne,
          config.genArt721Core.address,
          [config.accounts.user.address, config.accounts.artist.address]
        );

      config.isEngine = params.core.includes("Engine");

      return config;
    }

    async function configureHashSeedForProject(config: any, projectId: number) {
      await config.randomizer
        .connect(config.accounts.artist)
        .setHashSeedSetterContract(
          config.genArt721Core.address,
          projectId,
          config.minter.address
        );
      await config.randomizer
        .connect(config.accounts.artist)
        .toggleProjectUseAssignedHashSeed(
          config.genArt721Core.address,
          projectId
        );
    }

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
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .updatePricesPerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.allowlistPricePerTokenInWei
            ),
          revertMessages.onlyArtist
        );
        // artist allowed
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
        const allowlistPrice = await config.minter.getAllowlistPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(allowlistPrice).to.equal(0);
      });

      it("allows setting public price to zero with non-zero allowlist price", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            0,
            config.allowlistPricePerTokenInWei
          );
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.be.true;
        expect(priceInfo.tokenPriceInWei).to.equal(0);
        const allowlistPrice = await config.minter.getAllowlistPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(allowlistPrice).to.equal(config.allowlistPricePerTokenInWei);
      });

      it("allows setting allowlist price to zero with non-zero public price", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            0
          );
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.be.true;
        expect(priceInfo.tokenPriceInWei).to.equal(config.pricePerTokenInWei);
        const allowlistPrice = await config.minter.getAllowlistPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(allowlistPrice).to.equal(0);
      });

      it("syncs max invocations on first price configuration", async function () {
        const config = await loadFixture(_beforeEach);
        // project zero has not had prices configured yet
        const maxInvBefore = await config.minter.maxInvocationsProjectConfig(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(maxInvBefore.maxInvocations).to.equal(0);

        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );

        const maxInvAfter = await config.minter.maxInvocationsProjectConfig(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(maxInvAfter.maxInvocations).to.equal(15);
      });
    });

    describe("purchase - tiered pricing", async function () {
      it("does not allow purchase prior to configuring prices", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            }),
          revertMessages.priceNotConfigured
        );
      });

      it("allowlisted address pays allowlist price", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        // user is on allowlist, can pay allowlist price
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.allowlistPricePerTokenInWei,
          });
      });

      it("allowlisted address rejected if sends less than allowlist price", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.allowlistPricePerTokenInWei.sub(1),
            }),
          revertMessages.needMoreValue
        );
      });

      it("non-allowlisted address pays public price", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        // additional is NOT on allowlist, must pay public price
        await config.minter
          .connect(config.accounts.additional)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.pricePerTokenInWei,
          });
      });

      it("non-allowlisted address rejected if sends only allowlist price", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        // additional is NOT on allowlist, allowlist price insufficient
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.allowlistPricePerTokenInWei,
            }),
          revertMessages.needMoreValue
        );
      });

      it("refunds excess ETH to allowlisted address", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const balanceBefore = await config.accounts.user.getBalance();
        const tx = await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.pricePerTokenInWei, // overpaying (sending public price as allowlisted)
          });
        const receipt = await tx.wait();
        const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
        const balanceAfter = await config.accounts.user.getBalance();
        // should have paid only allowlist price + gas, rest refunded
        expect(balanceBefore.sub(balanceAfter).sub(gasCost)).to.equal(
          config.allowlistPricePerTokenInWei
        );
      });

      it("refunds excess ETH to non-allowlisted address", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        // use additional2 since additional may be a payment split recipient on Engine
        const nonAllowlistedAccount = config.accounts.additional2;
        const overpayment = config.pricePerTokenInWei.add(
          ethers.utils.parseEther("1")
        );
        const balanceBefore = await nonAllowlistedAccount.getBalance();
        const tx = await config.minter
          .connect(nonAllowlistedAccount)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: overpayment,
          });
        const receipt = await tx.wait();
        const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
        const balanceAfter = await nonAllowlistedAccount.getBalance();
        expect(balanceBefore.sub(balanceAfter).sub(gasCost)).to.equal(
          config.pricePerTokenInWei
        );
      });

      it("price changes after allowlist removal", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        // user is on allowlist, purchase at allowlist price
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.allowlistPricePerTokenInWei,
          });
        // remove user from allowlist
        await config.minter
          .connect(config.accounts.artist)
          .removeAddressesFromAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [config.accounts.user.address]
          );
        // user now must pay public price
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.allowlistPricePerTokenInWei,
            }),
          revertMessages.needMoreValue
        );
        // user can purchase at public price
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.pricePerTokenInWei,
          });
      });
    });

    describe("purchaseTo", async function () {
      it("does not allow purchase prior to configuring prices", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.additional.address,
              config.projectZero,
              config.genArt721Core.address,
              {
                value: config.pricePerTokenInWei,
              }
            ),
          revertMessages.priceNotConfigured
        );
      });

      it("allows purchaseTo by default", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        // user is on allowlist, can purchaseTo at allowlist price
        await config.minter
          .connect(config.accounts.user)
          .purchaseTo(
            config.accounts.additional.address,
            config.projectZero,
            config.genArt721Core.address,
            {
              value: config.allowlistPricePerTokenInWei,
            }
          );
      });

      it("price tier based on msg.sender not recipient", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        // user (allowlisted) sends to additional (not allowlisted) - pays allowlist price
        await config.minter
          .connect(config.accounts.user)
          .purchaseTo(
            config.accounts.additional.address,
            config.projectZero,
            config.genArt721Core.address,
            {
              value: config.allowlistPricePerTokenInWei,
            }
          );
        // additional (not allowlisted) sends to user - must pay public price
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            .purchaseTo(
              config.accounts.user.address,
              config.projectZero,
              config.genArt721Core.address,
              {
                value: config.allowlistPricePerTokenInWei,
              }
            ),
          revertMessages.needMoreValue
        );
        // additional can purchaseTo at public price
        await config.minter
          .connect(config.accounts.additional)
          .purchaseTo(
            config.accounts.user.address,
            config.projectZero,
            config.genArt721Core.address,
            {
              value: config.pricePerTokenInWei,
            }
          );
      });
    });

    describe("purchaseMultiple", async function () {
      it("reverts with zero quantity", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseMultiple(
              config.projectZero,
              config.genArt721Core.address,
              0,
              { value: config.pricePerTokenInWei }
            ),
          "Must mint at least one token"
        );
      });

      it("mints multiple tokens at allowlist price for allowlisted address", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const qty = 3;
        const totalCost = config.allowlistPricePerTokenInWei.mul(qty);
        const balanceBefore = await config.genArt721Core.balanceOf(
          config.accounts.user.address
        );
        await config.minter
          .connect(config.accounts.user)
          .purchaseMultiple(
            config.projectZero,
            config.genArt721Core.address,
            qty,
            { value: totalCost }
          );
        const balanceAfter = await config.genArt721Core.balanceOf(
          config.accounts.user.address
        );
        expect(balanceAfter.sub(balanceBefore)).to.equal(qty);
      });

      it("mints multiple tokens at public price for non-allowlisted address", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const qty = 3;
        const totalCost = config.pricePerTokenInWei.mul(qty);
        await config.minter
          .connect(config.accounts.additional)
          .purchaseMultiple(
            config.projectZero,
            config.genArt721Core.address,
            qty,
            { value: totalCost }
          );
      });

      it("rejects if total value too low for quantity", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const qty = 3;
        const totalCost = config.pricePerTokenInWei.mul(qty);
        // send one wei less than required
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            .purchaseMultiple(
              config.projectZero,
              config.genArt721Core.address,
              qty,
              { value: totalCost.sub(1) }
            ),
          revertMessages.needMoreValue
        );
      });

      it("refunds excess ETH on batch purchase for allowlisted address", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const qty = 2;
        const totalCost = config.allowlistPricePerTokenInWei.mul(qty);
        const overpayment = totalCost.add(ethers.utils.parseEther("1"));
        const balanceBefore = await config.accounts.user.getBalance();
        const tx = await config.minter
          .connect(config.accounts.user)
          .purchaseMultiple(
            config.projectZero,
            config.genArt721Core.address,
            qty,
            { value: overpayment }
          );
        const receipt = await tx.wait();
        const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
        const balanceAfter = await config.accounts.user.getBalance();
        expect(balanceBefore.sub(balanceAfter).sub(gasCost)).to.equal(
          totalCost
        );
      });

      it("refunds excess ETH on batch purchase for non-allowlisted address", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const qty = 2;
        // additional2 is not a payment split recipient on any core variant
        const nonAllowlistedAccount = config.accounts.additional2;
        const totalCost = config.pricePerTokenInWei.mul(qty);
        const overpayment = totalCost.add(ethers.utils.parseEther("1"));
        const balanceBefore = await nonAllowlistedAccount.getBalance();
        const tx = await config.minter
          .connect(nonAllowlistedAccount)
          .purchaseMultiple(
            config.projectZero,
            config.genArt721Core.address,
            qty,
            { value: overpayment }
          );
        const receipt = await tx.wait();
        const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
        const balanceAfter = await nonAllowlistedAccount.getBalance();
        expect(balanceBefore.sub(balanceAfter).sub(gasCost)).to.equal(
          totalCost
        );
      });

      it("respects max invocations across batch", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        // limit to 2 invocations
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        // trying to mint 3 should fail (core enforces max)
        await expectRevert.unspecified(
          config.minter
            .connect(config.accounts.user)
            .purchaseMultiple(
              config.projectZero,
              config.genArt721Core.address,
              3,
              {
                value: config.allowlistPricePerTokenInWei.mul(3),
              }
            )
        );
        // minting 2 should succeed
        await config.minter
          .connect(config.accounts.user)
          .purchaseMultiple(
            config.projectZero,
            config.genArt721Core.address,
            2,
            {
              value: config.allowlistPricePerTokenInWei.mul(2),
            }
          );
      });
    });

    describe("purchaseMultipleTo", async function () {
      it("mints multiple tokens to specified address", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const qty = 2;
        const totalCost = config.allowlistPricePerTokenInWei.mul(qty);
        await config.minter
          .connect(config.accounts.user)
          .purchaseMultipleTo(
            config.accounts.additional.address,
            config.projectZero,
            config.genArt721Core.address,
            qty,
            { value: totalCost }
          );
        // verify tokens owned by additional
        const balance = await config.genArt721Core.balanceOf(
          config.accounts.additional.address
        );
        expect(balance).to.equal(qty);
      });

      it("price tier based on msg.sender not recipient", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const qty = 2;
        // additional (not allowlisted) must pay public price
        const totalPublic = config.pricePerTokenInWei.mul(qty);
        await config.minter
          .connect(config.accounts.additional)
          .purchaseMultipleTo(
            config.accounts.user.address,
            config.projectZero,
            config.genArt721Core.address,
            qty,
            { value: totalPublic }
          );
        // user (allowlisted) pays allowlist price
        const totalAllowlist = config.allowlistPricePerTokenInWei.mul(qty);
        await config.minter
          .connect(config.accounts.user)
          .purchaseMultipleTo(
            config.accounts.additional.address,
            config.projectZero,
            config.genArt721Core.address,
            qty,
            { value: totalAllowlist }
          );
      });
    });

    describe("purchaseWithHashSeed", async function () {
      it("allows purchase with hash seed at allowlist price", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHashSeedForProject(config, config.projectZero);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const hashSeed = "0x000000000000000000000001";
        await config.minter
          .connect(config.accounts.user)
          .purchaseWithHashSeed(
            config.projectZero,
            config.genArt721Core.address,
            hashSeed,
            {
              value: config.allowlistPricePerTokenInWei,
            }
          );
      });

      it("reverts with zero hash seed", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const zeroHashSeed = "0x000000000000000000000000";
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseWithHashSeed(
              config.projectZero,
              config.genArt721Core.address,
              zeroHashSeed,
              {
                value: config.pricePerTokenInWei,
              }
            ),
          revertMessages.onlyNonZeroHashSeeds
        );
      });
    });

    describe("purchaseToWithHashSeed", async function () {
      it("allows purchaseTo with hash seed and validates assignment", async function () {
        const config = await loadFixture(_beforeEach);
        await configureHashSeedForProject(config, config.projectZero);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const hashSeed = "0xabcdef000000000000000001";
        await config.minter
          .connect(config.accounts.user)
          .purchaseToWithHashSeed(
            config.accounts.user.address,
            config.projectZero,
            config.genArt721Core.address,
            hashSeed,
            {
              value: config.allowlistPricePerTokenInWei,
            }
          );
        const tokenHash = await config.genArt721Core.tokenIdToHash(
          config.projectZeroTokenZero.toNumber()
        );
        expect(tokenHash).to.not.equal(ethers.constants.HashZero);
      });

      it("reverts with zero hash seed", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const zeroHashSeed = "0x000000000000000000000000";
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseToWithHashSeed(
              config.accounts.user.address,
              config.projectZero,
              config.genArt721Core.address,
              zeroHashSeed,
              {
                value: config.pricePerTokenInWei,
              }
            ),
          revertMessages.onlyNonZeroHashSeeds
        );
      });
    });

    describe("allowlist management", async function () {
      it("only allows artist to add addresses", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .addAddressesToAllowlist(
              config.projectZero,
              config.genArt721Core.address,
              [config.accounts.additional.address]
            ),
          revertMessages.onlyArtist
        );
        await config.minter
          .connect(config.accounts.artist)
          .addAddressesToAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [config.accounts.additional.address]
          );
      });

      it("only allows artist to remove addresses", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .removeAddressesFromAllowlist(
              config.projectZero,
              config.genArt721Core.address,
              [config.accounts.user.address]
            ),
          revertMessages.onlyArtist
        );
        await config.minter
          .connect(config.accounts.artist)
          .removeAddressesFromAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [config.accounts.user.address]
          );
      });

      it("allowlist is per-project", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .addAddressesToAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [config.accounts.additional.address]
          );
        expect(
          await config.minter.isAllowlisted(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.additional.address
          )
        ).to.be.true;
        expect(
          await config.minter.isAllowlisted(
            config.projectOne,
            config.genArt721Core.address,
            config.accounts.additional.address
          )
        ).to.be.false;
      });

      it("removal takes precedence in addAndRemove", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .addAndRemoveAddressesFromAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [config.accounts.additional.address],
            [config.accounts.additional.address]
          );
        expect(
          await config.minter.isAllowlisted(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.additional.address
          )
        ).to.be.false;
      });
    });

    describe("views", async function () {
      it("getPriceInfo returns correct values when configured", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const result = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result.isConfigured).to.be.true;
        expect(result.tokenPriceInWei).to.equal(config.pricePerTokenInWei);
        expect(result.currencySymbol).to.equal("ETH");
        expect(result.currencyAddress).to.equal(ethers.constants.AddressZero);
      });

      it("getPriceInfo returns not configured when prices not set", async function () {
        const config = await loadFixture(_beforeEach);
        const result = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result.isConfigured).to.be.false;
        expect(result.tokenPriceInWei).to.equal(0);
      });

      it("getAllowlistPriceInfo returns correct values", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const allowlistPrice = await config.minter.getAllowlistPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(allowlistPrice).to.equal(config.allowlistPricePerTokenInWei);
      });

      it("isEngineView correctly reports isEngine", async function () {
        const config = await loadFixture(_beforeEach);
        const isEngineView = await config.minter.isEngineView(
          config.genArt721Core.address
        );
        expect(isEngineView).to.equal(config.isEngine);
      });

      it("minterType returns correct value", async function () {
        const config = await loadFixture(_beforeEach);
        expect(await config.minter.minterType()).to.equal(TARGET_MINTER_NAME);
      });

      it("minterVersion returns correct value", async function () {
        const config = await loadFixture(_beforeEach);
        expect(await config.minter.minterVersion()).to.equal(
          TARGET_MINTER_VERSION
        );
      });
    });

    describe("payment splitting", async function () {
      beforeEach(async function () {
        const config = await loadFixture(_beforeEach);
        config.deadReceiver = await deployAndGet(
          config,
          "DeadReceiverMock",
          []
        );
        this.config = config;
      });

      it("requires successful payment to render provider", async function () {
        const config = this.config;
        if (config.isEngine) {
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProviderSalesAddresses(
              config.deadReceiver.address,
              config.accounts.additional.address,
              config.accounts.artist2.address,
              config.accounts.additional2.address
            );
        } else {
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArtblocksPrimarySalesAddress(config.deadReceiver.address);
        }
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.allowlistPricePerTokenInWei,
            }),
          "Render Provider payment failed"
        );
      });

      it("requires successful payment to artist", async function () {
        const config = this.config;
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProjectArtistAddress(
            config.projectZero,
            config.deadReceiver.address
          );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.allowlistPricePerTokenInWei,
            }),
          "Artist payment failed"
        );
      });
    });

    describe("reentrancy", async function () {
      it("does not allow reentrant single purchases", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const reentrancy = await deployAndGet(
          config,
          "ReentrancyMockShared",
          []
        );
        await config.minter
          .connect(config.accounts.artist)
          .addAddressesToAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [reentrancy.address]
          );
        await expectRevert(
          reentrancy
            .connect(config.accounts.user)
            .attack(
              2,
              config.minter.address,
              config.projectZero,
              config.genArt721Core.address,
              config.allowlistPricePerTokenInWei.add("1"),
              {
                value: config.allowlistPricePerTokenInWei.add(1).mul(2),
              }
            ),
          revertMessages.refundFailed
        );
        // single purchase should succeed
        await reentrancy
          .connect(config.accounts.user)
          .attack(
            1,
            config.minter.address,
            config.projectZero,
            config.genArt721Core.address,
            config.allowlistPricePerTokenInWei.add("1"),
            {
              value: config.allowlistPricePerTokenInWei.add(1),
            }
          );
      });

      it("does not allow reentrant batch purchases", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const reentrancy = await deployAndGet(
          config,
          "ReentrancyBatchMockShared",
          []
        );
        await config.minter
          .connect(config.accounts.artist)
          .addAddressesToAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [reentrancy.address]
          );
        // batch purchase with overpayment triggers refund to mock contract,
        // which tries to re-enter via purchase - blocked by nonReentrant
        const totalCost = config.allowlistPricePerTokenInWei.mul(2);
        const overpayment = totalCost.add(
          config.allowlistPricePerTokenInWei.add("1")
        );
        await expectRevert(
          reentrancy
            .connect(config.accounts.user)
            .attackBatch(
              config.minter.address,
              config.projectZero,
              config.genArt721Core.address,
              2,
              config.allowlistPricePerTokenInWei.add("1"),
              { value: overpayment }
            ),
          revertMessages.refundFailed
        );
      });

      it("allows batch purchase from contract when not re-entering", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const reentrancy = await deployAndGet(
          config,
          "ReentrancyBatchMockShared",
          []
        );
        await config.minter
          .connect(config.accounts.artist)
          .addAddressesToAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [reentrancy.address]
          );
        // exact payment (no refund) should succeed since receive() won't fire
        const totalCost = config.allowlistPricePerTokenInWei.mul(2);
        await reentrancy
          .connect(config.accounts.user)
          .attackBatch(
            config.minter.address,
            config.projectZero,
            config.genArt721Core.address,
            2,
            config.allowlistPricePerTokenInWei,
            { value: totalCost }
          );
      });
    });

    describe("manuallyLimitProjectMaxInvocations", async function () {
      it("enforces project max invocations set on minter", async function () {
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
            0
          );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.allowlistPricePerTokenInWei,
            }),
          revertMessages.maximumInvocationsReached
        );
      });
    });
  });
});
