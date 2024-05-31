import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
} from "../../util/common";

const runForEach = [
  {
    core: "GenArt721CoreV3",
    coreFirstProjectNumber: 0,
    minterFilter: "MinterFilterV1",
    minter: "MinterSetPriceV2",
  },
];

runForEach.forEach((params) => {
  describe(`Minter Suite Integration - Core: ${params.core}`, async function () {
    async function _beforeEach() {
      let config: T_Config = {
        accounts: await getAccounts(),
      };
      config = await assignDefaultConstants(
        config,
        params.coreFirstProjectNumber
      ); // config.config.projectZero = 3 on V1 core);
      config.higherPricePerTokenInWei = config.pricePerTokenInWei.add(
        ethers.utils.parseEther("0.1")
      );
      // deploy and configure minter filter and minter
      ({
        genArt721Core: config.genArt721Core,
        minterFilter: config.minterFilter,
        randomizer: config.randomizer,
      } = await deployCoreWithMinterFilter(
        config,
        params.core,
        params.minterFilter
      ));

      config.minter = await deployAndGet(config, params.minter, [
        config.genArt721Core.address,
        config.minterFilter.address,
      ]);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      // add projects config.projectZero and config.projectOne
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
        .updateProjectMaxInvocations(config.projectZero, 15);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, 15);

      config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectOne);

      // set project minters and prices
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.pricePerTokenInWei
        );
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectOne, config.pricePerTokenInWei);
      await config.minterFilter
        .connect(config.accounts.artist)
        .setMinterForProject(config.projectZero, config.minter.address);
      await config.minterFilter
        .connect(config.accounts.artist)
        .setMinterForProject(config.projectOne, config.minter.address);
      return config;
    }

    describe("purchase", async function () {
      it("does nothing if setProjectMaxInvocations is not called (fails correctly)", async function () {
        const config = await loadFixture(_beforeEach);
        for (let i = 0; i < 15; i++) {
          await config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, {
              value: config.pricePerTokenInWei,
            });
        }

        const userBalance = await config.accounts.user.getBalance();
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, {
              value: config.pricePerTokenInWei,
            }),
          "Must not exceed max invocations"
        );
      });

      it("doesnt add too much gas if setProjectMaxInvocations is set", async function () {
        const config = await loadFixture(_beforeEach);
        const tx = await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          });

        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        let gasCostNoMaxInvocations: any = receipt.effectiveGasPrice
          .mul(receipt.gasUsed)
          .toString();
        gasCostNoMaxInvocations = parseFloat(
          ethers.utils.formatUnits(gasCostNoMaxInvocations, "ether")
        );

        // Try with setProjectMaxInvocations, store gas cost
        await config.minter
          .connect(config.accounts.deployer)
          .setProjectMaxInvocations(config.projectOne);

        const maxSetTx = await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectOne, {
            value: config.pricePerTokenInWei,
          });
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
          "Gas cost for a mint with setProjectMaxInvocations: ",
          gasCostMaxInvocations.toString(),
          "ETH"
        );
        console.log(
          "Gas cost for a mint without setProjectMaxInvocations: ",
          gasCostNoMaxInvocations.toString(),
          "ETH"
        );

        // Check that with setProjectMaxInvocations it's cheaper or not too much more expensive
        expect(gasCostMaxInvocations < (gasCostNoMaxInvocations * 110) / 100).to
          .be.true;
      });
    });
  });
});
