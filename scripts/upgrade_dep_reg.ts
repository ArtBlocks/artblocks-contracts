import hre, { ethers, upgrades } from "hardhat";

async function main() {
  const DepRegV1 = await ethers.getContractFactory("DependencyRegistryV1");
  const upgraded = await upgrades.upgradeProxy(
    "0x47AF6d74AB159A7E95523f14424338980f434a0A",
    DepRegV1
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
