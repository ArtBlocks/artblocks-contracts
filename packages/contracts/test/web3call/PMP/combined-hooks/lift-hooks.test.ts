import helpers = require("@nomicfoundation/hardhat-network-helpers");
import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { LiftHooks__factory } from "../../../../scripts/contracts/factories/contracts/web3call/combined-hooks/LiftHooks.sol/LiftHooks__factory";
import {
  getPMPInputConfig,
  getPMPInput,
  PMP_AUTH_ENUM,
  PMP_PARAM_TYPE_ENUM,
} from "../pmpTestUtils";
import { constants } from "ethers";
import { revertMessages } from "./constants";

// @dev using fork testing for LIFT hooks
// may remove/archive in the future to avoid long term maintenance of temporary hook contract

const FORK_URL = process.env.MAINNET_JSON_RPC_PROVIDER_URL;
const FORK_BLOCK_NUMBER = 22991348;

const PMPV0_ADDRESS = "0x00000000A78E278b2d2e2935FaeBe19ee9F1FF14";

const SQUIGGLE_GENART_V0_ADDRESS = "0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a";
const RELIC_CONTRACT_ADDRESS = "0x9b917686DD68B68A780cB8Bf70aF46617A7b3f80";

const liftPmp0 = getPMPInputConfig(
  "Featured_Squiggle",
  PMP_AUTH_ENUM.TokenOwner,
  PMP_PARAM_TYPE_ENUM.Uint256Range,
  0,
  constants.AddressZero,
  [],
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0x000000000000000000000000000000000000000000000000000000000000270F"
);
const liftPmp1 = getPMPInputConfig(
  "PFP_Mode",
  PMP_AUTH_ENUM.TokenOwner,
  PMP_PARAM_TYPE_ENUM.Bool,
  0,
  constants.AddressZero,
  [],
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000000000000000000000000000000"
);

const pmpInputPFPModeTrue = getPMPInput(
  "PFP_Mode",
  PMP_PARAM_TYPE_ENUM.Bool,
  "0x0000000000000000000000000000000000000000000000000000000000000001",
  false,
  ""
);
const pmpInputSquiggle9209 = getPMPInput(
  "Featured_Squiggle",
  PMP_PARAM_TYPE_ENUM.Uint256Range,
  "0x00000000000000000000000000000000000000000000000000000000000023F9",
  false,
  ""
);
const pmpInputSquiggle9999 = getPMPInput(
  "Featured_Squiggle",
  PMP_PARAM_TYPE_ENUM.Uint256Range,
  "0x000000000000000000000000000000000000000000000000000000000000270F",
  false,
  ""
);
const pmpInputSquiggle1981 = getPMPInput(
  "Featured_Squiggle",
  PMP_PARAM_TYPE_ENUM.Uint256Range,
  "0x00000000000000000000000000000000000000000000000000000000000007BD",
  false,
  ""
);

