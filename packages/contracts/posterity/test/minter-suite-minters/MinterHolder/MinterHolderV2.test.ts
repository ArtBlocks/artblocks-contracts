import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployAndGetPBAB,
  deployCoreWithMinterFilter,
  compareBN,
  safeAddProject,
} from "../../util/common";

import { MinterHolder_Common } from "./MinterHolder.common";
import { AbiCoder } from "ethers/lib/utils";

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  "GenArt721CoreV3_Explorations", // V3 core explorations contract
];

const addressZero = "0x0000000000000000000000000000000000000000";

/**
 * These tests intended to ensure Filtered Minter integrates properly with V3
 * core contract.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`MinterHolderV2_${coreContractName}`, async function () {
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

      this.delegationRegistry = await deployAndGet.call(
        this,
        "DelegationRegistry",
        []
      );
      this.targetMinterName = "MinterHolderV2";
      this.minter = await deployAndGet.call(this, this.targetMinterName, [
        this.genArt721Core.address,
        this.minterFilter.address,
        this.delegationRegistry.address,
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
      const minterFactorySetPrice =
        await ethers.getContractFactory("MinterSetPriceV2");
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
    });

    describe("common MinterHolder tests", async () => {
      await MinterHolder_Common();
    });

    describe("constructor", async function () {
      it("emits an event indicating dependency registry in constructor", async function () {
        const contractFactory = await ethers.getContractFactory(
          this.targetMinterName
        );
        const tx = await contractFactory.deploy(
          this.genArt721Core.address,
          this.minterFilter.address,
          this.delegationRegistry.address
        );
        const receipt = await tx.deployTransaction.wait();
        // target event is the last log
        const targetLog = receipt.logs[0];
        // expect "PlatformUpdated" event as log 0
        await expect(targetLog.topics[0]).to.be.equal(
          ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes("DelegationRegistryUpdated(address)")
          )
        );
        // expect field to be address of delegation registry as data 1
        // zero-pad address to 32 bytes when checking against event data
        const abiCoder = new AbiCoder();
        expect(targetLog.data).to.be.equal(
          abiCoder.encode(["address"], [this.delegationRegistry.address])
        );
      });
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

    describe("Works for different valid delegation levels", async function () {
      ["delegateForAll", "delegateForContract", "delegateForToken"].forEach(
        (delegationType) => {
          describe(`purchaseTo_dlc with a VALID vault delegate after ${delegationType}`, async function () {
            beforeEach(async function () {
              // artist account holds mint #0 for delegating
              this.artistVault = this.accounts.artist;

              this.userVault = this.accounts.additional2;

              // delegate the vault to the user
              let delegationArgs;
              if (delegationType === "delegateForAll") {
                delegationArgs = [this.accounts.user.address, true];
              } else if (delegationType === "delegateForContract") {
                delegationArgs = [
                  this.accounts.user.address,
                  this.genArt721Core.address,
                  true,
                ];
              } else if (delegationType === "delegateForToken") {
                delegationArgs = [
                  this.accounts.user.address, // delegate
                  this.genArt721Core.address, // contract address
                  this.projectZeroTokenZero.toNumber(), // tokenID
                  true,
                ];
              }
              await this.delegationRegistry
                .connect(this.userVault)
                [delegationType](...delegationArgs);
            });

            it("does allow purchases", async function () {
              // delegate the vault to the user
              await this.delegationRegistry
                .connect(this.artistVault)
                .delegateForToken(
                  this.accounts.user.address, // delegate
                  this.genArt721Core.address, // contract address
                  this.projectZeroTokenZero.toNumber(), // tokenID
                  true
                );

              // expect no revert
              await this.minter
                .connect(this.accounts.user)
                ["purchaseTo(address,uint256,address,uint256,address)"](
                  this.userVault.address,
                  this.projectZero,
                  this.genArt721Core.address,
                  this.projectZeroTokenZero.toNumber(),
                  this.artistVault.address, //  the allowlisted vault address
                  {
                    value: this.pricePerTokenInWei,
                  }
                );
            });

            it("allows purchases to vault if msg.sender is allowlisted and no vault is provided", async function () {
              await this.minter
                .connect(this.accounts.artist)
                ["purchaseTo(address,uint256,address,uint256)"](
                  this.accounts.additional.address,
                  this.projectZero,
                  this.genArt721Core.address,
                  this.projectZeroTokenZero.toNumber(),
                  {
                    value: this.pricePerTokenInWei,
                  }
                );
            });

            it("does not allow purchases with an incorrect token", async function () {
              await expectRevert(
                this.minter
                  .connect(this.accounts.user)
                  ["purchaseTo(address,uint256,address,uint256,address)"](
                    this.userVault.address,
                    this.projectOne,
                    this.genArt721Core.address,
                    this.projectZeroTokenOne.toNumber(),
                    this.userVault.address, //  the vault address has NOT been delegated
                    {
                      value: this.pricePerTokenInWei,
                    }
                  ),
                "Only allowlisted NFTs"
              );
            });
          });
        }
      );
    });

    describe("Works for delegation with different contract", async function () {
      it("enables delegation when owned token is on different contracts", async function () {
        // deploy different contract (for this case, use PBAB contract)
        const tokenOwner = this.accounts.additional; // alias for test readability
        const { pbabToken, pbabMinter } = await deployAndGetPBAB.bind(this)();
        await pbabMinter
          .connect(this.accounts.artist)
          .purchaseTo(
            tokenOwner.address,
            0,
            this.pricePerTokenInWei,
            addressZero,
            {
              value: this.pricePerTokenInWei,
            }
          );
        // register the PBAB token on our minter
        await this.minter
          .connect(this.accounts.deployer)
          .registerNFTAddress(pbabToken.address);
        // allow holders of PBAB project 0 to purchase tokens on this.projectTwo
        await this.minter
          .connect(this.accounts.artist)
          .allowHoldersOfProjects(this.projectTwo, [pbabToken.address], [0]);
        // configure price per token to be zero
        await this.minter
          .connect(this.accounts.artist)
          .updatePricePerTokenInWei(this.projectTwo, 0);
        // additional sets delegate to user2 for the PBAB token
        const delegee = this.accounts.user2; // alias for test readability
        await this.delegationRegistry.connect(tokenOwner).delegateForToken(
          delegee.address, // delegate
          pbabToken.address, // contract address
          0, // tokenID
          true
        );
        // does allow purchase when holder of token in PBAB this.projectZero is used as pass
        await this.minter
          .connect(delegee)
          ["purchaseTo(address,uint256,address,uint256,address)"](
            delegee.address, // address being minted to (irrelevant for this test)
            this.projectTwo, // the project being minted
            pbabToken.address, // the allowlisted token address
            0, // tokenID of the owned token
            tokenOwner.address, // the allowlisted vault address
            {
              value: this.pricePerTokenInWei,
            }
          );
      });
    });

    describe("purchaseTo_dlc with an INVALID vault delegate", async function () {
      beforeEach(async function () {
        this.userVault = this.accounts.additional2;
        // intentionally do not add any delegations
      });

      it("does NOT allow purchases", async function () {
        await expectRevert(
          this.minter
            .connect(this.accounts.user)
            ["purchaseTo(address,uint256,address,uint256,address)"](
              this.userVault.address,
              this.projectZero,
              this.genArt721Core.address,
              this.projectZeroTokenZero.toNumber(),
              this.userVault.address, //  the address has NOT been delegated
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
