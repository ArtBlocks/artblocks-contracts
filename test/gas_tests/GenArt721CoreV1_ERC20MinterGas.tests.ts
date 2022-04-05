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
  
  /**
   * These tests are intended to check the average gas costs of each minter filter
   * with the V1 core contract.
   */
  describe("GenArt721CoreV1", async function () {
    const name = "Non Fungible Token";
    const symbol = "NFT";
  
    const firstTokenId = new BN("30000000");
    const secondTokenId = new BN("3000001");
  
    const pricePerTokenInWei = ethers.utils.parseEther("1");
    const projectZero = 3; // V1 core starts at project 3
  
    const maxInvocations = 15;
  
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
      this.ERC20token = await artblocksFactory
        .connect(snowfro)
        .deploy(name, symbol, this.randomizer.address);

      // deploy and configure minter filter and minter
      const minterFilterFactory = await ethers.getContractFactory(
        "MinterFilterV0"
      );

      this.minterFilter = await minterFilterFactory.deploy(this.ERC20token.address);
      const minterSetERC20PriceFactory = await ethers.getContractFactory("MinterSetPriceERC20V0");
      this.minterERC20 = await minterSetERC20PriceFactory.deploy(
        this.ERC20token.address,
        this.minterFilter.address
      );


    await this.minterFilter
      .connect(snowfro)
      .addApprovedMinter(this.minterERC20.address);
    await this.ERC20token
      .connect(snowfro)
      .addMintWhitelisted(this.minterFilter.address);
    // add project
    await this.ERC20token
      .connect(snowfro)
      .addProject("name", artist.address, 0, false);
    await this.ERC20token.connect(snowfro).toggleProjectIsActive(projectZero);
    await this.ERC20token.connect(artist).toggleProjectIsPaused(projectZero);
    await this.ERC20token
      .connect(artist)
      .updateProjectMaxInvocations(projectZero, maxInvocations);
    // set project's minter and price
    await this.minterERC20
      .connect(artist)
      .updatePricePerTokenInWei(projectZero, pricePerTokenInWei);
    await this.minterFilter
      .connect(artist)
      .setMinterForProject(projectZero, this.minterERC20.address);
      // console.log('project: ', await this.ERC20token.connect(snowfro).projectDetails(3))
    // get project's info
    this.projectZeroInfo = await this.ERC20token.projectTokenInfo(projectZero);
    });

    //TEST GAS COSTS FOR MINTER

    describe("GAS TEST | ERC20 MINTER : ", async function () {
      it("mints and calculates gas values", async function () {
        // Try without setProjectMaxInvocations, store gas cost
        const ownerBalanceNoMaxSet = await this.accounts.owner.getBalance();
  
        for (let i = 0; i < 15; i++) {
          await this.minterERC20.connect(this.accounts.owner).purchase(projectZero, {
            value: pricePerTokenInWei,
            gasPrice: 1,
          });
        }
        // Add back in mint costs to get only gas costs
        const ownerDeltaNoMaxSet = (await this.accounts.owner.getBalance())
          .sub(ownerBalanceNoMaxSet)
          .add(pricePerTokenInWei.mul(15));

          console.log(
            "Gas cost for 15 successful mints without setProjectMaxInvocations: ",
            ownerDeltaNoMaxSet.toString()
          );

          expect(parseInt(ownerDeltaNoMaxSet.toString())).to.be.lessThan(0);
      })
    });
  });
  