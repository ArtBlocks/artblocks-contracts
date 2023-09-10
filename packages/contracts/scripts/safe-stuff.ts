import hre from "hardhat";
import { ethers } from "hardhat";
import Safe, { EthersAdapter, SafeFactory } from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";

// actual tx stuff
import { SafeTransactionDataPartial } from "@safe-global/safe-core-sdk-types";

/**
 * This generic hardhat script throws an error if the current network gas price
 * is above the configured threshold for the network.
 */

/**
 * Gets the configured max nominal gas price in gwei for the current network
 * @returns the max nominal gas price in gwei for the current network
 */
async function doSafeStuff() {
  // create an ethers adapter for gnosis safe transactions
  // deployer must be a member of the safe
  const [deployer] = await ethers.getSigners();
  const safeAddress = "0xC5E6237C1a992f7f79a62b19eFBfE3c512408625"; // address of the safe

  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: deployer,
  });
  const safeSdk: Safe = await Safe.create({
    ethAdapter: ethAdapter,
    safeAddress,
  });

  // ...

  // create a gnosis safe transaction from a normal ethers transaction
  // Deploy AdminACL contract
  const adminACLFactory = await ethers.getContractFactory("AdminACLV1");
  const adminACLDeployTx = adminACLFactory.getDeployTransaction();
  console.log("og tx:", adminACLDeployTx);

  const deploymentFactory = "0x0000000000FFe8B47B3e2130213B802212439497"; // available cross-network
  const deployFactoryFunctionSignature = "0x64e03087"; // bytes4(keccak256("safeCreate2(bytes32,bytes)"))
  // first 20 bytes must match the deployer address
  const deploySalt = deployer.address + "000000000000000000000000"; // ethers.constants.HashZero;
  const deployInitCode = adminACLDeployTx.data.toString();
  // abi encode the deploy tx data
  const deployInitCodeEncoded = ethers.utils.defaultAbiCoder.encode(
    ["bytes32", "bytes"],
    [deploySalt, deployInitCode]
  );

  const deployData =
    deployFactoryFunctionSignature + deployInitCodeEncoded.slice(2);
  console.log(deployData);

  const safeTransactionData: SafeTransactionDataPartial = {
    to: deploymentFactory, // adminACLDeployTx.to?.toString() ||
    data: deployData, //adminACLDeployTx.data.toString(), // convert to string
    value: "0", // adminACLDeployTx.value?.toString() || "0", // convert to string
    operation: 1, // use DelegateCall for DEPLOYMENT // Optional
    safeTxGas: "7000000", // Optional
    // baseGas, // Optional
    // gasPrice, // Optional
    // gasToken, // Optional
    // refundReceiver, // Optional
    // nonce: nextNonce, // Optional
  };

  console.log(
    "converted from ethers deploy tx to safe tx data: ",
    safeTransactionData
  );

  const safeTransaction = await safeSdk.createTransaction({
    safeTransactionData: safeTransactionData,
  });
  // off-chain signature of the safe transaction
  const signedSafeTransaction = await safeSdk.signTransaction(safeTransaction);
  // ... additional signers can sign the transaction if needed...
  // @dev not needed if 1:x multisig
  // execute the transaction
  const executeTxResponse = await safeSdk.executeTransaction(
    signedSafeTransaction
  );
  await executeTxResponse.transactionResponse?.wait();
  console.log(
    `Transaction executed with hash: ${executeTxResponse.transactionResponse?.hash}`
  );
}

doSafeStuff()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
