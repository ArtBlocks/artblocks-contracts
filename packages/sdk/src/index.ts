import { PublicClient } from "viem";
import { FormBlueprint, SubmissionStatusEnum, SubmissionStatus } from "./types";
import { generateProjectMinterConfigurationForms } from "./minter-configuration";
import { ProjectMinterConfigurationData } from "./minter-configuration/types";
import { GraphQLClient } from "graphql-request";

export type ArtBlocksClientOptions = {
  publicClient: PublicClient;
  graphqlEndpoint: string;
  authToken?: string;
};

export type ArtBlocksClientContext = {
  graphqlClient: GraphQLClient;
  publicClient: PublicClient;
  userIsStaff: boolean;
};

export default class ArtBlocksClient {
  context: ArtBlocksClientContext;

  constructor({
    publicClient,
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
      publicClient,
      userIsStaff,
    };
  }

  setAuthToken(authToken: string) {
    this.context.graphqlClient.setHeaders({
      Authorization: `Bearer ${authToken}`,
    });
  }

  async getProjectMinterConfigurationContext(projectId: string) {
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

    // Load the initial configuration
    const { forms, data } = await generateProjectMinterConfigurationForms({
      projectId,
      onConfigurationChange: notifySubscribers,
      clientContext: this.context,
    });

    return {
      data,
      // Provide a method to access the current configuration
      forms,

      // Provide a method to refresh the configuration
      refresh: async () => {
        await generateProjectMinterConfigurationForms({
          projectId,
          onConfigurationChange: notifySubscribers,
          clientContext: this.context,
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
