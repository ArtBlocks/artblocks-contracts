const {
    BN,
    constants,
    expectEvent,
    expectRevert,
    balance,
    ether
} = require('@openzeppelin/test-helpers');
const {
    ZERO_ADDRESS
} = constants;

const {
    expect
} = require('chai');
const {
    ethers
} = require('hardhat');


describe('GenArt721Minter2', async function() {

    const name = 'Non Fungible Token';
    const symbol = 'NFT';
    const firstTokenId = new BN('30000000');
    const secondTokenId = new BN('3000001');

    const pricePerTokenInWei = ethers.utils.parseEther('1');
    const projectOne = 0;
    const ONE_MINUTE = 60000;
    const ONE_HOUR = ONE_MINUTE * 60;
    const ONE_DAY = ONE_HOUR * 24;
    

    beforeEach(async function() {
        const [owner, newOwner, artist, additional, snowfro] = await ethers.getSigners();
        this.accounts = {
            "owner": owner,
            "newOwner": newOwner,
            "artist": artist,
            "additional": additional,
            "snowfro": snowfro
        }

        const randomizerFactory = await ethers.getContractFactory("Randomizer")
        this.randomizer = await randomizerFactory.deploy();

        const artblocksFactory = await ethers.getContractFactory("GenArt721Core2")
        this.token = await artblocksFactory.connect(snowfro).deploy(name, symbol, this.randomizer.address)

        const minterFilterFactory = await ethers.getContractFactory("MinterFilter")
        this.minterFilter = await minterFilterFactory.deploy(this.token.address);

        const minterFactory = await ethers.getContractFactory("GenArt721MinterEthAuction")
        this.minter = await minterFactory.deploy(this.token.address, this.minterFilter.address);


        await this.token.connect(snowfro).addProject(
            "project1",
            artist.address,
            pricePerTokenInWei,
            true
        );

        await this.token.connect(snowfro).toggleProjectIsActive(projectOne);

        await this.token.connect(snowfro).addMintWhitelisted(this.minterFilter.address);

        await this.token.connect(artist).updateProjectMaxInvocations(projectOne, 15);

        await this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectOne);

        await this.minterFilter.connect(this.accounts.snowfro).setMinterForProject(projectOne, this.minter.address);

        if (this.hasOwnProperty('startTime') && this.startTime){
          this.startTime = this.startTime + ONE_DAY;
        } else {
          this.startTime = Date.now();
        }

        startTimePlusMinuteAndTwoHours = this.startTime + ONE_HOUR * 2;
        await this.minter.connect(this.accounts.snowfro).setAuctionDetails(projectOne, this.startTime, startTimePlusMinuteAndTwoHours, ethers.utils.parseEther('1'), ethers.utils.parseEther('0.1'));
    });


    describe('purchase', async function() {
        it('Calculates the price correctly', async function() {
            await network.provider.send("evm_setNextBlockTimestamp", [this.startTime]);
            const duration = ONE_HOUR * 2; // 2 hours
            const step = ONE_MINUTE * 8; // 480 seconds
            startingPrice = ethers.utils.parseEther('1');
            endingPrice = ethers.utils.parseEther('0.1');


            for (let i = 0; i < 15; i++) {
                let ownerBalance = await this.accounts.owner.getBalance();
                let a = ethers.BigNumber.from(i * step).mul(ethers.utils.parseEther('0.9'));
                let t = ethers.BigNumber.from(a.toString());
                let price = startingPrice.sub(t.div(7200000));
                let contractPrice = await this.minter.connect(this.accounts.owner).getPrice(projectOne);
                await network.provider.send("evm_setNextBlockTimestamp", [this.startTime + (i) * 480000]);
                await this.minter.connect(this.accounts.owner).purchase(projectOne, {
                    value: price.toString(),
                    gasPrice: 0
                });
                // Test that price isn't too low

                await expectRevert(this.minter.connect(this.accounts.owner).purchase(projectOne, {
                    value: (price * 100 / 101).toString(),
                    gasPrice: 0
                }), "Must send minimum value to mint!");
                let ownerDelta = (await this.accounts.owner.getBalance()).sub(ownerBalance);
                expect(ownerDelta.mul('-1').lte(contractPrice)).to.be.true;
            }
        });

        it('Calculates the price before correctly', async function() {
            await network.provider.send("evm_setNextBlockTimestamp", [this.startTime]);

            await this.minter.connect(this.accounts.snowfro).setAuctionDetails(projectOne, this.startTime + 60000, this.startTime + 2 * ONE_HOUR, ethers.utils.parseEther('1'), ethers.utils.parseEther('0.1'));

            startingPrice = ethers.utils.parseEther('1');
            endingPrice = ethers.utils.parseEther('0.1');
            let contractPrice = await this.minter.connect(this.accounts.owner).getPrice(projectOne);
            expect(contractPrice).to.be.equal(startingPrice);
        });

        it('Calculates the price after correctly ', async function() {
            await network.provider.send("evm_setNextBlockTimestamp", [this.startTime + 5 * ONE_HOUR]);

            await this.minter.connect(this.accounts.snowfro).setAuctionDetails(projectOne, this.startTime + 60000, this.startTime + 2 * ONE_HOUR, ethers.utils.parseEther('1'), ethers.utils.parseEther('0.1'));

            startingPrice = ethers.utils.parseEther('1');
            endingPrice = ethers.utils.parseEther('0.1');
            let contractPrice = await this.minter.connect(this.accounts.owner).getPrice(projectOne);
            expect(contractPrice).to.be.equal(endingPrice);
        });
    });
});
