// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";

/**
 * Post-deployment verification for a FormPaletteBindingHooks deployment.
 *
 * The contract deliberately does not re-check its own PostParams setup on
 * chain, because nothing on chain branches on the answer. This script is that
 * check. It reads the live PMP and core contracts and reports every requirement
 * in the hook's REQUIRED SETUP natspec, for the form project and for every
 * registered palette project.
 *
 * Run before a palette project mints. Registering a palette project after its
 * tokens mint cannot be repaired: palette projects carry no PostParam, so there
 * is nothing to write that would trigger a re-render.
 *
 *   yarn hardhat run scripts/web3call/verify-form-palette-binding-hooks.ts --network sepolia
 */

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////

/** Deployed FormPaletteBindingHooks address. */
const HOOK_ADDRESS = "";

/** Network this deployment lives on, as hardhat names it. */
const EXPECTED_NETWORK = "sepolia";

//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

const PARAM_KEY_BOUND_PALETTE_REF = "boundPaletteRef";

// IPMPV0.ParamType / AuthOption
const PARAM_TYPE_UINT256_RANGE = 3;
const AUTH_TOKEN_OWNER_AND_ADDRESS = 5;
// IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyType
const DEPENDENCY_TYPE_ONCHAIN = 2;

const HOOK_ABI = [
  "function pmp() view returns (address)",
  "function formCore() view returns (address)",
  "function formProjectId() view returns (uint256)",
  "function paletteProjectCount() view returns (uint256)",
  "function paletteProjectAt(uint256) view returns (address coreContract, uint256 projectId)",
  "function paletteCount(address,uint256) view returns (uint256)",
  "function isPaletteProject(address,uint256) view returns (bool)",
  "function BINDING_PARAM_MAX_RANGE() view returns (uint256)",
  "function UNBOUND_PARAM_VALUE() view returns (uint256)",
];

const PMP_ABI = [
  "function getProjectPMPConfig(address,uint256,string) view returns (tuple(uint8 highestConfigNonce, uint8 authOption, uint8 paramType, uint48 pmpLockedAfterTimestamp, address authAddress, uint8 selectOptionsLength, string[] selectOptions, bytes32 minRange, bytes32 maxRange))",
  "function getProjectConfig(address,uint256) view returns (string[] pmpKeys, uint8 configNonce, address tokenPMPPostConfigHook, address tokenPMPReadAugmentationHook)",
];

const CORE_ABI = [
  "function projectTransferHookConfig(uint256) view returns (address hook, bool locked)",
  "function projectExternalAssetDependencyCount(uint256) view returns (uint256)",
  "function projectExternalAssetDependencyByIndex(uint256,uint256) view returns (tuple(string cid, uint8 dependencyType, address bytecodeAddress, string data))",
];

let failures = 0;
let warnings = 0;

function check(ok: boolean, label: string, detail?: string) {
  if (ok) {
    console.log(`  ok    ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? ` -- ${detail}` : ""}`);
  }
}

function warn(label: string, detail?: string) {
  warnings++;
  console.log(`  warn  ${label}${detail ? ` -- ${detail}` : ""}`);
}

/** Whether the PMP is registered as an on-chain flex asset dependency. */
async function hasPmpFlexDependency(
  core: any,
  projectId: bigint | number,
  pmpAddress: string
): Promise<boolean> {
  let count: number;
  try {
    count = Number(await core.projectExternalAssetDependencyCount(projectId));
  } catch {
    // non-Flex core: no flex dependencies at all
    return false;
  }
  for (let i = 0; i < count; i++) {
    const dep = await core.projectExternalAssetDependencyByIndex(projectId, i);
    if (
      Number(dep.dependencyType) === DEPENDENCY_TYPE_ONCHAIN &&
      dep.bytecodeAddress.toLowerCase() === pmpAddress.toLowerCase()
    ) {
      return true;
    }
  }
  return false;
}

