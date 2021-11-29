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

describe("MinterFilterEvents", async function () {
  beforeEach(async function () {
    const [owner, newOwner, artist, additional, snowfro] =
      await ethers.getSigners();
    this.accounts = {
      owner: owner,
      newOwner: newOwner,
      artist: artist,
      additional: additional,
      snowfro: snowfro,
    };
    const randomizerFactory = await ethers.getContractFactory("Randomizer");
    this.randomizer = await randomizerFactory.deploy();
    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV2");
    this.token = await artblocksFactory
      .connect(snowfro)
      .deploy("Test Contract", "TEST", this.randomizer.address);
    const minterFilterFactory = await ethers.getContractFactory("MinterFilter");
    this.minterFilter = await minterFilterFactory.deploy(this.token.address);
    const minterFactory = await ethers.getContractFactory(
      "GenArt721FilteredMinter"
    );
    this.minter = await minterFactory.deploy(
      this.token.address,
      this.minterFilter.address
    );
  });

  describe("setDefaultMinter", async function () {
    it("emits an event", async function () {
      await expect(
        this.minterFilter
          .connect(this.accounts.snowfro)
          .setDefaultMinter(this.minter.address)
      )
        .to.emit(this.minterFilter, "DefaultMinterRegistered")
        .withArgs(this.minter.address);
    });
  });

  describe("resetMinterForProjectToDefault", async function () {
    it("emits an event", async function () {
      await expect(
        this.minterFilter
          .connect(this.accounts.snowfro)
          .resetMinterForProjectToDefault(0)
      )
        .to.emit(this.minterFilter, "ProjectMinterRegistered")
        .withArgs(0, ethers.constants.AddressZero);
    });
  });

  describe("setMinterForProject", async function () {
    it("emits an event", async function () {
      await expect(
        this.minterFilter
          .connect(this.accounts.snowfro)
          .setMinterForProject(0, this.minter.address)
      )
        .to.emit(this.minterFilter, "ProjectMinterRegistered")
        .withArgs(0, this.minter.address);

      await expect(
        this.minterFilter
          .connect(this.accounts.snowfro)
          .setMinterForProject(1, this.minter.address)
      )
        .to.emit(this.minterFilter, "ProjectMinterRegistered")
        .withArgs(1, this.minter.address);
    });
  });
});
