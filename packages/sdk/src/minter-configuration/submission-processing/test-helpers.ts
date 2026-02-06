import {
  ProjectWithMinterFilter,
  TransformProjectMinterConfigurationFormValuesArgs,
} from "../types";
import { ProjectMinterConfigurationDetailsFragment } from "../../generated/graphql";
import { FormFieldSchema } from "../../json-schema";
import { GraphQLClient } from "graphql-request";
import { PublicClient } from "viem";
import { PublicClientResolver } from "../../index";

export function generateTransformProjectMinterConfigurationFormValuesArgs(
  overrides?: Partial<TransformProjectMinterConfigurationFormValuesArgs>
) {
  const mockPublicClientResolver: PublicClientResolver = () =>
    ({}) as unknown as PublicClient;
  const args: TransformProjectMinterConfigurationFormValuesArgs = {
    clientContext: {
      graphqlClient: {
        request: jest.fn(),
      } as unknown as GraphQLClient,
      userIsStaff: false,
      publicClientResolver: mockPublicClientResolver,
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
      chain_id: 1,
    } as unknown as ProjectWithMinterFilter,
    schema: {} as unknown as FormFieldSchema,
    ...overrides,
  };

  return args;
}
