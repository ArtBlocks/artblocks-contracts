import { graphql } from "./generated/gql";
import { request } from "graphql-request";
import {
  filterProjectIdFromFormSchema,
  mockMinterSchemaMap,
  minterSelectionSchema,
  ConfigurationForm,
} from "./minters";
import { Abi, Hex, PublicClient, WalletClient } from "viem";
import {
  BaseFormFieldSchema,
  FormFieldSchema,
  isOnChainFormFieldSchema,
} from "./json-schema";
import { formFieldSchemaToZod } from "./utils";
import {
  ProjectMinterConfigurationDetailsFragment,
  ProjectMinterConfigurationDetailsFragmentDoc,
} from "./generated/graphql";
import get from "lodash/get";
import set from "lodash/set";
import { useFragment } from "./generated";

export type ArtBlocksSDKOptions = {
  publicClient: PublicClient;
  graphqlEndpoint: string;
  jwt?: string;
};

const getProjectMinterConfigurationQueryDocument = graphql(/* GraphQL */ `
  query GetProjectMinterConfiguration($projectId: String!) {
    projects_metadata_by_pk(id: $projectId) {
      project_id

      contract {
        minter_filter {
          address
          globally_allowed_minters {
            address
            minter_type
            type {
              label
            }
          }
        }
      }

      minter_configuration {
        ...ProjectMinterConfigurationDetails
      }
    }
  }

  fragment ProjectMinterConfigurationDetails on project_minter_configurations {
    id
    project_id
    base_price
    currency_address
    currency_symbol
    extra_minter_details
    minter {
      address
      minter_type
      type {
        unversioned_type
        version_number
      }
    }
  }
`);

export default class ArtBlocksSDK {
  publicClient: PublicClient;
  graphqlEndpoint: string;
  jwt?: string;

  constructor({ publicClient, jwt, graphqlEndpoint }: ArtBlocksSDKOptions) {
    this.publicClient = publicClient;
    this.jwt = jwt;
    this.graphqlEndpoint = graphqlEndpoint;
  }

  async getProjectMinterConfiguration(
    coreContractAddress: string,
    projectId: number
  ) {
    // Load the initial configuration
    let configuration = await this.loadProjectMinterConfiguration(
      coreContractAddress,
      projectId
    );

    // Create a list of subscribers
    let subscribers: Array<(config: typeof configuration) => void> = [];

    return {
      // Provide a method to access the current configuration
      forms: configuration,

      // Provide a method to refresh the configuration
      refresh: async () => {
        configuration = await this.loadProjectMinterConfiguration(
          coreContractAddress,
          projectId
        );

        // Notify subscribers of the change
        for (const subscriber of subscribers) {
          subscriber(configuration);
        }
      },

      // Provide a method to subscribe to changes in the configuration
      subscribe: (callback: (config: typeof configuration) => void) => {
        subscribers.push(callback);

        // Provide a way to unsubscribe
        return () => {
          subscribers = subscribers.filter(
            (subscriber) => subscriber !== callback
          );
        };
      },
    };
  }

