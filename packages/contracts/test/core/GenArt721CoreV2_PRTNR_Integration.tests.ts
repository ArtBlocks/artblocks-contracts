import { Coder } from "@ethersproject/abi/lib/coders/abstract-coder";
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
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../util/common";
import { GenArt721MinterV1V2PRTNR_Common } from "./GenArt721CoreV1V2PRTNR.common";
import { BigNumber } from "ethers";

/**
 * These tests are intended to check integration of the MinterFilter suite with
 * the V2 PRTNR core contract.
 * Some basic core tests, and basic functional tests to ensure purchase
 * does in fact mint tokens to purchaser.
 */
describe("GenArt721CoreV2_PRTNR_Integration", async function () {
  async function _beforeEach() {
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);
    // deploy and configure minter filter and minter
    ({
      genArt721Core: config.genArt721Core,
      minterFilter: config.minterFilter,
      randomizer: config.randomizer,
    } = await deployCoreWithMinterFilter(
      config,
      "GenArt721CoreV2_PRTNR",
      "MinterFilterV0"
    ));
    config.minter = await deployAndGet(config, "MinterSetPriceV1", [
      config.genArt721Core.address,
      config.minterFilter.address,
    ]);
    await config.minterFilter
      .connect(config.accounts.deployer)
      .addApprovedMinter(config.minter.address);
    // add project
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .addProject("name", config.accounts.artist.address, 0);
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .toggleProjectIsActive(config.projectZero);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);
    // set project's minter and price
    await config.minter
      .connect(config.accounts.artist)
      .updatePricePerTokenInWei(config.projectZero, config.pricePerTokenInWei);
    await config.minterFilter
      .connect(config.accounts.artist)
      .setMinterForProject(config.projectZero, config.minter.address);
    // get project's info
    config.projectZeroInfo = await config.genArt721Core.projectTokenInfo(
      config.projectZero
    );
    return config;
  }

  describe("common tests", async function () {
    await GenArt721MinterV1V2PRTNR_Common(_beforeEach);
  });

  describe("initial nextProjectId", function () {
    it("returns zero when initialized to zero nextProjectId", async function () {
      const config = await loadFixture(_beforeEach);
      // one project has already been added, so should be one
      expect(await config.genArt721Core.nextProjectId()).to.be.equal(1);
    });

    it("returns >0 when initialized to >0 nextProjectId", async function () {
      const config = await loadFixture(_beforeEach);
      const differentGenArt721Core = await deployAndGet(
        config,
        "GenArt721CoreV2_PRTNR",
        [config.name, config.symbol, config.randomizer.address, 365]
      );
      expect(await differentGenArt721Core.nextProjectId()).to.be.equal(365);
    });
  });

  describe("purchase payments and gas", async function () {
    it("can create a token then funds distributed (no additional payee) [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      const artistBalance = await config.accounts.artist.getBalance();
      const ownerBalance = await config.accounts.user.getBalance();
      const deployerBalance = await config.accounts.deployer.getBalance();

      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);

      // pricePerTokenInWei setup above to be 1 ETH
      const targetToken = BigNumber.from(
        config.projectZeroTokenZero.toString()
      );
      await expect(
        config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          })
      )
        .to.emit(config.genArt721Core, "Transfer")
        .withArgs(
          constants.ZERO_ADDRESS,
          config.accounts.user.address,
          targetToken
        );

      config.projectZeroInfo = await config.genArt721Core.projectTokenInfo(
        config.projectZero
      );
      expect(config.projectZeroInfo.invocations).to.equal("1");
      expect(
        (await config.accounts.deployer.getBalance()).sub(deployerBalance)
      ).to.equal(ethers.utils.parseEther("0.1"));
      expect(
        (await config.accounts.artist.getBalance()).sub(artistBalance)
      ).to.equal(ethers.utils.parseEther("0.8971063"));
      expect(
        (await config.accounts.user.getBalance()).sub(ownerBalance)
      ).to.equal(ethers.utils.parseEther("1.0185247").mul("-1")); // spent 1 ETH
    });

    it("can create a token then funds distributed (with additional payee) [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      const additionalBalance = await config.accounts.additional.getBalance();
      const artistBalance = await config.accounts.artist.getBalance();
      const ownerBalance = await config.accounts.user.getBalance();
      const deployerBalance = await config.accounts.deployer.getBalance();

      const additionalPayeePercentage = 10;
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectAdditionalPayeeInfo(
          config.projectZero,
          config.accounts.additional.address,
          additionalPayeePercentage
        );
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);

      // pricePerTokenInWei setup above to be 1 ETH
      const targetToken = BigNumber.from(
        config.projectZeroTokenZero.toString()
      );
      await expect(
        config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          })
      )
        .to.emit(config.genArt721Core, "Transfer")
        .withArgs(
          constants.ZERO_ADDRESS,
          config.accounts.user.address,
          targetToken
        );

      config.projectZeroInfo = await config.genArt721Core.projectTokenInfo(
        config.projectZero
      );
      expect(config.projectZeroInfo.invocations).to.equal("1");

      expect(
        (await config.accounts.deployer.getBalance()).sub(deployerBalance)
      ).to.equal(ethers.utils.parseEther("0.1"));
      expect(
        (await config.accounts.additional.getBalance()).sub(additionalBalance)
      ).to.equal(ethers.utils.parseEther("0.09"));
      expect(
        (await config.accounts.user.getBalance()).sub(ownerBalance)
      ).to.equal(ethers.utils.parseEther("1.0199105").mul("-1")); // spent 1 ETH
      expect(
        (await config.accounts.artist.getBalance()).sub(artistBalance)
      ).to.equal(ethers.utils.parseEther("0.8002156"));
    });

    it("can create a token then funds distributed (with additional payee getting 100%) [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      const additionalBalance = await config.accounts.additional.getBalance();
      const artistBalance = await config.accounts.artist.getBalance();
      const ownerBalance = await config.accounts.user.getBalance();
      const deployerBalance = await config.accounts.deployer.getBalance();

      const additionalPayeePercentage = 100;
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectAdditionalPayeeInfo(
          config.projectZero,
          config.accounts.additional.address,
          additionalPayeePercentage
        );
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);

      // pricePerTokenInWei setup above to be 1 ETH
      const targetToken = BigNumber.from(
        config.projectZeroTokenZero.toString()
      );
      await expect(
        config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          })
      )
        .to.emit(config.genArt721Core, "Transfer")
        .withArgs(
          constants.ZERO_ADDRESS,
          config.accounts.user.address,
          targetToken
        );

      const projectZeroInfo = await config.genArt721Core.projectTokenInfo(
        config.projectZero
      );
      expect(projectZeroInfo.invocations).to.equal("1");

      expect(
        (await config.accounts.deployer.getBalance()).sub(deployerBalance)
      ).to.equal(ethers.utils.parseEther("0.1"));
      expect(
        (await config.accounts.additional.getBalance()).sub(additionalBalance)
      ).to.equal(ethers.utils.parseEther("0.9"));
      expect(
        (await config.accounts.user.getBalance()).sub(ownerBalance)
      ).to.equal(ethers.utils.parseEther("1.0186381").mul("-1")); // spent 1 ETH
      expect(
        (await config.accounts.artist.getBalance()).sub(artistBalance)
      ).to.equal(ethers.utils.parseEther("0.0097844").mul("-1"));
    });
  });
});
