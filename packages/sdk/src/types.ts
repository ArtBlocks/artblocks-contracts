import { WalletClient } from "viem";
import { FormFieldSchema } from "./json-schema";
import { ZodValidationSchema } from "./utils/zod";

export type Hex = `0x${string}`;

export type FormBlueprint = {
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

export const SubmissionStatusEnum = {
  SIMULATING_TRANSACTION: "SIMULATING_TRANSACTION",
  AWAITING_USER_SIGNATURE: "AWAITING_USER_SIGNATURE",
  CONFIRMING: "CONFIRMING",
  SYNCING: "SYNCING",
} as const;

export type SubmissionStatus =
  (typeof SubmissionStatusEnum)[keyof typeof SubmissionStatusEnum];
