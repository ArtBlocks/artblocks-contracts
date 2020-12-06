const {BigNumber} = require('ethers');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    "Deploying Randomizer DAI from:",
    deployerAddress
  );

  const RandomizerDAI = await ethers.getContractFactory("RandomizerEmpty");
  const randomizerDAI = await RandomizerDAI.deploy();

  console.log('Randomizer Empty contract deployed at:', (await randomizerDAI.deployed()).address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
