import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
} from "../../../util/common";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { MinterFilterEvents_Common } from "./MinterFilterEvents.common";

const runForEach = [
  {
    core: "GenArt721CoreV3",
    coreFirstProjectNumber: 0,
    minterFilter: "MinterFilterV1",
    minter: "MinterSetPriceERC20V2",
    minter2: "MinterSetPriceV2",
    minter3: "MinterDALinV2",
  },
  {
    core: "GenArt721CoreV3_Explorations",
    coreFirstProjectNumber: 0,
    minterFilter: "MinterFilterV1",
    minter: "MinterSetPriceERC20V2",
    minter2: "MinterSetPriceV2",
    minter3: "MinterDALinV2",
  },
];

runForEach.forEach((params) => {
  describe(`${params.minterFilter} Events w/${params.core} core`, async function () {
    async function _beforeEach() {
      let config: T_Config = {
        accounts: await getAccounts(),
      };
      config = await assignDefaultConstants(config);
      // deploy and configure minter filter and minter
      ({
        genArt721Core: config.genArt721Core,
        minterFilter: config.minterFilter,
      } = await deployCoreWithMinterFilter(
        config,
        params.core,
        params.minterFilter
      ));
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );

      config.minter = await deployAndGet(config, params.minter, [
        config.genArt721Core.address,
        config.minterFilter.address,
      ]);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      // deploy different types of filtered minters
      const minterFactoryETH = await ethers.getContractFactory(params.minter2);
      config.minterETH = await minterFactoryETH.deploy(
        config.genArt721Core.address,
        config.minterFilter.address
      );
      const minterFactoryETHAuction = await ethers.getContractFactory(
        params.minter3
      );
      config.minterETHAuction = await minterFactoryETHAuction.deploy(
        config.genArt721Core.address,
        config.minterFilter.address
      );
      return config;
    }

    describe("common tests", async function () {
      await MinterFilterEvents_Common(_beforeEach);
    });

    describe("Deployed", async function () {
      it("should emit Deployed during deployment", async function () {
        const config = await loadFixture(_beforeEach);
        const minterFilterFactory =
          await ethers.getContractFactory("MinterFilterV1");

        const tx = await minterFilterFactory
          .connect(config.accounts.deployer)
          .deploy(config.genArt721Core.address);
        const receipt = await tx.deployTransaction.wait();
        const deployed = receipt.logs[0];
        // expect "Deployed" event as log 0
        await expect(deployed.topics[0]).to.be.equal(
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Deployed()"))
        );
      });
    });
  });
});
