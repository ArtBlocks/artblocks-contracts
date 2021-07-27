const { BigNumber } = require("ethers");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deploying GEN ART 721 from:", deployerAddress);

  const GenArt721 = await ethers.getContractFactory("GenArt721");
  const genArt721 = await GenArt721.deploy("Art Blocks", "BLOCKS");

  console.log(
    "GenArt721 token contract deployed at:",
    (await genArt721.deployed()).address
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
