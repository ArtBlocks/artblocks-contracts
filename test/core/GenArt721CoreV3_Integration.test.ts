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

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../util/common";

/**
 * NOTE: V3 core does not currently have a compatible minter.
 * Tests/operations involving minter currently commented out in this file -
 * to be updated when developing a minter for V3 core.
 */
describe("GenArt721CoreV3", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);

    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();
    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV3");
    this.genArt721Core = await artblocksFactory
      .connect(this.accounts.deployer)
      .deploy(this.name, this.symbol, this.randomizer.address);

    // TBD - V3 DOES NOT CURRENTLY HAVE A WORKING MINTER

    // add project
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("name", this.accounts.artist.address);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);
  });

  describe("has whitelisted owner", function () {
    it("has an admin", async function () {
      expect(await this.genArt721Core.artblocksAddress()).to.be.equal(
        this.accounts.deployer.address
      );
    });

    it("has an admin", async function () {
      expect(await this.genArt721Core.admin()).to.be.equal(
        this.accounts.deployer.address
      );
    });

    describe("has whitelisted owner", function () {
      it("has an admin", async function () {
        expect(await this.genArt721Core.artblocksAddress()).to.be.equal(
          this.accounts.deployer.address
        );
      });

      it("has an admin", async function () {
        expect(await this.genArt721Core.admin()).to.be.equal(
          this.accounts.deployer.address
        );
      });

      it("has a whitelisted account", async function () {
        expect(
          await this.genArt721Core.isWhitelisted(this.accounts.deployer.address)
        ).to.be.equal(true);
      });
    });

    describe("reverts on project locked", async function () {
      it("reverts if try to modify script", async function () {
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .toggleProjectIsLocked(this.projectZero);
        await expectRevert(
          this.genArt721Core
            .connect(this.accounts.artist)
            .updateProjectScriptJSON(this.projectZero, "lorem ipsum"),
          "Only if unlocked"
        );
      });
    });
  });

  describe("coreVersion", function () {
    it("returns expected value", async function () {
      const coreVersion = await this.genArt721Core
        .connect(this.accounts.deployer)
        .coreVersion();
      expect(coreVersion).to.be.equal("v3.0.0");
    });
  });

  describe("projectInfo", function () {
    it("returns expected deprecated values", async function () {
      const tokenInfo = await this.genArt721Core
        .connect(this.accounts.deployer)
        .projectInfo(0);
      expect(tokenInfo.invocations).to.be.equal(0);
      expect(tokenInfo.maxInvocations).to.be.equal(15);
    });
  });

  describe("owner", function () {
    it("returns expected owner", async function () {
      const ownerAddress = await this.genArt721Core
        .connect(this.accounts.deployer)
        .owner();
      expect(ownerAddress).to.be.equal(this.accounts.deployer.address);
    });
  });

  describe("admin", function () {
    it("returns expected backwards-compatible admin (owner)", async function () {
      const adminAddress = await this.genArt721Core
        .connect(this.accounts.deployer)
        .owner();
      expect(adminAddress).to.be.equal(this.accounts.deployer.address);
    });
  });
});
