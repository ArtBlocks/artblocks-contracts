import { ethers } from "hardhat";

// Core Contract
import { GenArt721CoreV2ArtBlocksXPace__factory } from "../../contracts/factories/GenArt721CoreV2ArtBlocksXPace__factory";

// MinterSuite
import { MinterFilterV0__factory } from "../../contracts/factories/MinterFilterV0__factory";
import { MinterSetPriceERC20V1__factory } from "../../contracts/factories/MinterSetPriceERC20V1__factory";
import { MinterSetPriceV1__factory } from "../../contracts/factories/MinterSetPriceV1__factory";
import { MinterDALinV1__factory } from "../../contracts/factories/MinterDALinV1__factory";
import { MinterDAExpV1__factory } from "../../contracts/factories/MinterDAExpV1__factory";

import { createPBABBucket } from "../../util/aws_s3";

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const pbabTokenName = "AB Test"; // arb mainnet
const pbabTokenTicker = "ABTEST"; // arb mainnet

const randomizerContractAddress = "0xDF5ca0669Fe370E0656E5cf85cAaC9Ee16BF775c"; // arb mainnet
// Deployer wallet
const pbabTransferAddress = "0x885FAD7c8Fa5A008d27c58A108C834f77401597b"; // arb mainnet (ben L tester wallet)
// Deployer wallet
const rendererProviderAddress = "0x885FAD7c8Fa5A008d27c58A108C834f77401597b"; // arb mainnet (ben  tester L wallet)
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // await createPBABBucket(pbabTokenName, networkName);

  // Deploy Core contract.
  console.log(
    `Using Randomizer deployed at ${randomizerContractAddress} on ${networkName}`
  );
  const genArt721CoreFactory = new GenArt721CoreV2ArtBlocksXPace__factory(
    deployer
  );
  const genArt721Core = await genArt721CoreFactory.deploy(
    pbabTokenName,
    pbabTokenTicker,
    randomizerContractAddress,
    {
      gasLimit: 60000000,
    }
  );

  await genArt721Core.deployed();
  console.log(`GenArt721Core deployed at ${genArt721Core.address}`);

  // Deploy Minter Filter contract.
  const minterFilterFactory = new MinterFilterV0__factory(deployer);
  const minterFilter = await minterFilterFactory.deploy(genArt721Core.address);
  await minterFilter.deployed();
  console.log(`MinterFilterV0 deployed at ${minterFilter.address}`);

  // Deploy basic Minter contract (functionally equivalent to the current
  // standard Minter contract).
  const minterSetPriceERC20V1Factory = new MinterSetPriceERC20V1__factory(
    deployer
  );
  const minterSetPriceERC20V1 = await minterSetPriceERC20V1Factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterSetPriceERC20V1.deployed();
  console.log(
    `MinterSetPriceERC20V1 deployed at ${minterSetPriceERC20V1.address}`
  );

  // Deploy basic Minter contract that **only** supports ETH, as an optimization,
  // and thus _does not_ support custom ERC20 minting.
  const minterSetPriceV1Factory = new MinterSetPriceV1__factory(deployer);
  const minterSetPriceV1 = await minterSetPriceV1Factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterSetPriceV1.deployed();
  console.log(`MinterSetPriceV1 deployed at ${minterSetPriceV1.address}`);

  // Deploy automated linear-decay DA Minter contract that **only** supports ETH.
  const minterDALinV1Factory = new MinterDALinV1__factory(deployer);
  const minterDALinV1 = await minterDALinV1Factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterDALinV1.deployed();
  console.log(`MinterDALinV1 deployed at ${minterDALinV1.address}`);

  // Deploy automated exponential-decay DA Minter contract that **only** supports ETH.
  const minterDAExpV1Factory = new MinterDAExpV1__factory(deployer);
  const minterDAExpV1 = await minterDAExpV1Factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterDAExpV1.deployed();
  console.log(`MinterDAExpV1 deployed at ${minterDAExpV1.address}`);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Allowlist the Minter on the Core contract.
  await genArt721Core
    .connect(deployer)
    .addMintWhitelisted(minterFilter.address);
  console.log(`Allowlisted the Minter on the Core contract.`);

  // Update the Renderer provider.
  await genArt721Core
    .connect(deployer)
    .updateRenderProviderAddress(rendererProviderAddress);
  console.log(`Updated the renderer provider to: ${rendererProviderAddress}.`);

  // Allowlist AB staff (testnet only)
  // if (network.name == "ropsten") {
  //   // purplehat
  //   await genArt721Core
  //     .connect(deployer)
  //     .addWhitelisted("0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63");
  //   // dogbot
  //   await genArt721Core
  //     .connect(deployer)
  //     .addWhitelisted("0x3c3cAb03C83E48e2E773ef5FC86F52aD2B15a5b0");
  //   // ben_thank_you
  //   await genArt721Core
  //     .connect(deployer)
  //     .addWhitelisted("0x0B7917b62BC98967e06e80EFBa9aBcAcCF3d4928");
  //   console.log(`Performing ${network.name} deployment, allowlisted AB staff.`);
  // }

  // Allowlist new PBAB owner.
  await genArt721Core.connect(deployer).addWhitelisted(pbabTransferAddress);
  console.log(`Allowlisted Core contract access for: ${pbabTransferAddress}.`);

  // Transfer Core contract to new PBAB owner.
  await genArt721Core.connect(deployer).updateAdmin(pbabTransferAddress);
  console.log(`Transferred Core contract admin to: ${pbabTransferAddress}.`);

  // Output instructions for manual Etherscan verification.
  const standardVerify = "yarn hardhat verify";
  console.log(`Verify GenArt721CoreV2 deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${genArt721Core.address} "${pbabTokenName}" "${pbabTokenTicker}" ${randomizerContractAddress}`
  );
  console.log(`Verify MinterFilter deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterFilter.address} ${genArt721Core.address}`
  );
  console.log(`Verify each of the Minter deployments with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterSetPriceERC20V1.address} ${genArt721Core.address} ${minterFilter.address}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterSetPriceV1.address} ${genArt721Core.address} ${minterFilter.address}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterDALinV1.address} ${genArt721Core.address} ${minterFilter.address}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterDAExpV1.address} ${genArt721Core.address} ${minterFilter.address}`
  );
  console.log(
    `Reminder: call 'alertAsCanonicalMinterFilter' from MinterFilter!`
  );

  //////////////////////////////////////////////////////////////////////////////
  // SETUP ENDS HERE
  //////////////////////////////////////////////////////////////////////////////
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
