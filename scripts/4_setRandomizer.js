var prompt = require('prompt-sync')();
const GenArt721 = require('../artifacts/GenArt721Core.json');
const {BigNumber} = require('ethers');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    "Checking:",
    deployerAddress
  );

  const genArt721Address = prompt('GenArt721 address? ');
  const randomizerAddress = prompt('Randomizer address? ');
  const genArt721 = new ethers.Contract(
    genArt721Address,
    GenArt721.abi,
    deployer //provider
  );

  let randomizer = await genArt721.updateRandomizerAddress(randomizerAddress);

  //console.log('randomizer: '+randomizer);
  //let supply = await genArt721.totalSupply();
  //console.log("supply:" +supply);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
