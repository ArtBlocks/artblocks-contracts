import { ethers } from "hardhat";
import { MinterFilter__factory } from "./contracts/factories/MinterFilter__factory";
import { GenArt721FilteredMinter__factory } from "./contracts/factories/GenArt721FilteredMinter__factory";
import { GenArt721FilteredMinterETH__factory } from "./contracts/factories/GenArt721FilteredMinterETH__factory";
import { GenArt721FilteredMinterETHAuction__factory } from "./contracts/factories/GenArt721FilteredMinterETHAuction__factory";

const CORE_CONTRACT_ADDRESS = "0x87c6E93Fc0B149ec59AD595e2E187a4e1d7fDC25";

async function main() {
  const [deployer] = await ethers.getSigners();

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Minter Filter contract.
  const minterFilterFactory = new MinterFilter__factory(deployer);
  const minterFilter = await minterFilterFactory.deploy(CORE_CONTRACT_ADDRESS);

  await minterFilter.deployed();
  console.log(`MinterFilter deployed at ${minterFilter.address}`);

  // Deploy basic Minter contract (functionally equivalent to the current
  // standard Minter contract).
  const genArt721FilteredMinterFactory = new GenArt721FilteredMinter__factory(
    deployer
  );
  const genArt721FilteredMinter = await genArt721FilteredMinterFactory.deploy(
    CORE_CONTRACT_ADDRESS,
    minterFilter.address
  );

  await genArt721FilteredMinter.deployed();
  console.log(
    `GenArt721FilteredMinter deployed at ${genArt721FilteredMinter.address}`
  );

  // Deploy basic Minter contract that **only** supports ETH, as an optimization,
  // and thus _does not_ support custom ERC20 minting.
  const genArt721FilteredMinterETHFactory =
    new GenArt721FilteredMinterETH__factory(deployer);
  const genArt721FilteredMinterETH =
    await genArt721FilteredMinterETHFactory.deploy(
      CORE_CONTRACT_ADDRESS,
      minterFilter.address
    );

  await genArt721FilteredMinterETH.deployed();
  console.log(
    `GenArt721FilteredMinterETH deployed at ${genArt721FilteredMinterETH.address}`
  );

  // Deploy basic Minter contract that **only** supports ETH, as an optimization,
  // and thus _does not_ support custom ERC20 minting.
  const genArt721FilteredMinterETHAuctionFactory =
    new GenArt721FilteredMinterETHAuction__factory(deployer);
  const genArt721FilteredMinterETHAuction =
    await genArt721FilteredMinterETHAuctionFactory.deploy(
      CORE_CONTRACT_ADDRESS,
      minterFilter.address
    );

  await genArt721FilteredMinterETHAuction.deployed();
  console.log(
    `GenArt721FilteredMinterETHAuction deployed at ${genArt721FilteredMinterETHAuction.address}`
  );

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Setup the Minter Filter to use the most basic minter as the default.
  await minterFilter
    .connect(deployer)
    .setDefaultMinter(genArt721FilteredMinter.address);

  //////////////////////////////////////////////////////////////////////////////
  // SETUP ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Reminder re: CoreContract allowlisting.
  console.log(
    `REMINDER: Allowlist the MinterFilter on your core contract located at: ${CORE_CONTRACT_ADDRESS}`
  );

  // Output instructions for manual Etherscan verification.
  const networkName = network.name == "homestead" ? "mainnet" : network.name;
  const standardVerify =
    "yarn hardhat verify --contract <path to .sol>:<contract name>";
  console.log(`Verify MinterFilter deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterFilter.address} ${CORE_CONTRACT_ADDRESS}`
  );
  console.log(`Verify each of the Minter deployments with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${genArt721FilteredMinter.address} ${CORE_CONTRACT_ADDRESS} ${minterFilter.address}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${genArt721FilteredMinterETH.address} ${CORE_CONTRACT_ADDRESS} ${minterFilter.address}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${genArt721FilteredMinterETHAuction.address} ${CORE_CONTRACT_ADDRESS} ${minterFilter.address}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
