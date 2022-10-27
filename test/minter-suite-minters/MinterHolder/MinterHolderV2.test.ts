import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  compareBN,
  safeAddProject,
} from "../../util/common";

import { MinterHolder_Common } from "./MinterHolder.common";
import { smock, FakeContract } from "@defi-wonderland/smock";
import { IDelegationRegistry } from "../../../scripts/contracts";

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  "GenArt721CoreV3_Explorations", // V3 core explorations contract
];

/**
 * These tests intended to ensure Filtered Minter integrates properly with V3
 * core contract.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`MinterHolderV2_${coreContractName}`, async function () {
    let fakeDelegationRegistry: FakeContract<IDelegationRegistry>;

    beforeEach(async function () {
      // standard accounts and constants
      this.accounts = await getAccounts();
      await assignDefaultConstants.call(this);
      this.higherPricePerTokenInWei = this.pricePerTokenInWei.add(
        ethers.utils.parseEther("0.1")
      );
      // deploy and configure minter filter and minter
      ({
        genArt721Core: this.genArt721Core,
        minterFilter: this.minterFilter,
        randomizer: this.randomizer,
      } = await deployCoreWithMinterFilter.call(
        this,
        coreContractName,
        "MinterFilterV1"
      ));

      this.minter = await deployAndGet.call(this, "MinterHolderV2", [
        this.genArt721Core.address,
        this.minterFilter.address,
      ]);

      await safeAddProject(
        this.genArt721Core,
        this.accounts.deployer,
        this.accounts.artist.address
      );
      await safeAddProject(
        this.genArt721Core,
        this.accounts.deployer,
        this.accounts.artist.address
      );
      await safeAddProject(
        this.genArt721Core,
        this.accounts.deployer,
        this.accounts.artist.address
      );

      await this.genArt721Core
        .connect(this.accounts.deployer)
        .toggleProjectIsActive(this.projectZero);
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .toggleProjectIsActive(this.projectOne);
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .toggleProjectIsActive(this.projectTwo);

      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectOne, this.maxInvocations);
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectTwo, this.maxInvocations);

      await this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectZero);
      await this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectOne);
      await this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectTwo);

      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectOne, this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectTwo, this.minter.address);

      // set token price for projects zero and one on minter
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectZero, this.pricePerTokenInWei);
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectOne, this.pricePerTokenInWei);

      // artist mints a token on this.projectZero to use as proof of ownership
      const minterFactorySetPrice = await ethers.getContractFactory(
        "MinterSetPriceV2"
      );
      this.minterSetPrice = await minterFactorySetPrice.deploy(
        this.genArt721Core.address,
        this.minterFilter.address
      );
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minterSetPrice.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minterSetPrice.address);
      await this.minterSetPrice
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectZero, this.pricePerTokenInWei);
      await this.minterSetPrice
        .connect(this.accounts.artist)
        .purchase(this.projectZero, { value: this.pricePerTokenInWei });
      // switch this.projectZero back to MinterHolderV0
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minter.address);
      await this.minter
        .connect(this.accounts.deployer)
        .registerNFTAddress(this.genArt721Core.address);
      await this.minter
        .connect(this.accounts.artist)
        .allowHoldersOfProjects(
          this.projectZero,
          [this.genArt721Core.address],
          [this.projectZero]
        );

      // mock delegate.cash registry with Goerli/mainnet-deployed address
      fakeDelegationRegistry = await smock.fake("IDelegationRegistry", {
        address: "0x00000000000076A84feF008CDAbe6409d2FE638B",
      });
    });

    describe("common MinterHolder tests", async () => {
      await MinterHolder_Common();
    });

    describe("setProjectMaxInvocations", async function () {
      it("allows artist to call setProjectMaxInvocations", async function () {
        await this.minter
          .connect(this.accounts.artist)
          .setProjectMaxInvocations(this.projectZero);
      });

      it("allows user to call setProjectMaxInvocations", async function () {
        await this.minter
          .connect(this.accounts.user)
          .setProjectMaxInvocations(this.projectZero);
      });
    });

    describe("purchase_nnf", async function () {
      it("allows `purchase_nnf` by default", async function () {
        await this.minter
          .connect(this.accounts.artist)
          .purchase_nnf(
            this.projectZero,
            this.genArt721Core.address,
            this.projectZeroTokenZero.toNumber(),
            {
              value: this.pricePerTokenInWei,
            }
          );
      });
    });

    describe("payment splitting", async function () {
      beforeEach(async function () {
        this.deadReceiver = await deployAndGet.call(
          this,
          "DeadReceiverMock",
          []
        );
      });

      it("requires successful payment to platform", async function () {
        // update platform address to a contract that reverts on receive
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateArtblocksPrimarySalesAddress(this.deadReceiver.address);
        // expect revert when trying to purchase
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .purchase_nnf(
              this.projectZero,
              this.genArt721Core.address,
              this.projectZeroTokenZero.toNumber(),
              {
                value: this.pricePerTokenInWei,
              }
            ),
          "Art Blocks payment failed"
        );
      });

      it("requires successful payment to artist", async function () {
        // update artist address to a contract that reverts on receive
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProjectArtistAddress(
            this.projectZero,
            this.deadReceiver.address
          );
        // expect revert when trying to purchase
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .purchase_nnf(
              this.projectZero,
              this.genArt721Core.address,
              this.projectZeroTokenZero.toNumber(),
              {
                value: this.pricePerTokenInWei,
              }
            ),
          "Artist payment failed"
        );
      });

      it("requires successful payment to artist additional payee", async function () {
        // update artist additional payee to a contract that reverts on receive
        const proposedAddressesAndSplits = [
          this.projectZero,
          this.accounts.artist.address,
          this.deadReceiver.address,
          // @dev 50% to additional, 50% to artist, to ensure additional is paid
          50,
          this.accounts.additional2.address,
          // @dev split for secondary sales doesn't matter for this test
          50,
        ];
        await this.genArt721Core
          .connect(this.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(
            ...proposedAddressesAndSplits
          );
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...proposedAddressesAndSplits);
        // expect revert when trying to purchase
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .purchase_nnf(
              this.projectZero,
              this.genArt721Core.address,
              this.projectZeroTokenZero.toNumber(),
              {
                value: this.pricePerTokenInWei,
              }
            ),
          "Additional Payee payment failed"
        );
      });

      it("handles zero platform and artist payment values", async function () {
        // update platform to zero percent
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateArtblocksPrimarySalesPercentage(0);
        // update artist primary split to zero
        const proposedAddressesAndSplits = [
          this.projectZero,
          this.accounts.artist.address,
          this.accounts.additional.address,
          // @dev 100% to additional, 0% to artist, to induce zero artist payment value
          100,
          this.accounts.additional2.address,
          // @dev split for secondary sales doesn't matter for this test
          50,
        ];
        await this.genArt721Core
          .connect(this.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(
            ...proposedAddressesAndSplits
          );
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...proposedAddressesAndSplits);
        // expect successful purchase
        await this.minter
          .connect(this.accounts.artist)
          .purchase_nnf(
            this.projectZero,
            this.genArt721Core.address,
            this.projectZeroTokenZero.toNumber(),
            {
              value: this.pricePerTokenInWei,
            }
          );
      });
    });

    describe("onlyCoreAdminACL", async function () {
      it("restricts registerNFTAddress to only core admin ACL allowed", async function () {
        await expectRevert(
          this.minter
            .connect(this.accounts.user)
            .registerNFTAddress(this.genArt721Core.address),
          "Only Core AdminACL allowed"
        );
      });
    });

    describe("additional payee payments", async function () {
      it("handles additional payee payments", async function () {
        const valuesToUpdateTo = [
          this.projectZero,
          this.accounts.artist.address,
          this.accounts.additional.address,
          50,
          this.accounts.additional2.address,
          51,
        ];
        await this.genArt721Core
          .connect(this.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo);
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...valuesToUpdateTo);

        await this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            this.projectZero,
            this.genArt721Core.address,
            this.projectZeroTokenZero.toNumber(),
            {
              value: this.pricePerTokenInWei,
            }
          );
      });
    });

    describe("purchaseTo_dlc with a VALID vault delegate", async function () {
      it("does allow purchases", async function () {
        fakeDelegationRegistry.checkDelegateForToken.returns(true);

        const allowlistedVault = this.accounts.artist.address;

        await this.minter
          .connect(this.accounts.user)
          ["purchaseTo(address,uint256,address,uint256,address)"](
            allowlistedVault,
            this.projectZero,
            this.genArt721Core.address,
            this.projectZeroTokenZero.toNumber(),
            allowlistedVault, //  the allowlisted address
            {
              value: this.pricePerTokenInWei,
            }
          );
      });

      it("allows purchases to vault if msg.sender is allowlisted and no vault is provided", async function () {
        fakeDelegationRegistry.checkDelegateForToken.returns(true);

        const allowlistedVault = this.accounts.artist.address;

        await this.minter
          .connect(this.accounts.artist)
          ["purchaseTo(address,uint256,address,uint256)"](
            allowlistedVault,
            this.projectZero,
            this.genArt721Core.address,
            this.projectZeroTokenZero.toNumber(),
            {
              value: this.pricePerTokenInWei,
            }
          );
      });

      it("does not allow purchases with an incorrect token", async function () {
        fakeDelegationRegistry.checkDelegateForToken.returns(true);

        const allowlistedVault = this.accounts.artist.address;

        await expectRevert(
          this.minter
            .connect(this.accounts.user)
            ["purchaseTo(address,uint256,address,uint256,address)"](
              allowlistedVault,
              this.projectOne,
              this.genArt721Core.address,
              this.projectZeroTokenOne.toNumber(),
              allowlistedVault, //  the allowlisted address
              {
                value: this.pricePerTokenInWei,
              }
            ),
          "Only allowlisted NFTs"
        );
      });
    });

    describe("purchaseTo_dlc with an INVALID vault delegate", async function () {
      it("does NOT allow purchases", async function () {
        fakeDelegationRegistry.checkDelegateForToken.returns(false);

        const allowlistedVault = this.accounts.artist.address;

        await expectRevert(
          this.minter
            .connect(this.accounts.user)
            ["purchaseTo(address,uint256,address,uint256,address)"](
              allowlistedVault,
              this.projectZero,
              this.genArt721Core.address,
              this.projectZeroTokenZero.toNumber(),
              allowlistedVault, //  the allowlisted address
              {
                value: this.pricePerTokenInWei,
              }
            ),
          "Invalid delegate-vault pairing"
        );
      });
    });

    describe("calculates gas", async function () {
      it("mints and calculates gas values [ @skip-on-coverage ]", async function () {
        const tx = await this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            this.projectZero,
            this.genArt721Core.address,
            this.projectZeroTokenZero.toNumber(),
            {
              value: this.pricePerTokenInWei,
            }
          );

        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed);

        console.log(
          "Gas cost for a successful mint: ",
          ethers.utils.formatUnits(txCost.toString(), "ether").toString(),
          "ETH"
        );
        expect(compareBN(txCost, ethers.utils.parseEther("0.0115697"), 1)).to.be
          .true;
      });
    });
  });
}
