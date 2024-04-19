import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { SetPrice_Common_Events } from "../common.events";
import { ethers } from "hardhat";

const TARGET_MINTER_NAME = "MinterSetPriceERC20V5";

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
  describe(`${TARGET_MINTER_NAME} Events w/ core ${params.core}`, async function () {
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

      // deploy ERC20 token, sending 100e18 tokens to user
      const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
      config.ERC20 = await ERC20Factory.connect(config.accounts.user).deploy(
        ethers.utils.parseEther("100")
      );

      return config;
    }

    describe("Common Set Price Minter Events Tests", async function () {
      await SetPrice_Common_Events(_beforeEach);
    });

    describe("ProjectCurrencyInfoUpdated", async function () {
      it("emits event upon currency update", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .updateProjectCurrencyInfo(
              config.projectZero,
              config.genArt721Core.address,
              "ERC20",
              config.ERC20.address
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
            "ERC20"
          );
      });
    });

    describe("PricePerTokenReset", async function () {
      it("emits event upon price reset", async function () {
        const config = await loadFixture(_beforeEach);
        // set price
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectOne,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // initial currency configuring should not emit price reset
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .updateProjectCurrencyInfo(
              config.projectZero,
              config.genArt721Core.address,
              "ERC20",
              config.ERC20.address
            )
        ).to.not.emit(
          await ethers.getContractAt("SetPriceLib", config.minter.address),
          "PricePerTokenReset"
        );
        // subsequent currency configuring should emit price reset
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .updateProjectCurrencyInfo(
              config.projectZero,
              config.genArt721Core.address,
              "ERC20",
              config.ERC20.address
            )
        )
          .to.emit(
            await ethers.getContractAt("SetPriceLib", config.minter.address),
            "PricePerTokenReset"
          )
          .withArgs(config.projectZero, config.genArt721Core.address);
      });
    });
  });
});
