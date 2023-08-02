import { graphql } from "./generated/gql";
import { request } from "graphql-request";
import {
  filterProjectIdFromFormSchema,
  mockMinterSchemaMap,
  SelectedMinter,
  AvailableMinter,
} from "./minters";
import { Abi, PublicClient, WalletClient } from "viem";
import { isOnChainFormFieldSchema } from "./json-schema";
import { formFieldSchemaToZod } from "./utils";

export type ArtBlocksSDKOptions = {
  publicClient: PublicClient;
  graphqlEndpoint: string;
  jwt?: string;
};

const getProjectMinterConfigurationQueryDocument = graphql(/* GraphQL */ `
  query GetProjectMinterConfiguration($projectId: String!) {
    projects_metadata_by_pk(id: $projectId) {
      contract {
        minter_filter {
          globally_allowed_minters {
            address
            minter_type
          }
        }
      }

      minter_configuration {
        id
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
  ): Promise<{
    availableMinters: AvailableMinter[];
    selectedMinter: SelectedMinter | null;
  } | null> {
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

    console.log("PROJECT ", project);

    const minterConfiguration = project?.minter_configuration;
    if (!minterConfiguration || !minterConfiguration.minter) {
      return null;
    }

    const configurationSchema =
      mockMinterSchemaMap[
        minterConfiguration.minter?.type?.unversioned_type as string
      ];

    const configurationForms = Object.entries(
      configurationSchema.properties
    ).map(([, value]) => {
      // Filter out projectId from the form schema because we already know it
      const schemaWithProjectIdFiltered = filterProjectIdFromFormSchema(value);

      return {
        formSchema: schemaWithProjectIdFiltered,
        zodSchema: formFieldSchemaToZod(schemaWithProjectIdFiltered),
        handleSubmit: async (
          args: Record<string, any>,
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

          try {
            const hash = await walletClient.writeContract({
              address: coreContractAddress as `0x${string}`,
              abi: schemaWithProjectIdFiltered.transactionDetails.abi as Abi,
              functionName:
                schemaWithProjectIdFiltered.transactionDetails.functionName,
              args: schemaWithProjectIdFiltered.transactionDetails.args,
              account: walletClient.account,
              chain: walletClient.chain,
            });

            if (hash) {
              const { status } =
                await this.publicClient.waitForTransactionReceipt({
                  hash,
                });
              console.log("STATUS ", status);
            } else {
              console.log("ERROR");
            }
          } catch (err) {
            // TODO: add better error handling
            console.error(`ERROR: ${err}`);
          }
        },
      };
    });
    return {
      availableMinters: (
        project.contract.minter_filter?.globally_allowed_minters || []
      ).map((minter) => ({
        address: minter.address,
        type: minter.minter_type,
      })),
      selectedMinter: {
        type: minterConfiguration.minter?.minter_type ?? "",
        address: minterConfiguration.minter?.address as string,
        basePrice: minterConfiguration.base_price ?? null,
        currencyAddress: minterConfiguration.currency_address ?? null,
        currencySymbol: minterConfiguration.currency_symbol ?? null,
        extraMinterDetails: minterConfiguration.extra_minter_details,
        configurationForms,
      },
    };
  }
}
