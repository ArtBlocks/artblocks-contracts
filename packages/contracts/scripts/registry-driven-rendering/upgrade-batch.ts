// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Shared builder for the two proxy-upgrade steps of the rollout.
 *
 * Both steps are the same shape — point a set of proxies at a freshly deployed
 * implementation via their ProxyAdmin — so they differ only in which proxies and
 * which contract. Every call is simulated as if the owning Safe were sending it,
 * so a batch is never handed to signers unless it is known to execute.
 */

import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { ethCallOrThrow } from "../generator-upgrade/eth-call";
import {
  buildProxyAdminUpgradeTx,
  buildSafeBatch,
} from "../generator-upgrade/safe-tx-builder";
import { requireDeployedImplementation } from "./implementation";
import { describeSigner, readProxyOwnership } from "./topology";

const OUTPUT_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "deployments",
  "generator",
  "safe-txs"
);

const PROXY_ADMIN_INTERFACE = new ethers.utils.Interface([
  "function upgrade(address proxy, address implementation) external",
]);

export async function buildUpgradeBatch(params: {
  networkName: string;
  chainId: number;
  contractName: string;
  proxies: { label: string; address: string }[];
  /** Short description of what the new implementation changes. */
  description: string;
  /** File name stem, e.g. "upgrade-registry". */
  fileStem: string;
  /**
   * Built for review ahead of its turn in the rollout. Marked in the file name so
   * a preview is never mistaken for the batch that should be executed.
   */
  preview?: boolean;
}): Promise<void> {
  const implementation = await requireDeployedImplementation(
    params.contractName
  );

  // Read ownership per proxy rather than trusting config, then require the whole
  // batch to share one ProxyAdmin and one owner — otherwise it cannot execute as
  // a single batch and must be split.
  const ownerships = [];
  for (const proxy of params.proxies) {
    ownerships.push({
      ...proxy,
      ...(await readProxyOwnership(proxy.address)),
    });
  }
  const proxyAdmins = new Set(ownerships.map((o) => o.proxyAdmin));
  const owners = new Set(ownerships.map((o) => o.owner));
  if (proxyAdmins.size !== 1 || owners.size !== 1) {
    throw new Error(
      `Proxies do not share a single ProxyAdmin/owner ` +
        `(admins: ${Array.from(proxyAdmins).join(", ")}; owners: ${Array.from(owners).join(", ")}). ` +
        `They cannot be upgraded in one batch.`
    );
  }
  const { proxyAdmin, owner, ownerIsContract, ownerSafe } = ownerships[0];

  const alreadyUpgraded = ownerships.filter(
    (o) => o.implementation.toLowerCase() === implementation.toLowerCase()
  );
  if (alreadyUpgraded.length === ownerships.length) {
    console.log(
      `Every ${params.contractName} proxy on ${params.networkName} already runs ` +
        `${implementation}. Nothing to do.`
    );
    return;
  }
  const pending = ownerships.filter(
    (o) => o.implementation.toLowerCase() !== implementation.toLowerCase()
  );

  for (const proxy of pending) {
    await ethCallOrThrow({
      from: owner,
      to: proxyAdmin,
      data: PROXY_ADMIN_INTERFACE.encodeFunctionData("upgrade", [
        proxy.address,
        implementation,
      ]),
    });
  }

  const labels = pending.map((p) => p.label).join(" + ");
  const batch = buildSafeBatch({
    chainId: params.chainId,
    safeAddress: owner,
    name: `Upgrade ${params.contractName} (${labels})`,
    description: params.description,
    transactions: pending.map((proxy) =>
      buildProxyAdminUpgradeTx({
        proxyAdmin,
        proxy: proxy.address,
        implementation,
      })
    ),
  });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(
    OUTPUT_DIR,
    `${params.networkName}-${params.fileStem}-${implementation.slice(0, 10)}` +
      `${params.preview ? "-PREVIEW" : ""}.json`
  );
  fs.writeFileSync(outPath, JSON.stringify(batch, null, 2) + "\n");

  console.log(`Contract:       ${params.contractName}`);
  console.log(`Implementation: ${implementation}`);
  console.log(`ProxyAdmin:     ${proxyAdmin}`);
  console.log(
    `Signer:         ${describeSigner(owner, ownerIsContract, ownerSafe)}\n`
  );
  if (alreadyUpgraded.length > 0) {
    console.log(
      `Skipping ${alreadyUpgraded.map((p) => p.label).join(", ")} — already upgraded.`
    );
  }
  console.log(
    `${pending.length} transaction(s), each simulated from the Safe:`
  );
  for (const proxy of pending) {
    console.log(
      `  upgrade(${proxy.address}, ${implementation})   [${proxy.label}]`
    );
  }
  console.log(`\nWrote ${path.relative(process.cwd(), outPath)}`);
  console.log(`Upload it to the Transaction Builder app for Safe ${owner}.`);
}
