var prompt = require('prompt-sync')();
const GenArt721 = require('../artifacts/GenArt721.json');
const {BigNumber} = require('ethers');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    "Adding project:",
    deployerAddress
  );

  const genArt721Address = prompt('GenArt721 address? ');
  const genArt721 = new ethers.Contract(
    genArt721Address,
    GenArt721.abi,
    deployer //provider
  );

  await genArt721.addProject(
    "Genesis Project",
    "D.C.A.",
    "100000000000000000",
    "processing",
    "NIFTY",
    true,
  );

  console.log('addProject done');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
