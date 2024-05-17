import {
  ProjectWithMinterFilter,
  TransformProjectMinterConfigurationFormValuesArgs,
} from "../types";
import { ProjectMinterConfigurationDetailsFragment } from "../../generated/graphql";
import { FormFieldSchema } from "../../json-schema";
import { GraphQLClient } from "graphql-request";
import { PublicClient } from "viem";

export function generateTransformProjectMinterConfigurationFormValuesArgs(
  overrides?: Partial<TransformProjectMinterConfigurationFormValuesArgs>
) {
  const args: TransformProjectMinterConfigurationFormValuesArgs = {
    clientContext: {
      graphqlClient: {
        request: jest.fn(),
      } as unknown as GraphQLClient,
      userIsStaff: false,
      publicClient: {} as unknown as PublicClient,
    },
    projectId: "fake-project-id",
    minterConfiguration: {
      id: "fake-config-id",
    } as unknown as ProjectMinterConfigurationDetailsFragment,
    allowedPrivilegedRolesForProject: ["staff"],
    onConfigurationChange: jest.fn(),
    coreContractAddress: "fake-core-contract-address",
    projectIndex: 1,
    formValues: {},
    project: {
      id: "fake-project-id",
    } as unknown as ProjectWithMinterFilter,
    schema: {} as unknown as FormFieldSchema,
    ...overrides,
  };

  return args;
}
