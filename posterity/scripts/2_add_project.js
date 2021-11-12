var prompt = require("prompt-sync")();
const GenArt721Core = require("../artifacts/GenArt721Core.json");
const { BigNumber } = require("ethers");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Adding project:", deployerAddress);

  const genArt721Address = prompt("GenArt721 address? ");
  const genArt721Core = new ethers.Contract(
    genArt721Address,
    GenArt721Core.abi,
    deployer //provider
  );

  await genArt721Core.addProject(
    "Flamingo1",
    "0x8De4e517A6F0B84654625228D8293b70AB49cF6C",
    "100000000000000000",
    true
  );

  console.log("addProject done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
