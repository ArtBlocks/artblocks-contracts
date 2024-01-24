import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import {
  deployAndGet,
  deployCore,
  safeAddProject,
  deployAndGetPBAB,
} from "../../../util/common";
import { SetPrice_Common_Configure } from "../common.configure";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { expect } from "chai";
import { expectRevert } from "@openzeppelin/test-helpers";

const TARGET_MINTER_NAME = "MinterSetPriceHolderV5";
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
  describe(`MinterSetPriceHolder Configure w/ core ${params.core}`, async function () {
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
        // can purchase token at higher price
        await config.minter
          .connect(config.accounts.artist)
          [
            "purchase(uint256,address,address,uint256)"
          ](config.projectZero, config.genArt721Core.address, config.genArt721Core.address, config.projectZeroTokenZero.toNumber(), {
            value: config.higherPricePerTokenInWei,
          });
        // cannot purchase token at lower price
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            [
              "purchase(uint256,address,address,uint256)"
            ](config.projectZero, config.genArt721Core.address, config.genArt721Core.address, config.projectZeroTokenZero.toNumber(), {
              value: config.pricePerTokenInWei,
            }),
          revertMessages.needMoreValue
        );
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
            .connect(config.accounts.artist)
            [
              "purchase(uint256,address,address,uint256)"
            ](config.projectOne, config.genArt721Core.address, config.genArt721Core.address, config.projectZeroTokenZero.toNumber(), {
              value: config.pricePerTokenInWei,
            }),
          revertMessages.needMoreValue
        );
        // can purchase project two token at lower price
        await config.minter
          .connect(config.accounts.artist)
          [
            "purchase(uint256,address,address,uint256)"
          ](config.projectZero, config.genArt721Core.address, config.genArt721Core.address, config.projectZeroTokenZero.toNumber(), {
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
        // reduce local maxInvocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        const maxInvocationsProjectConfig = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig.maxInvocations).to.equal(2);

        // mint a token
        await config.minter
          .connect(config.accounts.artist)
          [
            "purchase(uint256,address,address,uint256)"
          ](config.projectZero, config.genArt721Core.address, config.genArt721Core.address, config.projectZeroTokenZero.toNumber(), {
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
        // artist sets price of project zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // reduce local maxInvocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        const localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations.maxInvocations).to.equal(2);

        // mint a token
        await config.minter
          .connect(config.accounts.artist)
          [
            "purchase(uint256,address,address,uint256)"
          ](config.projectZero, config.genArt721Core.address, config.genArt721Core.address, config.projectZeroTokenZero.toNumber(), {
            value: config.pricePerTokenInWei,
          });

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // increase invocations on the minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            3
          );

        // expect maxInvocations on the minter to be 3
        const localMaxInvocations2 = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations2.maxInvocations).to.equal(3);

        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked2).to.be.false;

        // reduce invocations on the minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            2
          );

        // expect maxInvocations on the minter to be 1
        const localMaxInvocations3 = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations3.maxInvocations).to.equal(2);

        // expect projectMaxHasBeenInvoked to now be true
        const hasMaxBeenInvoked3 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked3).to.be.true;
      });
    });

    describe("allowHoldersOfProjects", async function () {
      it("only allows artist to update allowed holders", async function () {
        const config = await loadFixture(_beforeEach);
        // user not allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .allowHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne]
            ),
          revertMessages.onlyArtist
        );
        // additional not allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            .allowHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne]
            ),
          revertMessages.onlyArtist
        );
        // artist allowed
        await config.minter
          .connect(config.accounts.artist)
          .allowHoldersOfProjects(
            config.projectZero,
            config.genArt721Core.address,
            [config.genArt721Core.address],
            [config.projectOne]
          );
      });

      it("length of array args must match", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .allowHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address, config.genArt721Core.address],
              [config.projectOne]
            ),
          revertMessages.lengthOfArraysMustMatch
        );
      });
    });

    describe("removeHoldersOfProjects", async function () {
      it("only allows artist to update allowed holders", async function () {
        const config = await loadFixture(_beforeEach);
        // user not allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .removeHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne]
            ),
          revertMessages.onlyArtist
        );
        // additional not allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            .removeHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne]
            ),
          revertMessages.onlyArtist
        );
        // artist allowed
        await config.minter
          .connect(config.accounts.artist)
          .removeHoldersOfProjects(
            config.projectZero,
            config.genArt721Core.address,
            [config.genArt721Core.address],
            [config.projectOne]
          );
      });

      it("only allows equal length array args", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .removeHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address, config.genArt721Core.address],
              [config.projectOne]
            ),
          revertMessages.lengthOfArraysMustMatch
        );
      });
    });

    describe("allowAndRemoveHoldersOfProjects", async function () {
      it("only allows artist to update allowed holders", async function () {
        const config = await loadFixture(_beforeEach);
        // user not allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .allowAndRemoveHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne],
              [config.genArt721Core.address],
              [config.projectOne]
            ),
          revertMessages.onlyArtist
        );
        // additional not allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            .allowAndRemoveHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne],
              [config.genArt721Core.address],
              [config.projectOne]
            ),
          revertMessages.onlyArtist
        );
        // artist allowed
        await config.minter
          .connect(config.accounts.artist)
          .allowAndRemoveHoldersOfProjects(
            config.projectZero,
            config.genArt721Core.address,
            [config.genArt721Core.address],
            [config.projectOne],
            [config.genArt721Core.address],
            [config.projectOne]
          );
      });
    });
  });
});
