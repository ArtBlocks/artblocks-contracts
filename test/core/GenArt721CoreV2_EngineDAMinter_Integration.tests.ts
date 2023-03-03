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

import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../util/constants";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../util/common";
import { GenArt721MinterV1V2PRTNR_Common } from "./GenArt721CoreV1V2PRTNR.common";

/**
 * These tests are intended to check integration of the V2-engine compatible DA minter
 * with the V2_PBAB core contract.
 * Some basic core tests, and basic functional tests to ensure purchase
 * does in fact mint tokens to purchaser.
 */
describe("GenArt721CoreV2_EngineDAMinter_Integration", async function () {
  async function _beforeEach() {
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);
    // deploy and configure core, randomizer, and minter
    config.randomizer = await deployAndGet(config, "BasicRandomizer", []);
    // V2_PBAB need additional arg for starting project ID
    config.genArt721Core = await deployAndGet(config, "GenArt721CoreV2_PBAB", [
      config.name,
      config.symbol,
      config.randomizer.address,
      0,
    ]);
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
    // deploy + add minter
    config.minter = await deployAndGet(config, "GenArt721MinterDAExp_PBAB", [
      config.genArt721Core.address,
    ]);
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .addMintWhitelisted(config.minter.address);
    // configure minter
    config.defaultHalfLife = ONE_HOUR / 2;
    config.auctionStartTimeOffset = ONE_HOUR;
    if (!config.startTime) {
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp;
    }
    config.startTime = config.startTime + ONE_DAY;
    await ethers.provider.send("evm_mine", [config.startTime - ONE_MINUTE]);
    await config.minter
      .connect(config.accounts.deployer)
      .resetAuctionDetails(config.projectZero);
    // perform tests in fixed-price-mode
    await config.minter
      .connect(config.accounts.artist)
      .setAuctionDetails(
        config.projectZero,
        config.startTime + config.auctionStartTimeOffset,
        config.defaultHalfLife,
        config.pricePerTokenInWei,
        config.pricePerTokenInWei
      );
    await ethers.provider.send("evm_mine", [
      config.startTime + config.auctionStartTimeOffset,
    ]);
    return config;
  }

  describe("common tests", async function () {
    await GenArt721MinterV1V2PRTNR_Common(_beforeEach);
  });

  describe("core allowlisted ACL checks", function () {
    const expectedErrorMessage = "Only Core allowlisted";
    it("setAllowablePriceDecayHalfLifeRangeSeconds is gated", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .setAllowablePriceDecayHalfLifeRangeSeconds(60, 600),
        expectedErrorMessage
      );
    });
    it("resetAuctionDetails is gated", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .resetAuctionDetails(config.projectZero),
        expectedErrorMessage
      );
    });
    it("setOwnerAddress is gated", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .setOwnerAddress(config.accounts.deployer2.address),
        expectedErrorMessage
      );
    });
    it("setOwnerPercentage is gated", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .setOwnerPercentage(10),
        expectedErrorMessage
      );
    });
  });

  describe("valid project ID checks", function () {
    const expectedErrorMessage = "Only existing projects";
    it("resetAuctionDetails is gated", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(config.projectOne),
        expectedErrorMessage
      );
    });
    it("setAuctionDetails is gated", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter.connect(config.accounts.artist).setAuctionDetails(
          config.projectOne,
          0, // not relevant for config test, as it is checked later
          0, // not relevant for config test, as it is checked later
          0, // not relevant for config test, as it is checked later
          0 // not relevant for config test, as it is checked later
        ),
        expectedErrorMessage
      );
    });
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
        "GenArt721CoreV2_PBAB",
        [config.name, config.symbol, config.randomizer.address, 365]
      );
      expect(await differentGenArt721Core.nextProjectId()).to.be.equal(365);
    });
  });

  describe("purchase payments and gas", async function () {
    it("can create a token then funds distributed (no additional payee) [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.deployer)
        .setOwnerAddress(config.accounts.deployer2.address);
      await config.minter
        .connect(config.accounts.deployer)
        .setOwnerPercentage(10 /* 10% */);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);

      const artistBalance = await config.accounts.artist.getBalance();
      const ownerBalance = await config.accounts.user.getBalance();
      const deployerBalance = await config.accounts.deployer.getBalance();
      const partnerBalance = await config.accounts.deployer2.getBalance();

      // pricePerTokenInWei setup above to be 1 ETH
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
          config.projectZeroTokenZero
        );

      config.projectZeroInfo = await config.genArt721Core.projectTokenInfo(
        config.projectZero
      );
      expect(config.projectZeroInfo.invocations).to.equal("1");
      expect(
        (await config.accounts.deployer.getBalance()).sub(deployerBalance)
      ).to.equal(ethers.utils.parseEther("0.1"));
      expect(
        (await config.accounts.deployer2.getBalance()).sub(partnerBalance)
      ).to.equal(ethers.utils.parseEther("0.09"));
      expect(
        (await config.accounts.artist.getBalance()).sub(artistBalance)
      ).to.equal(ethers.utils.parseEther("0.81"));
      expect(
        (await config.accounts.user.getBalance()).sub(ownerBalance)
      ).to.equal(ethers.utils.parseEther("1.0191029").mul("-1")); // spent 1 ETH
    });

    it("can create a token then funds distributed (with additional payee) [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.deployer)
        .setOwnerAddress(config.accounts.deployer2.address);
      await config.minter
        .connect(config.accounts.deployer)
        .setOwnerPercentage(10 /* 10% */);

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

      const additionalBalance = await config.accounts.additional.getBalance();
      const artistBalance = await config.accounts.artist.getBalance();
      const ownerBalance = await config.accounts.user.getBalance();
      const deployerBalance = await config.accounts.deployer.getBalance();
      const partnerBalance = await config.accounts.deployer2.getBalance();

      // pricePerTokenInWei setup above to be 1 ETH
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
          config.projectZeroTokenZero
        );

      config.projectZeroInfo = await config.genArt721Core.projectTokenInfo(
        config.projectZero
      );
      expect(config.projectZeroInfo.invocations).to.equal("1");
      expect(
        (await config.accounts.deployer.getBalance()).sub(deployerBalance)
      ).to.equal(ethers.utils.parseEther("0.1"));
      expect(
        (await config.accounts.deployer2.getBalance()).sub(partnerBalance)
      ).to.equal(ethers.utils.parseEther("0.09"));
      expect(
        (await config.accounts.additional.getBalance()).sub(additionalBalance)
      ).to.equal(ethers.utils.parseEther("0.081"));
      expect(
        (await config.accounts.artist.getBalance()).sub(artistBalance)
      ).to.equal(ethers.utils.parseEther("0.729"));
      expect(
        (await config.accounts.user.getBalance()).sub(ownerBalance)
      ).to.equal(ethers.utils.parseEther("1.0203819").mul("-1")); // spent 1 ETH
    });

    it("can create a token then funds distributed (with additional payee getting 100%) [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.deployer)
        .setOwnerAddress(config.accounts.deployer2.address);
      await config.minter
        .connect(config.accounts.deployer)
        .setOwnerPercentage(10 /* 10% */);

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

      const additionalBalance = await config.accounts.additional.getBalance();
      const artistBalance = await config.accounts.artist.getBalance();
      const ownerBalance = await config.accounts.user.getBalance();
      const deployerBalance = await config.accounts.deployer.getBalance();
      const partnerBalance = await config.accounts.deployer2.getBalance();

      // pricePerTokenInWei setup above to be 1 ETH
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
          config.projectZeroTokenZero
        );

      const projectZeroInfo = await config.genArt721Core.projectTokenInfo(
        config.projectZero
      );
      expect(projectZeroInfo.invocations).to.equal("1");
      expect(
        (await config.accounts.deployer.getBalance()).sub(deployerBalance)
      ).to.equal(ethers.utils.parseEther("0.1"));
      expect(
        (await config.accounts.deployer2.getBalance()).sub(partnerBalance)
      ).to.equal(ethers.utils.parseEther("0.09"));
      expect(
        (await config.accounts.additional.getBalance()).sub(additionalBalance)
      ).to.equal(ethers.utils.parseEther("0.81"));
      expect(
        (await config.accounts.artist.getBalance()).sub(artistBalance)
      ).to.equal(ethers.utils.parseEther("0"));
      expect(
        (await config.accounts.user.getBalance()).sub(ownerBalance)
      ).to.equal(ethers.utils.parseEther("1.0191249").mul("-1")); // spent 1 ETH
    });
  });
});
