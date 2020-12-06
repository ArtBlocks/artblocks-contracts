var prompt = require('prompt-sync')();
const GenArt721 = require('../artifacts/GenArt721.json');
const {BigNumber} = require('ethers');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    "Adding minter:",
    deployerAddress
  );

  const genArt721Address = prompt('GenArt721 address? ');
  const minterAddress = prompt('Minting Contract Address? ');
  const genArt721 = new ethers.Contract(
    genArt721Address,
    GenArt721.abi,
    deployer //provider
  );

  await genArt721.addMintWhitelisted(

    minterAddress
  );

  console.log('addMinter done');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