describe("test forking mainnet - LiftHooks", async function () {
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
  describe("fork tests - LiftHooks", async function () {
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
      const hookFactory = new LiftHooks__factory(impersonatedArtist);
      const hook = await hookFactory.deploy(
        SQUIGGLE_GENART_V0_ADDRESS,
        RELIC_CONTRACT_ADDRESS
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
      await pmpV0
        .connect(impersonatedArtist)
        .configureProject(coreAddress, projectId, [liftPmp0, liftPmp1]);
      await pmpV0
        .connect(impersonatedArtist)
        .configureProjectHooks(
          coreAddress,
          projectId,
          hook.address,
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
      const postParams0 = await pmpV0.getTokenParams(coreAddress, token0);
      expect(postParams0.length).to.equal(0);

      // assign only non-squiggle pmp - confirm only non-squiggle pmp params returned
      await pmpV0
        .connect(impersonatedArtist)
        .configureTokenParams(coreAddress, token0, [pmpInputPFPModeTrue]);
      const postParams1 = await pmpV0.getTokenParams(coreAddress, token0);
      expect(postParams1.length).to.equal(1);
      expect(postParams1[0].key).to.equal("PFP_Mode");
      expect(postParams1[0].value).to.equal("true");

      // fail auth check while assigning unowned squiggle token id
      await expectRevert(
        pmpV0
          .connect(impersonatedArtist)
          .configureTokenParams(coreAddress, token0, [pmpInputSquiggle9209]),
        revertMessages.failAuth
      );
      const postParams2 = await pmpV0.getTokenParams(coreAddress, token0);
      expect(postParams2.length).to.equal(1);
      expect(postParams2[0].key).to.equal("PFP_Mode");
      expect(postParams2[0].value).to.equal("true");

      // pass auth check while assigning owned squiggle token id - confirm all pmp params returned (squiggle + hash)
      const squiggleTokenId = 9209;
      const squiggleOwner = "0x8d19C87C37c9f1512BF0436012453e4e7C2C5a2c";
      const impersonatedSquiggleOwner =
        await ethers.getImpersonatedSigner(squiggleOwner);
      await core
        .connect(impersonatedArtist)
        .mint_Ecf(squiggleOwner, projectId, artistAddress);
      const token1 = projectId.mul(1_000_000).add(1);
      await pmpV0
        .connect(impersonatedSquiggleOwner)
        .configureTokenParams(coreAddress, token1, [pmpInputSquiggle9209]);
      const postParams3 = await pmpV0.getTokenParams(coreAddress, token1);
      expect(postParams3.length).to.equal(2);
      expect(postParams3[0].key).to.equal("Featured_Squiggle");
      expect(postParams3[0].value).to.equal(squiggleTokenId.toString());
      expect(postParams3[1].key).to.equal("Featured_Squiggle_Hash");
      expect(postParams3[1].value).to.equal(
        "0x56461a01b69faeffeaa342cd081d753c0b98f9863f60600541a391a093a17275"
      );

      // properly merges squiggle + pfp mode params
      await pmpV0
        .connect(impersonatedSquiggleOwner)
        .configureTokenParams(coreAddress, token1, [pmpInputPFPModeTrue]);
      const postParams4 = await pmpV0.getTokenParams(coreAddress, token1);
      expect(postParams4.length).to.equal(3);
      expect(postParams4[0].key).to.equal("PFP_Mode");
      expect(postParams4[0].value).to.equal("true");
      expect(postParams4[1].key).to.equal("Featured_Squiggle");
      expect(postParams4[1].value).to.equal(squiggleTokenId.toString());
      expect(postParams4[2].key).to.equal("Featured_Squiggle_Hash");
      expect(postParams4[2].value).to.equal(
        "0x56461a01b69faeffeaa342cd081d753c0b98f9863f60600541a391a093a17275"
      );

      // fail auth check while assigning squiggle 9999 (relic) from unsigned address
      await expectRevert(
        pmpV0
          .connect(impersonatedArtist)
          .configureTokenParams(coreAddress, token0, [pmpInputSquiggle9999]),
        revertMessages.failAuth
      );
      const postParams5 = await pmpV0.getTokenParams(coreAddress, token0);
      expect(postParams5.length).to.equal(1);
      expect(postParams5[0].key).to.equal("PFP_Mode");
      expect(postParams5[0].value).to.equal("true");

      // pass auth check while assigning squiggle 9999 (relic) from signed address
      const relicSignerAddress = "0x816B2D8daD051716A58271d484e5cC12fBf5096A";
      const impersonatedRelicSigner =
        await ethers.getImpersonatedSigner(relicSignerAddress);
      // set balance to 10 ETH
      await ethers.provider.send("hardhat_setBalance", [
        relicSignerAddress,
        "0x8AC7230489E80000", // 10 ETH
      ]);
      await core
        .connect(impersonatedArtist)
        .mint_Ecf(relicSignerAddress, projectId, artistAddress);
      const token2 = projectId.mul(1_000_000).add(2);
      await pmpV0
        .connect(impersonatedRelicSigner)
        .configureTokenParams(coreAddress, token2, [pmpInputSquiggle9999]);
      const postParams6 = await pmpV0.getTokenParams(coreAddress, token2);
      expect(postParams6.length).to.equal(2);
      expect(postParams6[0].key).to.equal("Featured_Squiggle");
      expect(postParams6[0].value).to.equal("9999");
      expect(postParams6[1].key).to.equal("Featured_Squiggle_Hash");
      expect(postParams6[1].value).to.equal(
        "0x0eefe6dcaed22a8dce481c38a11308682fd61b79463878f74f3144015316dcca"
      );

      // delegate from squiggle 9209 owner to relic 0 owner, delegate v1
      const delegateV1 = await ethers.getContractAt(
        "IDelegationRegistry",
        "0x00000000000076A84feF008CDAbe6409d2FE638B"
      );
      await delegateV1
        .connect(impersonatedSquiggleOwner)
        .delegateForToken(
          artistAddress,
          SQUIGGLE_GENART_V0_ADDRESS,
          squiggleTokenId,
          true
        );

      // assign squiggle 9209, pass auth check via v1 delegation
      await pmpV0
        .connect(impersonatedArtist)
        .configureTokenParams(coreAddress, token0, [pmpInputSquiggle9209]);
      const postParams7 = await pmpV0.getTokenParams(coreAddress, token0);
      expect(postParams7.length).to.equal(3);
      expect(postParams7[0].key).to.equal("PFP_Mode");
      expect(postParams7[0].value).to.equal("true");
      expect(postParams7[1].key).to.equal("Featured_Squiggle");
      expect(postParams7[1].value).to.equal(squiggleTokenId.toString());
      expect(postParams7[2].key).to.equal("Featured_Squiggle_Hash");
      expect(postParams7[2].value).to.equal(
        "0x56461a01b69faeffeaa342cd081d753c0b98f9863f60600541a391a093a17275"
      );

      // revoke delegation v1, fails auth check while assigning squiggle 9209, but retains squiggle post params
      await delegateV1
        .connect(impersonatedSquiggleOwner)
        .delegateForToken(
          artistAddress,
          SQUIGGLE_GENART_V0_ADDRESS,
          squiggleTokenId,
          false
        );
      const postParams8 = await pmpV0.getTokenParams(coreAddress, token0);
      expect(postParams8.length).to.equal(3);
      expect(postParams8[0].key).to.equal("PFP_Mode");
      expect(postParams8[0].value).to.equal("true");
      expect(postParams8[1].key).to.equal("Featured_Squiggle");
      expect(postParams8[1].value).to.equal(squiggleTokenId.toString());
      expect(postParams8[2].key).to.equal("Featured_Squiggle_Hash");
      expect(postParams8[2].value).to.equal(
        "0x56461a01b69faeffeaa342cd081d753c0b98f9863f60600541a391a093a17275"
      );

      await expectRevert(
        pmpV0
          .connect(impersonatedArtist)
          .configureTokenParams(coreAddress, token0, [pmpInputSquiggle9209]),
        revertMessages.failAuth
      );

      // delegate from squiggle 9209 owner to relic 0 owner, delegate v2
      const delegateV2 = await ethers.getContractAt(
        "IDelegateRegistry",
        "0x00000000000000447e69651d841bD8D104Bed493"
      );
      await delegateV2
        .connect(impersonatedSquiggleOwner)
        .delegateERC721(
          artistAddress,
          SQUIGGLE_GENART_V0_ADDRESS,
          squiggleTokenId,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          true
        );

      // assign squiggle 9209, pass auth check via v2 delegation
      await pmpV0
        .connect(impersonatedArtist)
        .configureTokenParams(coreAddress, token0, [pmpInputSquiggle9209]);
      const postParams9 = await pmpV0.getTokenParams(coreAddress, token0);
      expect(postParams9.length).to.equal(3);
      expect(postParams9[0].key).to.equal("PFP_Mode");
      expect(postParams9[0].value).to.equal("true");
      expect(postParams9[1].key).to.equal("Featured_Squiggle");
      expect(postParams9[1].value).to.equal(squiggleTokenId.toString());
      expect(postParams9[2].key).to.equal("Featured_Squiggle_Hash");
      expect(postParams9[2].value).to.equal(
        "0x56461a01b69faeffeaa342cd081d753c0b98f9863f60600541a391a093a17275"
      );

      // revoke delegation v2, confirm token params still include squiggle details
      await delegateV2
        .connect(impersonatedSquiggleOwner)
        .delegateERC721(
          artistAddress,
          SQUIGGLE_GENART_V0_ADDRESS,
          squiggleTokenId,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          false
        );
      const postParams10 = await pmpV0.getTokenParams(coreAddress, token0);
      expect(postParams10.length).to.equal(3);
      expect(postParams10[0].key).to.equal("PFP_Mode");
      expect(postParams10[0].value).to.equal("true");
      expect(postParams10[1].key).to.equal("Featured_Squiggle");
      expect(postParams10[1].value).to.equal(squiggleTokenId.toString());
      expect(postParams10[2].key).to.equal("Featured_Squiggle_Hash");
      expect(postParams10[2].value).to.equal(
        "0x56461a01b69faeffeaa342cd081d753c0b98f9863f60600541a391a093a17275"
      );

      // re-enable delegation v2, delegate for all, use subdelegations, squiggle should be assignable
      const rights = ethers.utils.formatBytes32String("postmintparameters");
      await delegateV2
        .connect(impersonatedSquiggleOwner)
        .delegateAll(artistAddress, rights, true);
      await pmpV0
        .connect(impersonatedArtist)
        .configureTokenParams(coreAddress, token0, [pmpInputSquiggle9209]);
      // verify all postparams are still present
      const postParams11 = await pmpV0.getTokenParams(coreAddress, token0);
      expect(postParams11.length).to.equal(3);
      expect(postParams11[0].key).to.equal("PFP_Mode");
      expect(postParams11[1].key).to.equal("Featured_Squiggle");
      expect(postParams11[1].value).to.equal(squiggleTokenId.toString());
      expect(postParams11[2].key).to.equal("Featured_Squiggle_Hash");
      expect(postParams11[2].value).to.equal(
        "0x56461a01b69faeffeaa342cd081d753c0b98f9863f60600541a391a093a17275"
      );

      // set squiggle to 1981, confirm squiggle-related postparams are stripped
      await pmpV0
        .connect(impersonatedArtist)
        .configureTokenParams(coreAddress, token0, [pmpInputSquiggle1981]);
      const postParams12 = await pmpV0.getTokenParams(coreAddress, token0);
      expect(postParams12.length).to.equal(1);
      expect(postParams12[0].key).to.equal("PFP_Mode");
      expect(postParams12[0].value).to.equal("true");
    });
  });
});
