/**
 * This TypeScript file defines an extended JSON Schema specifically tailored for creating complex forms.
 * The schema supports various field attributes, dependencies, and processing rules to generate forms
 * capable of performing both on-chain and off-chain data mutations. On-chain mutations pertain to blockchain transactions,
 * whereas off-chain mutations relate to traditional data operations outside the blockchain.
 * The structures here facilitate defining form fields, handling on-chain smart contract interactions,
 * compound field groupings, and establishing validation dependencies, ultimately driving dynamic and
 * responsive form generation for decentralized applications.
 */

import { JSONSchema7 } from "json-schema";
import { Abi } from "abitype";

/**
 * TransactionDetails contains information required to call a smart contract function on the blockchain.
 */
export type TransactionDetails = {
  /** List of form field names in order that should be passed to function call.
   * By default, the values of these fields will be checked to confirm changes
   * during synchronization.
   */
  args: string[];

  /**
   * An optional array of field names that should be checked to confirm changes during synchronization.
   * If provided, only these fields will be checked instead of the default behavior of checking args.
   */
  syncCheckFieldsOverride?: string[];

  /** The name of the function to call. */
  functionName: string;

  /** The ABI (Application Binary Interface) of the function. */
  abi: Abi;
};

/**
 * ArrayTransactionDetails contains information required to call a smart contract functions that mutate an array on the blockchain.
 */
export type ArrayTransactionDetails = {
  /** The transaction details to add to the array */
  ADD: TransactionDetails;

  /** The transaction details to update an existing item in the array */
  UPDATE: TransactionDetails;

  /** The transaction to remove an item from the array, usually only the last item. */
  REMOVE: TransactionDetails;
};

/**
 * Represents a single option for an array field.
 */
interface Option {
  /** The name of the option. */
  name?: string;

  /** The display name of the option. */
  display_name?: string;
}

/**
 * ValidationConditions is a constant object that defines the possible conditions for validation.
 * These conditions can be used to determine the validity of a field's value.
 */
export const ValidationConditions = {
  /** The value of the field must be greater than a specified value. */
  GREATER_THAN: "greaterThan",
  /** The value of the field must be less than a specified value. */
  LESS_THAN: "lessThan",
  /** The value of the field must be greater than or equal to a specified value. */
  GREATER_THAN_OR_EQUAL: "greaterThanOrEqual",
  /** The value of the field must be less than or equal to a specified value. */
  LESS_THAN_OR_EQUAL: "lessThanOrEqual",
  /** The value of the field must be equal to a specified value. */
  EQUAL: "equal",
} as const;

/**
 * ValidationCondition is a type that represents a validation condition.
 * It is derived from the keys of the ValidationConditions constant object.
 */
type ValidationCondition =
  (typeof ValidationConditions)[keyof typeof ValidationConditions];

/**
 * ValidationDependency is an interface that represents a validation dependency.
 * It contains a field and a condition that the field must meet.
 */
interface ValidationDependency {
  /** The name of the field that is being validated against. */
  field: string;
  /** The validation condition that the field must meet. */
  condition: ValidationCondition;
}

/**
 * BaseFormFieldAttributes extends ConfigurationSchema7 to describe a basic property in the schema.
 */
export interface BaseFormFieldSchema extends JSONSchema7 {
  /** Optional display label corresponding to the enum value. */
  displayLabels?: string[];

  /** An array of options for the property. Only relevant to array properties. */
  options?: Option[];

  /** The name of another property that this property depends on. */
  dependsOn?: string;

  /** Optional property indicating how a field should be transformed before submitting. */
  submissionProcessing?:
    | "merkleRoot"
    | "tokenHolderAllowlist"
    | "ethToWei"
    | "datetimeToUnixTimestamp"
    | "auctionEndDatetimeToHalfLifeSeconds";

  /** Optional property indicating how a field should be transformed before being displayed. */
  displayProcessing?: "weiToEth" | "unixTimestampToDatetime";

  validationDependency?: ValidationDependency;

  /** Optional property indicating the order the fields should be displayed */
  "ui:order"?: string[];

  /** Optional property specifying what widget should be used in the ui for this field */
  "ui:widget"?: string;
}

interface FormFieldProperties {
  properties?: { [key: string]: BaseFormFieldSchema };
}

interface CompoundConcatenateDetails extends FormFieldProperties {
  compound: true;
  compoundBehavior: "concatenate";
  order: string[];
  delimiter: string;
}

interface CompoundTransactionGroupDetails {
  properties?: {
    [key: string]: BaseFormFieldSchema | CompoundConcatenateDetails;
  };
  compound: true;
  compoundBehavior: "transactionGroup";
}

interface NonCompoundDetails {
  compound?: false;
}

type CompoundType =
  | CompoundConcatenateDetails
  | CompoundTransactionGroupDetails;

export type ItemsSchema = Omit<JSONSchema7, "items"> & {
  properties?: {
    [key: string]: Omit<
      FormFieldSchema,
      "items" | "transactionDetails" | "onChain"
    >;
  };
};

