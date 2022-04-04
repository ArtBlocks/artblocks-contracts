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
      this.token = await artblocksFactory
        .connect(snowfro)
        .deploy(name, symbol, this.randomizer.address);
      // deploy and configure minter filter and minter
      const minterFilterFactory = await ethers.getContractFactory(
        "MinterFilterV0"
      );
      this.minterFilter = await minterFilterFactory.deploy(this.token.address);
      const minterSetETHPriceFactory = await ethers.getContractFactory("MinterSetPriceV0");
      this.minterETH = await minterSetETHPriceFactory.deploy(
        this.token.address,
        this.minterFilter.address
      );

      /////// TEST NEW MINTERS
      this.ERC20token = await artblocksFactory
        .connect(snowfro)
        .deploy(name, symbol, this.randomizer.address);

      this.ERC20MinterFilter = await minterFilterFactory.deploy(this.ERC20token.address);
      const minterSetERC20PriceFactory = await ethers.getContractFactory("MinterSetPriceERC20V0");
      this.minterERC20 = await minterSetERC20PriceFactory.deploy(
        this.ERC20token.address,
        this.ERC20MinterFilter.address
      );

    //   const minterSetDALinearFactory = await ethers.getContractFactory("MinterDALinV0");
    //   this.minterDALinear = await minterSetDALinearFactory.deploy(
    //     this.token.address,
    //     this.minterFilter.address
    //   );

    //   const minterSetDAExponentialFactory = await ethers.getContractFactory("MinterDAExpV0");
    //   this.minterDAExponential = await minterSetDAExponentialFactory.deploy(
    //     this.token.address,
    //     this.minterFilter.address
    //   );

      await this.minterFilter
        .connect(snowfro)
        .addApprovedMinter(this.minterETH.address);
      await this.token
        .connect(snowfro)
        .addMintWhitelisted(this.minterFilter.address);
      // add project
      await this.token
        .connect(snowfro)
        .addProject("name", artist.address, 0, false);
      await this.token.connect(snowfro).toggleProjectIsActive(projectZero);
      await this.token
        .connect(artist)
        .updateProjectMaxInvocations(projectZero, maxInvocations);
      // set project's minter and price
      await this.minter
        .connect(artist)
        .updatePricePerTokenInWei(projectZero, pricePerTokenInWei);
      await this.minterFilter
        .connect(artist)
        .setMinterForProject(projectZero, this.minterETH.address);
      // get project's info
      this.projectZeroInfo = await this.token.projectTokenInfo(projectZero);
    });
  
  });
  