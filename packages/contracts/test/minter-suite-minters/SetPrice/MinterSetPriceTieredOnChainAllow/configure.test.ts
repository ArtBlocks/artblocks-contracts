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
  describe(`${TARGET_MINTER_NAME} Configure w/ core ${params.core}`, async function () {
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

      // configure prices for project one
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

      // add test accounts to allowlist
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

      return config;
    }

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
        // reduce local maxInvocations to 1 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectOne,
            config.genArt721Core.address,
            1
          );
        const localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectOne,
            config.genArt721Core.address
          );
        expect(localMaxInvocations.maxInvocations).to.equal(1);

        // mint a token (user is allowlisted, pays allowlist price)
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectOne, config.genArt721Core.address, {
            value: config.pricePerTokenInWei,
          });

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
          config.projectOne,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // increase invocations on the minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectOne,
            config.genArt721Core.address,
            3
          );

        const localMaxInvocations2 = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectOne,
            config.genArt721Core.address
          );
        expect(localMaxInvocations2.maxInvocations).to.equal(3);

        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await config.minter.projectMaxHasBeenInvoked(
          config.projectOne,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked2).to.be.false;

        // reduce invocations on the minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectOne,
            config.genArt721Core.address,
            1
          );

        const localMaxInvocations3 = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectOne,
            config.genArt721Core.address
          );
        expect(localMaxInvocations3.maxInvocations).to.equal(1);

        // expect projectMaxHasBeenInvoked to now be true
        const hasMaxBeenInvoked3 = await config.minter.projectMaxHasBeenInvoked(
          config.projectOne,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked3).to.be.true;
      });

      it("enforces project max invocations set on minter", async function () {
        const config = await loadFixture(_beforeEach);
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
              value: config.pricePerTokenInWei,
            }),
          revertMessages.maximumInvocationsReached
        );
      });
    });

    describe("syncProjectMaxInvocationsToCore", async function () {
      it("reverts for unconfigured/non-existent project", async function () {
        const config = await loadFixture(_beforeEach);
        expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .syncProjectMaxInvocationsToCore(99, config.genArt721Core.address),
          revertMessages.projectIdDoesNotExist
        );
      });

      it("does not allow non-artist to call", async function () {
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

      it("allows artist to call", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .syncProjectMaxInvocationsToCore(
            config.projectZero,
            config.genArt721Core.address
          );
      });

      it("updates local projectMaxInvocations after syncing to core", async function () {
        const config = await loadFixture(_beforeEach);
        // update max invocations to 2 on the core
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 2);
        // sync max invocations on minter
        await config.minter
          .connect(config.accounts.artist)
          .syncProjectMaxInvocationsToCore(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(
          (
            await config.minter.maxInvocationsProjectConfig(
              config.projectZero,
              config.genArt721Core.address
            )
          ).maxInvocations
        ).to.be.equal(2);
      });

      it("resets maxHasBeenInvoked after it's been set to true locally and then synced from core", async function () {
        const config = await loadFixture(_beforeEach);
        // configure prices for project zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        // reduce local maxInvocations to 1 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        const maxInvocationsProjectConfig = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig.maxInvocations).to.equal(1);

        // mint a token
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.allowlistPricePerTokenInWei,
          });

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // sync max invocations from core to minter
        await config.minter
          .connect(config.accounts.artist)
          .syncProjectMaxInvocationsToCore(
            config.projectZero,
            config.genArt721Core.address
          );

        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked2).to.be.false;

        // expect maxInvocations on the minter to be 15
        const syncedMaxInvocationsProjectConfig = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(syncedMaxInvocationsProjectConfig.maxInvocations).to.equal(15);
      });
    });

    describe("updatePricesPerTokenInWei", async function () {
      it("only allows artist to update prices", async function () {
        const config = await loadFixture(_beforeEach);
        // doesn't allow user
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
        // doesn't allow deployer
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
        // doesn't allow additional
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            .updatePricesPerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.allowlistPricePerTokenInWei
            ),
          revertMessages.onlyArtist
        );
        // does allow artist
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
      });

      it("enforces public price update", async function () {
        const config = await loadFixture(_beforeEach);
        // artist sets higher public price on project zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.higherPricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        // non-allowlisted user cannot purchase at lower price
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            }),
          revertMessages.needMoreValue
        );
        // non-allowlisted user can purchase at higher price
        await config.minter
          .connect(config.accounts.additional)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.higherPricePerTokenInWei,
          });
      });

      it("enforces allowlist price update", async function () {
        const config = await loadFixture(_beforeEach);
        const higherAllowlistPrice = config.allowlistPricePerTokenInWei.add(
          ethers.utils.parseEther("0.1")
        );
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            higherAllowlistPrice
          );
        // allowlisted user cannot purchase at original (lower) allowlist price
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.allowlistPricePerTokenInWei,
            }),
          revertMessages.needMoreValue
        );
        // allowlisted user can purchase at new higher allowlist price
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: higherAllowlistPrice,
          });
      });

      it("enforces price update only on desired project", async function () {
        const config = await loadFixture(_beforeEach);
        // artist sets prices on project zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        // artist sets higher prices on project one
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectOne,
            config.genArt721Core.address,
            config.higherPricePerTokenInWei,
            config.higherPricePerTokenInWei
          );
        // cannot purchase project one token at lower price
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectOne, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            }),
          revertMessages.needMoreValue
        );
        // can purchase project zero token at lower allowlist price
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.allowlistPricePerTokenInWei,
          });
      });
    });

    describe("addAddressesToAllowlist", async function () {
      it("only allows artist to add addresses to allowlist", async function () {
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
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
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

      it("adds multiple addresses correctly", async function () {
        const config = await loadFixture(_beforeEach);
        expect(
          await config.minter.isAllowlisted(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.additional.address
          )
        ).to.be.false;
        expect(
          await config.minter.isAllowlisted(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.additional2.address
          )
        ).to.be.false;
        await config.minter
          .connect(config.accounts.artist)
          .addAddressesToAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [
              config.accounts.additional.address,
              config.accounts.additional2.address,
            ]
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
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.additional2.address
          )
        ).to.be.true;
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
    });

    describe("removeAddressesFromAllowlist", async function () {
      it("only allows artist to remove addresses from allowlist", async function () {
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
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
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

      it("removes addresses correctly", async function () {
        const config = await loadFixture(_beforeEach);
        expect(
          await config.minter.isAllowlisted(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          )
        ).to.be.true;
        await config.minter
          .connect(config.accounts.artist)
          .removeAddressesFromAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [config.accounts.user.address]
          );
        expect(
          await config.minter.isAllowlisted(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          )
        ).to.be.false;
      });
    });

    describe("addAndRemoveAddressesFromAllowlist", async function () {
      it("only allows artist to call", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .addAndRemoveAddressesFromAllowlist(
              config.projectZero,
              config.genArt721Core.address,
              [config.accounts.additional.address],
              [config.accounts.user.address]
            ),
          revertMessages.onlyArtist
        );
        await config.minter
          .connect(config.accounts.artist)
          .addAndRemoveAddressesFromAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [config.accounts.additional.address],
            [config.accounts.user.address]
          );
      });

      it("adds and removes addresses in a single transaction", async function () {
        const config = await loadFixture(_beforeEach);
        expect(
          await config.minter.isAllowlisted(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          )
        ).to.be.true;
        expect(
          await config.minter.isAllowlisted(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.additional.address
          )
        ).to.be.false;
        await config.minter
          .connect(config.accounts.artist)
          .addAndRemoveAddressesFromAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [config.accounts.additional.address],
            [config.accounts.user.address]
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
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          )
        ).to.be.false;
      });

      it("removal takes precedence if address is in both arrays", async function () {
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
  });
});
