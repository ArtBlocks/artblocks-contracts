var prompt = require('prompt-sync')();
const GenArt721 = require('../artifacts/GenArt721.json');
const {BigNumber} = require('ethers');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    "checking supply:",
    deployerAddress
  );

  const genArt721Address = prompt('GenArt721 address? ');
  const genArt721 = new ethers.Contract(
    genArt721Address,
    GenArt721.abi,
    deployer //provider
  );

  let supply = await genArt721.projectTokenInfo(0);
  //let maxInvocations = await genArt721.

  console.log('project details: '+supply);
  //let supply = await genArt721.totalSupply();
  //console.log("supply:" +supply);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
