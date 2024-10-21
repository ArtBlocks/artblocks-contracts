import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployCoreWithMinterFilter,
} from "../util/common";

export type ArtistFinanceProposal = {
  artistAddress: string;
  additionalPayeePrimarySalesAddress: string;
  additionalPayeePrimarySalesPercentage: number;
  additionalPayeeSecondarySalesAddress: string;
  additionalPayeeSecondarySalesPercentage: number;
};

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3_Engine", // V3 core engine contract
];

/**
 * Tests regarding view functions for V3 core.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`EngineRegistryV0 integration (with ${coreContractName})`, async function () {
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
        adminACL: config.adminACL,
        engineRegistry: config.engineRegistry,
      } = await deployCoreWithMinterFilter(
        config,
        coreContractName,
        "MinterFilterV1"
      ));
      return config;
    }

    describe("registerContract", function () {
      it("allows deployer to register arbitrary address", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.engineRegistry
            .connect(config.accounts.deployer)
            .registerContract(
              config.accounts.additional.address,
              ethers.utils.formatBytes32String("dummyCoreVersion"),
              ethers.utils.formatBytes32String("dummyCoreType")
            )
        )
          .to.be.emit(config.engineRegistry, "ContractRegistered")
          .withArgs(
            config.accounts.additional.address,
            ethers.utils.formatBytes32String("dummyCoreVersion"),
            ethers.utils.formatBytes32String("dummyCoreType")
          );
      });

      it("does not allow non-deployer to register address", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.engineRegistry
            .connect(config.accounts.artist)
            .registerContract(
              config.accounts.additional.address,
              ethers.utils.formatBytes32String("dummyCoreVersion"),
              ethers.utils.formatBytes32String("dummyCoreType")
            ),
          "Only allowed deployer-address TX origin"
        );
      });
    });

    describe("unregisterContract", function () {
      it("allows deployer to register arbitrary address", async function () {
        const config = await loadFixture(_beforeEach);
        const coreVersion = await config.genArt721Core
          .connect(config.accounts.deployer)
          .coreVersion();
        const coreType = await config.genArt721Core
          .connect(config.accounts.deployer)
          .coreType();
        await config.engineRegistry
          .connect(config.accounts.deployer)
          .registerContract(
            config.genArt721Core.address,
            ethers.utils.formatBytes32String(coreVersion),
            ethers.utils.formatBytes32String(coreType)
          );
        await expect(
          config.engineRegistry
            .connect(config.accounts.deployer)
            .unregisterContract(config.genArt721Core.address)
        )
          .to.be.emit(config.engineRegistry, "ContractUnregistered")
          .withArgs(config.genArt721Core.address);
      });

      it("does not allow non-deployer to register address", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.engineRegistry
            .connect(config.accounts.artist)
            .unregisterContract(config.genArt721Core.address),
          "Only allowed deployer-address TX origin"
        );
      });
    });
  });
}
