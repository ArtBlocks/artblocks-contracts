import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { SetPrice_Common_Configure } from "../common.configure";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";

const TARGET_MINTER_NAME = "MinterSetPricePMPV0";

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
  describe(`MinterSetPricePMP Configure w/ core ${params.core}`, async function () {
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

      const delegateRegistry = await deployAndGet(
        config,
        "DelegateRegistry",
        []
      );
      config.pmp = await deployAndGet(config, "PMPV1", [
        delegateRegistry.address,
      ]);

      config.minter = await deployAndGet(config, TARGET_MINTER_NAME, [
        config.minterFilter.address,
        config.pmp.address,
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

      it("does not re-sync max invocations once they have been synced", async function () {
        const config = await loadFixture(_beforeEach);
        // first price update syncs local max invocations to the core value
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // artist then intentionally limits max invocations below the core value
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        // a subsequent price update must not clobber the manual limit
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.higherPricePerTokenInWei
          );
        expect(
          await config.minter.projectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address
          )
        ).to.equal(1);
      });

      it("only allows the artist to update the price", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            ),
          revertMessages.onlyArtist
        );
      });
    });
  });
});
