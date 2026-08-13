// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 3 — confirm the Safe batch landed and the generator behaves correctly.
 *
 * Checks the implementation slot of every proxy on the network, then on mainnet
 * re-derives the HTML for each affected project and asserts the project script is
 * no longer wrapped, while the control projects still are.
 *
 *   yarn hardhat run --network sepolia scripts/generator-upgrade/3_verify-upgrade.ts
 *   yarn hardhat run --network mainnet scripts/generator-upgrade/3_verify-upgrade.ts
 */

import { ethers } from "hardhat";
import { getNetworkName } from "../util/utils";
import {
  CONTRACT_NAME,
  CREATE2_FACTORY,
  IMPLEMENTATION_SALT,
  MAINNET_CHECK_PROJECTS,
  getEnvironment,
} from "./config";

const IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

// send/receive assembles ~700KB of HTML, which exceeds the default eth_call cap.
const CALL_OVERRIDES = { gasLimit: 500_000_000 };

async function main() {
  const networkName = await getNetworkName();
  const environment = getEnvironment(networkName);

  const factory = await ethers.getContractFactory(CONTRACT_NAME);
  const initcode = factory.getDeployTransaction().data?.toString() as string;
  const expectedImplementation = ethers.utils.getCreate2Address(
    CREATE2_FACTORY,
    IMPLEMENTATION_SALT,
    ethers.utils.keccak256(initcode)
  );

  console.log(`Network:        ${networkName}`);
  console.log(`Expected impl:  ${expectedImplementation}\n`);

  let failures = 0;

  console.log("Implementation slots:");
  for (const proxy of environment.proxies) {
    const raw = await ethers.provider.getStorageAt(
      proxy.address,
      IMPLEMENTATION_SLOT
    );
    const actual = ethers.utils.getAddress("0x" + raw.slice(-40));
    const ok = actual === expectedImplementation;
    if (!ok) failures++;
    console.log(
      `  ${proxy.label.padEnd(8)} ${proxy.address}  ->  ${actual}  ${
        ok ? "OK" : "MISMATCH"
      }`
    );
  }

  if (failures > 0) {
    throw new Error(
      `${failures} proxy/proxies are not on the expected implementation. ` +
        `Has the Safe batch executed?`
    );
  }

  if (networkName !== "mainnet") {
    console.log(
      `\nSkipping project render checks — the affected projects live on mainnet.`
    );
    return;
  }

  const generator = await ethers.getContractAt(
    CONTRACT_NAME,
    environment.proxies[0].address
  );

  console.log("\nProject checks:");
  for (const project of MAINNET_CHECK_PROJECTS) {
    const html = await generator.getTokenHtml(
      project.core,
      project.tokenId,
      CALL_OVERRIDES
    );
    const script = await generator.getProjectScript(
      project.core,
      project.projectId,
      CALL_OVERRIDES
    );
    const isWrapped = html.includes(`<script>${script}</script>`);
    const isRaw = !isWrapped && html.includes(script);
    const ok = project.expect === "raw" ? isRaw : isWrapped;
    if (!ok) failures++;
    console.log(
      `  ${project.name.padEnd(14)} ${String(html.length).padStart(7)} bytes  ` +
        `${isWrapped ? "wrapped" : "verbatim"}  (expected ${
          project.expect === "raw" ? "verbatim" : "wrapped"
        })  ${ok ? "OK" : "FAIL"}`
    );
  }

  if (failures > 0) {
    throw new Error(`${failures} check(s) failed.`);
  }
  console.log(`\nAll checks passed.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