async function main() {
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "sepolia" : network.name;
  if (networkName !== EXPECTED_NETWORK) {
    throw new Error(
      `[ERROR] expected network ${EXPECTED_NETWORK}, got ${networkName}`
    );
  }
  if (!ethers.utils.isAddress(HOOK_ADDRESS)) {
    throw new Error(`[ERROR] set HOOK_ADDRESS at the top of this script`);
  }
  if ((await ethers.provider.getCode(HOOK_ADDRESS)) === "0x") {
    throw new Error(`[ERROR] no contract at ${HOOK_ADDRESS}`);
  }

  const hook = new ethers.Contract(HOOK_ADDRESS, HOOK_ABI, ethers.provider);
  const pmpAddress: string = await hook.pmp();
  const formCore: string = await hook.formCore();
  const formProjectId = await hook.formProjectId();
  const maxRange = await hook.BINDING_PARAM_MAX_RANGE();

  console.log(`FormPaletteBindingHooks ${HOOK_ADDRESS} on ${networkName}`);
  console.log(`  PMP          ${pmpAddress}`);
  console.log(`  form project ${formCore} #${formProjectId.toString()}`);
  console.log("");

  const pmp = new ethers.Contract(pmpAddress, PMP_ABI, ethers.provider);
  const core = new ethers.Contract(formCore, CORE_ABI, ethers.provider);

  // ---- form project ----
  console.log("form project");

  const paramConfig = await pmp.getProjectPMPConfig(
    formCore,
    formProjectId,
    PARAM_KEY_BOUND_PALETTE_REF
  );
  check(
    Number(paramConfig.paramType) === PARAM_TYPE_UINT256_RANGE,
    `${PARAM_KEY_BOUND_PALETTE_REF} is Uint256Range ("Number")`,
    `paramType=${paramConfig.paramType}`
  );
  check(
    Number(paramConfig.authOption) === AUTH_TOKEN_OWNER_AND_ADDRESS,
    "auth is Token owner + Contract address",
    `authOption=${paramConfig.authOption}`
  );
  check(
    paramConfig.authAddress.toLowerCase() === HOOK_ADDRESS.toLowerCase(),
    "auth Contract address is the hook",
    `got ${paramConfig.authAddress}`
  );
  check(
    ethers.BigNumber.from(paramConfig.minRange).eq(0),
    "min range is 0",
    `got ${ethers.BigNumber.from(paramConfig.minRange).toString()}`
  );
  check(
    ethers.BigNumber.from(paramConfig.maxRange).eq(maxRange),
    "max range is the maximum",
    `got ${ethers.BigNumber.from(paramConfig.maxRange).toString()}`
  );
  check(
    Number(paramConfig.pmpLockedAfterTimestamp) === 0,
    "no lock date on the binding parameter"
  );

  const formHooks = await pmp.getProjectConfig(formCore, formProjectId);
  check(
    formHooks.tokenPMPPostConfigHook.toLowerCase() ===
      HOOK_ADDRESS.toLowerCase(),
    "Post-config hook is the hook",
    `got ${formHooks.tokenPMPPostConfigHook}`
  );
  check(
    formHooks.tokenPMPReadAugmentationHook.toLowerCase() ===
      HOOK_ADDRESS.toLowerCase(),
    "Read augmentation hook is the hook",
    `got ${formHooks.tokenPMPReadAugmentationHook}`
  );

  const [formTransferHook] =
    await core.projectTransferHookConfig(formProjectId);
  check(
    formTransferHook.toLowerCase() === HOOK_ADDRESS.toLowerCase(),
    "transfer hook is the hook",
    `got ${formTransferHook}`
  );

  check(
    await hasPmpFlexDependency(core, formProjectId, pmpAddress),
    "PMP registered as an on-chain flex dependency"
  );

  // ---- palette projects ----
  const paletteProjectCount = Number(await hook.paletteProjectCount());
  console.log("");
  console.log(`palette projects (${paletteProjectCount} registered)`);
  if (paletteProjectCount === 0) {
    warn("none registered, so nothing can bind yet");
  }

  for (let i = 0; i < paletteProjectCount; i++) {
    const { coreContract, projectId } = await hook.paletteProjectAt(i);
    console.log("");
    console.log(`  ${coreContract} #${projectId.toString()}`);

    const entries = Number(await hook.paletteCount(coreContract, projectId));
    check(entries > 0, `${entries} palette entries registered`);

    const paletteCore = new ethers.Contract(
      coreContract,
      CORE_ABI,
      ethers.provider
    );
    const paletteHooks = await pmp.getProjectConfig(coreContract, projectId);
    check(
      paletteHooks.tokenPMPReadAugmentationHook.toLowerCase() ===
        HOOK_ADDRESS.toLowerCase(),
      "Read augmentation hook is the hook",
      `got ${paletteHooks.tokenPMPReadAugmentationHook}`
    );
    if (paletteHooks.tokenPMPPostConfigHook !== ethers.constants.AddressZero) {
      warn(
        "a Post-config hook is set; a palette project needs none",
        paletteHooks.tokenPMPPostConfigHook
      );
    }

    const [paletteTransferHook] =
      await paletteCore.projectTransferHookConfig(projectId);
    check(
      paletteTransferHook.toLowerCase() === HOOK_ADDRESS.toLowerCase(),
      "transfer hook is the hook",
      `got ${paletteTransferHook}`
    );

    check(
      await hasPmpFlexDependency(paletteCore, projectId, pmpAddress),
      "PMP registered as an on-chain flex dependency"
    );
  }

  console.log("");
  console.log(`${failures} failure(s), ${warnings} warning(s)`);
  if (failures > 0) {
    throw new Error("[ERROR] setup is incomplete, see failures above");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
