import helpers = require("@nomicfoundation/hardhat-network-helpers");
import { expect } from "chai";
import { ethers } from "hardhat";

import { InjectBlockHeightAndNumOwnedProjectTokens__factory } from "../../../../../scripts/contracts/factories/contracts/web3call/augment-hooks/InjectBlockHeightAndNumOwnedProjectTokens.sol/InjectBlockHeightAndNumOwnedProjectTokens__factory";

import { constants } from "ethers";

// @dev using fork testing for InjectBlockHeightAndNumOwnedProjectTokens hook
// checking ownership on reference project Forecast
// may remove/archive in the future to avoid long term maintenance of temporary hook contract

const FORK_URL = process.env.MAINNET_JSON_RPC_PROVIDER_URL;
const FORK_BLOCK_NUMBER = 23275000;

const PMPV0_ADDRESS = "0x00000000A78E278b2d2e2935FaeBe19ee9F1FF14";

// reference project is Forecast
const FORECAST_CONTRACT_ADDRESS = "0x99a9b7c1116f9ceeb1652de04d5969cce509b069";
const FORECAST_PROJECT_ID = 470;
const NUM_FORECAST_TOKENS = 365;

describe("test forking mainnet - InjectBlockHeightAndNumOwnedProjectTokens", async function () {
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
  describe("fork tests - InjectBlockHeightAndNumOwnedProjectTokens", async function () {
    it("passes all tested behaviors", async function () {
      // impersonate account (fork block admin of AB Studio 76)
      const artistAddress = "0x2574c77a694700b7baB562fefeB9Ce93DB5A097A";
      const impersonatedArtist =
        await ethers.getImpersonatedSigner(artistAddress);
      await ethers.provider.send("hardhat_setBalance", [
        artistAddress,
        "0x8AC7230489E80000", // 10 ETH
      ]);
      // deploy hook
      const hookFactory =
        new InjectBlockHeightAndNumOwnedProjectTokens__factory(
          impersonatedArtist
        );
      const hook = await hookFactory.deploy(
        FORECAST_CONTRACT_ADDRESS,
        FORECAST_PROJECT_ID,
        NUM_FORECAST_TOKENS
      );
      await hook.deployed();

      // add new project to existing flex core, minimal setup
      const coreAddress = "0xaa00B2b2dB36B8F8004A9AA96F0012005D92B300";
      const core = await ethers.getContractAt(
        "GenArt721CoreV3_Engine_Flex",
        coreAddress
      );
      const projectId = await core.nextProjectId();
      await core.connect(impersonatedArtist).addProject("LIFT", artistAddress);
      await core
        .connect(impersonatedArtist)
        .addProjectAssetDependencyOnChainAtAddress(projectId, PMPV0_ADDRESS);

      // configure pmp for project, including hooks
      const pmpV0 = await ethers.getContractAt("PMPV0", PMPV0_ADDRESS);
      await pmpV0.connect(impersonatedArtist).configureProjectHooks(
        coreAddress,
        projectId,
        constants.AddressZero, // no post config hook
        hook.address
      );

      // mint token 0
      await core
        .connect(impersonatedArtist)
        .updateMinterContract(artistAddress);
      await core
        .connect(impersonatedArtist)
        .mint_Ecf(artistAddress, projectId, artistAddress);
      const token0 = projectId.mul(1_000_000).add(0);

      // get token params - confirm no postparams returned prior to configure
      // also get gas used to get token params
      const postParams0 = await pmpV0.getTokenParams(coreAddress, token0);

      // expect block height and no owned forecast
      expect(postParams0.length).to.equal(2);
      expect(postParams0[0].key).to.equal("BlockNumber");
      // block number should be a number greater than 22991348
      expect(parseInt(postParams0[0].value, 10)).to.be.greaterThan(
        FORK_BLOCK_NUMBER
      );
      expect(postParams0[1].key).to.equal("NumOwnedReferenceTokens");
      expect(postParams0[1].value).to.equal("0"); // this wallet owns no forecast tokens

      const gasUsed = await pmpV0.estimateGas.getTokenParams(
        coreAddress,
        token0
      );
      console.log("gas used to get token params:", gasUsed.toString());

      // mint token 1 to wallet that owns 1 forecast token
      const collectorAddress0 = "0xaa3d23e1f0470429c594cfe8045dcc97daa751bf";
      await core
        .connect(impersonatedArtist)
        .mint_Ecf(collectorAddress0, projectId, artistAddress);
      const token1 = projectId.mul(1_000_000).add(1);

      // get token params - confirm no postparams returned prior to configure
      // also get gas used to get token params
      const postParams1 = await pmpV0.getTokenParams(coreAddress, token1);

      // expect block height and 2 owned forecast
      expect(postParams1.length).to.equal(2);
      expect(postParams1[0].key).to.equal("BlockNumber");
      expect(parseInt(postParams1[0].value, 10)).to.be.greaterThan(
        FORK_BLOCK_NUMBER
      );
      expect(postParams1[1].key).to.equal("NumOwnedReferenceTokens");
      expect(postParams1[1].value).to.equal("2"); // this wallet owns 2 forecast tokens

      const gasUsed1 = await pmpV0.estimateGas.getTokenParams(
        coreAddress,
        token1
      );
      console.log(
        "gas used to get token params with 2 owned forecast:",
        gasUsed1.toString()
      );
    });
  });
});
