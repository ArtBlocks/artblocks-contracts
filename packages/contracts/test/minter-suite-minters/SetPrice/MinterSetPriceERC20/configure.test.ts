import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { SetPrice_Common_Configure } from "../common.configure";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

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

const FAKE_CURRENCY_ADDRESS = "0xba5bd3d5644f570738eecd5ad9639e6f712dae87";

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

      // deploy ERC20 token, sending 100e18 tokens to user
      const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
      config.ERC20 = await ERC20Factory.connect(config.accounts.user).deploy(
        ethers.utils.parseEther("100")
      );
      // update currency for project zero, leave project one as unconfigured
      await config.minter
        .connect(config.accounts.artist)
        .updateProjectCurrencyInfo(
          config.projectZero,
          config.genArt721Core.address,
          "ERC20",
          config.ERC20.address
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

        // approve lower price of ERC20 tokens
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.pricePerTokenInWei
        );
        // cannot purchase token at lower price
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              "ERC20",
              config.ERC20.address
            ),
          revertMessages.mustSendCorrectAmount
        );

        // even if correct price is sent, need to approve higher price of ERC20 tokens
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(
              config.projectZero,
              config.genArt721Core.address,
              config.higherPricePerTokenInWei,
              "ERC20",
              config.ERC20.address
            ),
          revertMessages.needMoreAllowance
        );
        // can purchase token at higher price, after approval
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.higherPricePerTokenInWei
        );
        await config.minter
          .connect(config.accounts.user)
          .purchase(
            config.projectZero,
            config.genArt721Core.address,
            config.higherPricePerTokenInWei,
            "ERC20",
            config.ERC20.address
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

        // artist increases price of project one and configures currency
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectOne,
            config.genArt721Core.address,
            config.higherPricePerTokenInWei
          );

        await config.minter
          .connect(config.accounts.artist)
          .updateProjectCurrencyInfo(
            config.projectOne,
            config.genArt721Core.address,
            "ERC20",
            config.ERC20.address
          );
        // cannot purchase project one token at lower price
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
              "ERC20",
              config.ERC20.address
            ),
          revertMessages.mustSendCorrectAmount
        );
        // can purchase project two token at lower price
        // @dev approval still granted to minter for pricePerTokenInWei
        await config.minter
          .connect(config.accounts.user)
          .purchase(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            "ERC20",
            config.ERC20.address
          );
      });
    });

    describe("updateProjectCurrencyInfo", async function () {
      it("enforces currency to be non-zero address", async function () {
        const config = await loadFixture(_beforeEach);
        // reverts when setting currency zero address
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updateProjectCurrencyInfo(
              config.projectZero,
              config.genArt721Core.address,
              "ERC20",
              ethers.constants.AddressZero
            ),
          revertMessages.ERC20NullAddress
        );
      });

      it("enforces symbol to be non-empty string", async function () {
        const config = await loadFixture(_beforeEach);
        // reverts when setting currency zero address
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updateProjectCurrencyInfo(
              config.projectZero,
              config.genArt721Core.address,
              "",
              config.ERC20.address
            ),
          revertMessages.ERC20NonNullSymbol
        );
      });
    });

    describe("purchase", async function () {
      it("requires sufficient ERC20 balance", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // user approves minter to spend ERC20 tokens
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.pricePerTokenInWei
        );
        // user sends entire balance to another address
        const userBalance = await config.ERC20.balanceOf(
          config.accounts.user.address
        );
        await config.ERC20.connect(config.accounts.user).transfer(
          config.accounts.artist.address,
          userBalance
        );
        // user cannot purchase token
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              "ERC20",
              config.ERC20.address
            ),
          revertMessages.needMoreBalance
        );
      });
      it("requires price sent to be greater than or equal to the minting price", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // user approves minter to spend an amount of mint price
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.pricePerTokenInWei
        );

        // user can purchase token for mint price
        await config.minter
          .connect(config.accounts.user)
          .purchase(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            "ERC20",
            config.ERC20.address
          );

        // user can purchase token for a price higher than mint
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.higherPricePerTokenInWei
        );

        await config.minter
          .connect(config.accounts.user)
          .purchase(
            config.projectZero,
            config.genArt721Core.address,
            config.higherPricePerTokenInWei,
            "ERC20",
            config.ERC20.address
          );
      });
      it("requires price sent not to be lower than minting price", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.higherPricePerTokenInWei
          );
        // user approves minter to spend an amount of mint price
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.higherPricePerTokenInWei
        );

        // user can not purchase token for a price lower than mint
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              "ERC20",
              config.ERC20.address
            ),
          revertMessages.mustSendCorrectAmount
        );
      });
      it("requires the currency to match the configured currency on the project", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // artist configured the currency
        await config.minter
          .connect(config.accounts.artist)
          .updateProjectCurrencyInfo(
            config.projectZero,
            config.genArt721Core.address,
            "ERC20",
            config.ERC20.address
          );

        // user approves minter to spend an amount of mint price
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.pricePerTokenInWei
        );

        // user can not purchase token if currency symbols do not match
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              "BAD",
              config.ERC20.address
            ),
          revertMessages.currencySymbolMatch
        );

        // user can not purchase token if currency addresses do not match
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              "ERC20",
              FAKE_CURRENCY_ADDRESS
            ),
          revertMessages.currencyAddressMatch
        );

        // user can purchase token if currency address and symbol match
        await config.minter
          .connect(config.accounts.user)
          .purchase(
            config.projectZero,
            config.genArt721Core.address,
            config.higherPricePerTokenInWei,
            "ERC20",
            config.ERC20.address
          );
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
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.pricePerTokenInWei
        );
        await config.minter
          .connect(config.accounts.user)
          .purchase(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            "ERC20",
            config.ERC20.address
          );

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
        // reduce local maxInvocations to 2 on minter
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
          .connect(config.accounts.artist)
          .updateProjectCurrencyInfo(
            config.projectOne,
            config.genArt721Core.address,
            "ERC20",
            config.ERC20.address
          );
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.pricePerTokenInWei
        );
        await config.minter
          .connect(config.accounts.user)
          .purchase(
            config.projectOne,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            "ERC20",
            config.ERC20.address
          );

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
        // @dev no ERC20 approval needed due to ordering of checks during purchase
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              "ERC20",
              config.ERC20.address
            ),
          revertMessages.maximumInvocationsReached
        );
      });

      it("does not support setting project max invocations less than current invocations", async function () {
        const config = await loadFixture(_beforeEach);
        // mint a token
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          config.pricePerTokenInWei
        );
        await config.minter
          .connect(config.accounts.user)
          .purchase(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            "ERC20",
            config.ERC20.address
          );
        // expect revert when setting max invocations to less than current invocations
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              0
            ),
          revertMessages.invalidMaxInvocations
        );
      });
    });
  });
});