  private async loadProjectMinterConfiguration(
    coreContractAddress: string,
    projectId: number
  ): Promise<ConfigurationForm[]> {
    // Get current minter configuration details from the database
    const res = await request(
      this.graphqlEndpoint,
      getProjectMinterConfigurationQueryDocument,
      {
        projectId: `${coreContractAddress}-${projectId}`,
      },
      {
        Authorization: `Bearer ${this.jwt}`,
      }
    );
    const project = res.projects_metadata_by_pk;

    if (!project) {
      throw new Error(
        `Could not find project with core contract address ${coreContractAddress} and project id ${projectId}`
      );
    }

    if (!project.contract.minter_filter) {
      throw new Error(
        `Project with core contract address ${coreContractAddress} and project id ${projectId} does not have a minter filter`
      );
    }

    // If no minter has been selected, return only the minter selection form
    const minterConfiguration = useFragment(
      ProjectMinterConfigurationDetailsFragmentDoc,
      res.projects_metadata_by_pk?.minter_configuration
    );

    const minterSelectionSchemaWithMinters = minterSelectionSchema;
    if (minterSelectionSchemaWithMinters.properties?.["minter.address"]) {
      minterSelectionSchemaWithMinters.properties["minter.address"].oneOf = (
        project.contract.minter_filter.globally_allowed_minters || []
      ).map((minter) => ({
        const: minter.address,
        title: minter.type?.label ?? undefined,
      }));
    }

    // Initialize configurationForms with the minter selection form
    let configurationForms: ConfigurationForm[] = [
      {
        formSchema: minterSelectionSchemaWithMinters,
        initialFormValues: getInitialMinterConfigurationValuesForFormField(
          minterSelectionSchema,
          minterConfiguration ?? null
        ),
        zodSchema: formFieldSchemaToZod(minterSelectionSchema),
        handleSubmit: async (
          formValues: Record<string, any>,
          walletClient: WalletClient
        ) => {
          // We need basic information about the project and the
          // minter to submit the transaction
          if (
            !project ||
            !project.contract.minter_filter ||
            !formValues["minter.address"] ||
            !walletClient.account
          ) {
            return;
          }

          // Get the minter filter address for minter selection
          const minterFilterAddress: Hex = project.contract.minter_filter
            .address as Hex;

          // Map the form values to an array of arguments expected by the smart contract function
          const functionArgs = this.mapFormValuesToArgs(
            minterSelectionSchema.transactionDetails.args,
            formValues,
            projectId,
            coreContractAddress
          );

          console.log({ functionArgs });

          // Submit the transaction
          await this.submitTransaction({
            walletClient,
            address: minterFilterAddress,
            abi: minterSelectionSchema.transactionDetails.abi as Abi,
            functionName: minterSelectionSchema.transactionDetails.functionName,
            args: functionArgs,
          });
        },
      },
    ];

    if (!minterConfiguration || !minterConfiguration.minter) {
      return configurationForms;
    }

    const minterConfigurationSchema =
      mockMinterSchemaMap[
        minterConfiguration.minter?.type?.unversioned_type as string
      ];

    configurationForms = configurationForms.concat(
      Object.entries(minterConfigurationSchema.properties).map(([, value]) => {
        // Filter out projectId from the form schema because we already know it
        const schemaWithProjectIdFiltered =
          filterProjectIdFromFormSchema(value);

        const initialFormValues =
          getInitialMinterConfigurationValuesForFormField(
            schemaWithProjectIdFiltered,
            minterConfiguration
          );

        return {
          formSchema: schemaWithProjectIdFiltered,
          initialFormValues,
          zodSchema: formFieldSchemaToZod(schemaWithProjectIdFiltered),
          handleSubmit: async (
            formValues: Record<string, any>,
            walletClient: WalletClient
          ) => {
            if (
              !minterConfiguration.minter ||
              !isOnChainFormFieldSchema(schemaWithProjectIdFiltered) ||
              !("abi" in schemaWithProjectIdFiltered.transactionDetails) ||
              !walletClient.account
            ) {
              return;
            }

            const functionArgs = this.mapFormValuesToArgs(
              schemaWithProjectIdFiltered.transactionDetails.args,
              formValues,
              projectId,
              coreContractAddress
            );

            await this.submitTransaction({
              walletClient,
              address: minterConfiguration.minter.address as `0x${string}`,
              abi: schemaWithProjectIdFiltered.transactionDetails.abi as Abi,
              functionName:
                schemaWithProjectIdFiltered.transactionDetails.functionName,
              args: functionArgs, // this needs to come from values,
            });
          },
        };
      })
    );
    return configurationForms;
  }

  private async submitTransaction({
    walletClient,
    address,
    abi,
    functionName,
    args,
  }: {
    walletClient: WalletClient;
    address: Hex;
    abi: Abi;
    functionName: string;
    args: (string | number)[];
  }) {
    if (!walletClient.account) {
      return;
    }

    try {
      const hash = await walletClient.writeContract({
        address,
        abi,
        functionName,
        args,
        account: walletClient.account,
        chain: walletClient.chain,
      });

      if (hash) {
        const { status } = await this.publicClient.waitForTransactionReceipt({
          hash,
        });
        console.log("STATUS ", status);
      } else {
        console.log("ERROR");
      }
    } catch (err) {
      console.error(`ERROR: ${err}`);
    }
  }

  private mapFormValuesToArgs(
    schemaArgs: string[],
    formValues: Record<string, any>,
    projectId: number,
    coreContractAddress: string
  ): (string | number)[] {
    return schemaArgs.reduce<(string | number)[]>((acc, arg) => {
      if (arg === "project_id") {
        return acc.concat(projectId);
      }

      if (arg === "contract_address") {
        return acc.concat(coreContractAddress);
      }

      return acc.concat(get(formValues, arg));
    }, []);
  }
}

export function getInitialMinterConfigurationValuesForFormField(
  formField: FormFieldSchema,
  projectMinterConfiguration: ProjectMinterConfigurationDetailsFragment | null
): Record<string, any> {
  // Object to hold the initial values
  const initialValues: Record<string, any> = {};

  // Recursive function to traverse the schema and set initial values
  function recursiveInitialValues(
    schema: BaseFormFieldSchema,
    configuration: ProjectMinterConfigurationDetailsFragment | null,
    parentKey = ""
  ): void {
    // Check if the current schema is of type object and has properties
    if (schema.type === "object" && schema.properties) {
      // Iterate through the properties of the schema
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (!propSchema || typeof propSchema !== "object") {
          continue;
        }
        // Construct the full key for the current property (e.g., "parent.child")
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        // Call the function recursively for the current property
        recursiveInitialValues(propSchema, configuration, fullKey);
      }
    } else {
      // If the current schema is a leaf field (not an object), set the initial value
      // Use the value from the configuration if present, otherwise fall back to the default value
      console.log({
        parentKey,
        configuration,
        data: get(configuration, parentKey, schema.default ?? null),
      });
      set(
        initialValues,
        parentKey,
        get(configuration, parentKey, schema.default ?? null)
      );
    }
  }

  // Start the recursion from the root form field
  recursiveInitialValues(formField, projectMinterConfiguration);

  // Return the populated initialValues object
  return initialValues;
}
