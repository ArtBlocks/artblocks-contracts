const {BN, constants, expectEvent, expectRevert, balance, ether} = require('@openzeppelin/test-helpers');
const {ZERO_ADDRESS} = constants;

const {expect} = require('chai');

const GenArt721Core = artifacts.require('GenArt721Core');
const GenArt721Minter = artifacts.require('GenArt721Minter');
const Randomizer = artifacts.require('Randomizer');

contract('GenArt721', function (accounts) {
  const [owner, newOwner, artist, additional, snowfro] = accounts;

  const name = 'Non Fungible Token';
  const symbol = 'NFT';

  const firstTokenId = new BN('30000000');
  const secondTokenId = new BN('3000001');

  const pricePerTokenInWei = ether('1');
  const projectZero = new BN('3');

  beforeEach(async function () {
    this.randomizer = await Randomizer.new();
    this.token = await GenArt721Core.new(name, symbol, this.randomizer.address, {from: snowfro});
    this.minter = await GenArt721Minter.new(this.token.address);

    //await this.token.addWhitelisted(artist, {from: snowfro});

    await this.token.addProject(
      "name",
      artist,
      pricePerTokenInWei,
      true,
      {from: snowfro}
    );

    this.projectZeroInfo = await this.token.projectTokenInfo(projectZero);
    //await this.token.updateProjectCurrencyInfo(projectZero,"ABST",ZERO_ADDRESS, {from:artist});

    await this.token.toggleProjectIsActive(projectZero, {from: snowfro});
    await this.token.addMintWhitelisted(this.minter.address, {from: snowfro});
    await this.token.updateProjectMaxInvocations(projectZero, 15, {from:artist});


    //await this.token.toggleProjectIsPaused(projectZero, {from: artist});
    /*
    for (let i=0;i<10;i++){
      this.minter.purchase(projectZero, {value: pricePerTokenInWei, from: artist});
    }
    */
  });

  describe('has whitelisted owner', function () {
    it('has an admin', async function () {
      expect(await this.token.artblocksAddress()).to.be.equal(snowfro);
    });

    it('has an admin', async function () {
      expect(await this.token.admin()).to.be.equal(snowfro);
    });

    it('has a whitelisted account', async function () {
      expect(await this.token.isWhitelisted(snowfro)).to.be.equal(true);
    });
  });

  describe('reverts on project locked', async function(){
    it('reverts if try to modify script', async function(){
      await this.token.toggleProjectIsLocked(projectZero, {from:snowfro});
      await expectRevert(this.token.updateProjectScriptJSON(projectZero, {from:artist}), "Only if unlocked");
      //await expectRevert(this.token.updateProjectMaxInvocations(projectZero, 13, {from:artist}), "Only if unlocked");
    });
  });

  describe('purchase', async function () {
    it('reverts if below min amount', async function () {
      await expectRevert(this.minter.purchase(projectZero, {value: 0, from:artist}), 'Must send minimum value to mint!');
    });

    it('reverts if project not active', async function () {
      await expectRevert(this.minter.purchase(projectZero, {value: pricePerTokenInWei, from:snowfro}), 'Purchases are paused.');
    });



    it('can create a token then funds distributed (no additional payee)', async function () {
      const artistBalance = await balance.tracker(artist);
      const ownerBalance = await balance.tracker(owner);
      const snowfroBalance = await balance.tracker(snowfro);
      this.token.toggleProjectIsPaused(projectZero, {from: artist});

      // pricePerTokenInWei setup above to be 1 ETH
      const tx = await this.minter.purchase(projectZero, {value: pricePerTokenInWei, from: owner});
      //expectEvent(tx, 'Transfer', {from: constants.ZERO_ADDRESS, to: owner, tokenId: firstTokenId});

      this.projectZeroInfo = await this.token.projectTokenInfo(projectZero);
      expect(this.projectZeroInfo.invocations).to.be.bignumber.equal('1');

      expect(await snowfroBalance.delta()).to.be.bignumber.equal(ether('0.1'));
      expect(await artistBalance.delta()).to.be.bignumber.equal(ether('0.9'));
      expect(await ownerBalance.delta()).to.be.bignumber.equal(ether('1').mul(new BN('-1'))); // spent 1 ETH
    });

    it('can create a token then funds distributed (with additional payee)', async function () {
      const additionalBalance = await balance.tracker(additional);
      const artistBalance = await balance.tracker(artist);
      const ownerBalance = await balance.tracker(owner);
      const snowfroBalance = await balance.tracker(snowfro);

      const additionalPayeePercentage = new BN('10');
      this.token.updateProjectAdditionalPayeeInfo(projectZero, additional, additionalPayeePercentage, {from: artist});
      this.token.toggleProjectIsPaused(projectZero, {from: artist});

      // pricePerTokenInWei setup above to be 1 ETH
      const tx = await this.minter.purchase(projectZero, {value: pricePerTokenInWei, from: owner});
      //expectEvent(tx, 'Transfer', {from: constants.ZERO_ADDRESS, to: owner, tokenId: firstTokenId});

      this.projectZeroInfo = await this.token.projectTokenInfo(projectZero);
      expect(this.projectZeroInfo.invocations).to.be.bignumber.equal('1');

      expect(await snowfroBalance.delta()).to.be.bignumber.equal(ether('0.1'));
      expect(await additionalBalance.delta()).to.be.bignumber.equal(ether('0.09'));
      expect(await ownerBalance.delta()).to.be.bignumber.equal(ether('1').mul(new BN('-1'))); // spent 1 ETH
      expect(await artistBalance.delta()).to.be.bignumber.equal(ether('0.9').sub(ether('0.09')));
    });

    it('can create a token then funds distributed (with additional payee getting 100%)', async function () {
      const additionalBalance = await balance.tracker(additional);
      const artistBalance = await balance.tracker(artist);
      const ownerBalance = await balance.tracker(owner);
      const snowfroBalance = await balance.tracker(snowfro);

      const additionalPayeePercentage = new BN('100');
      this.token.updateProjectAdditionalPayeeInfo(projectZero, additional, additionalPayeePercentage, {from: artist});
      this.token.toggleProjectIsPaused(projectZero, {from: artist});

      // pricePerTokenInWei setup above to be 1 ETH
      const tx = await this.minter.purchase(projectZero, {value: pricePerTokenInWei, from: owner});
      //expectEvent(tx, 'Transfer', {from: constants.ZERO_ADDRESS, to: owner, tokenId: firstTokenId});

      this.projectZeroInfo = await this.token.projectTokenInfo(projectZero);
      expect(this.projectZeroInfo.invocations).to.be.bignumber.equal('1');

      expect(await snowfroBalance.delta()).to.be.bignumber.equal(ether('0.1'));
      expect(await additionalBalance.delta()).to.be.bignumber.equal(ether('0.9'));
      expect(await ownerBalance.delta()).to.be.bignumber.equal(ether('1').mul(new BN('-1'))); // spent 1 ETH
      expect(await artistBalance.delta()).to.be.bignumber.equal(ether('0'));
    });



});
});
