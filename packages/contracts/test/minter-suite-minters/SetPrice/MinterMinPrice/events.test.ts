import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { SetPrice_Common_Events } from "../common.events";
import { ethers } from "hardhat";
import { T_Config } from "../../../util/common";
import {
  GenArt721CoreV3_Engine,
  GenArt721CoreV3_Engine_Flex,
  MinterFilterV2,
  MinterMinPriceV0,
} from "../../../../scripts/contracts";
import { BigNumber } from "ethers";

const TARGET_MINTER_NAME = "MinterMinPriceV0";
const TARGET_MINTER_VERSION = "v0.0.0";

const DEFAULT_MIN_MINT_FEE = ethers.utils.parseEther("0.01");

const runForEach = [
  {
    core: "GenArt721CoreV3_Engine",
  },
  {
    core: "GenArt721CoreV3_Engine_Flex",
  },
];

interface T_MinterMinPriceTestConfig extends T_Config {
  genArt721Core: GenArt721CoreV3_Engine | GenArt721CoreV3_Engine_Flex;
  minterFilter: MinterFilterV2;
  minter: MinterMinPriceV0;
  projectZero: number;
  projectOne: number;
  pricePerTokenInWei: BigNumber;
  higherPricePerTokenInWei: BigNumber;
}

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
        DEFAULT_MIN_MINT_FEE,
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

      return config as T_MinterMinPriceTestConfig;
    }

    describe("Common Set Price Minter Events Tests", async function () {
      await SetPrice_Common_Events(_beforeEach);
    });

    describe("DefaultMinMintFeeUpdated", async function () {
      it("should emit DefaultMinMintFeeUpdated event", async function () {
        const config = await loadFixture(_beforeEach);
        const newFee = DEFAULT_MIN_MINT_FEE.add(
          ethers.utils.parseEther("0.01")
        );
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .updateDefaultMinMintFee(newFee)
        )
          .to.emit(
            await ethers.getContractAt("MinPriceLib", config.minter.address),
            "DefaultMinMintFeeUpdated"
          )
          .withArgs(newFee);
      });
    });
  });
});
