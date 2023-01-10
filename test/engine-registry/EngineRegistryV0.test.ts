import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import {
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
    beforeEach(async function () {
      // standard accounts and constants
      this.accounts = await getAccounts();
      await assignDefaultConstants.call(this);

      // deploy and configure minter filter and minter
      ({
        genArt721Core: this.genArt721Core,
        minterFilter: this.minterFilter,
        randomizer: this.randomizer,
        adminACL: this.adminACL,
        engineRegistry: this.engineRegistry,
      } = await deployCoreWithMinterFilter.call(
        this,
        coreContractName,
        "MinterFilterV1"
      ));
    });

    describe("registerContract", function () {
      it("allows deployer to register arbitrary address", async function () {
        await expect(
          this.engineRegistry
            .connect(this.accounts.deployer)
            .registerContract(
              this.accounts.additional.address,
              ethers.utils.formatBytes32String("dummyCoreVersion"),
              ethers.utils.formatBytes32String("dummyCoreType")
            )
        )
          .to.be.emit(this.engineRegistry, "ContractRegistered")
          .withArgs(
            this.accounts.additional.address,
            ethers.utils.formatBytes32String("dummyCoreVersion"),
            ethers.utils.formatBytes32String("dummyCoreType")
          );
      });

      it("does not allow non-deployer to register address", async function () {
        await expectRevert(
          this.engineRegistry
            .connect(this.accounts.artist)
            .registerContract(
              this.accounts.additional.address,
              ethers.utils.formatBytes32String("dummyCoreVersion"),
              ethers.utils.formatBytes32String("dummyCoreType")
            ),
          "Only allowed deployer-address TX origin"
        );
      });
    });

    describe("unregisterContract", function () {
      it("allows deployer to register arbitrary address", async function () {
        await expect(
          this.engineRegistry
            .connect(this.accounts.deployer)
            .unregisterContract(this.genArt721Core.address)
        )
          .to.be.emit(this.engineRegistry, "ContractUnregistered")
          .withArgs(this.genArt721Core.address);
      });

      it("does not allow non-deployer to register address", async function () {
        await expectRevert(
          this.engineRegistry
            .connect(this.accounts.artist)
            .unregisterContract(this.genArt721Core.address),
          "Only allowed deployer-address TX origin"
        );
      });
    });
  });
}
