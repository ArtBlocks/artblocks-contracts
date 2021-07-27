var prompt = require("prompt-sync")();
const GenArt721CorePlus = require("../artifacts/contracts/GenArt721CorePlus.sol/GenArt721CorePlus.json");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  const genArt721Address = prompt("GenArt721 address? ");
  const projectId = prompt("Project ID? ");
  const newName = prompt("New name? ");
  const contract = new ethers.Contract(
    genArt721Address,
    GenArt721CorePlus.abi,
    deployer //provider
  );

  await contract.updateProjectName(parseInt(projectId), newName);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
