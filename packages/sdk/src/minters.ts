import {
  FormFieldSchema,
  OnChainCompoundNonArrayFormFieldSchema,
} from "./json-schema";
import { Maybe } from "./generated/graphql";
import { WalletClient } from "viem";
import { ZodValidationSchema } from "./utils";

export const SubmissionStatusEnum = {
  AWAITING_USER_SIGNATURE: "AWAITING_USER_SIGNATURE",
  CONFIRMING: "CONFIRMING",
  SYNCING: "SYNCING",
} as const;

export type SubmissionStatus =
  (typeof SubmissionStatusEnum)[keyof typeof SubmissionStatusEnum];

export type AvailableMinter = {
  address: string;
  type: string;
};

// export type ConfigurationFormHandleSubmitOptions = {
//   [key: string]: unknown;
//   onProgress?: (status: SubmissionStatus) => void;
// };

export type ConfigurationForm = {
  key: string;
  formSchema: FormFieldSchema;
  initialFormValues: Record<string, any>;
  zodSchema: ZodValidationSchema;
  handleSubmit: (
    formValues: Record<string, any>,
    signer: WalletClient,
    onProgress?: (status: SubmissionStatus) => void
  ) => Promise<void>;
};

export type SelectedMinter = AvailableMinter & {
  basePrice: Maybe<string>;
  currencyAddress: Maybe<string>;
  currencySymbol: Maybe<string>;
  extraMinterDetails: any;
  configurationForms: ConfigurationForm[];
};

export function filterProjectIdAndCoreContractAddressFromFormSchema(
  schema: FormFieldSchema
): FormFieldSchema {
  // If properties are defined, remove projectId
  const properties = schema.properties
    ? (({ projectIndex, coreContractAddress, ...rest }) => rest)(
        schema.properties
      )
    : undefined;

  // If required is defined, filter out projectId
  const required = schema.required
    ? schema.required.filter(
        (item) => item !== "projectIndex" && item !== "coreContractAddress"
      )
    : undefined;

  return {
    ...schema,
    properties,
    required,
  };
}

export function generateMinterSelectionFormSchema(
  shared: boolean
): OnChainCompoundNonArrayFormFieldSchema {
  const args = ["projectIndex", "minter.address"];
  const inputs = [
    {
      internalType: "uint256",
      name: "_projectId",
      type: "uint256",
    },
    {
      internalType: "address",
      name: "_minter",
      type: "address",
    },
  ];

  if (shared) {
    args.splice(1, 0, "coreContractAddress");
    inputs.splice(1, 0, {
      internalType: "address",
      name: "_coreContract",
      type: "address",
    });
  }

  return {
    title: "Set Minter For Project",
    type: "object",
    compound: true,
    compoundBehavior: "transactionGroup",
    onChain: true,
    transactionDetails: {
      functionName: "setMinterForProject",
      args,
      abi: [
        {
          inputs,
          name: "setMinterForProject",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
    },
    properties: {
      "minter.address": {
        type: "string",
        title: "Minter Address",
      },
    },
    required: ["minter.address"],
  };
}
