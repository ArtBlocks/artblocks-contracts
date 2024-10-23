import helpers = require("@nomicfoundation/hardhat-network-helpers");
import { expect } from "chai";
import { ethers } from "hardhat";

const FORK_URL = process.env.MAINNET_JSON_RPC_PROVIDER_URL;
const FORK_BLOCK_NUMBER = 21024119;

describe("test forking mainnet", async function () {
  before(async function () {
    // fork mainnet
    await resetFork();
  });

  after(async function () {
    // reset fork to not use a fork
    await helpers.reset();
  });

  // helper function to reset fork
  async function resetFork() {
    await helpers.reset(FORK_URL, FORK_BLOCK_NUMBER);
  }

  // public variable Views
  describe("coreType", async function () {
    it("should return expected view result during fork", async function () {
      // call core contract to verify fork is working
      const coreAddress = "0xAB0000000000aa06f89B268D604a9c1C41524Ac6";
      const core = await ethers.getContractAt(
        "GenArt721CoreV3_Engine",
        coreAddress
      );
      const coreType = await core.coreType();
      expect(coreType).to.equal("GenArt721CoreV3_Engine");
    });
  });

  // impersonate account for write operations
  it("should impersonate account for write operations", async function () {
    // impersonate account
    const artistAddress = "0x2A98FCD155c9Da4A28BdB32acc935836C233882A";
    const impersonatedArtist =
      await ethers.getImpersonatedSigner(artistAddress);
    // attach to contract
    const coreAddress = "0x99a9B7c1116f9ceEB1652de04d5969CcE509B069";
    const core = await ethers.getContractAt(
      "GenArt721CoreV3_Engine",
      coreAddress
    );
    // get current project name
    const initialProjectDetails = await core.projectDetails(435);
    // call update project name
    const newProjectWebsite = "super cool project website";
    expect(newProjectWebsite).to.not.equal(initialProjectDetails.website); // verify change
    await core
      .connect(impersonatedArtist)
      .updateProjectWebsite(435, newProjectWebsite);
    // verify project name was updated
    const updatedProjectDetails = await core.projectDetails(435);
    expect(updatedProjectDetails.website).to.equal(newProjectWebsite);
  });
});