type NonArrayFormFieldSchema = BaseFormFieldSchema &
  NonCompoundDetails & { type: Exclude<string, "array"> };

type ArrayFormFieldSchema = BaseFormFieldSchema &
  NonCompoundDetails & { type: "array"; items: ItemsSchema };

type CompoundNonArrayFormFieldSchema = FormFieldProperties &
  BaseFormFieldSchema &
  CompoundType & { type: Exclude<string, "array"> };

type CompoundArrayFormFieldSchema = BaseFormFieldSchema &
  CompoundType & { type: "array"; items: ItemsSchema };

export type OnChainNonArrayFormFieldSchema = FormFieldProperties &
  NonArrayFormFieldSchema & {
    onChain: true;
    transactionDetails: TransactionDetails;
  };
export type OnChainArrayFormFieldSchema = Partial<FormFieldProperties> &
  ArrayFormFieldSchema & {
    onChain: true;
    transactionDetails: ArrayTransactionDetails;
  };
export type OnChainCompoundNonArrayFormFieldSchema = FormFieldProperties &
  CompoundNonArrayFormFieldSchema & {
    onChain: true;
    transactionDetails: TransactionDetails;
  };
export type OnChainCompoundArrayFormFieldSchema = Partial<FormFieldProperties> &
  CompoundArrayFormFieldSchema & {
    onChain: true;
    transactionDetails: ArrayTransactionDetails;
  };

export type OnChainFormFieldSchema =
  | OnChainNonArrayFormFieldSchema
  | OnChainArrayFormFieldSchema
  | OnChainCompoundNonArrayFormFieldSchema
  | OnChainCompoundArrayFormFieldSchema;

export type OffChainNonArrayFormFieldSchema = FormFieldProperties &
  NonArrayFormFieldSchema & { onChain: false };
export type OffChainArrayFormFieldSchema = Partial<FormFieldProperties> &
  ArrayFormFieldSchema & { onChain: false };
export type OffChainCompoundNonArrayFormFieldSchema = FormFieldProperties &
  CompoundNonArrayFormFieldSchema & { onChain: false };
export type OffChainCompoundArrayFormFieldSchema =
  Partial<FormFieldProperties> &
    CompoundArrayFormFieldSchema & { onChain: false };

export type OffChainFormFieldSchema =
  | OffChainNonArrayFormFieldSchema
  | OffChainArrayFormFieldSchema
  | OffChainCompoundNonArrayFormFieldSchema
  | OffChainCompoundArrayFormFieldSchema;

export type FormFieldSchema = OffChainFormFieldSchema | OnChainFormFieldSchema;

/**
 * A ConfigurationSchema is an extended JSONSchema7 object that describes a set of related forms for configuring an entity.
 */
export interface ConfigurationSchema extends JSONSchema7 {
  /** The title of the schema. */
  title: string;

  /** An object containing properties of the schema where each key is a property name and the value is a FormFieldSchema.
   * Each property represents either a set of fields required as arguments to a smart contract function or a single field to
   * be stored off-chain.
   */
  properties: {
    [key: string]: FormFieldSchema;
  };

  additionalProperties?: boolean;
}

/**
 * Type guard, checks if a property is a top level property meaning its value is not part of a compound property.
 *
 * @param {FormFieldSchema | BaseFormFieldSchema | undefined} property - The property to check.
 * @returns {boolean} - Returns true if the property is a top-level property; otherwise, false.
 */
export function isTopLevelFormField(
  property: FormFieldSchema | BaseFormFieldSchema | undefined
): property is FormFieldSchema {
  return (property as FormFieldSchema)?.onChain !== undefined;
}

export function isOnChainFormFieldSchema(
  property: FormFieldSchema | BaseFormFieldSchema | undefined
): property is OnChainFormFieldSchema {
  return isTopLevelFormField(property) && property.onChain;
}

export function isOffChainFormFieldSchema(
  property: FormFieldSchema | BaseFormFieldSchema | undefined
): property is OffChainFormFieldSchema {
  return isTopLevelFormField(property) && !property.onChain;
}

export function isCompoundFormFieldSchema(
  property: FormFieldSchema | BaseFormFieldSchema | undefined
): property is CompoundNonArrayFormFieldSchema | CompoundArrayFormFieldSchema {
  return Boolean(
    (property as CompoundNonArrayFormFieldSchema | CompoundArrayFormFieldSchema)
      ?.compound
  );
}

export function isOnChainArrayFormFieldSchema(
  schema: FormFieldSchema | BaseFormFieldSchema | undefined
): schema is OnChainArrayFormFieldSchema & FormFieldProperties {
  return (
    schema !== undefined &&
    "onChain" in schema &&
    schema.onChain === true &&
    "type" in schema &&
    schema.type === "array" &&
    "transactionDetails" in schema &&
    "items" in schema
  );
}

export function isTransactionDetails(
  transactionDetails: TransactionDetails | ArrayTransactionDetails | undefined
): transactionDetails is TransactionDetails {
  return (
    transactionDetails !== undefined &&
    "args" in transactionDetails &&
    "functionName" in transactionDetails &&
    "abi" in transactionDetails
  );
}
