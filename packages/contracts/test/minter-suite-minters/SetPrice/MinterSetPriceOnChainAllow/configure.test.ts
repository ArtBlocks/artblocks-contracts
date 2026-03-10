import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { SetPrice_Common_Configure } from "../common.configure";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterSetPriceOnChainAllowV0";
const TARGET_MINTER_VERSION = "v0.1.0";

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
  describe(`${TARGET_MINTER_NAME} Configure w/ core ${params.core}`, async function () {
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

      // add test accounts to allowlist so purchase tests work
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

    describe("Common Set Price Minter Configure Tests", async function () {
      await SetPrice_Common_Configure(_beforeEach);
    });

    describe("updatePricePerTokenInWei", async function () {
      it("enforces price update", async function () {
        const config = await loadFixture(_beforeEach);
        // artist increases price
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.higherPricePerTokenInWei
          );

        // cannot purchase token at lower price
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.pricePerTokenInWei,
            }),
          revertMessages.needMoreValue
        );
        // can purchase token at higher price
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.higherPricePerTokenInWei,
          });
      });

      it("enforces price update only on desired project", async function () {
        const config = await loadFixture(_beforeEach);
        // artist sets price of project zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );

        // artist increases price of project one
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectOne,
            config.genArt721Core.address,
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
        // can purchase project zero token at lower price
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.pricePerTokenInWei,
          });
      });
    });

    describe("syncProjectMaxInvocationsToCore", async function () {
      it("resets maxHasBeenInvoked after it's been set to true locally and then max project invocations is synced from the core contract", async function () {
        const config = await loadFixture(_beforeEach);
        // artist sets price of project zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
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
            value: config.pricePerTokenInWei,
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

    describe("manuallyLimitProjectMaxInvocations", async function () {
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

        // mint a token
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

        // expect maxInvocations on the minter to be 3
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

        // expect maxInvocations on the minter to be 1
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
        // revert during purchase
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

    describe("addAddressesToAllowlist", async function () {
      it("only allows artist to add addresses to allowlist", async function () {
        const config = await loadFixture(_beforeEach);
        // user not allowed
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
        // deployer not allowed
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
        // artist allowed
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
        // verify addresses are not on allowlist
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
        // add addresses
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
        // verify addresses are on allowlist
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
        // add address to project zero allowlist
        await config.minter
          .connect(config.accounts.artist)
          .addAddressesToAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [config.accounts.additional.address]
          );
        // verify address is on project zero allowlist
        expect(
          await config.minter.isAllowlisted(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.additional.address
          )
        ).to.be.true;
        // verify address is NOT on project one allowlist
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
        // user not allowed
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
        // deployer not allowed
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
        // artist allowed
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
        // user is on allowlist from _beforeEach
        expect(
          await config.minter.isAllowlisted(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          )
        ).to.be.true;
        // remove user from allowlist
        await config.minter
          .connect(config.accounts.artist)
          .removeAddressesFromAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [config.accounts.user.address]
          );
        // verify user is no longer on allowlist
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
        // user not allowed
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
        // artist allowed
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
        // user is on allowlist, additional is not
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
        // add additional, remove user
        await config.minter
          .connect(config.accounts.artist)
          .addAndRemoveAddressesFromAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [config.accounts.additional.address],
            [config.accounts.user.address]
          );
        // verify additional is on allowlist, user is not
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
        // add and remove the same address
        await config.minter
          .connect(config.accounts.artist)
          .addAndRemoveAddressesFromAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [config.accounts.additional.address],
            [config.accounts.additional.address]
          );
        // verify address is NOT on allowlist (remove takes precedence)
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
