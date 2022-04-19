import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

describe("GenArt721Minter", async function () {
  const name = "Non Fungible Token";
  const symbol = "NFT";

  const firstTokenId = new BN("30000000");
  const secondTokenId = new BN("3000001");

  const pricePerTokenInWei = ethers.utils.parseEther("1");
  const projectZero = 3; // V1 core starts at project 3
  const projectOne = 4;

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
    // deploy and configure minter filter and minter
    const minterFilterFactory = await ethers.getContractFactory(
      "MinterFilterV0"
    );
    this.minterFilter = await minterFilterFactory.deploy(this.token.address);
    const minterFactory = await ethers.getContractFactory("MinterSetPriceV0");
    this.minter = await minterFactory.deploy(
      this.token.address,
      this.minterFilter.address
    );
    await this.minterFilter
      .connect(snowfro)
      .addApprovedMinter(this.minter.address);
    await this.token
      .connect(snowfro)
      .addMintWhitelisted(this.minterFilter.address);
    // add projects
    await this.token
      .connect(snowfro)
      .addProject("project1", artist.address, 0, false);
    await this.token
      .connect(snowfro)
      .addProject("project2", artist.address, 0, false);

    await this.token.connect(snowfro).toggleProjectIsActive(projectZero);
    await this.token.connect(snowfro).toggleProjectIsActive(projectOne);

    await this.token
      .connect(artist)
      .updateProjectMaxInvocations(projectZero, 15);
    await this.token
      .connect(artist)
      .updateProjectMaxInvocations(projectOne, 15);

    this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectZero);
    this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectOne);

    // set project minters and prices
    await this.minter
      .connect(artist)
      .updatePricePerTokenInWei(projectZero, pricePerTokenInWei);
    await this.minter
      .connect(artist)
      .updatePricePerTokenInWei(projectOne, pricePerTokenInWei);
    await this.minterFilter
      .connect(artist)
      .setMinterForProject(projectZero, this.minter.address);
    await this.minterFilter
      .connect(artist)
      .setMinterForProject(projectOne, this.minter.address);
  });

  describe("purchase", async function () {
    it("does nothing if setProjectMaxInvocations is not called (fails correctly)", async function () {
      for (let i = 0; i < 15; i++) {
        await this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
        });
      }

      const ownerBalance = await this.accounts.owner.getBalance();
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
        }),
        "Must not exceed max invocations"
      );
    });

    it("doesnt add too much gas if setProjectMaxInvocations is set", async function () {
      const tx = await this.minter
        .connect(this.accounts.owner)
        .purchase(projectZero, {
          value: pricePerTokenInWei,
        });

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      let gasCostNoMaxInvocations: any = receipt.effectiveGasPrice
        .mul(receipt.gasUsed)
        .toString();
      gasCostNoMaxInvocations = parseFloat(
        ethers.utils.formatUnits(gasCostNoMaxInvocations, "ether")
      );

      // Try with setProjectMaxInvocations, store gas cost
      await this.minter
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(projectOne);

      const maxSetTx = await this.minter
        .connect(this.accounts.owner)
        .purchase(projectOne, {
          value: pricePerTokenInWei,
        });
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
        "Gas cost for a mint with setProjectMaxInvocations: ",
        gasCostMaxInvocations.toString(), 'ETH'
      );
      console.log(
        "Gas cost for a mint without setProjectMaxInvocations: ",
        gasCostNoMaxInvocations.toString(), 'ETH'
      );

      // Check that with setProjectMaxInvocations it's cheaper or not too much more expensive
      expect(gasCostMaxInvocations < (gasCostNoMaxInvocations * 110) / 100).to
        .be.true;
    });

    it("fails more cheaply if setProjectMaxInvocations is set", async function () {
      // Try without setProjectMaxInvocations, store gas cost
      for (let i = 0; i < 15; i++) {
        await this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
        });
      }
      const ownerBalanceNoMaxSet = BigNumber.from(
        await this.accounts.owner.getBalance()
      );
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
        }),
        "Must not exceed max invocations"
      );
      const ownerDeltaNoMaxSet = ownerBalanceNoMaxSet.sub(
        BigNumber.from(await this.accounts.owner.getBalance())
      );

      // Try with setProjectMaxInvocations, store gas cost
      await this.minter
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(projectOne);
      for (let i = 0; i < 15; i++) {
        await this.minter.connect(this.accounts.owner).purchase(projectOne, {
          value: pricePerTokenInWei,
        });
      }
      const ownerBalanceMaxSet = BigNumber.from(
        await this.accounts.owner.getBalance()
      );
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectOne, {
          value: pricePerTokenInWei,
        }),
        "Maximum number of invocations reached"
      );
      const ownerDeltaMaxSet = ownerBalanceMaxSet.sub(
        BigNumber.from(await this.accounts.owner.getBalance())
      );

      console.log(
        "Gas cost with setProjectMaxInvocations: ",
        ethers.utils.formatUnits(ownerDeltaMaxSet, "ether").toString(), 'ETH'
      );
      console.log(
        "Gas cost without setProjectMaxInvocations: ",
        ethers.utils.formatUnits(ownerDeltaNoMaxSet, "ether").toString(), 'ETH'
      );

      expect(ownerDeltaMaxSet.lt(ownerDeltaNoMaxSet)).to.be.true;
    });
  });
});
