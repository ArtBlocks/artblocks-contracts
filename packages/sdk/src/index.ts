import { PublicClient, WalletClient } from "viem";
import { FormBlueprint, SubmissionStatusEnum, SubmissionStatus } from "./types";
import { generateProjectMinterConfigurationForms } from "./minter-configuration";
import { ProjectMinterConfigurationData } from "./minter-configuration/types";
import { GraphQLClient, RequestDocument, Variables } from "graphql-request";
import { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { VariablesAndRequestHeadersArgs } from "graphql-request/build/esm/types";

/**
 * A function that resolves to a PublicClient for a given chainId.
 */
export type PublicClientResolver = (
  chainId: number
) => PublicClient | undefined;

export type ArtBlocksClientOptions = {
  graphqlEndpoint: string;
  publicClientResolver?: PublicClientResolver;
  authToken?: string;
  walletClient?: WalletClient;
};

export type ArtBlocksClientContext = {
  graphqlClient: GraphQLClient;
  publicClientResolver?: PublicClientResolver;
  walletClient?: WalletClient;
  userIsStaff: boolean;
};

/**
 * A resolved context with a concrete PublicClient for a specific chain.
 * Used internally when making chain-specific calls.
 */
export type ArtBlocksClientContextWithPublicClient = Omit<
  ArtBlocksClientContext,
  "publicClientResolver"
> & {
  publicClient: PublicClient;
};

export class ArtBlocksClient {
  context: ArtBlocksClientContext;

  constructor({
    publicClientResolver,
    walletClient,
    authToken,
    graphqlEndpoint,
  }: ArtBlocksClientOptions) {
    // Create a GraphQL client with the provided endpoint and auth token
    const graphqlClient = new GraphQLClient(graphqlEndpoint, {
      headers: (): { Authorization?: string } => {
        if (!authToken) {
          return {};
        }

        return {
          Authorization: `Bearer ${authToken}`,
        };
      },
    });

    // Parse the JWT to determine if the user is staff
    const jwtString = Buffer.from(
      authToken?.split(".")[1] ?? "",
      "base64"
    ).toString();
    const jwtData = jwtString ? JSON.parse(jwtString) : null;
    const userIsStaff = Boolean(jwtData?.isStaff);

    this.context = {
      graphqlClient,
      publicClientResolver,
      walletClient,
      userIsStaff,
    };
  }

  setAuthToken(authToken?: string) {
    if (!authToken) {
      this.context.graphqlClient.setHeaders({});
      return;
    }

    this.context.graphqlClient.setHeaders({
      Authorization: `Bearer ${authToken}`,
    });
  }

  getPublicClient(chainId: number): PublicClient | undefined {
    return this.context.publicClientResolver?.(chainId);
  }

  setPublicClientResolver(
    publicClientResolver: PublicClientResolver | undefined
  ) {
    this.context.publicClientResolver = publicClientResolver;
  }

  setWalletClient(walletClient: WalletClient | undefined) {
    this.context.walletClient = walletClient;
  }

  getWalletClient() {
    return this.context.walletClient;
  }

  async graphqlRequest<T, V extends Variables = Variables>(
    document: RequestDocument | TypedDocumentNode<T, V>,
    ...variablesAndRequestHeaders: VariablesAndRequestHeadersArgs<V>
  ): Promise<T> {
    return this.context.graphqlClient.request(
      document,
      ...variablesAndRequestHeaders
    );
  }

  async getProjectMinterConfigurationContext(
    projectId: string,
    chainId: number
  ) {
    if (!this.context.publicClientResolver) {
      throw new Error(
        "A publicClientResolver is required to get project minter configuration context"
      );
    }

    // Create a list of subscribers
    let subscribers: Array<
      (config: {
        data: ProjectMinterConfigurationData;
        forms: FormBlueprint[];
      }) => void
    > = [];

    const notifySubscribers = (updatedConfig: {
      data: ProjectMinterConfigurationData;
      forms: FormBlueprint[];
    }) => {
      for (const subscriber of subscribers) {
        subscriber(updatedConfig);
      }
    };

    // Build the client context with the resolver
    const clientContext = {
      ...this.context,
      publicClientResolver: this.context.publicClientResolver,
    };

    // Load the initial configuration
    const { forms, data } = await generateProjectMinterConfigurationForms({
      projectId,
      chainId,
      onConfigurationChange: notifySubscribers,
      clientContext,
    });

    return {
      data,
      // Provide a method to access the current configuration
      forms,

      // Provide a method to refresh the configuration
      refresh: async () => {
        if (!this.context.publicClientResolver) {
          throw new Error(
            "A publicClientResolver is required to get project minter configuration context"
          );
        }

        const clientContext = {
          ...this.context,
          publicClientResolver: this.context.publicClientResolver,
        };

        await generateProjectMinterConfigurationForms({
          projectId,
          chainId,
          onConfigurationChange: notifySubscribers,
          clientContext,
        });
      },

      // Provide a method to subscribe to changes in the configuration
      subscribe: (
        callback: (config: {
          data: ProjectMinterConfigurationData;
          forms: FormBlueprint[];
        }) => void
      ) => {
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
}

export {
  type FormBlueprint as ConfigurationForm,
  type SubmissionStatus,
  type ProjectMinterConfigurationData as ProjectConfigData,
  SubmissionStatusEnum,
};
