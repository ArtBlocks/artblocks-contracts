const {BN, constants, expectEvent, expectRevert, balance, ether} = require('@openzeppelin/test-helpers');

const {expect} = require('chai');

const GenArt721 = artifacts.require('GenArt721');

contract('GenArt721', function (accounts) {
  const [owner, newOwner, artist, additional, snowfro] = accounts;

  const name = 'Non Fungible Token';
  const symbol = 'NFT';

  const firstTokenId = new BN('0');
  const secondTokenId = new BN('1');

  const pricePerTokenInWei = ether('1');
  const projectZero = new BN('0');

  beforeEach(async function () {
    this.token = await GenArt721.new(name, symbol, {from: snowfro});

    await this.token.addWhitelisted(artist, {from: snowfro});

    await this.token.addProject(
      pricePerTokenInWei,
      true,
      {from: artist}
    );

    this.projectZeroInfo = await this.token.projectTokenInfo(projectZero);

    await this.token.toggleProjectIsActive(projectZero, {from: snowfro});
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

  describe('purchase', function () {
    it('reverts if below min amount', async function () {
      await expectRevert(this.token.purchase(projectZero, {value: 0}), 'Must send at least pricePerTokenInWei');
    });

    it('can create a token then funds distributed (no additional payee)', async function () {
      const artistBalance = await balance.tracker(artist);
      const ownerBalance = await balance.tracker(owner);
      const snowfroBalance = await balance.tracker(snowfro);
      this.token.toggleProjectIsPaused(projectZero, {from: artist});

      // pricePerTokenInWei setup above to be 1 ETH
      const tx = await this.token.purchase(projectZero, {value: pricePerTokenInWei, from: owner});
      expectEvent(tx, 'Transfer', {from: constants.ZERO_ADDRESS, to: owner, tokenId: firstTokenId});

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
      const tx = await this.token.purchase(projectZero, {value: pricePerTokenInWei, from: owner});
      expectEvent(tx, 'Transfer', {from: constants.ZERO_ADDRESS, to: owner, tokenId: firstTokenId});

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
      const tx = await this.token.purchase(projectZero, {value: pricePerTokenInWei, from: owner});
      expectEvent(tx, 'Transfer', {from: constants.ZERO_ADDRESS, to: owner, tokenId: firstTokenId});

      this.projectZeroInfo = await this.token.projectTokenInfo(projectZero);
      expect(this.projectZeroInfo.invocations).to.be.bignumber.equal('1');

      expect(await snowfroBalance.delta()).to.be.bignumber.equal(ether('0.1'));
      expect(await additionalBalance.delta()).to.be.bignumber.equal(ether('0.9'));
      expect(await ownerBalance.delta()).to.be.bignumber.equal(ether('1').mul(new BN('-1'))); // spent 1 ETH
      expect(await artistBalance.delta()).to.be.bignumber.equal(ether('0'));
    });
  });

});
