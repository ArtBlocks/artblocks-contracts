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


describe('MinterFilter', async function() {

    const name = 'Non Fungible Token';
    const symbol = 'NFT';

    const firstTokenId = new BN('30000000');
    const secondTokenId = new BN('3000001');

    const pricePerTokenInWei = ethers.utils.parseEther('1');
    const projectOne = 0;
    const projectTwo = 1;
    const projectThree = 2;

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

        const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV2")
        this.token = await artblocksFactory.connect(snowfro).deploy(name, symbol, this.randomizer.address)

        const minterFilterFactory = await ethers.getContractFactory("MinterFilter")
        this.minterFilter = await minterFilterFactory.deploy(this.token.address);

        const minterFactory = await ethers.getContractFactory("GenArt721FilteredMinterETH")
        this.minter1 = await minterFactory.deploy(this.token.address, this.minterFilter.address);
        this.minter2 = await minterFactory.deploy(this.token.address, this.minterFilter.address);
        this.minter3 = await minterFactory.deploy(this.token.address, this.minterFilter.address);

        await this.token.connect(snowfro).addProject(
            "project1",
            artist.address,
            pricePerTokenInWei,
        );

        await this.token.connect(snowfro).addProject(
            "project2",
            artist.address,
            pricePerTokenInWei,
        );

        await this.token.connect(snowfro).addProject(
            "project3",
            artist.address,
            pricePerTokenInWei,
        );

        await this.token.connect(snowfro).toggleProjectIsActive(projectOne);
        await this.token.connect(snowfro).toggleProjectIsActive(projectTwo);
        await this.token.connect(snowfro).toggleProjectIsActive(projectThree);

        await this.token.connect(snowfro).addMintWhitelisted(this.minterFilter.address);

        await this.token.connect(artist).updateProjectMaxInvocations(projectOne, 15);
        await this.token.connect(artist).updateProjectMaxInvocations(projectTwo, 15);
        await this.token.connect(artist).updateProjectMaxInvocations(projectThree, 15);

        await this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectOne);
        await this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectTwo);
        await this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectThree);

        await this.minterFilter.connect(this.accounts.snowfro).setMinterForProject(projectOne, this.minter1.address);
        await this.minterFilter.connect(this.accounts.snowfro).setMinterForProject(projectTwo, this.minter2.address);
        // We leave project three with no minter on purpose
    });


    describe('purchase', async function() {
        it('Allows purchases through the correct minter', async function() {
            for (let i = 0; i < 15; i++) {
                await this.minter1.connect(this.accounts.owner).purchase(projectOne, {
                    value: pricePerTokenInWei
                });
            }
            for (let i = 0; i < 15; i++) {
                await this.minter2.connect(this.accounts.owner).purchase(projectTwo, {
                    value: pricePerTokenInWei
                });
            }
        });
        it('Allows purchases through the default minter if not set', async function() {
            await this.minterFilter.connect(this.accounts.snowfro).setDefaultMinter(this.minter1.address);
            for (let i = 0; i < 15; i++) {
                await this.minter1.connect(this.accounts.owner).purchase(projectThree, {
                    value: pricePerTokenInWei
                });
            }
        });

        it('Blocks purchases through the incorrect minter', async function() {
            await expectRevert(this.minter2.connect(this.accounts.owner).purchase(projectOne, {
                value: pricePerTokenInWei
            }), "Not sent from correct minter for project");
            await expectRevert(this.minter1.connect(this.accounts.owner).purchase(projectTwo, {
                value: pricePerTokenInWei
            }), "Not sent from correct minter for project");

            await expectRevert(this.minter1.connect(this.accounts.owner).purchase(projectThree, {
                value: pricePerTokenInWei
            }), "Not sent from correct minter for project");
            await expectRevert(this.minter2.connect(this.accounts.owner).purchase(projectThree, {
                value: pricePerTokenInWei
            }), "Not sent from correct minter for project");

            await expectRevert(this.minter3.connect(this.accounts.owner).purchase(projectOne, {
                value: pricePerTokenInWei
            }), "Not sent from correct minter for project");
            await expectRevert(this.minter3.connect(this.accounts.owner).purchase(projectTwo, {
                value: pricePerTokenInWei
            }), "Not sent from correct minter for project");
            await expectRevert(this.minter3.connect(this.accounts.owner).purchase(projectThree, {
                value: pricePerTokenInWei
            }), "Not sent from correct minter for project");
        });
    });
});
