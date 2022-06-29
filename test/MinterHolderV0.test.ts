import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { SafeTransactionDataPartial } from "@gnosis.pm/safe-core-sdk-types";
import { getGnosisSafe } from "./util/GnosisSafeNetwork";

/**
 * These tests intended to ensure Filtered Minter integrates properly with V1
 * core contract.
 */
describe("MinterHolderV0", async function () {
  const name = "Non Fungible Token";
  const symbol = "NFT";

  const firstTokenId = new BN("30000000");
  const secondTokenId = new BN("3000001");

  const pricePerTokenInWei = ethers.utils.parseEther("1");
  const higherPricePerTokenInWei = pricePerTokenInWei.add(
    ethers.utils.parseEther("0.1")
  );
  const projectZero = 3; // V1 core starts at project 3
  const projectZeroTokenZero = 3000000;
  const projectOne = 4;
  const projectOneTokenZero = 4000000;
  const projectTwo = 5;
  const projectTwoTokenZero = 5000000;

  const projectMaxInvocations = 15;

  // Merkle trees (populated beforeEach)
  let merkleTreeZero;
  let merkleTreeOne;
  let merkleTreeTwo;

  beforeEach(async function () {
    const [owner, newOwner, artist, additional, deployer] =
      await ethers.getSigners();
    this.accounts = {
      owner: owner,
      newOwner: newOwner,
      artist: artist,
      additional: additional,
      deployer: deployer,
    };
    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();

    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV1");
    this.token = await artblocksFactory
      .connect(this.accounts.deployer)
      .deploy(name, symbol, this.randomizer.address);

    const minterFilterFactory = await ethers.getContractFactory(
      "MinterFilterV0"
    );
    this.minterFilter = await minterFilterFactory.deploy(this.token.address);

    const minterFactory = await ethers.getContractFactory("MinterHolderV0");
    this.minter = await minterFactory.deploy(
      this.token.address,
      this.minterFilter.address
    );
    this.minter3 = await minterFactory.deploy(
      this.token.address,
      this.minterFilter.address
    );

    await this.token
      .connect(this.accounts.deployer)
      .addProject("project0", this.accounts.artist.address, 0, false);

    await this.token
      .connect(this.accounts.deployer)
      .addProject("project1", this.accounts.artist.address, 0, false);

    await this.token
      .connect(this.accounts.deployer)
      .addProject("project2", this.accounts.artist.address, 0, false);

    await this.token
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(projectZero);
    await this.token
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(projectOne);
    await this.token
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(projectTwo);

    await this.token
      .connect(this.accounts.deployer)
      .addMintWhitelisted(this.minterFilter.address);

    await this.token
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(projectZero, projectMaxInvocations);
    await this.token
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(projectOne, projectMaxInvocations);
    await this.token
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(projectTwo, projectMaxInvocations);

    this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectZero);
    this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectOne);
    this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectTwo);

    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minter.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(projectZero, this.minter.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(projectOne, this.minter.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(projectTwo, this.minter.address);

    // set token price for projects zero and one on minter
    await this.minter
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(projectZero, pricePerTokenInWei);
    await this.minter
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(projectOne, pricePerTokenInWei);

    // artist mints a token on projectZero to use as proof of ownership
    const minterFactorySetPrice = await ethers.getContractFactory(
      "MinterSetPriceV1"
    );
    this.minterSetPrice = await minterFactorySetPrice.deploy(
      this.token.address,
      this.minterFilter.address
    );
    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minterSetPrice.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(projectZero, this.minterSetPrice.address);
    await this.minterSetPrice
      .connect(artist)
      .updatePricePerTokenInWei(projectZero, pricePerTokenInWei);
    await this.minterSetPrice
      .connect(artist)
      .purchase(projectZero, { value: pricePerTokenInWei });
    // switch projectZero back to MinterHolderV0
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(projectZero, this.minter.address);
    await this.minter
      .connect(this.accounts.deployer)
      .registerNFTAddress(this.token.address);
    await this.minter
      .connect(this.accounts.artist)
      .allowHoldersOfProjects(projectZero, [this.token.address], [projectZero]);
  });

  describe("constructor", async function () {
    it("reverts when given incorrect minter filter and core addresses", async function () {
      const artblocksFactory = await ethers.getContractFactory(
        "GenArt721CoreV1"
      );
      const token2 = await artblocksFactory
        .connect(this.accounts.deployer)
        .deploy(name, symbol, this.randomizer.address);

      const minterFilterFactory = await ethers.getContractFactory(
        "MinterFilterV0"
      );
      const minterFilter = await minterFilterFactory.deploy(token2.address);

      const minterFactory = await ethers.getContractFactory("MinterHolderV0");
      // fails when combine new minterFilter with the old token in constructor
      await expectRevert(
        minterFactory.deploy(this.token.address, minterFilter.address),
        "Illegal contract pairing"
      );
    });
  });

  describe("updatePricePerTokenInWei", async function () {
    it("only allows artist to update price", async function () {
      const onlyArtistErrorMessage = "Only Artist";
      // doesn't allow owner
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei),
        onlyArtistErrorMessage
      );
      // doesn't allow deployer
      await expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei),
        onlyArtistErrorMessage
      );
      // does allow artist
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei);
    });

    it("enforces price update", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist increases price
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei);
      // cannot purchase token at lower price
      // note: purchase function is overloaded, so requires full signature
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            projectZero,
            this.token.address,
            projectZeroTokenZero,
            {
              value: pricePerTokenInWei,
            }
          ),
        needMoreValueErrorMessage
      );
      // can purchase token at higher price
      await this.minter
        .connect(this.accounts.artist)
        ["purchase(uint256,address,uint256)"](
          projectZero,
          this.token.address,
          projectZeroTokenZero,
          {
            value: higherPricePerTokenInWei,
          }
        );
    });

    it("emits event upon price update", async function () {
      // artist increases price
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei)
      )
        .to.emit(this.minter, "PricePerTokenInWeiUpdated")
        .withArgs(projectZero, higherPricePerTokenInWei);
    });
  });

  describe("allowHoldersOfProjects", async function () {
    it("only allows artist to update allowed holders", async function () {
      // owner not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          .allowHoldersOfProjects(
            projectZero,
            [this.token.address],
            [projectOne]
          ),
        "Only Artist"
      );
      // additional not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .allowHoldersOfProjects(
            projectZero,
            [this.token.address],
            [projectOne]
          ),
        "Only Artist"
      );
      // artist allowed
      await this.minter
        .connect(this.accounts.artist)
        .allowHoldersOfProjects(
          projectZero,
          [this.token.address],
          [projectOne]
        );
    });

    it("emits event when update allowed holders for a single project", async function () {
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .allowHoldersOfProjects(
            projectZero,
            [this.token.address],
            [projectOne]
          )
      )
        .to.emit(this.minter, "AllowedHoldersOfProjects")
        .withArgs(projectZero, [this.token.address], [projectOne]);
    });

    it("emits event when update allowed holders for a multiple projects", async function () {
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .allowHoldersOfProjects(
            projectZero,
            [this.token.address, this.token.address],
            [projectOne, projectTwo]
          )
      )
        .to.emit(this.minter, "AllowedHoldersOfProjects")
        .withArgs(
          projectZero,
          [this.token.address, this.token.address],
          [projectOne, projectTwo]
        );
    });
  });

  describe("removeHoldersOfProjects", async function () {
    it("only allows artist to update allowed holders", async function () {
      // owner not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          .removeHoldersOfProjects(
            projectZero,
            [this.token.address],
            [projectOne]
          ),
        "Only Artist"
      );
      // additional not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .removeHoldersOfProjects(
            projectZero,
            [this.token.address],
            [projectOne]
          ),
        "Only Artist"
      );
      // artist allowed
      await this.minter
        .connect(this.accounts.artist)
        .removeHoldersOfProjects(
          projectZero,
          [this.token.address],
          [projectOne]
        );
    });

    it("emits event when removing allowed holders for a single project", async function () {
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .removeHoldersOfProjects(
            projectZero,
            [this.token.address],
            [projectOne]
          )
      )
        .to.emit(this.minter, "RemovedHoldersOfProjects")
        .withArgs(projectZero, [this.token.address], [projectOne]);
    });

    it("emits event when removing allowed holders for multiple projects", async function () {
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .removeHoldersOfProjects(
            projectZero,
            [this.token.address, this.token.address],
            [projectOne, projectTwo]
          )
      )
        .to.emit(this.minter, "RemovedHoldersOfProjects")
        .withArgs(
          projectZero,
          [this.token.address, this.token.address],
          [projectOne, projectTwo]
        );
    });
  });

  describe("allowRemoveHoldersOfProjects", async function () {
    it("only allows artist to update allowed holders", async function () {
      // owner not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          .allowRemoveHoldersOfProjects(
            projectZero,
            [this.token.address],
            [projectOne],
            [this.token.address],
            [projectOne]
          ),
        "Only Artist"
      );
      // additional not allowed
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .allowRemoveHoldersOfProjects(
            projectZero,
            [this.token.address],
            [projectOne],
            [this.token.address],
            [projectOne]
          ),
        "Only Artist"
      );
      // artist allowed
      await this.minter
        .connect(this.accounts.artist)
        .allowRemoveHoldersOfProjects(
          projectZero,
          [this.token.address],
          [projectOne],
          [this.token.address],
          [projectOne]
        );
    });

    it("emits event when removing allowed holders for a single project", async function () {
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .allowRemoveHoldersOfProjects(
            projectZero,
            [this.token.address],
            [projectOne],
            [this.token.address],
            [projectOne]
          )
      )
        .to.emit(this.minter, "AllowedHoldersOfProjects")
        .withArgs(projectZero, [this.token.address], [projectOne]);
      // remove event (for same operation, since multiple events)
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .allowRemoveHoldersOfProjects(
            projectZero,
            [this.token.address],
            [projectOne],
            [this.token.address],
            [projectOne]
          )
      )
        .to.emit(this.minter, "RemovedHoldersOfProjects")
        .withArgs(projectZero, [this.token.address], [projectOne]);
    });

    it("emits event when adding allowed holders for multiple projects", async function () {
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .allowRemoveHoldersOfProjects(
            projectZero,
            [this.token.address, this.token.address],
            [projectOne, projectTwo],
            [],
            []
          )
      )
        .to.emit(this.minter, "AllowedHoldersOfProjects")
        .withArgs(
          projectZero,
          [this.token.address, this.token.address],
          [projectOne, projectTwo]
        );
    });

    it("emits event when removing allowed holders for multiple projects", async function () {
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .allowRemoveHoldersOfProjects(
            projectZero,
            [],
            [],
            [this.token.address, this.token.address],
            [projectOne, projectTwo]
          )
      )
        .to.emit(this.minter, "RemovedHoldersOfProjects")
        .withArgs(
          projectZero,
          [this.token.address, this.token.address],
          [projectOne, projectTwo]
        );
    });
  });

  describe("isAllowlistedNFT", async function () {
    it("returns true when queried NFT is allowlisted", async function () {
      const isAllowlisted = await this.minter
        .connect(this.accounts.additional)
        .isAllowlistedNFT(
          projectZero,
          this.token.address,
          projectZeroTokenZero
        );
      expect(isAllowlisted).to.be.true;
    });

    it("returns false when queried NFT is not allowlisted", async function () {
      const isAllowlisted = await this.minter
        .connect(this.accounts.additional)
        .isAllowlistedNFT(projectZero, this.token.address, projectOneTokenZero);
      expect(isAllowlisted).to.be.false;
    });
  });

  describe("purchase", async function () {
    it("does not allow purchase without NFT ownership args", async function () {
      // expect revert due to price not being configured
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          ["purchase(uint256)"](projectZero, {
            value: pricePerTokenInWei,
          }),
        "Must claim NFT ownership"
      );
    });

    it("does not allow purchase prior to configuring price", async function () {
      // expect revert due to price not being configured
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          ["purchase(uint256,address,uint256)"](
            projectTwo,
            this.token.address,
            projectTwoTokenZero,
            {
              value: pricePerTokenInWei,
            }
          ),
        "Price not configured"
      );
    });

    it("does not allow purchase without sending enough funds", async function () {
      // expect revert due when sending zero funds
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          ["purchase(uint256,address,uint256)"](
            projectOne,
            this.token.address,
            projectZeroTokenZero,
            {
              value: 0,
            }
          ),
        "Must send minimum value to mint"
      );
      // expect revert due when sending funds less than price
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          ["purchase(uint256,address,uint256)"](
            projectOne,
            this.token.address,
            projectZeroTokenZero,
            {
              value: pricePerTokenInWei.sub(1),
            }
          ),
        "Must send minimum value to mint"
      );
    });

    describe("allows/disallows based on allowed project holder configuration", async function () {
      it("does not allow purchase when using token of unallowed project", async function () {
        // allow holders of projectOne to purchase tokens on projectTwo
        await this.minter
          .connect(this.accounts.artist)
          .allowHoldersOfProjects(
            projectTwo,
            [this.token.address],
            [projectOne]
          );
        // configure price per token to be zero
        await this.minter
          .connect(this.accounts.artist)
          .updatePricePerTokenInWei(projectTwo, 0);
        // do not allow purchase when holder token in projectZero is used as pass
        await expectRevert(
          this.minter
            .connect(this.accounts.additional)
            ["purchase(uint256,address,uint256)"](
              projectTwo,
              this.token.address,
              projectZeroTokenZero,
              {
                value: pricePerTokenInWei,
              }
            ),
          "Only allowlisted NFTs"
        );
      });

      it("does not allow purchase when using token of allowed then unallowed project", async function () {
        // allow holders of projectZero and projectOne, then remove projectZero
        await this.minter
          .connect(this.accounts.artist)
          .allowRemoveHoldersOfProjects(
            projectTwo,
            [this.token.address, this.token.address],
            [projectZero, projectOne],
            [this.token.address],
            [projectZero]
          );
        // configure price per token to be zero
        await this.minter
          .connect(this.accounts.artist)
          .updatePricePerTokenInWei(projectTwo, 0);
        // do not allow purchase when holder token in projectZero is used as pass
        await expectRevert(
          this.minter
            .connect(this.accounts.additional)
            ["purchase(uint256,address,uint256)"](
              projectTwo,
              this.token.address,
              projectZeroTokenZero,
              {
                value: pricePerTokenInWei,
              }
            ),
          "Only allowlisted NFTs"
        );
      });

      it("does allow purchase when using token of allowed project", async function () {
        // allow holders of projectZero to purchase tokens on projectTwo
        await this.minter
          .connect(this.accounts.artist)
          .allowHoldersOfProjects(
            projectTwo,
            [this.token.address],
            [projectZero]
          );
        // configure price per token to be zero
        await this.minter
          .connect(this.accounts.artist)
          .updatePricePerTokenInWei(projectTwo, 0);
        // does allow purchase when holder token in projectZero is used as pass
        await this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            projectTwo,
            this.token.address,
            projectZeroTokenZero,
            {
              value: pricePerTokenInWei,
            }
          );
      });

      it("does allow purchase when using token of allowed project (when set in bulk)", async function () {
        // allow holders of projectOne and projectZero to purchase tokens on projectTwo
        await this.minter
          .connect(this.accounts.artist)
          .allowRemoveHoldersOfProjects(
            projectTwo,
            [this.token.address, this.token.address],
            [projectOne, projectZero],
            [],
            []
          );
        // configure price per token to be zero
        await this.minter
          .connect(this.accounts.artist)
          .updatePricePerTokenInWei(projectTwo, 0);
        // does allow purchase when holder token in projectZero is used as pass
        await this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            projectTwo,
            this.token.address,
            projectZeroTokenZero,
            {
              value: pricePerTokenInWei,
            }
          );
      });

      it("does not allow purchase when using token not owned", async function () {
        // allow holders of projectZero to purchase tokens on projectTwo
        await this.minter
          .connect(this.accounts.artist)
          .allowHoldersOfProjects(
            projectTwo,
            [this.token.address],
            [projectZero]
          );
        // configure price per token to be zero
        await this.minter
          .connect(this.accounts.artist)
          .updatePricePerTokenInWei(projectTwo, 0);
        // does allow purchase when holder token in projectZero is used as pass
        await expectRevert(
          this.minter
            .connect(this.accounts.additional)
            ["purchase(uint256,address,uint256)"](
              projectTwo,
              this.token.address,
              projectZeroTokenZero,
              {
                value: pricePerTokenInWei,
              }
            ),
          "Only owner of NFT"
        );
      });
    });

    it("does allow purchase with a price of zero when intentionally configured", async function () {
      // allow holders of projectZero to purchase tokens on projectTwo
      await this.minter
        .connect(this.accounts.artist)
        .allowHoldersOfProjects(
          projectTwo,
          [this.token.address],
          [projectZero]
        );
      // configure price per token to be zero
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectTwo, 0);
      // allow purchase when intentionally configured price of zero
      await this.minter
        .connect(this.accounts.artist)
        ["purchase(uint256,address,uint256)"](
          projectTwo,
          this.token.address,
          projectZeroTokenZero,
          {
            value: pricePerTokenInWei,
          }
        );
    });

    it("does nothing if setProjectMaxInvocations is not called (fails correctly)", async function () {
      // allow holders of project zero to mint on project one
      await this.minter
        .connect(this.accounts.artist)
        .allowHoldersOfProjects(
          projectOne,
          [this.token.address],
          [projectZero]
        );
      for (let i = 0; i < projectMaxInvocations; i++) {
        await this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            projectOne,
            this.token.address,
            projectZeroTokenZero,
            {
              value: pricePerTokenInWei,
            }
          );
      }

      // expect revert after project hits max invocations
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            projectOne,
            this.token.address,
            projectZeroTokenZero,
            {
              value: pricePerTokenInWei,
            }
          ),
        "Must not exceed max invocations"
      );
    });

    it("doesnt add too much gas if setProjectMaxInvocations is set", async function () {
      // Try without setProjectMaxInvocations, store gas cost
      const tx = await this.minter
        .connect(this.accounts.artist)
        ["purchase(uint256,address,uint256)"](
          projectZero,
          this.token.address,
          projectZeroTokenZero,
          {
            value: pricePerTokenInWei,
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
      await this.minter
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(projectZero);
      const maxSetTx = await this.minter
        .connect(this.accounts.artist)
        ["purchase(uint256,address,uint256)"](
          projectZero,
          this.token.address,
          projectZeroTokenZero,
          {
            value: pricePerTokenInWei,
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

    it("fails more cheaply if setProjectMaxInvocations is set", async function () {
      // Try without setProjectMaxInvocations, store gas cost
      for (let i = 0; i < projectMaxInvocations - 1; i++) {
        await this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            projectZero,
            this.token.address,
            projectZeroTokenZero,
            {
              value: pricePerTokenInWei,
            }
          );
      }
      const artistBalanceNoMaxSet = await this.accounts.artist.getBalance();
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            projectZero,
            this.token.address,
            projectZeroTokenZero,
            {
              value: pricePerTokenInWei,
            }
          ),
        "Must not exceed max invocations"
      );
      const artistDeltaNoMaxSet = artistBalanceNoMaxSet.sub(
        BigNumber.from(await this.accounts.artist.getBalance())
      );

      // Try with setProjectMaxInvocations, store gas cost
      await this.minter
        .connect(this.accounts.artist)
        .allowHoldersOfProjects(
          projectOne,
          [this.token.address],
          [projectZero]
        );
      await this.minter
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(projectOne);
      for (let i = 0; i < projectMaxInvocations; i++) {
        await this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            projectOne,
            this.token.address,
            projectZeroTokenZero,
            {
              value: pricePerTokenInWei,
            }
          );
      }
      const artistBalanceMaxSet = BigNumber.from(
        await this.accounts.artist.getBalance()
      );
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            projectOne,
            this.token.address,
            projectZeroTokenZero,
            {
              value: pricePerTokenInWei,
            }
          ),
        "Maximum number of invocations reached"
      );
      const artistDeltaMaxSet = artistBalanceMaxSet.sub(
        BigNumber.from(await this.accounts.artist.getBalance())
      );

      console.log(
        "Gas cost with setProjectMaxInvocations: ",
        ethers.utils.formatUnits(artistDeltaMaxSet, "ether").toString(),
        "ETH"
      );
      console.log(
        "Gas cost without setProjectMaxInvocations: ",
        ethers.utils.formatUnits(artistDeltaNoMaxSet, "ether").toString(),
        "ETH"
      );

      expect(artistDeltaMaxSet.lt(artistDeltaNoMaxSet)).to.be.true;
    });
  });

  describe("calculates gas", async function () {
    it("mints and calculates gas values", async function () {
      const tx = await this.minter
        .connect(this.accounts.artist)
        ["purchase(uint256,address,uint256)"](
          projectZero,
          this.token.address,
          projectZeroTokenZero,
          {
            value: pricePerTokenInWei,
          }
        );

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed).toString();

      console.log(
        "Gas cost for a successful ERC20 mint: ",
        ethers.utils.formatUnits(txCost, "ether").toString(),
        "ETH"
      );
      expect(txCost.toString()).to.equal(ethers.utils.parseEther("0.0319919"));
    });
  });

  describe("purchaseTo", async function () {
    it("does not allow purchaseTo without NFT ownership args", async function () {
      // expect revert due to price not being configured
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          ["purchaseTo(address,uint256)"](
            this.accounts.additional.address,
            projectZero,
            {
              value: pricePerTokenInWei,
            }
          ),
        "Must claim NFT ownership"
      );
    });

    it("allows `purchaseTo` by default", async function () {
      await this.minter
        .connect(this.accounts.artist)
        ["purchaseTo(address,uint256,address,uint256)"](
          this.accounts.additional.address,
          projectZero,
          this.token.address,
          projectZeroTokenZero,
          {
            value: pricePerTokenInWei,
          }
        );
    });

    it("does not support toggling of `purchaseToDisabled`", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .togglePurchaseToDisabled(projectOne),
        "Action not supported"
      );
      // still allows `purchaseTo`.
      await this.minter
        .connect(this.accounts.artist)
        ["purchaseTo(address,uint256,address,uint256)"](
          this.accounts.additional.address,
          projectZero,
          this.token.address,
          projectZeroTokenZero,
          {
            value: pricePerTokenInWei,
          }
        );
    });
  });

  describe("setProjectMaxInvocations", async function () {
    it("handles getting tokenInfo invocation info with V1 core", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(projectOne);
      // minter should update storage with accurate projectMaxInvocations
      let maxInvocations = await this.minter
        .connect(this.accounts.deployer)
        .projectMaxInvocations(projectOne);
      expect(maxInvocations).to.be.equal(projectMaxInvocations);
      // ensure hasMaxBeenReached did not unexpectedly get set as true
      let hasMaxBeenInvoked = await this.minter
        .connect(this.accounts.deployer)
        .projectMaxHasBeenInvoked(projectOne);
      expect(hasMaxBeenInvoked).to.be.false;
      // should also support unconfigured project projectMaxInvocations
      // e.g. project 99, which does not yet exist
      await this.minter
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(99);
      maxInvocations = await this.minter
        .connect(this.accounts.deployer)
        .projectMaxInvocations(99);
      expect(maxInvocations).to.be.equal(0);
    });
  });

  describe("currency info hooks", async function () {
    const unconfiguredProjectNumber = 99;

    it("reports expected price per token", async function () {
      let currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(currencyInfo.tokenPriceInWei).to.be.equal(pricePerTokenInWei);
      // returns zero for unconfigured project price
      currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.tokenPriceInWei).to.be.equal(0);
    });

    it("reports expected isConfigured", async function () {
      let currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(currencyInfo.isConfigured).to.be.equal(true);
      // false for unconfigured project
      currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.isConfigured).to.be.equal(false);
    });

    it("reports default currency as ETH", async function () {
      let currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(currencyInfo.currencySymbol).to.be.equal("ETH");
      // should also report ETH for unconfigured project
      currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.currencySymbol).to.be.equal("ETH");
    });

    it("reports default currency address as null address", async function () {
      let currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(currencyInfo.currencyAddress).to.be.equal(constants.ZERO_ADDRESS);
      // should also report ETH for unconfigured project
      currencyInfo = await this.minter
        .connect(this.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.currencyAddress).to.be.equal(constants.ZERO_ADDRESS);
    });
  });

  describe("registered NFT address enumeration", async function () {
    it("reports expected number of registered NFT addresses after add/remove", async function () {
      const numRegisteredNFTAddresses = await this.minter
        .connect(this.accounts.additional)
        .getNumRegisteredNFTAddresses();
      expect(numRegisteredNFTAddresses).to.be.equal(BigNumber.from("1"));
      // allow a different NFT address
      await this.minter
        .connect(this.accounts.deployer)
        .registerNFTAddress(this.accounts.deployer.address); // dummy address
      // expect number of registered NFT addresses to be increased by one
      const newNumRegisteredNFTAddresses = await this.minter
        .connect(this.accounts.additional)
        .getNumRegisteredNFTAddresses();
      expect(numRegisteredNFTAddresses.add(1)).to.be.equal(
        newNumRegisteredNFTAddresses
      );
      // deny an NFT address
      await this.minter
        .connect(this.accounts.deployer)
        .unregisterNFTAddress(this.accounts.deployer.address);
      // expect number of registered NFT addresses to be increased by one
      const removedNumRegisteredNFTAddresses = await this.minter
        .connect(this.accounts.additional)
        .getNumRegisteredNFTAddresses();
      expect(numRegisteredNFTAddresses).to.be.equal(
        removedNumRegisteredNFTAddresses
      );
    });

    it("gets registered NFT address at index", async function () {
      // register another NFT address
      await this.minter
        .connect(this.accounts.deployer)
        .registerNFTAddress(this.accounts.deployer.address); // dummy address
      // expect NFT address at index zero to be token
      let NFTAddressAtZero = await this.minter
        .connect(this.accounts.additional)
        .getRegisteredNFTAddressAt(0);
      expect(NFTAddressAtZero).to.be.equal(this.token.address);
      // expect NFT address at index one to be deployer
      const NFTAddressAtOne = await this.minter
        .connect(this.accounts.additional)
        .getRegisteredNFTAddressAt(1);
      expect(NFTAddressAtOne).to.be.equal(this.accounts.deployer.address);
      // unregister an token NFT address
      await this.minter
        .connect(this.accounts.deployer)
        .unregisterNFTAddress(this.token.address);
      // expect NFT address at index zero to be deployer
      NFTAddressAtZero = await this.minter
        .connect(this.accounts.additional)
        .getRegisteredNFTAddressAt(0);
      expect(NFTAddressAtZero).to.be.equal(this.accounts.deployer.address);
    });
  });

  describe("reentrancy attack", async function () {
    it("does not allow reentrant purchaseTo", async function () {
      // attacker deploys reentrancy contract specifically for TokenHolder Merkle
      const reentrancyMockFactory = await ethers.getContractFactory(
        "ReentrancyHolderMock"
      );
      const reentrancyMock = await reentrancyMockFactory
        .connect(this.accounts.deployer)
        .deploy();

      // artist sents token zero of project zero to reentrant contract
      await this.token
        .connect(this.accounts.artist)
        .transferFrom(
          this.accounts.artist.address,
          reentrancyMock.address,
          projectZeroTokenZero
        );

      // attacker should see revert when performing reentrancy attack
      let totalTokensToMint = 2;
      let numTokensToMint = BigNumber.from(totalTokensToMint.toString());
      let totalValue = higherPricePerTokenInWei.mul(numTokensToMint);
      await expectRevert(
        reentrancyMock
          .connect(this.accounts.deployer)
          .attack(
            numTokensToMint,
            this.minter.address,
            projectZero,
            higherPricePerTokenInWei,
            this.token.address,
            projectZeroTokenZero,
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
      totalValue = higherPricePerTokenInWei.mul(numTokensToMint);
      for (let i = 0; i < totalTokensToMint; i++) {
        await reentrancyMock
          .connect(this.accounts.deployer)
          .attack(
            numTokensToMint,
            this.minter.address,
            projectZero,
            higherPricePerTokenInWei,
            this.token.address,
            projectZeroTokenZero,
            {
              value: higherPricePerTokenInWei,
            }
          );
      }
    });
  });

  describe("gnosis safe", async function () {
    it("allows gnosis safe to purchase in ETH", async function () {
      // deploy new Gnosis Safe
      const safeSdk: Safe = await getGnosisSafe(
        this.accounts.artist,
        this.accounts.additional,
        this.accounts.owner
      );
      const safeAddress = safeSdk.getAddress();

      // artist sents token zero of project zero to safe
      await this.token
        .connect(this.accounts.artist)
        .transferFrom(
          this.accounts.artist.address,
          safeAddress,
          projectZeroTokenZero
        );

      // create a transaction
      const unsignedTx = await this.minter.populateTransaction[
        "purchase(uint256,address,uint256)"
      ](projectZero, this.token.address, projectZeroTokenZero);
      const transaction: SafeTransactionDataPartial = {
        to: this.minter.address,
        data: unsignedTx.data,
        value: pricePerTokenInWei.toHexString(),
      };
      const safeTransaction = await safeSdk.createTransaction(transaction);
      // signers sign and execute the transaction
      // artist signs
      await safeSdk.signTransaction(safeTransaction);
      // additional signs
      const ethAdapterOwner2 = new EthersAdapter({
        ethers,
        signer: this.accounts.additional,
      });
      const safeSdk2 = await safeSdk.connect({
        ethAdapter: ethAdapterOwner2,
        safeAddress,
      });
      const txHash = await safeSdk2.getTransactionHash(safeTransaction);
      const approveTxResponse = await safeSdk2.approveTransactionHash(txHash);
      await approveTxResponse.transactionResponse?.wait();
      // fund the safe and execute transaction
      await this.accounts.artist.sendTransaction({
        to: safeAddress,
        value: pricePerTokenInWei,
      });
      const projectTokenInfoBefore = await this.token.projectTokenInfo(
        projectZero
      );
      const executeTxResponse = await safeSdk2.executeTransaction(
        safeTransaction
      );
      await executeTxResponse.transactionResponse?.wait();
      const projectTokenInfoAfter = await this.token.projectTokenInfo(
        projectZero
      );
      expect(projectTokenInfoAfter.invocations).to.be.equal(
        projectTokenInfoBefore.invocations.add(1)
      );
    });
  });
});
