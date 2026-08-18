// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Encodes backfill calls, both as calldata for simulation and direct sends, and
 * as Safe Transaction Builder entries.
 *
 * Both forms come from one description of the call, so the batch a Safe executes
 * and the transaction that was simulated cannot diverge.
 */

import { ethers } from "ethers";
import { BackfillCall } from "./plan";
import {
  SafeContractMethod,
  SafeTransaction,
} from "../generator-upgrade/safe-tx-builder";

const NAME_AND_VERSION_INPUT = {
  name: "dependencyNameAndVersion",
  type: "bytes32",
  internalType: "bytes32",
};

const METHODS: Record<BackfillCall["kind"], SafeContractMethod> = {
  canvasTagType: {
    inputs: [
      NAME_AND_VERSION_INPUT,
      {
        name: "canvasTagType",
        type: "uint8",
        internalType: "enum IDependencyRegistryV0.CanvasTagType",
      },
    ],
    name: "updateDependencyCanvasTagType",
    payable: false,
  },
  loadAsModule: {
    inputs: [
      NAME_AND_VERSION_INPUT,
      { name: "loadAsModule", type: "bool", internalType: "bool" },
    ],
    name: "updateDependencyLoadAsModule",
    payable: false,
  },
  projectScriptTagType: {
    inputs: [
      NAME_AND_VERSION_INPUT,
      {
        name: "projectScriptTagType",
        type: "uint8",
        internalType: "enum IDependencyRegistryV0.ProjectScriptTagType",
      },
      {
        name: "projectScriptSpecialType",
        type: "string",
        internalType: "string",
      },
    ],
    name: "updateDependencyProjectScriptTagType",
    payable: false,
  },
  projectDependencyOverride: {
    inputs: [
      { name: "contractAddress", type: "address", internalType: "address" },
      { name: "projectId", type: "uint256", internalType: "uint256" },
      NAME_AND_VERSION_INPUT,
    ],
    name: "addProjectDependencyOverride",
    payable: false,
  },
};

function inputValues(call: BackfillCall): Record<string, string> {
  switch (call.kind) {
    case "canvasTagType":
      return {
        dependencyNameAndVersion: call.nameAndVersionBytes,
        canvasTagType: call.canvasTagType.toString(),
      };
    case "loadAsModule":
      return {
        dependencyNameAndVersion: call.nameAndVersionBytes,
        loadAsModule: call.loadAsModule.toString(),
      };
    case "projectScriptTagType":
      return {
        dependencyNameAndVersion: call.nameAndVersionBytes,
        projectScriptTagType: call.projectScriptTagType.toString(),
        projectScriptSpecialType: call.projectScriptSpecialType,
      };
    case "projectDependencyOverride":
      return {
        contractAddress: call.core,
        projectId: call.projectId.toString(),
        dependencyNameAndVersion: call.nameAndVersionBytes,
      };
  }
}

function functionSignature(method: SafeContractMethod): string {
  return `function ${method.name}(${method.inputs
    .map((input) => `${input.type} ${input.name}`)
    .join(", ")})`;
}

export function encodeBackfillCall(call: BackfillCall): string {
  const method = METHODS[call.kind];
  const iface = new ethers.utils.Interface([functionSignature(method)]);
  const values = inputValues(call);
  return iface.encodeFunctionData(
    method.name,
    method.inputs.map((input) => values[input.name])
  );
}

export function buildBackfillSafeTx(
  registry: string,
  call: BackfillCall
): SafeTransaction {
  return {
    to: ethers.utils.getAddress(registry),
    value: "0",
    // @dev left null so the Transaction Builder re-encodes from the values
    // below, which is what a reviewer in the app actually reads.
    data: null,
    contractMethod: METHODS[call.kind],
    contractInputsValues: inputValues(call),
  };
}
