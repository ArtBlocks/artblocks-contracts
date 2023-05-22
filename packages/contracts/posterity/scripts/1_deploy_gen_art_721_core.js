const { BigNumber } = require("ethers");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deploying GEN ART 721 Core from:", deployerAddress);

  const GenArt721CoreV2 = await ethers.getContractFactory("GenArt721CoreV2");
  const GenArt721CoreV2 = await GenArt721CoreV2.deploy(
    "Infinethum",
    "INF",
    "0x92E52C3406c5Cc72968C6D702476d430818D425D"
  );

  console.log(
    "GenArt721 Core token contract deployed at:",
    (await genArt721CoreV2.deployed()).address
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
