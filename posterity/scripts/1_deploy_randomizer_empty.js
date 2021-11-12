const { BigNumber } = require("ethers");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deploying Randomizer from:", deployerAddress);

  const Randomizer = await ethers.getContractFactory("Randomizer");
  const randomizer = await Randomizer.deploy();

  console.log(
    "Randomizer contract deployed at:",
    (await randomizer.deployed()).address
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
