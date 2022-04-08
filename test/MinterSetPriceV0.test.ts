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

/**
 * These tests intended to ensure Filtered Minter integrates properly with V1
 * core contract.
 */
describe("GenArt721MinterEthAuction_V1Core", async function () {
  const name = "Non Fungible Token";
  const symbol = "NFT";

  const firstTokenId = new BN("30000000");
  const secondTokenId = new BN("3000001");

  const pricePerTokenInWei = ethers.utils.parseEther("1");
  const higherPricePerTokenInWei = pricePerTokenInWei.add(
    ethers.utils.parseEther("0.1")
  );
  const projectOne = 3; // V1 core starts at project 3
  const projectTwo = 4;
  const projectThree = 5;

  const projectMaxInvocations = 15;

  beforeEach(async function () {
    const [owner, newOwner, artist, additional, snowfro] =
      await ethers.getSigners();
    this.accounts = {
      owner: owner,
      newOwner: newOwner,
      artist: artist,
      additional: additional,
      snowfro: snowfro,
    };
    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();

    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV1");
    this.token = await artblocksFactory
      .connect(snowfro)
      .deploy(name, symbol, this.randomizer.address);

    const minterFilterFactory = await ethers.getContractFactory(
      "MinterFilterV0"
    );
    this.minterFilter = await minterFilterFactory.deploy(this.token.address);

    const minterFactory = await ethers.getContractFactory("MinterSetPriceV0");
    this.minter1 = await minterFactory.deploy(
      this.token.address,
      this.minterFilter.address
    );
    this.minter2 = await minterFactory.deploy(
      this.token.address,
      this.minterFilter.address
    );
    this.minter3 = await minterFactory.deploy(
      this.token.address,
      this.minterFilter.address
    );

    await this.token
      .connect(snowfro)
      .addProject("project1", artist.address, 0, false);

    await this.token
      .connect(snowfro)
      .addProject("project2", artist.address, 0, false);

    await this.token
      .connect(snowfro)
      .addProject("project3", artist.address, 0, false);

    await this.token.connect(snowfro).toggleProjectIsActive(projectOne);
    await this.token.connect(snowfro).toggleProjectIsActive(projectTwo);
    await this.token.connect(snowfro).toggleProjectIsActive(projectThree);

    await this.token
      .connect(snowfro)
      .addMintWhitelisted(this.minterFilter.address);

    await this.token
      .connect(artist)
      .updateProjectMaxInvocations(projectOne, projectMaxInvocations);
    await this.token
      .connect(artist)
      .updateProjectMaxInvocations(projectTwo, projectMaxInvocations);
    await this.token
      .connect(artist)
      .updateProjectMaxInvocations(projectThree, projectMaxInvocations);

    await this.token.connect(artist).toggleProjectIsPaused(projectOne);
    await this.token.connect(artist).toggleProjectIsPaused(projectTwo);
    await this.token.connect(artist).toggleProjectIsPaused(projectThree);

    await this.minterFilter
      .connect(this.accounts.snowfro)
      .addApprovedMinter(this.minter1.address);
    await this.minterFilter
      .connect(this.accounts.snowfro)
      .addApprovedMinter(this.minter2.address);
    await this.minterFilter
      .connect(this.accounts.snowfro)
      .addApprovedMinter(this.minter3.address);

    await this.minterFilter
      .connect(this.accounts.snowfro)
      .setMinterForProject(projectOne, this.minter1.address);
    await this.minterFilter
      .connect(this.accounts.snowfro)
      .setMinterForProject(projectTwo, this.minter2.address);
    // We leave project three with no minter on purpose

    // set token price for first two projects on minter one
    await this.minter1
      .connect(artist)
      .updatePricePerTokenInWei(projectOne, pricePerTokenInWei);
    await this.minter1
      .connect(artist)
      .updatePricePerTokenInWei(projectTwo, pricePerTokenInWei);
  });

  describe("constructor", async function () {
    it("reverts when given incorrect minter filter and core addresses", async function () {
      const artblocksFactory = await ethers.getContractFactory(
        "GenArt721CoreV1"
      );
      const token2 = await artblocksFactory
        .connect(this.accounts.snowfro)
        .deploy(name, symbol, this.randomizer.address);

      const minterFilterFactory = await ethers.getContractFactory(
        "MinterFilterV0"
      );
      const minterFilter = await minterFilterFactory.deploy(token2.address);

      const minterFactory = await ethers.getContractFactory(
        "MinterSetPriceERC20V0"
      );
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
        this.minter1
          .connect(this.accounts.owner)
          .updatePricePerTokenInWei(projectOne, higherPricePerTokenInWei),
        onlyArtistErrorMessage
      );
      // doesn't allow snowfro
      await expectRevert(
        this.minter1
          .connect(this.accounts.snowfro)
          .updatePricePerTokenInWei(projectOne, higherPricePerTokenInWei),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        this.minter1
          .connect(this.accounts.additional)
          .updatePricePerTokenInWei(projectOne, higherPricePerTokenInWei),
        onlyArtistErrorMessage
      );
      // does allow artist
      await this.minter1
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectOne, higherPricePerTokenInWei);
    });

    it("enforces price update", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist increases price
      await this.minter1
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectOne, higherPricePerTokenInWei);
      // cannot purchase token at lower price
      await expectRevert(
        this.minter1.connect(this.accounts.owner).purchase(projectOne, {
          value: pricePerTokenInWei,
        }),
        needMoreValueErrorMessage
      );
      // can purchase token at higher price
      await this.minter1.connect(this.accounts.owner).purchase(projectOne, {
        value: higherPricePerTokenInWei,
      });
    });

    it("enforces price update only on desired project", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // update project two to use minter one
      await this.minterFilter
        .connect(this.accounts.snowfro)
        .setMinterForProject(projectTwo, this.minter1.address);
      // artist increases price of project one
      await this.minter1
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectOne, higherPricePerTokenInWei);
      // cannot purchase project one token at lower price
      await expectRevert(
        this.minter1.connect(this.accounts.owner).purchase(projectOne, {
          value: pricePerTokenInWei,
        }),
        needMoreValueErrorMessage
      );
      // can purchase project two token at lower price
      await this.minter1.connect(this.accounts.owner).purchase(projectTwo, {
        value: pricePerTokenInWei,
      });
    });

    it("emits event upon price update", async function () {
      // artist increases price
      await expect(
        this.minter1
          .connect(this.accounts.artist)
          .updatePricePerTokenInWei(projectOne, higherPricePerTokenInWei)
      )
        .to.emit(this.minter1, "PricePerTokenInWeiUpdated")
        .withArgs(projectOne, higherPricePerTokenInWei);
    });
  });

  describe("purchase", async function () {
    it("does not allow purchase prior to configuring price", async function () {
      await this.minterFilter
        .connect(this.accounts.snowfro)
        .setMinterForProject(projectThree, this.minter3.address);
      await expectRevert(
        this.minter3.connect(this.accounts.owner).purchase(projectThree, {
          value: pricePerTokenInWei,
        }),
        "Price not configured"
      );
    });

    it("allows purchases through the correct minter", async function () {
      for (let i = 0; i < 15; i++) {
        await this.minter1.connect(this.accounts.owner).purchase(projectOne, {
          value: pricePerTokenInWei,
        });
      }
      await this.minter2
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectTwo, pricePerTokenInWei);
      for (let i = 0; i < 15; i++) {
        await this.minter2.connect(this.accounts.owner).purchase(projectTwo, {
          value: pricePerTokenInWei,
        });
      }
    });

    it("blocks purchases through the incorrect minter", async function () {
      const noAssignedMinterErrorMessage = "EnumerableMap: nonexistent key";
      const OnlyAssignedMinterErrorMessage = "Only assigned minter";
      // project one on minter two
      await this.minter2
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectOne, pricePerTokenInWei);
      await expectRevert(
        this.minter2.connect(this.accounts.owner).purchase(projectOne, {
          value: pricePerTokenInWei,
        }),
        OnlyAssignedMinterErrorMessage
      );
      // project two on minter one
      await this.minter1
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectTwo, pricePerTokenInWei);
      await expectRevert(
        this.minter1.connect(this.accounts.owner).purchase(projectTwo, {
          value: pricePerTokenInWei,
        }),
        OnlyAssignedMinterErrorMessage
      );
      // project three on minter one
      await this.minter1
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectThree, pricePerTokenInWei);
      await expectRevert(
        this.minter1.connect(this.accounts.owner).purchase(projectThree, {
          value: pricePerTokenInWei,
        }),
        noAssignedMinterErrorMessage
      );
      // project three on minter two
      await this.minter2
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectThree, pricePerTokenInWei);
      await expectRevert(
        this.minter2.connect(this.accounts.owner).purchase(projectThree, {
          value: pricePerTokenInWei,
        }),
        noAssignedMinterErrorMessage
      );
      // project three on minter three
      await this.minter3
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectOne, pricePerTokenInWei);
      await expectRevert(
        this.minter3.connect(this.accounts.owner).purchase(projectOne, {
          value: pricePerTokenInWei,
        }),
        OnlyAssignedMinterErrorMessage
      );
      // project two on minter three
      await this.minter3
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectTwo, pricePerTokenInWei);
      await expectRevert(
        this.minter3.connect(this.accounts.owner).purchase(projectTwo, {
          value: pricePerTokenInWei,
        }),
        OnlyAssignedMinterErrorMessage
      );
      // project three on minter three
      await this.minter3
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectThree, pricePerTokenInWei);
      await expectRevert(
        this.minter3.connect(this.accounts.owner).purchase(projectThree, {
          value: pricePerTokenInWei,
        }),
        noAssignedMinterErrorMessage
      );
    });
  });

  describe('calculates gas', async function () {
    it("mints and calculates gas values", async function () {
      const ownerBalanceNoMaxSet = await this.accounts.owner.getBalance();

      await this.minter1.connect(this.accounts.owner).purchase(projectOne, {
        value: pricePerTokenInWei
      });

      const remainingBalance = await this.accounts.owner.getBalance()

      const formattedPrice = ethers.utils.formatUnits(pricePerTokenInWei, 'wei')

      // Add back in mint costs to get only gas costs
      const ownerTxCost = ownerBalanceNoMaxSet - remainingBalance - parseInt(formattedPrice)

        console.log(
          "Gas cost for a successful Ether mint: ",
          ownerTxCost.toString()
        );

        expect(parseInt(ownerTxCost.toString())).to.be.lessThan(0);
    })
  })

  describe("purchaseTo", async function () {
    it("does not allow purchase prior to configuring price", async function () {
      await this.minterFilter
        .connect(this.accounts.snowfro)
        .setMinterForProject(projectThree, this.minter3.address);
      await expectRevert(
        this.minter3
          .connect(this.accounts.owner)
          .purchaseTo(this.accounts.additional.address, projectThree, {
            value: pricePerTokenInWei,
          }),
        "Price not configured"
      );
    });

    it("allows `purchaseTo` by default", async function () {
      await this.minter1
        .connect(this.accounts.owner)
        .purchaseTo(this.accounts.additional.address, projectOne, {
          value: pricePerTokenInWei,
        });
    });

    it("disallows `purchaseTo` if disallowed explicitly", async function () {
      await this.minter1
        .connect(this.accounts.snowfro)
        .togglePurchaseToDisabled(projectOne);
      await expectRevert(
        this.minter1
          .connect(this.accounts.owner)
          .purchaseTo(this.accounts.additional.address, projectOne, {
            value: pricePerTokenInWei,
          }),
        "No `purchaseTo` Allowed"
      );
      // still allows `purchaseTo` if destination matches sender.
      await this.minter1
        .connect(this.accounts.owner)
        .purchaseTo(this.accounts.owner.address, projectOne, {
          value: pricePerTokenInWei,
        });
    });

    it("emits event when `purchaseTo` is toggled", async function () {
      // emits true when changed from initial value of false
      await expect(
        this.minter1
          .connect(this.accounts.snowfro)
          .togglePurchaseToDisabled(projectOne)
      )
        .to.emit(this.minter1, "PurchaseToDisabledUpdated")
        .withArgs(projectOne, true);
      // emits false when changed from initial value of true
      await expect(
        this.minter1
          .connect(this.accounts.snowfro)
          .togglePurchaseToDisabled(projectOne)
      )
        .to.emit(this.minter1, "PurchaseToDisabledUpdated")
        .withArgs(projectOne, false);
    });
  });

  describe("setProjectMaxInvocations", async function () {
    it("handles getting tokenInfo invocation info with V1 core", async function () {
      await this.minter1
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(projectOne);
      // minter should update storage with accurate projectMaxInvocations
      await this.minter1
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(projectOne);
      let maxInvocations = await this.minter1
        .connect(this.accounts.snowfro)
        .projectMaxInvocations(projectOne);
      expect(maxInvocations).to.be.equal(projectMaxInvocations);
      // ensure hasMaxBeenReached did not unexpectedly get set as true
      let hasMaxBeenInvoked = await this.minter1
        .connect(this.accounts.snowfro)
        .projectMaxHasBeenInvoked(projectOne);
      expect(hasMaxBeenInvoked).to.be.false;
      // ensure minter2 gives same results
      await this.minter2
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(projectTwo);
      await this.minter2
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(projectTwo);
      maxInvocations = await this.minter2
        .connect(this.accounts.snowfro)
        .projectMaxInvocations(projectTwo);
      expect(maxInvocations).to.be.equal(projectMaxInvocations);
      // should also support unconfigured project projectMaxInvocations
      // e.g. projectOne on minter3 - still update to accurate max invocations
      await this.minter3
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(projectOne);
      maxInvocations = await this.minter3
        .connect(this.accounts.snowfro)
        .projectMaxInvocations(projectOne);
      expect(maxInvocations).to.be.equal(projectMaxInvocations);
    });
  });

  describe("currency info hooks", async function () {
    const unconfiguredProjectNumber = 99;

    it("reports expected price per token", async function () {
      let currencyInfo = await this.minter1
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(currencyInfo.tokenPriceInWei).to.be.equal(pricePerTokenInWei);
      // returns zero for unconfigured project price
      currencyInfo = await this.minter1
        .connect(this.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.tokenPriceInWei).to.be.equal(0);
    });

    it("reports expected isConfigured", async function () {
      let currencyInfo = await this.minter1
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(currencyInfo.isConfigured).to.be.equal(true);
      // false for unconfigured project
      currencyInfo = await this.minter1
        .connect(this.accounts.artist)
        .getPriceInfo(unconfiguredProjectNumber);
      expect(currencyInfo.isConfigured).to.be.equal(false);
    });

    it("reports currency as ETH", async function () {
      const priceInfo = await this.minter1
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(priceInfo.currencySymbol).to.be.equal("ETH");
    });

    it("reports currency address as null address", async function () {
      const priceInfo = await this.minter1
        .connect(this.accounts.artist)
        .getPriceInfo(projectOne);
      expect(priceInfo.currencyAddress).to.be.equal(constants.ZERO_ADDRESS);
    });
  });

  describe("reentrancy attack", async function () {
    it("does not allow reentrant purchaseTo", async function () {
      // admin allows contract buys
      await this.minter1
        .connect(this.accounts.snowfro)
        .toggleContractMintable(projectOne);
      // attacker deploys reentrancy contract
      const reentrancyMockFactory = await ethers.getContractFactory(
        "ReentrancyMock"
      );
      const reentrancyMock = await reentrancyMockFactory
        .connect(this.accounts.snowfro)
        .deploy();
      // attacker should see revert when performing reentrancy attack
      const totalTokensToMint = 2;
      let numTokensToMint = BigNumber.from(totalTokensToMint.toString());
      let totalValue = higherPricePerTokenInWei.mul(numTokensToMint);
      await expectRevert(
        reentrancyMock
          .connect(this.accounts.snowfro)
          .attack(
            numTokensToMint,
            this.minter1.address,
            projectOne,
            higherPricePerTokenInWei,
            {
              value: totalValue,
            }
          ),
        // failure message occurs during refund, where attack reentrency occurs
        "Refund failed"
      );
      // attacker should be able to purchase ONE token at a time w/refunds
      numTokensToMint = BigNumber.from("1");
      totalValue = higherPricePerTokenInWei.mul(numTokensToMint);
      for (let i = 0; i < totalTokensToMint; i++) {
        await reentrancyMock
          .connect(this.accounts.snowfro)
          .attack(
            numTokensToMint,
            this.minter1.address,
            projectOne,
            higherPricePerTokenInWei,
            {
              value: higherPricePerTokenInWei,
            }
          );
      }
    });
  });
});
