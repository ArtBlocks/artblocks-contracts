import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import {
  deployAndGet,
  deployCore,
  safeAddProject,
  deployAndGetPBAB,
} from "../../../util/common";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterSetPricePolyptychERC20V5";
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
  describe(`${TARGET_MINTER_NAME} Integration w/ core ${params.core}`, async function () {
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
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectTwo);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectOne);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectTwo);

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
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectTwo,
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

      // set randomizer's hash seed setter contract
      await config.randomizer
        .connect(config.accounts.artist)
        .setHashSeedSetterContract(
          config.genArt721Core.address,
          config.projectZero,
          config.minter.address
        );
      await config.randomizer
        .connect(config.accounts.artist)
        .setHashSeedSetterContract(
          config.genArt721Core.address,
          config.projectOne,
          config.minter.address
        );
      await config.randomizer
        .connect(config.accounts.artist)
        .setHashSeedSetterContract(
          config.genArt721Core.address,
          config.projectTwo,
          config.minter.address
        );
      // toggle projects to be polyptych
      await config.randomizer
        .connect(config.accounts.artist)
        .toggleProjectUseAssignedHashSeed(
          config.genArt721Core.address,
          config.projectZero
        );
      await config.randomizer
        .connect(config.accounts.artist)
        .toggleProjectUseAssignedHashSeed(
          config.genArt721Core.address,
          config.projectOne
        );
      await config.randomizer
        .connect(config.accounts.artist)
        .toggleProjectUseAssignedHashSeed(
          config.genArt721Core.address,
          config.projectTwo
        );

      // deploy ERC20 token, sending 100e18 tokens to user
      const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
      config.ERC20 = await ERC20Factory.connect(config.accounts.artist).deploy(
        ethers.utils.parseEther("100")
      );
      // artist approve the minter for effectively infinite tokens to simplify tests
      await config.ERC20.connect(config.accounts.artist).approve(
        config.minter.address,
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

      // configure project one to work with polyptych
      await config.minter
        .connect(config.accounts.artist)
        .allowHoldersOfProjects(
          config.projectOne,
          config.genArt721Core.address,
          [config.genArt721Core.address],
          [config.projectZero]
        );
      await config.minter
        .connect(config.accounts.artist)
        .updateProjectCurrencyInfo(
          config.projectOne,
          config.genArt721Core.address,
          "ERC20",
          config.ERC20.address
        );

      return config;
    }

    describe("purchase", async function () {
      it("does not allow purchase prior to configuring price", async function () {
        const config = await loadFixture(_beforeEach);
        // expect revert due to price not being configured
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            ["purchase(uint256,address,uint256,address,address,uint256)"](
              config.projectTwo,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.ERC20.address,
              config.genArt721Core.address,
              config.projectTwoTokenZero.toNumber()
            ),
          "Price not configured"
        );
      });

      it("does not allow purchase without sufficient ERC20 approvals", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectOne,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        // expect revert due no ERC20 approval
        await config.ERC20.connect(config.accounts.artist).approve(
          config.minter.address,
          ethers.utils.parseEther("0")
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            ["purchase(uint256,address,uint256,address,address,uint256)"](
              config.projectOne,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.ERC20.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber()
            ),
          revertMessages.needMoreAllowance
        );
        // expect revert due when approving funds less than price
        await config.ERC20.connect(config.accounts.artist).approve(
          config.minter.address,
          config.pricePerTokenInWei.sub(1)
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            ["purchase(uint256,address,uint256,address,address,uint256)"](
              config.projectOne,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.ERC20.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber()
            ),
          revertMessages.needMoreAllowance
        );

        it("requires configured, non-zero currency address", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectOne,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          // expect revert when trying to purchase
          await expectRevert(
            config.minter
              .connect(config.accounts.artist)
              ["purchase(uint256,address,uint256,address,address,uint256)"](
                config.projectOne,
                config.genArt721Core.address,
                config.pricePerTokenInWei,
                config.ERC20.address,
                config.genArt721Core.address,
                config.projectZeroTokenZero.toNumber()
              ),
            revertMessages.ERC20NotConfigured
          );
        });

        it("requires no ETH payment when configured for ERC20", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei
            );
          // expect revert when trying to purchase while sending ETH
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .purchase(config.projectZero, config.genArt721Core.address, {
                value: config.pricePerTokenInWei,
              }),
            revertMessages.ERC20NoEther
          );
        });
      });

      describe("allows/disallows based on allowed project holder configuration", async function () {
        it("does not allow purchase when using token of unallowed project", async function () {
          const config = await loadFixture(_beforeEach);
          // allow holders of config.projectOne to purchase tokens on config.projectTwo
          await config.minter
            .connect(config.accounts.artist)
            .allowHoldersOfProjects(
              config.projectTwo,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne]
            );
          // configure price per token to be zero
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectTwo,
              config.genArt721Core.address,
              0
            );
          await config.minter
            .connect(config.accounts.artist)
            .updateProjectCurrencyInfo(
              config.projectTwo,
              config.genArt721Core.address,
              "ERC20",
              config.ERC20.address
            );
          // do not allow purchase when holder token in config.projectZero is used as pass
          await expectRevert(
            config.minter
              .connect(config.accounts.additional)
              ["purchase(uint256,address,uint256,address,address,uint256)"](
                config.projectTwo,
                config.genArt721Core.address,
                config.pricePerTokenInWei,
                config.ERC20.address,
                config.genArt721Core.address,
                config.projectZeroTokenZero.toNumber()
              ),
            "Only allowlisted NFTs"
          );
        });

        it("does not allow purchase when using token of allowed then unallowed project", async function () {
          const config = await loadFixture(_beforeEach);
          // allow holders of config.projectZero and config.projectOne, then remove config.projectZero
          await config.minter
            .connect(config.accounts.artist)
            .allowAndRemoveHoldersOfProjects(
              config.projectTwo,
              config.genArt721Core.address,
              [config.genArt721Core.address, config.genArt721Core.address],
              [config.projectZero, config.projectOne],
              [config.genArt721Core.address],
              [config.projectZero]
            );
          // configure price per token to be zero
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectTwo,
              config.genArt721Core.address,
              0
            );
          await config.minter
            .connect(config.accounts.artist)
            .updateProjectCurrencyInfo(
              config.projectTwo,
              config.genArt721Core.address,
              "ERC20",
              config.ERC20.address
            );
          // do not allow purchase when holder token in config.projectZero is used as pass
          await expectRevert(
            config.minter
              .connect(config.accounts.additional)
              ["purchase(uint256,address,uint256,address,address,uint256)"](
                config.projectTwo,
                config.genArt721Core.address,
                config.pricePerTokenInWei,
                config.ERC20.address,
                config.genArt721Core.address,
                config.projectZeroTokenZero.toNumber()
              ),
            "Only allowlisted NFTs"
          );
        });

        it("does allow purchase when using token of allowed project", async function () {
          const config = await loadFixture(_beforeEach);
          // allow holders of config.projectZero to purchase tokens on config.projectTwo
          await config.minter
            .connect(config.accounts.artist)
            .allowHoldersOfProjects(
              config.projectTwo,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectZero]
            );
          // configure price per token to be zero
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectTwo,
              config.genArt721Core.address,
              0
            );
          await config.minter
            .connect(config.accounts.artist)
            .updateProjectCurrencyInfo(
              config.projectTwo,
              config.genArt721Core.address,
              "ERC20",
              config.ERC20.address
            );
          // does allow purchase when holder token in config.projectZero is used as pass
          await config.minter
            .connect(config.accounts.artist)
            ["purchase(uint256,address,uint256,address,address,uint256)"](
              config.projectTwo,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.ERC20.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber()
            );
        });

        it("does allow purchase when using token of allowed project (when set in bulk)", async function () {
          const config = await loadFixture(_beforeEach);
          // allow holders of config.projectOne and config.projectZero to purchase tokens on config.projectTwo
          await config.minter
            .connect(config.accounts.artist)
            .allowAndRemoveHoldersOfProjects(
              config.projectTwo,
              config.genArt721Core.address,
              [config.genArt721Core.address, config.genArt721Core.address],
              [config.projectOne, config.projectZero],
              [],
              []
            );
          // configure price per token to be zero
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectTwo,
              config.genArt721Core.address,
              0
            );
          await config.minter
            .connect(config.accounts.artist)
            .updateProjectCurrencyInfo(
              config.projectTwo,
              config.genArt721Core.address,
              "ERC20",
              config.ERC20.address
            );
          // does allow purchase when holder token in config.projectZero is used as pass
          await config.minter
            .connect(config.accounts.artist)
            ["purchase(uint256,address,uint256,address,address,uint256)"](
              config.projectTwo,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.ERC20.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber()
            );
        });

        it("does not allow purchase when using token not owned", async function () {
          const config = await loadFixture(_beforeEach);
          // allow holders of config.projectZero to purchase tokens on config.projectTwo
          await config.minter
            .connect(config.accounts.artist)
            .allowHoldersOfProjects(
              config.projectTwo,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectZero]
            );
          // configure price per token to be zero
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectTwo,
              config.genArt721Core.address,
              0
            );
          await config.minter
            .connect(config.accounts.artist)
            .updateProjectCurrencyInfo(
              config.projectTwo,
              config.genArt721Core.address,
              "ERC20",
              config.ERC20.address
            );
          // does allow purchase when holder token in config.projectZero is used as pass
          await expectRevert(
            config.minter
              .connect(config.accounts.additional)
              ["purchase(uint256,address,uint256,address,address,uint256)"](
                config.projectTwo,
                config.genArt721Core.address,
                config.pricePerTokenInWei,
                config.ERC20.address,
                config.genArt721Core.address,
                config.projectZeroTokenZero.toNumber()
              ),
            "Only owner of NFT"
          );
        });

        it("does not allow purchase when using token of an unallowed project on a different contract", async function () {
          const config = await loadFixture(_beforeEach);
          const { pbabToken, pbabMinter } = await deployAndGetPBAB(config);
          await pbabMinter
            .connect(config.accounts.artist)
            .purchaseTo(config.accounts.additional.address, 0, {
              value: config.pricePerTokenInWei,
            });

          // configure price per token to be zero
          await config.minter
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(
              config.projectTwo,
              config.genArt721Core.address,
              0
            );
          // expect failure when using PBAB token because it is not allowlisted for config.projectTwo
          await expectRevert(
            config.minter
              .connect(config.accounts.additional)
              ["purchase(uint256,address,uint256,address,address,uint256)"](
                config.projectTwo,
                config.genArt721Core.address,
                0,
                config.ERC20.address,
                pbabToken.address,
                0
              ),
            revertMessages.currencyAddressMatch
          );
        });
      });

      it("does allow purchase with a price of zero when intentionally configured", async function () {
        const config = await loadFixture(_beforeEach);
        // allow holders of config.projectZero to purchase tokens on config.projectTwo
        await config.minter
          .connect(config.accounts.artist)
          .allowHoldersOfProjects(
            config.projectTwo,
            config.genArt721Core.address,
            [config.genArt721Core.address],
            [config.projectZero]
          );
        // configure price per token to be zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectTwo,
            config.genArt721Core.address,
            0
          );
        await config.minter
          .connect(config.accounts.artist)
          .updateProjectCurrencyInfo(
            config.projectTwo,
            config.genArt721Core.address,
            "ERC20",
            config.ERC20.address
          );
        // allow purchase when intentionally configured price of zero
        await config.ERC20.connect(config.accounts.artist).approve(
          config.minter.address,
          0 // intentionally zero
        );
        await config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,uint256,address,address,uint256)"](
            config.projectTwo,
            config.genArt721Core.address,
            0,
            config.ERC20.address,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber()
          );
      });

      it("auto-configures if setProjectMaxInvocations is not called (fails correctly)", async function () {
        const config = await loadFixture(_beforeEach);
        // sync to core projext max maxInvocations
        await config.minter
          .connect(config.accounts.artist)
          .syncProjectMaxInvocationsToCore(
            config.projectOne,
            config.genArt721Core.address
          );
        // allow holders of project zero to mint on project one
        await config.minter
          .connect(config.accounts.artist)
          .allowHoldersOfProjects(
            config.projectOne,
            config.genArt721Core.address,
            [config.genArt721Core.address],
            [config.projectZero]
          );
        for (let i = 0; i < config.maxInvocations; i++) {
          await config.minter
            .connect(config.accounts.artist)
            ["purchase(uint256,address,uint256,address,address,uint256)"](
              config.projectOne,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.ERC20.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber()
            );
          // increment polyptych panel to allow repeat tokenId in next loop
          await config.minter
            .connect(config.accounts.artist)
            .incrementPolyptychProjectPanelId(
              config.projectOne,
              config.genArt721Core.address
            );
        }

        // since auto-configured, we should see the minter's revert message
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            ["purchase(uint256,address,uint256,address,address,uint256)"](
              config.projectOne,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.ERC20.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber()
            ),
          revertMessages.maximumInvocationsReached
        );
      });

      it("doesnt add too much gas if setProjectMaxInvocations is set", async function () {
        const config = await loadFixture(_beforeEach);
        // Try without setProjectMaxInvocations, store gas cost
        const minterType = await config.minter.minterType();
        const accountToTestWith =
          minterType.includes("V0") || minterType.includes("V1")
            ? config.accounts.deployer
            : config.accounts.artist;

        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        const tx = await config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,uint256,address,address,uint256)"](
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.ERC20.address,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber()
          );

        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        let gasCostNoMaxInvocations: any = receipt.effectiveGasPrice
          .mul(receipt.gasUsed)
          .toString();
        gasCostNoMaxInvocations = parseFloat(
          ethers.utils.formatUnits(gasCostNoMaxInvocations, "ether")
        );

        // Try with setProjectMaxInvocations, store gas cost
        await config.minter
          .connect(accountToTestWith)
          .syncProjectMaxInvocationsToCore(
            config.projectZero,
            config.genArt721Core.address
          );
        await config.minter
          .connect(config.accounts.artist)
          .incrementPolyptychProjectPanelId(
            config.projectZero,
            config.genArt721Core.address
          );
        const maxSetTx = await config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,uint256,address,address,uint256)"](
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.ERC20.address,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber()
          );
        const receipt2 = await ethers.provider.getTransactionReceipt(
          maxSetTx.hash
        );
        let gasCostMaxInvocations: any = receipt2.effectiveGasPrice
          .mul(receipt2.gasUsed)
          .toString();
        gasCostMaxInvocations = parseFloat(
          ethers.utils.formatUnits(gasCostMaxInvocations, "ether")
        );

        console.log(
          "Gas cost for a successful mint with setProjectMaxInvocations: ",
          gasCostMaxInvocations.toString(),
          "ETH"
        );
        console.log(
          "Gas cost for a successful mint without setProjectMaxInvocations: ",
          gasCostNoMaxInvocations.toString(),
          "ETH"
        );

        // Check that with setProjectMaxInvocations it's not too much moer expensive
        expect(gasCostMaxInvocations < (gasCostNoMaxInvocations * 110) / 100).to
          .be.true;
      });

      // @dev not straightforward to test reentrancy attack, because it requires an ERC20 with pre or post
      // transfer hooks, which we have not built a mock contract for. Instead, we test that the reentrancy
      // guard is working on other minting contracts, and assume that the implementation works here as well.
    });

    describe("purchaseTo", async function () {
      it("allows `purchaseTo` by default", async function () {
        const config = await loadFixture(_beforeEach);
        // configures prices on minter
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        await config.minter
          .connect(config.accounts.artist)
          [
            "purchaseTo(address,uint256,address,uint256,address,address,uint256)"
          ](
            config.accounts.artist.address,
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.ERC20.address,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber()
          );
      });
    });

    describe("Works for different valid delegation levels", async function () {
      ["delegateForAll", "delegateForContract", "delegateForToken"].forEach(
        (delegationType) => {
          describe(`purchaseTo with a VALID vault delegate after ${delegationType}`, async function () {
            beforeEach(async function () {
              const config = await loadFixture(_beforeEach);
              // artist account holds mint #0 for delegating
              config.artistVault = config.accounts.artist;
              config.userVault = config.accounts.additional2;
              // send and approve ERC20 tokens to avoid test failures
              await config.ERC20.connect(config.accounts.artist).transfer(
                config.accounts.user.address,
                ethers.utils.parseEther("10")
              );
              await config.ERC20.connect(config.accounts.user).approve(
                config.minter.address,
                ethers.utils.parseEther("10")
              );

              // delegate the vault to the user
              let delegationArgs;
              if (delegationType === "delegateForAll") {
                delegationArgs = [config.accounts.user.address, true];
              } else if (delegationType === "delegateForContract") {
                delegationArgs = [
                  config.accounts.user.address,
                  config.genArt721Core.address,
                  true,
                ];
              } else if (delegationType === "delegateForToken") {
                delegationArgs = [
                  config.accounts.user.address, // delegate
                  config.genArt721Core.address, // contract address
                  config.projectZeroTokenZero.toNumber(), // tokenID
                  true,
                ];
              }
              await config.delegationRegistry
                .connect(config.userVault)
                [delegationType](...delegationArgs);
              // pass config to tests in this describe block
              this.config = config;
            });

            it("does allow purchases", async function () {
              // get config from beforeEach
              const config = this.config;

              await config.minter
                .connect(config.accounts.artist)
                .updatePricePerTokenInWei(
                  config.projectZero,
                  config.genArt721Core.address,
                  config.pricePerTokenInWei
                );
              // // delegate the vault to the user
              await config.delegationRegistry
                .connect(config.accounts.artist)
                .delegateForToken(
                  config.accounts.user.address, // delegate
                  config.genArt721Core.address, // contract address
                  config.projectZeroTokenZero.toNumber(), // tokenID
                  true
                );

              // expect no revert
              await config.minter
                .connect(config.accounts.user)
                [
                  "purchaseTo(address,uint256,address,uint256,address,address,uint256,address)"
                ](
                  config.userVault.address,
                  config.projectZero,
                  config.genArt721Core.address,
                  config.pricePerTokenInWei,
                  config.ERC20.address,
                  config.genArt721Core.address,
                  config.projectZeroTokenZero.toNumber(),
                  config.accounts.artist.address //  the allowlisted vault address
                );
            });

            it("allows purchases to vault if msg.sender is allowlisted and no vault is provided", async function () {
              // get config from beforeEach
              const config = this.config;
              await config.minter
                .connect(config.accounts.artist)
                .updatePricePerTokenInWei(
                  config.projectZero,
                  config.genArt721Core.address,
                  config.pricePerTokenInWei
                );
              await config.minter
                .connect(config.accounts.artist)
                [
                  "purchaseTo(address,uint256,address,uint256,address,address,uint256)"
                ](
                  config.accounts.artist.address,
                  config.projectZero,
                  config.genArt721Core.address,
                  config.pricePerTokenInWei,
                  config.ERC20.address,
                  config.genArt721Core.address,
                  config.projectZeroTokenZero.toNumber()
                );
            });
          });
        }
      );
    });

    describe("purchaseTo with an INVALID vault delegate", async function () {
      beforeEach(async function () {
        const config = await loadFixture(_beforeEach);
        config.userVault = config.accounts.additional2;
        // send and approve ERC20 tokens to avoid test failures
        await config.ERC20.connect(config.accounts.artist).transfer(
          config.accounts.user.address,
          ethers.utils.parseEther("10")
        );
        await config.ERC20.connect(config.accounts.user).approve(
          config.minter.address,
          ethers.utils.parseEther("10")
        );
        // intentionally do not add any delegations
        // pass config to tests in this describe block
        this.config = config;
      });

      it("does NOT allow purchases", async function () {
        // get config from beforeEach
        const config = this.config;
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            [
              "purchaseTo(address,uint256,address,uint256,address,address,uint256,address)"
            ](
              config.userVault.address,
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.ERC20.address,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              config.userVault.address //  the address has NOT been delegated
            ),
          "Invalid delegate-vault pairing"
        );
      });
    });
  });
});
