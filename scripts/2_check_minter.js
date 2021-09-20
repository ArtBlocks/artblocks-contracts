var prompt = require('prompt-sync')();
const GenArt721Core = require('../artifacts/GenArt721Core.json');
const {BigNumber} = require('ethers');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    "Checking minter:",
    deployerAddress
  );

  const genArt721Address = prompt('GenArt721 address? ');
  const minterAddress = prompt('Minting Contract Address? ');
  const genArt721Core = new ethers.Contract(
    genArt721Address,
    GenArt721Core.abi,
    deployer //provider
  );

  let wl = await genArt721Core.isMintWhitelisted(

    minterAddress
  );

  console.log('whitelisted? '+wl);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
