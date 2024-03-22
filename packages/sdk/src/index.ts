import { PublicClient } from "viem";
import { FormBlueprint, SubmissionStatusEnum, SubmissionStatus } from "./types";
import { generateProjectMinterConfigurationForms } from "./minter-configuration";
import { ProjectMinterConfigurationData } from "./minter-configuration/types";

export type ArtBlocksSDKOptions = {
  publicClient: PublicClient;
  graphqlEndpoint: string;
  jwt?: string;
};

export default class ArtBlocksSDK {
  publicClient: PublicClient;
  graphqlEndpoint: string;
  jwt?: string;
  userIsStaff: boolean;

  constructor({ publicClient, jwt, graphqlEndpoint }: ArtBlocksSDKOptions) {
    this.publicClient = publicClient;
    this.jwt = jwt;
    this.graphqlEndpoint = graphqlEndpoint;

    const jwtString = Buffer.from(
      this.jwt?.split(".")[1] ?? "",
      "base64"
    ).toString();
    const jwtData = jwtString ? JSON.parse(jwtString) : null;

    this.userIsStaff = jwtData?.isStaff ?? false;
  }

  async getProjectMinterConfiguration(projectId: string) {
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
      sdk: this,
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
          sdk: this,
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
