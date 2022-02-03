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

describe("GenArt721FilteredMinter", async function () {
  const name = "Non Fungible Token";
  const symbol = "NFT";

  const firstTokenId = new BN("30000000");
  const secondTokenId = new BN("3000001");

  const pricePerTokenInWei = ethers.utils.parseEther("1");
  const higherPricePerTokenInWei = ethers.utils.parseEther("1.1");
  const projectZero = 0;
  const projectOne = 1;

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
    const randomizerFactory = await ethers.getContractFactory("Randomizer");
    this.randomizer = await randomizerFactory.deploy();
    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV3");
    this.token = await artblocksFactory
      .connect(snowfro)
      .deploy(name, symbol, this.randomizer.address);
    const minterFilterFactory = await ethers.getContractFactory("MinterFilter");
    this.minterFilter = await minterFilterFactory.deploy(this.token.address);
    const minterFactory = await ethers.getContractFactory(
      "GenArt721FilteredMinter"
    );
    this.minter = await minterFactory.deploy(
      this.token.address,
      this.minterFilter.address
    );

    await this.token.connect(snowfro).addProject("project0", artist.address);

    await this.token.connect(snowfro).addProject("project1", artist.address);

    await this.token.connect(snowfro).toggleProjectIsActive(projectZero);
    await this.token.connect(snowfro).toggleProjectIsActive(projectOne);

    await this.token
      .connect(snowfro)
      .updateMinterContract(this.minterFilter.address);

    await this.token
      .connect(artist)
      .updateProjectMaxInvocations(projectZero, 15);
    await this.token
      .connect(artist)
      .updateProjectMaxInvocations(projectOne, 15);

    this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectZero);
    this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectOne);

    await this.minterFilter
      .connect(this.accounts.snowfro)
      .addApprovedMinter(this.minter.address);
    await this.minterFilter
      .connect(this.accounts.snowfro)
      .setMinterForProject(projectZero, this.minter.address);
    await this.minterFilter
      .connect(this.accounts.snowfro)
      .setMinterForProject(projectOne, this.minter.address);

    // set token price for both projects on minter
    await this.minter
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(projectZero, pricePerTokenInWei);
    await this.minter
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(projectOne, pricePerTokenInWei);

    // mock ERC20 token
    const ERC20Factory = await ethers.getContractFactory("MockToken");
    this.ERC20Mock = await ERC20Factory.deploy(ethers.utils.parseEther("100"));
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
      // doesn't allow snowfro
      await expectRevert(
        this.minter
          .connect(this.accounts.snowfro)
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
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
        }),
        needMoreValueErrorMessage
      );
      // can purchase token at higher price
      await this.minter.connect(this.accounts.owner).purchase(projectZero, {
        value: higherPricePerTokenInWei,
      });
    });

    it("enforces price update only on desired project", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist increases price of project zero
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectZero, higherPricePerTokenInWei);
      // cannot purchase project zero token at lower price
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
        }),
        needMoreValueErrorMessage
      );
      // can purchase project one token at lower price
      await this.minter.connect(this.accounts.owner).purchase(projectOne, {
        value: pricePerTokenInWei,
      });
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

  describe("updateProjectCurrencyInfo", async function () {
    it("only allows artist to update currency info", async function () {
      const onlyArtistErrorMessage = "Only Artist";
      // doesn't allow owner
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          .updateProjectCurrencyInfo(
            projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow snowfro
      await expectRevert(
        this.minter
          .connect(this.accounts.snowfro)
          .updateProjectCurrencyInfo(
            projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .updateProjectCurrencyInfo(
            projectZero,
            "ETH",
            constants.ZERO_ADDRESS
          ),
        onlyArtistErrorMessage
      );
      // does allow artist
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectZero, "ETH", constants.ZERO_ADDRESS);
    });

    it("enforces currency info update and allows purchases", async function () {
      // artist changes to Mock ERC20 token
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectZero, "MOCK", this.ERC20Mock.address);
      // cannot purchase token with ETH
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
        }),
        "this project accepts a different currency and cannot accept ETH"
      );
      // approve contract and able to mint with Mock token
      await this.ERC20Mock.connect(this.accounts.owner).approve(
        this.minter.address,
        ethers.utils.parseEther("100")
      );
      await this.minter.connect(this.accounts.owner).purchase(projectZero);
      // cannot purchase token with ERC20 token when insufficient balance
      await this.ERC20Mock.connect(this.accounts.owner).transfer(
        this.accounts.artist.address,
        ethers.utils.parseEther("100").sub(pricePerTokenInWei)
      );
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectZero),
        "Insufficient balance"
      );
      // artist changes back to ETH
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectZero, "ETH", constants.ZERO_ADDRESS);
      // able to mint with ETH
      await this.minter.connect(this.accounts.owner).purchase(projectZero, {
        value: pricePerTokenInWei,
      });
    });

    it("enforces currency update only on desired project", async function () {
      const needMoreValueErrorMessage = "Must send minimum value to mint!";
      // artist changes currency info for project zero
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectZero, "MOCK", this.ERC20Mock.address);
      // can purchase project one token with ETH
      await this.minter.connect(this.accounts.owner).purchase(projectOne, {
        value: pricePerTokenInWei,
      });
    });

    it("emits event upon currency update", async function () {
      // artist changes currency info
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .updateProjectCurrencyInfo(
            projectZero,
            "MOCK",
            this.ERC20Mock.address
          )
      )
        .to.emit(this.minter, "ProjectCurrencyInfoUpdated")
        .withArgs(projectZero, "MOCK", this.ERC20Mock.address);
    });
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
      // Try without setProjectMaxInvocations, store gas cost
      const ownerBalanceNoMaxSet = await this.accounts.owner.getBalance();
      for (let i = 0; i < 15; i++) {
        await this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
          gasPrice: 1,
        });
      }
      // Add back in mint costs to get only gas costs
      const ownerDeltaNoMaxSet = (await this.accounts.owner.getBalance())
        .sub(ownerBalanceNoMaxSet)
        .add(pricePerTokenInWei.mul(15));

      // Try with setProjectMaxInvocations, store gas cost
      await this.minter
        .connect(this.accounts.snowfro)
        .setProjectMaxInvocations(projectOne);
      const ownerBalanceMaxSet = await this.accounts.owner.getBalance();
      for (let i = 0; i < 15; i++) {
        await this.minter.connect(this.accounts.owner).purchase(projectOne, {
          value: pricePerTokenInWei,
          gasPrice: 1,
        });
      }
      // Add back in mint costs to get only gas costs
      const ownerDeltaMaxSet = (await this.accounts.owner.getBalance())
        .sub(ownerBalanceMaxSet)
        .add(pricePerTokenInWei.mul(15));

      console.log(
        "Gas cost for 15 successful mints with setProjectMaxInvocations: ",
        ownerDeltaMaxSet.toString()
      );
      console.log(
        "Gas cost for 15 successful mints without setProjectMaxInvocations: ",
        ownerDeltaNoMaxSet.toString()
      );

      // Check that with setProjectMaxInvocations it's not too much moer expensive
      expect(
        ownerDeltaMaxSet.abs().lt(ownerDeltaNoMaxSet.abs().mul(110).div(100))
      ).to.be.true;
    });

    it("fails more cheaply if setProjectMaxInvocations is set", async function () {
      // Try without setProjectMaxInvocations, store gas cost
      for (let i = 0; i < 15; i++) {
        await this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
        });
      }
      const ownerBalanceNoMaxSet = await this.accounts.owner.getBalance();
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectZero, {
          value: pricePerTokenInWei,
          gasPrice: 1,
        }),
        "Must not exceed max invocations"
      );
      const ownerDeltaNoMaxSet = (await this.accounts.owner.getBalance()).sub(
        ownerBalanceNoMaxSet
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
      const ownerBalanceMaxSet = await this.accounts.owner.getBalance();
      await expectRevert(
        this.minter.connect(this.accounts.owner).purchase(projectOne, {
          value: pricePerTokenInWei,
          gasPrice: 1,
        }),
        "Maximum number of invocations reached"
      );
      const ownerDeltaMaxSet = (await this.accounts.owner.getBalance()).sub(
        ownerBalanceMaxSet
      );

      console.log(
        "Gas cost with setProjectMaxInvocations: ",
        ownerDeltaMaxSet.toString()
      );
      console.log(
        "Gas cost without setProjectMaxInvocations: ",
        ownerDeltaNoMaxSet.toString()
      );

      expect(ownerDeltaMaxSet.abs().lt(ownerDeltaNoMaxSet.abs())).to.be.true;
    });
  });

  describe("purchaseTo", async function () {
    it("allows `purchaseTo` by default", async function () {
      await this.minter
        .connect(this.accounts.owner)
        .purchaseTo(this.accounts.additional.address, projectOne, {
          value: pricePerTokenInWei,
        });
    });

    it("disallows `purchaseTo` if disallowed explicitly", async function () {
      await this.minter
        .connect(this.accounts.snowfro)
        .togglePurchaseToDisabled(projectOne);
      await expectRevert(
        this.minter
          .connect(this.accounts.owner)
          .purchaseTo(this.accounts.additional.address, projectOne, {
            value: pricePerTokenInWei,
          }),
        "No `purchaseTo` Allowed"
      );
      // still allows `purchaseTo` if destination matches sender.
      await this.minter
        .connect(this.accounts.owner)
        .purchaseTo(this.accounts.owner.address, projectOne, {
          value: pricePerTokenInWei,
        });
    });

    it("emits event when `purchaseTo` is toggled", async function () {
      // emits true when changed from initial value of false
      await expect(
        this.minter
          .connect(this.accounts.snowfro)
          .togglePurchaseToDisabled(projectOne)
      )
        .to.emit(this.minter, "PurchaseToDisabledUpdated")
        .withArgs(projectOne, true);
      // emits false when changed from initial value of true
      await expect(
        this.minter
          .connect(this.accounts.snowfro)
          .togglePurchaseToDisabled(projectOne)
      )
        .to.emit(this.minter, "PurchaseToDisabledUpdated")
        .withArgs(projectOne, false);
    });
  });

  describe("currency info hooks", async function () {
    it("reports default currency as ETH", async function () {
      const currencySymbol = await this.minter
        .connect(this.accounts.artist)
        .getCurrencySymbol(projectOne);
      expect(currencySymbol).to.be.equal("ETH");
    });

    it("reports default currency address as null address", async function () {
      const currencyAddress = await this.minter
        .connect(this.accounts.artist)
        .getCurrencyAddress(projectOne);
      expect(currencyAddress).to.be.equal(constants.ZERO_ADDRESS);
    });
  });
});
