import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Minter_Common } from "../Minter.common";
import { deployAndGetPBAB, isCoreV3, T_Config } from "../../../util/common";

import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { SafeTransactionDataPartial } from "@gnosis.pm/safe-core-sdk-types";
import { getGnosisSafe } from "../../../util/GnosisSafeNetwork";

/**
 * These tests are intended to check common MinterHolder functionality.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterHolder_Common = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("common minter tests", async () => {
    await Minter_Common(_beforeEach);
  });

  describe("updatePricePerTokenInWei", async function () {
    it("only allows artist to update price", async function () {
      const config = await loadFixture(_beforeEach);
      const onlyArtistErrorMessage = "Only Artist";
      // doesn't allow user
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow deployer
      await expectRevert(
        config.minter
          .connect(config.accounts.deployer)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.higherPricePerTokenInWei
        );
    });

    it("enforces price update", async function () {
      const config = await loadFixture(_beforeEach);
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist increases price
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.higherPricePerTokenInWei
        );
      // cannot purchase token at lower price
      // note: purchase function is overloaded, so requires full signature
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            config.projectZero,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.pricePerTokenInWei,
            }
          ),
        needMoreValueErrorMessage
      );
      // can purchase token at higher price
      await config.minter
        .connect(config.accounts.artist)
        ["purchase(uint256,address,uint256)"](
          config.projectZero,
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          {
            value: config.higherPricePerTokenInWei,
          }
        );
    });

    it("emits event upon price update", async function () {
      const config = await loadFixture(_beforeEach);
      // artist increases price
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            config.higherPricePerTokenInWei
          )
      )
        .to.emit(config.minter, "PricePerTokenInWeiUpdated")
        .withArgs(config.projectZero, config.higherPricePerTokenInWei);
    });
  });

  describe("allowHoldersOfProjects", async function () {
    it("only allows artist to update allowed holders", async function () {
      const config = await loadFixture(_beforeEach);
      // user not allowed
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .allowHoldersOfProjects(
            config.projectZero,
            [config.genArt721Core.address],
            [config.projectOne]
          ),
        "Only Artist"
      );
      // additional not allowed
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .allowHoldersOfProjects(
            config.projectZero,
            [config.genArt721Core.address],
            [config.projectOne]
          ),
        "Only Artist"
      );
      // artist allowed
      await config.minter
        .connect(config.accounts.artist)
        .allowHoldersOfProjects(
          config.projectZero,
          [config.genArt721Core.address],
          [config.projectOne]
        );
    });

    it("length of array args must match", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .allowHoldersOfProjects(
            config.projectZero,
            [config.genArt721Core.address, config.genArt721Core.address],
            [config.projectOne]
          ),
        "Length of add arrays must match"
      );
    });

    it("emits event when update allowed holders for a single project", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .allowHoldersOfProjects(
            config.projectZero,
            [config.genArt721Core.address],
            [config.projectOne]
          )
      )
        .to.emit(config.minter, "AllowedHoldersOfProjects")
        .withArgs(
          config.projectZero,
          [config.genArt721Core.address],
          [config.projectOne]
        );
    });

    it("emits event when update allowed holders for a multiple projects", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .allowHoldersOfProjects(
            config.projectZero,
            [config.genArt721Core.address, config.genArt721Core.address],
            [config.projectOne, config.projectTwo]
          )
      )
        .to.emit(config.minter, "AllowedHoldersOfProjects")
        .withArgs(
          config.projectZero,
          [config.genArt721Core.address, config.genArt721Core.address],
          [config.projectOne, config.projectTwo]
        );
    });

    it("does not allow allowlisting a project on an unregistered contract", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy different contract (for config case, use PBAB contract)
      const { pbabToken, pbabMinter } = await deployAndGetPBAB(config);
      await pbabMinter
        .connect(config.accounts.artist)
        .purchaseTo(config.accounts.additional.address, 0, {
          value: config.pricePerTokenInWei,
        });
      // allow holders of PBAB project 0 to purchase tokens on config.projectTwo
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .allowHoldersOfProjects(
            config.projectTwo,
            [pbabToken.address],
            [config.projectZero]
          ),
        "Only Registered NFT Addresses"
      );
    });
  });

  describe("removeHoldersOfProjects", async function () {
    it("only allows artist to update allowed holders", async function () {
      const config = await loadFixture(_beforeEach);
      // user not allowed
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .removeHoldersOfProjects(
            config.projectZero,
            [config.genArt721Core.address],
            [config.projectOne]
          ),
        "Only Artist"
      );
      // additional not allowed
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .removeHoldersOfProjects(
            config.projectZero,
            [config.genArt721Core.address],
            [config.projectOne]
          ),
        "Only Artist"
      );
      // artist allowed
      await config.minter
        .connect(config.accounts.artist)
        .removeHoldersOfProjects(
          config.projectZero,
          [config.genArt721Core.address],
          [config.projectOne]
        );
    });

    it("only allows equal length array args", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .removeHoldersOfProjects(
            config.projectZero,
            [config.genArt721Core.address, config.genArt721Core.address],
            [config.projectOne]
          ),
        "Length of remove arrays must match"
      );
    });

    it("emits event when removing allowed holders for a single project", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .removeHoldersOfProjects(
            config.projectZero,
            [config.genArt721Core.address],
            [config.projectOne]
          )
      )
        .to.emit(config.minter, "RemovedHoldersOfProjects")
        .withArgs(
          config.projectZero,
          [config.genArt721Core.address],
          [config.projectOne]
        );
    });

    it("emits event when removing allowed holders for multiple projects", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .removeHoldersOfProjects(
            config.projectZero,
            [config.genArt721Core.address, config.genArt721Core.address],
            [config.projectOne, config.projectTwo]
          )
      )
        .to.emit(config.minter, "RemovedHoldersOfProjects")
        .withArgs(
          config.projectZero,
          [config.genArt721Core.address, config.genArt721Core.address],
          [config.projectOne, config.projectTwo]
        );
    });
  });

  describe("allowRemoveHoldersOfProjects", async function () {
    it("only allows artist to update allowed holders", async function () {
      const config = await loadFixture(_beforeEach);
      // user not allowed
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .allowRemoveHoldersOfProjects(
            config.projectZero,
            [config.genArt721Core.address],
            [config.projectOne],
            [config.genArt721Core.address],
            [config.projectOne]
          ),
        "Only Artist"
      );
      // additional not allowed
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .allowRemoveHoldersOfProjects(
            config.projectZero,
            [config.genArt721Core.address],
            [config.projectOne],
            [config.genArt721Core.address],
            [config.projectOne]
          ),
        "Only Artist"
      );
      // artist allowed
      await config.minter
        .connect(config.accounts.artist)
        .allowRemoveHoldersOfProjects(
          config.projectZero,
          [config.genArt721Core.address],
          [config.projectOne],
          [config.genArt721Core.address],
          [config.projectOne]
        );
    });

    it("emits event when removing allowed holders for a single project", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .allowRemoveHoldersOfProjects(
            config.projectZero,
            [config.genArt721Core.address],
            [config.projectOne],
            [config.genArt721Core.address],
            [config.projectOne]
          )
      )
        .to.emit(config.minter, "AllowedHoldersOfProjects")
        .withArgs(
          config.projectZero,
          [config.genArt721Core.address],
          [config.projectOne]
        );
      // remove event (for same operation, since multiple events)
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .allowRemoveHoldersOfProjects(
            config.projectZero,
            [config.genArt721Core.address],
            [config.projectOne],
            [config.genArt721Core.address],
            [config.projectOne]
          )
      )
        .to.emit(config.minter, "RemovedHoldersOfProjects")
        .withArgs(
          config.projectZero,
          [config.genArt721Core.address],
          [config.projectOne]
        );
    });

    it("emits event when adding allowed holders for multiple projects", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .allowRemoveHoldersOfProjects(
            config.projectZero,
            [config.genArt721Core.address, config.genArt721Core.address],
            [config.projectOne, config.projectTwo],
            [],
            []
          )
      )
        .to.emit(config.minter, "AllowedHoldersOfProjects")
        .withArgs(
          config.projectZero,
          [config.genArt721Core.address, config.genArt721Core.address],
          [config.projectOne, config.projectTwo]
        );
    });

    it("emits event when removing allowed holders for multiple projects", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .allowRemoveHoldersOfProjects(
            config.projectZero,
            [],
            [],
            [config.genArt721Core.address, config.genArt721Core.address],
            [config.projectOne, config.projectTwo]
          )
      )
        .to.emit(config.minter, "RemovedHoldersOfProjects")
        .withArgs(
          config.projectZero,
          [config.genArt721Core.address, config.genArt721Core.address],
          [config.projectOne, config.projectTwo]
        );
    });
  });

  describe("isAllowlistedNFT", async function () {
    it("returns true when queried NFT is allowlisted", async function () {
      const config = await loadFixture(_beforeEach);
      const isAllowlisted = await config.minter
        .connect(config.accounts.additional)
        .isAllowlistedNFT(
          config.projectZero,
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber()
        );
      expect(isAllowlisted).to.be.true;
    });

    it("returns false when queried NFT is not allowlisted", async function () {
      const config = await loadFixture(_beforeEach);
      const isAllowlisted = await config.minter
        .connect(config.accounts.additional)
        .isAllowlistedNFT(
          config.projectZero,
          config.genArt721Core.address,
          config.projectOneTokenZero.toNumber()
        );
      expect(isAllowlisted).to.be.false;
    });
  });

  describe("purchase", async function () {
    it("does not allow purchase without NFT ownership args", async function () {
      const config = await loadFixture(_beforeEach);
      // expect revert due to price not being configured
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          ["purchase(uint256)"](config.projectZero, {
            value: config.pricePerTokenInWei,
          }),
        "Must claim NFT ownership"
      );
    });

    it("does not allow purchase prior to configuring price", async function () {
      const config = await loadFixture(_beforeEach);
      // expect revert due to price not being configured
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          ["purchase(uint256,address,uint256)"](
            config.projectTwo,
            config.genArt721Core.address,
            config.projectTwoTokenZero.toNumber(),
            {
              value: config.pricePerTokenInWei,
            }
          ),
        "Price not configured"
      );
    });

    it("does not allow purchase without sending enough funds", async function () {
      const config = await loadFixture(_beforeEach);
      // expect revert due when sending zero funds
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          ["purchase(uint256,address,uint256)"](
            config.projectOne,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: 0,
            }
          ),
        "Must send minimum value to mint"
      );
      // expect revert due when sending funds less than price
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          ["purchase(uint256,address,uint256)"](
            config.projectOne,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.pricePerTokenInWei.sub(1),
            }
          ),
        "Must send minimum value to mint"
      );
    });

    describe("allows/disallows based on allowed project holder configuration", async function () {
      it("does not allow purchase when using token of unallowed project", async function () {
        const config = await loadFixture(_beforeEach);
        // allow holders of config.projectOne to purchase tokens on config.projectTwo
        await config.minter
          .connect(config.accounts.artist)
          .allowHoldersOfProjects(
            config.projectTwo,
            [config.genArt721Core.address],
            [config.projectOne]
          );
        // configure price per token to be zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(config.projectTwo, 0);
        // do not allow purchase when holder token in config.projectZero is used as pass
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            ["purchase(uint256,address,uint256)"](
              config.projectTwo,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.pricePerTokenInWei,
              }
            ),
          "Only allowlisted NFTs"
        );
      });

      it("does not allow purchase when using token of allowed then unallowed project", async function () {
        const config = await loadFixture(_beforeEach);
        // allow holders of config.projectZero and config.projectOne, then remove config.projectZero
        await config.minter
          .connect(config.accounts.artist)
          .allowRemoveHoldersOfProjects(
            config.projectTwo,
            [config.genArt721Core.address, config.genArt721Core.address],
            [config.projectZero, config.projectOne],
            [config.genArt721Core.address],
            [config.projectZero]
          );
        // configure price per token to be zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(config.projectTwo, 0);
        // do not allow purchase when holder token in config.projectZero is used as pass
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            ["purchase(uint256,address,uint256)"](
              config.projectTwo,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.pricePerTokenInWei,
              }
            ),
          "Only allowlisted NFTs"
        );
      });

      it("does allow purchase when using token of allowed project", async function () {
        const config = await loadFixture(_beforeEach);
        // allow holders of config.projectZero to purchase tokens on config.projectTwo
        await config.minter
          .connect(config.accounts.artist)
          .allowHoldersOfProjects(
            config.projectTwo,
            [config.genArt721Core.address],
            [config.projectZero]
          );
        // configure price per token to be zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(config.projectTwo, 0);
        // does allow purchase when holder token in config.projectZero is used as pass
        await config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            config.projectTwo,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.pricePerTokenInWei,
            }
          );
      });

      it("does allow purchase when using token of allowed project (when set in bulk)", async function () {
        const config = await loadFixture(_beforeEach);
        // allow holders of config.projectOne and config.projectZero to purchase tokens on config.projectTwo
        await config.minter
          .connect(config.accounts.artist)
          .allowRemoveHoldersOfProjects(
            config.projectTwo,
            [config.genArt721Core.address, config.genArt721Core.address],
            [config.projectOne, config.projectZero],
            [],
            []
          );
        // configure price per token to be zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(config.projectTwo, 0);
        // does allow purchase when holder token in config.projectZero is used as pass
        await config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            config.projectTwo,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.pricePerTokenInWei,
            }
          );
      });

      it("does not allow purchase when using token not owned", async function () {
        const config = await loadFixture(_beforeEach);
        // allow holders of config.projectZero to purchase tokens on config.projectTwo
        await config.minter
          .connect(config.accounts.artist)
          .allowHoldersOfProjects(
            config.projectTwo,
            [config.genArt721Core.address],
            [config.projectZero]
          );
        // configure price per token to be zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(config.projectTwo, 0);
        // does allow purchase when holder token in config.projectZero is used as pass
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            ["purchase(uint256,address,uint256)"](
              config.projectTwo,
              config.genArt721Core.address,
              config.projectZeroTokenZero.toNumber(),
              {
                value: config.pricePerTokenInWei,
              }
            ),
          "Only owner of NFT"
        );
      });

      it("does not allow purchase when using token of an unallowed project on a different contract", async function () {
        const config = await loadFixture(_beforeEach);
        const { pbabToken, pbabMinter } = await deployAndGetPBAB(config);
        await pbabMinter
          .connect(config.accounts.artist)
          .purchaseTo(config.accounts.additional.address, 0, {
            value: config.pricePerTokenInWei,
          });
        // register the PBAB token on our minter
        await config.minter
          .connect(config.accounts.deployer)
          .registerNFTAddress(pbabToken.address);
        // configure price per token to be zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(config.projectTwo, 0);
        // expect failure when using PBAB token because it is not allowlisted for config.projectTwo
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            ["purchase(uint256,address,uint256)"](
              config.projectTwo,
              pbabToken.address,
              0,
              {
                value: config.pricePerTokenInWei,
              }
            ),
          "Only allowlisted NFTs"
        );
      });

      it("does allow purchase when using token of allowed project on a different contract", async function () {
        const config = await loadFixture(_beforeEach);
        // deploy different contract (for config case, use PBAB contract)
        const { pbabToken, pbabMinter } = await deployAndGetPBAB(config);
        await pbabMinter
          .connect(config.accounts.artist)
          .purchaseTo(config.accounts.additional.address, 0, {
            value: config.pricePerTokenInWei,
          });
        // register the PBAB token on our minter
        await config.minter
          .connect(config.accounts.deployer)
          .registerNFTAddress(pbabToken.address);
        // allow holders of PBAB project 0 to purchase tokens on config.projectTwo
        await config.minter
          .connect(config.accounts.artist)
          .allowHoldersOfProjects(config.projectTwo, [pbabToken.address], [0]);
        // configure price per token to be zero
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(config.projectTwo, 0);
        // does allow purchase when holder of token in PBAB config.projectZero is used as pass
        await config.minter
          .connect(config.accounts.additional)
          ["purchase(uint256,address,uint256)"](
            config.projectTwo,
            pbabToken.address,
            0,
            {
              value: config.pricePerTokenInWei,
            }
          );
      });
    });

    it("does allow purchase with a price of zero when intentionally configured", async function () {
      const config = await loadFixture(_beforeEach);
      // allow holders of config.projectZero to purchase tokens on config.projectTwo
      await config.minter
        .connect(config.accounts.artist)
        .allowHoldersOfProjects(
          config.projectTwo,
          [config.genArt721Core.address],
          [config.projectZero]
        );
      // configure price per token to be zero
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectTwo, 0);
      // allow purchase when intentionally configured price of zero
      await config.minter
        .connect(config.accounts.artist)
        ["purchase(uint256,address,uint256)"](
          config.projectTwo,
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          {
            value: config.pricePerTokenInWei,
          }
        );
    });

    it("auto-configures if setProjectMaxInvocations is not called (fails correctly)", async function () {
      const config = await loadFixture(_beforeEach);
      // allow holders of project zero to mint on project one
      await config.minter
        .connect(config.accounts.artist)
        .allowHoldersOfProjects(
          config.projectOne,
          [config.genArt721Core.address],
          [config.projectZero]
        );
      for (let i = 0; i < config.maxInvocations; i++) {
        await config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            config.projectOne,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.pricePerTokenInWei,
            }
          );
      }

      // since auto-configured, we should see the minter's revert message
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            config.projectOne,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.pricePerTokenInWei,
            }
          ),
        "Maximum number of invocations reached"
      );
    });

    it("doesnt add too much gas if setProjectMaxInvocations is set", async function () {
      const config = await loadFixture(_beforeEach);
      // Try without setProjectMaxInvocations, store gas cost
      const minterType = await config.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? config.accounts.deployer
          : config.accounts.artist;

      const tx = await config.minter
        .connect(config.accounts.artist)
        ["purchase(uint256,address,uint256)"](
          config.projectZero,
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          {
            value: config.pricePerTokenInWei,
          }
        );

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      let gasCostNoMaxInvocations: any = receipt.effectiveGasPrice
        .mul(receipt.gasUsed)
        .toString();
      gasCostNoMaxInvocations = parseFloat(
        ethers.utils.formatUnits(gasCostNoMaxInvocations, "ether")
      );

      // Try with setProjectMaxInvocations, store gas cost
      await config.minter
        .connect(accountToTestWith)
        .setProjectMaxInvocations(config.projectZero);
      const maxSetTx = await config.minter
        .connect(config.accounts.artist)
        ["purchase(uint256,address,uint256)"](
          config.projectZero,
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          {
            value: config.pricePerTokenInWei,
          }
        );
      const receipt2 = await ethers.provider.getTransactionReceipt(
        maxSetTx.hash
      );
      let gasCostMaxInvocations: any = receipt2.effectiveGasPrice
        .mul(receipt2.gasUsed)
        .toString();
      gasCostMaxInvocations = parseFloat(
        ethers.utils.formatUnits(gasCostMaxInvocations, "ether")
      );

      console.log(
        "Gas cost for a successful mint with setProjectMaxInvocations: ",
        gasCostMaxInvocations.toString(),
        "ETH"
      );
      console.log(
        "Gas cost for a successful mint without setProjectMaxInvocations: ",
        gasCostNoMaxInvocations.toString(),
        "ETH"
      );

      // Check that with setProjectMaxInvocations it's not too much moer expensive
      expect(gasCostMaxInvocations < (gasCostNoMaxInvocations * 110) / 100).to
        .be.true;
    });
  });

  describe("purchaseTo", async function () {
    it("allows `purchaseTo` by default", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.artist)
        ["purchaseTo(address,uint256,address,uint256)"](
          config.accounts.additional.address,
          config.projectZero,
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          {
            value: config.pricePerTokenInWei,
          }
        );
    });

    it("does not support toggling of `purchaseToDisabled`", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .togglePurchaseToDisabled(config.projectOne),
        "Action not supported"
      );
      // still allows `purchaseTo`.
      await config.minter
        .connect(config.accounts.artist)
        ["purchaseTo(address,uint256,address,uint256)"](
          config.accounts.additional.address,
          config.projectZero,
          config.genArt721Core.address,
          config.projectZeroTokenZero.toNumber(),
          {
            value: config.pricePerTokenInWei,
          }
        );
    });
  });

  describe("setProjectMaxInvocations", async function () {
    it("handles getting tokenInfo invocation info with V1 core", async function () {
      const config = await loadFixture(_beforeEach);
      const minterType = await config.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? config.accounts.deployer
          : config.accounts.artist;

      await config.minter
        .connect(accountToTestWith)
        .setProjectMaxInvocations(config.projectOne);
      // minter should update storage with accurate config.maxInvocations
      let maxInvocations = await config.minter
        .connect(accountToTestWith)
        .projectMaxInvocations(config.projectOne);
      expect(maxInvocations).to.be.equal(config.maxInvocations);
      // ensure hasMaxBeenReached did not unexpectedly get set as true
      let hasMaxBeenInvoked = await config.minter
        .connect(accountToTestWith)
        .projectMaxHasBeenInvoked(config.projectOne);
      expect(hasMaxBeenInvoked).to.be.false;
    });

    it("reverts for unconfigured/non-existent project", async function () {
      const config = await loadFixture(_beforeEach);
      // trying to set config on unconfigured project (e.g. 99) should cause
      // revert on the underlying CoreContract.
      const minterType = await config.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? config.accounts.deployer
          : config.accounts.artist;

      expectRevert(
        config.minter.connect(accountToTestWith).setProjectMaxInvocations(99),
        "Project ID does not exist"
      );
    });
  });

  describe("registered NFT address enumeration", async function () {
    it("reports expected number of registered NFT addresses after add/remove", async function () {
      const config = await loadFixture(_beforeEach);
      const numRegisteredNFTAddresses = await config.minter
        .connect(config.accounts.additional)
        .getNumRegisteredNFTAddresses();
      expect(numRegisteredNFTAddresses).to.be.equal(BigNumber.from("1"));
      // allow a different NFT address
      await config.minter
        .connect(config.accounts.deployer)
        .registerNFTAddress(config.accounts.deployer.address); // dummy address
      // expect number of registered NFT addresses to be increased by one
      const newNumRegisteredNFTAddresses = await config.minter
        .connect(config.accounts.additional)
        .getNumRegisteredNFTAddresses();
      expect(numRegisteredNFTAddresses.add(1)).to.be.equal(
        newNumRegisteredNFTAddresses
      );
      // deny an NFT address
      await config.minter
        .connect(config.accounts.deployer)
        .unregisterNFTAddress(config.accounts.deployer.address);
      // expect number of registered NFT addresses to be increased by one
      const removedNumRegisteredNFTAddresses = await config.minter
        .connect(config.accounts.additional)
        .getNumRegisteredNFTAddresses();
      expect(numRegisteredNFTAddresses).to.be.equal(
        removedNumRegisteredNFTAddresses
      );
    });

    it("gets registered NFT address at index", async function () {
      const config = await loadFixture(_beforeEach);
      // register another NFT address
      await config.minter
        .connect(config.accounts.deployer)
        .registerNFTAddress(config.accounts.deployer.address); // dummy address
      // expect NFT address at index zero to be token
      let NFTAddressAtZero = await config.minter
        .connect(config.accounts.additional)
        .getRegisteredNFTAddressAt(0);
      expect(NFTAddressAtZero).to.be.equal(config.genArt721Core.address);
      // expect NFT address at index one to be deployer
      const NFTAddressAtOne = await config.minter
        .connect(config.accounts.additional)
        .getRegisteredNFTAddressAt(1);
      expect(NFTAddressAtOne).to.be.equal(config.accounts.deployer.address);
      // unregister an token NFT address
      await config.minter
        .connect(config.accounts.deployer)
        .unregisterNFTAddress(config.genArt721Core.address);
      // expect NFT address at index zero to be deployer
      NFTAddressAtZero = await config.minter
        .connect(config.accounts.additional)
        .getRegisteredNFTAddressAt(0);
      expect(NFTAddressAtZero).to.be.equal(config.accounts.deployer.address);
    });
  });

  describe("reentrancy attack", async function () {
    it("does not allow reentrant purchaseTo", async function () {
      const config = await loadFixture(_beforeEach);
      // attacker deploys reentrancy contract specifically for TokenHolder Merkle
      const reentrancyMockFactory = await ethers.getContractFactory(
        "ReentrancyHolderMock"
      );
      const reentrancyMock = await reentrancyMockFactory
        .connect(config.accounts.deployer)
        .deploy();

      // artist sents token zero of project zero to reentrant contract
      await config.genArt721Core
        .connect(config.accounts.artist)
        .transferFrom(
          config.accounts.artist.address,
          reentrancyMock.address,
          config.projectZeroTokenZero.toNumber()
        );

      // attacker should see revert when performing reentrancy attack
      let totalTokensToMint = 2;
      let numTokensToMint = BigNumber.from(totalTokensToMint.toString());
      let totalValue = config.higherPricePerTokenInWei.mul(numTokensToMint);
      await expectRevert(
        reentrancyMock
          .connect(config.accounts.deployer)
          .attack(
            numTokensToMint,
            config.minter.address,
            config.projectZero,
            config.higherPricePerTokenInWei,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: totalValue,
            }
          ),
        // failure message occurs during refund, where attack reentrency occurs
        "Refund failed"
      );
      // attacker should be able to purchase ONE token w/refunds
      totalTokensToMint = 1;
      numTokensToMint = BigNumber.from("1");
      totalValue = config.higherPricePerTokenInWei.mul(numTokensToMint);
      for (let i = 0; i < totalTokensToMint; i++) {
        await reentrancyMock
          .connect(config.accounts.deployer)
          .attack(
            numTokensToMint,
            config.minter.address,
            config.projectZero,
            config.higherPricePerTokenInWei,
            config.genArt721Core.address,
            config.projectZeroTokenZero.toNumber(),
            {
              value: config.higherPricePerTokenInWei,
            }
          );
      }
    });
  });

  describe("gnosis safe", async function () {
    it("allows gnosis safe to purchase in ETH", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy new Gnosis Safe
      const safeSdk: Safe = await getGnosisSafe(
        config.accounts.artist,
        config.accounts.additional,
        config.accounts.user
      );
      const safeAddress = safeSdk.getAddress();

      // artist sents token zero of project zero to safe
      await config.genArt721Core
        .connect(config.accounts.artist)
        .transferFrom(
          config.accounts.artist.address,
          safeAddress,
          config.projectZeroTokenZero.toNumber()
        );

      // create a transaction
      const unsignedTx = await config.minter.populateTransaction[
        "purchase(uint256,address,uint256)"
      ](
        config.projectZero,
        config.genArt721Core.address,
        config.projectZeroTokenZero.toNumber()
      );
      const transaction: SafeTransactionDataPartial = {
        to: config.minter.address,
        data: unsignedTx.data,
        value: config.pricePerTokenInWei.toHexString(),
      };
      const safeTransaction = await safeSdk.createTransaction(transaction);
      // signers sign and execute the transaction
      // artist signs
      await safeSdk.signTransaction(safeTransaction);
      // additional signs
      const ethAdapterOwner2 = new EthersAdapter({
        ethers,
        signer: config.accounts.additional,
      });
      const safeSdk2 = await safeSdk.connect({
        ethAdapter: ethAdapterOwner2,
        safeAddress,
      });
      const txHash = await safeSdk2.getTransactionHash(safeTransaction);
      const approveTxResponse = await safeSdk2.approveTransactionHash(txHash);
      await approveTxResponse.transactionResponse?.wait();
      // fund the safe and execute transaction
      await config.accounts.artist.sendTransaction({
        to: safeAddress,
        value: config.pricePerTokenInWei,
      });

      const viewFunctionWithInvocations = (await isCoreV3(config.genArt721Core))
        ? config.genArt721Core.projectStateData
        : config.genArt721Core.projectTokenInfo;
      const projectStateDataBefore = await viewFunctionWithInvocations(
        config.projectZero
      );
      const executeTxResponse = await safeSdk2.executeTransaction(
        safeTransaction
      );
      await executeTxResponse.transactionResponse?.wait();
      const projectStateDataAfter = await viewFunctionWithInvocations(
        config.projectZero
      );
      expect(projectStateDataAfter.invocations).to.be.equal(
        projectStateDataBefore.invocations.add(1)
      );
    });
  });
};
