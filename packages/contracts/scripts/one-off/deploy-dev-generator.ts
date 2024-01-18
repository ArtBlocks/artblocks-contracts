// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers, upgrades } from "hardhat";
import {
  BytecodeStorageV1Writer__factory,
  GenArt721GeneratorV0,
} from "../contracts";
import { GenArt721GeneratorV0__factory } from "../contracts/factories/generator/GenArt721GeneratorV0__factory";
import { getNetworkName } from "../util/utils";
import { BYTECODE_STORAGE_READER_LIBRARY_ADDRESSES } from "../util/constants";
import { StorageContractCreatedEvent } from "../contracts/BytecodeStorageV1Writer";

const dependencyRegistryAddress = "0x5Fcc415BCFb164C5F826B5305274749BeB684e9b";
const scriptyBuilderV2Address = "0xb205DFfE32259E2F1c3C0cba855250134147C083";
const GUNZIP_SCRIPT_BASE64 =
  "InVzZSBzdHJpY3QiOygoKT0+e3ZhciB2PVVpbnQ4QXJyYXksQT1VaW50MTZBcnJheSxfPVVpbnQzMkFycmF5LHJyPW5ldyB2KFswLDAsMCwwLDAsMCwwLDAsMSwxLDEsMSwyLDIsMiwyLDMsMywzLDMsNCw0LDQsNCw1LDUsNSw1LDAsMCwwLDBdKSxucj1uZXcgdihbMCwwLDAsMCwxLDEsMiwyLDMsMyw0LDQsNSw1LDYsNiw3LDcsOCw4LDksOSwxMCwxMCwxMSwxMSwxMiwxMiwxMywxMywwLDBdKSxscj1uZXcgdihbMTYsMTcsMTgsMCw4LDcsOSw2LDEwLDUsMTEsNCwxMiwzLDEzLDIsMTQsMSwxNV0pLHRyPWZ1bmN0aW9uKHIsbil7Zm9yKHZhciB0PW5ldyBBKDMxKSxlPTA7ZTwzMTsrK2UpdFtlXT1uKz0xPDxyW2UtMV07Zm9yKHZhciBhPW5ldyBfKHRbMzBdKSxlPTE7ZTwzMDsrK2UpZm9yKHZhciB1PXRbZV07dTx0W2UrMV07Kyt1KWFbdV09dS10W2VdPDw1fGU7cmV0dXJuW3QsYV19LGVyPXRyKHJyLDIpLGlyPWVyWzBdLGNyPWVyWzFdO2lyWzI4XT0yNTgsY3JbMjU4XT0yODt2YXIgYXI9dHIobnIsMCkscHI9YXJbMF0sVXI9YXJbMV0scT1uZXcgQSgzMjc2OCk7Zm9yKG89MDtvPDMyNzY4OysrbyltPShvJjQzNjkwKT4+PjF8KG8mMjE4NDUpPDwxLG09KG0mNTI0MjgpPj4+MnwobSYxMzEwNyk8PDIsbT0obSY2MTY4MCk+Pj40fChtJjM4NTUpPDw0LHFbb109KChtJjY1MjgwKT4+Pjh8KG0mMjU1KTw8OCk+Pj4xO3ZhciBtLG8sRD1mdW5jdGlvbihyLG4sdCl7Zm9yKHZhciBlPXIubGVuZ3RoLGE9MCx1PW5ldyBBKG4pO2E8ZTsrK2EpclthXSYmKyt1W3JbYV0tMV07dmFyIGc9bmV3IEEobik7Zm9yKGE9MDthPG47KythKWdbYV09Z1thLTFdK3VbYS0xXTw8MTt2YXIgcztpZih0KXtzPW5ldyBBKDE8PG4pO3ZhciBpPTE1LW47Zm9yKGE9MDthPGU7KythKWlmKHJbYV0pZm9yKHZhciBmPWE8PDR8clthXSxoPW4tclthXSxsPWdbclthXS0xXSsrPDxoLHc9bHwoMTw8aCktMTtsPD13OysrbClzW3FbbF0+Pj5pXT1mfWVsc2UgZm9yKHM9bmV3IEEoZSksYT0wO2E8ZTsrK2EpclthXSYmKHNbYV09cVtnW3JbYV0tMV0rK10+Pj4xNS1yW2FdKTtyZXR1cm4gc30sRT1uZXcgdigyODgpO2ZvcihvPTA7bzwxNDQ7KytvKUVbb109ODt2YXIgbztmb3Iobz0xNDQ7bzwyNTY7KytvKUVbb109OTt2YXIgbztmb3Iobz0yNTY7bzwyODA7KytvKUVbb109Nzt2YXIgbztmb3Iobz0yODA7bzwyODg7KytvKUVbb109ODt2YXIgbyxvcj1uZXcgdigzMik7Zm9yKG89MDtvPDMyOysrbylvcltvXT01O3ZhciBvO3ZhciBncj1EKEUsOSwxKTt2YXIgeXI9RChvciw1LDEpLFI9ZnVuY3Rpb24ocil7Zm9yKHZhciBuPXJbMF0sdD0xO3Q8ci5sZW5ndGg7Kyt0KXJbdF0+biYmKG49clt0XSk7cmV0dXJuIG59LHA9ZnVuY3Rpb24ocixuLHQpe3ZhciBlPW4vOHwwO3JldHVybihyW2VdfHJbZSsxXTw8OCk+PihuJjcpJnR9LCQ9ZnVuY3Rpb24ocixuKXt2YXIgdD1uLzh8MDtyZXR1cm4oclt0XXxyW3QrMV08PDh8clt0KzJdPDwxNik+PihuJjcpfSx3cj1mdW5jdGlvbihyKXtyZXR1cm4ocis3KS84fDB9LG1yPWZ1bmN0aW9uKHIsbix0KXsobj09bnVsbHx8bjwwKSYmKG49MCksKHQ9PW51bGx8fHQ+ci5sZW5ndGgpJiYodD1yLmxlbmd0aCk7dmFyIGU9bmV3KHIuQllURVNfUEVSX0VMRU1FTlQ9PTI/QTpyLkJZVEVTX1BFUl9FTEVNRU5UPT00P186dikodC1uKTtyZXR1cm4gZS5zZXQoci5zdWJhcnJheShuLHQpKSxlfTt2YXIgeHI9WyJ1bmV4cGVjdGVkIEVPRiIsImludmFsaWQgYmxvY2sgdHlwZSIsImludmFsaWQgbGVuZ3RoL2xpdGVyYWwiLCJpbnZhbGlkIGRpc3RhbmNlIiwic3RyZWFtIGZpbmlzaGVkIiwibm8gc3RyZWFtIGhhbmRsZXIiLCwibm8gY2FsbGJhY2siLCJpbnZhbGlkIFVURi04IGRhdGEiLCJleHRyYSBmaWVsZCB0b28gbG9uZyIsImRhdGUgbm90IGluIHJhbmdlIDE5ODAtMjA5OSIsImZpbGVuYW1lIHRvbyBsb25nIiwic3RyZWFtIGZpbmlzaGluZyIsImludmFsaWQgemlwIGRhdGEiXSx4PWZ1bmN0aW9uKHIsbix0KXt2YXIgZT1uZXcgRXJyb3Iobnx8eHJbcl0pO2lmKGUuY29kZT1yLEVycm9yLmNhcHR1cmVTdGFja1RyYWNlJiZFcnJvci5jYXB0dXJlU3RhY2tUcmFjZShlLHgpLCF0KXRocm93IGU7cmV0dXJuIGV9LHpyPWZ1bmN0aW9uKHIsbix0KXt2YXIgZT1yLmxlbmd0aDtpZighZXx8dCYmdC5mJiYhdC5sKXJldHVybiBufHxuZXcgdigwKTt2YXIgYT0hbnx8dCx1PSF0fHx0Lmk7dHx8KHQ9e30pLG58fChuPW5ldyB2KGUqMykpO3ZhciBnPWZ1bmN0aW9uKFYpe3ZhciBYPW4ubGVuZ3RoO2lmKFY+WCl7dmFyIGI9bmV3IHYoTWF0aC5tYXgoWCoyLFYpKTtiLnNldChuKSxuPWJ9fSxzPXQuZnx8MCxpPXQucHx8MCxmPXQuYnx8MCxoPXQubCxsPXQuZCx3PXQubSxUPXQubixJPWUqODtkb3tpZighaCl7cz1wKHIsaSwxKTt2YXIgQj1wKHIsaSsxLDMpO2lmKGkrPTMsQilpZihCPT0xKWg9Z3IsbD15cix3PTksVD01O2Vsc2UgaWYoQj09Mil7dmFyIEc9cChyLGksMzEpKzI1NyxZPXAocixpKzEwLDE1KSs0LFc9RytwKHIsaSs1LDMxKSsxO2krPTE0O2Zvcih2YXIgQz1uZXcgdihXKSxPPW5ldyB2KDE5KSxjPTA7YzxZOysrYylPW2xyW2NdXT1wKHIsaStjKjMsNyk7aSs9WSozO2Zvcih2YXIgaj1SKE8pLHNyPSgxPDxqKS0xLHVyPUQoTyxqLDEpLGM9MDtjPFc7KXt2YXIgZD11cltwKHIsaSxzcildO2krPWQmMTU7dmFyIHk9ZD4+PjQ7aWYoeTwxNilDW2MrK109eTtlbHNle3ZhciBTPTAsRj0wO2Zvcih5PT0xNj8oRj0zK3AocixpLDMpLGkrPTIsUz1DW2MtMV0pOnk9PTE3PyhGPTMrcChyLGksNyksaSs9Myk6eT09MTgmJihGPTExK3AocixpLDEyNyksaSs9Nyk7Ri0tOylDW2MrK109U319dmFyIEo9Qy5zdWJhcnJheSgwLEcpLHo9Qy5zdWJhcnJheShHKTt3PVIoSiksVD1SKHopLGg9RChKLHcsMSksbD1EKHosVCwxKX1lbHNlIHgoMSk7ZWxzZXt2YXIgeT13cihpKSs0LFo9clt5LTRdfHJbeS0zXTw8OCxrPXkrWjtpZihrPmUpe3UmJngoMCk7YnJlYWt9YSYmZyhmK1opLG4uc2V0KHIuc3ViYXJyYXkoeSxrKSxmKSx0LmI9Zis9Wix0LnA9aT1rKjgsdC5mPXM7Y29udGludWV9aWYoaT5JKXt1JiZ4KDApO2JyZWFrfX1hJiZnKGYrMTMxMDcyKTtmb3IodmFyIHZyPSgxPDx3KS0xLGhyPSgxPDxUKS0xLEw9aTs7TD1pKXt2YXIgUz1oWyQocixpKSZ2cl0sTT1TPj4+NDtpZihpKz1TJjE1LGk+SSl7dSYmeCgwKTticmVha31pZihTfHx4KDIpLE08MjU2KW5bZisrXT1NO2Vsc2UgaWYoTT09MjU2KXtMPWksaD1udWxsO2JyZWFrfWVsc2V7dmFyIEs9TS0yNTQ7aWYoTT4yNjQpe3ZhciBjPU0tMjU3LFU9cnJbY107Sz1wKHIsaSwoMTw8VSktMSkraXJbY10saSs9VX12YXIgUD1sWyQocixpKSZocl0sTj1QPj4+NDtQfHx4KDMpLGkrPVAmMTU7dmFyIHo9cHJbTl07aWYoTj4zKXt2YXIgVT1ucltOXTt6Kz0kKHIsaSkmKDE8PFUpLTEsaSs9VX1pZihpPkkpe3UmJngoMCk7YnJlYWt9YSYmZyhmKzEzMTA3Mik7Zm9yKHZhciBRPWYrSztmPFE7Zis9NCluW2ZdPW5bZi16XSxuW2YrMV09bltmKzEtel0sbltmKzJdPW5bZisyLXpdLG5bZiszXT1uW2YrMy16XTtmPVF9fXQubD1oLHQucD1MLHQuYj1mLHQuZj1zLGgmJihzPTEsdC5tPXcsdC5kPWwsdC5uPVQpfXdoaWxlKCFzKTtyZXR1cm4gZj09bi5sZW5ndGg/bjptcihuLDAsZil9O3ZhciBBcj1uZXcgdigwKTt2YXIgU3I9ZnVuY3Rpb24ocil7KHJbMF0hPTMxfHxyWzFdIT0xMzl8fHJbMl0hPTgpJiZ4KDYsImludmFsaWQgZ3ppcCBkYXRhIik7dmFyIG49clszXSx0PTEwO24mNCYmKHQrPXJbMTBdfChyWzExXTw8OCkrMik7Zm9yKHZhciBlPShuPj4zJjEpKyhuPj40JjEpO2U+MDtlLT0hclt0KytdKTtyZXR1cm4gdCsobiYyKX0sTXI9ZnVuY3Rpb24ocil7dmFyIG49ci5sZW5ndGg7cmV0dXJuKHJbbi00XXxyW24tM108PDh8cltuLTJdPDwxNnxyW24tMV08PDI0KT4+PjB9O2Z1bmN0aW9uIEgocixuKXtyZXR1cm4genIoci5zdWJhcnJheShTcihyKSwtOCksbnx8bmV3IHYoTXIocikpKX12YXIgVHI9dHlwZW9mIFRleHREZWNvZGVyPCJ1IiYmbmV3IFRleHREZWNvZGVyLENyPTA7dHJ5e1RyLmRlY29kZShBcix7c3RyZWFtOiEwfSksQ3I9MX1jYXRjaHt9dmFyIGZyPSgpPT57dmFyIG47bGV0IHI9ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnc2NyaXB0W3R5cGU9InRleHQvamF2YXNjcmlwdCtnemlwIl1bc3JjXScpO2ZvcihsZXQgdCBvZiByKXRyeXtsZXQgZT10LnNyYy5tYXRjaCgvXmRhdGE6KC4qPykoPzo7KGJhc2U2NCkpPywoLiopJC8pO2lmKCFlKWNvbnRpbnVlO2xldFthLHUsZyxzXT1lLGk9VWludDhBcnJheS5mcm9tKGc/YXRvYihzKTpkZWNvZGVVUklDb21wb25lbnQocyksdz0+dy5jaGFyQ29kZUF0KDApKSxoPW5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShIKGkpKSxsPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoInNjcmlwdCIpO2wudGV4dENvbnRlbnQ9aCwobj10LnBhcmVudE5vZGUpPT1udWxsfHxuLnJlcGxhY2VDaGlsZChsLHQpfWNhdGNoKGUpe2NvbnNvbGUuZXJyb3IoIkNvdWxkIG5vdCBndW56aXAgc2NyaXB0Iix0LGUpfX07ZnIoKTt3aW5kb3cuZ3VuemlwU3luYz1IO3dpbmRvdy5ndW56aXBTY3JpcHRzPWZyO30pKCk7";

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();
  if (networkName != "sepolia") {
    throw new Error("This script is intended to be run on sepolia only");
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  // Deploy BytecodeStorageV1Writer contract
  const bytecodeStorageV1WriterFactory = new BytecodeStorageV1Writer__factory(
    deployer
  );
  const bytecodeStorageV1Writer = await bytecodeStorageV1WriterFactory.deploy();
  console.log(
    `BytecodeStorageV1Writer deployed at ${bytecodeStorageV1Writer.address}`
  );

  // Use BytecodeStorageV1Writer to upload gunzip script
  const gunzipUploadTransaction = await bytecodeStorageV1Writer
    .connect(deployer)
    .writeStringToBytecodeStorage(GUNZIP_SCRIPT_BASE64);

  // Get address of gunzip storage contract from StorageContractCreated event
  const gunzipUploadReceipt = await gunzipUploadTransaction.wait();
  const storageContractCreatedEvent = gunzipUploadReceipt.events?.find(
    (event) => {
      if (event.event === "StorageContractCreated") {
        return true;
      }
    }
  );
  if (!storageContractCreatedEvent) {
    throw new Error("Failed to find StorageContractCreated event");
  }
  const gunzipStorageContractAddress = (
    storageContractCreatedEvent as StorageContractCreatedEvent
  ).args.storageContract;

  // Deploy generator contract
  const bytecodeStorageLibraryAddress =
    BYTECODE_STORAGE_READER_LIBRARY_ADDRESSES[networkName];
  const genArt721GeneratorFactory = new GenArt721GeneratorV0__factory(
    {
      "contracts/libs/v0.8.x/BytecodeStorageV1.sol:BytecodeStorageReader":
        bytecodeStorageLibraryAddress,
    },
    deployer
  );

  const genArt721Generator: GenArt721GeneratorV0 = (await upgrades.deployProxy(
    genArt721GeneratorFactory,
    [
      dependencyRegistryAddress,
      scriptyBuilderV2Address,
      gunzipStorageContractAddress,
    ],
    {
      unsafeAllow: ["external-library-linking"],
    }
  )) as GenArt721GeneratorV0;
  await genArt721Generator.deployed();

  const genArt721GeneratorAddress = genArt721Generator.address;
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(
    genArt721GeneratorAddress
  );
  console.log(
    `GenArt721GeneratorV0 implementation deployed at ${implementationAddress}`
  );
  console.log(`GenArt721GeneratorV0 deployed at ${genArt721GeneratorAddress}`);

  // Wait for 10 seconds to make sure etherscan has indexed the contracts
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // //////////////////////////////////////////////////////////////////////////////
  // // DEPLOYMENT ENDS HERE
  // //////////////////////////////////////////////////////////////////////////////

  // //////////////////////////////////////////////////////////////////////////////
  // // SETUP BEGINS HERE
  // //////////////////////////////////////////////////////////////////////////////

  try {
    await hre.run("verify:verify", {
      address: bytecodeStorageV1Writer.address,
    });
  } catch (e) {
    console.error("Failed to verify ETHFSFileStorage programatically", e);
  }

  try {
    await hre.run("verify:verify", {
      address: implementationAddress,
    });
  } catch (e) {
    console.error("Failed to verify GenArt721GeneratorV0 programatically", e);
  }

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
