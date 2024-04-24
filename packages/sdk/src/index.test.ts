import ArtBlocksClient from "./index";
import { PublicClient } from "viem";
import { generateProjectMinterConfigurationForms } from "./minter-configuration";
import { FormBlueprint } from "./types";
import { GraphQLClient } from "graphql-request";

// Mocking the external dependencies
jest.mock("./minter-configuration", () => ({
  generateProjectMinterConfigurationForms: jest.fn(),
}));

describe("ArtBlocksClient", () => {
  let abClient: ArtBlocksClient;
  const mockPublicClient = {} as PublicClient; // Mock as needed
  const graphqlEndpoint = "https://test.graphql.endpoint";
  const jwt = "test-jwt";

  beforeEach(() => {
    abClient = new ArtBlocksClient({
      publicClient: mockPublicClient,
      graphqlEndpoint,
      authToken: jwt,
    });
  });

  describe("constructor", () => {
    it("initializes with the correct properties", () => {
      expect(abClient.context.publicClient).toBe(mockPublicClient);
      expect(abClient.context.userIsStaff).toBe(false);

      const headers =
        typeof abClient.context.graphqlClient.requestConfig.headers ===
        "function"
          ? abClient.context.graphqlClient.requestConfig.headers()
          : abClient.context.graphqlClient.requestConfig.headers;
      expect(abClient.context.graphqlClient).toBeInstanceOf(GraphQLClient);
      expect((abClient.context.graphqlClient as any).url).toBe(graphqlEndpoint);
      expect(headers).toHaveProperty("Authorization", `Bearer ${jwt}`);
    });
  });

  describe("getProjectMinterConfiguration", () => {
    it("calls generateProjectMinterConfigurationForms with the correct parameters", async () => {
      const projectId = "test-project-id";
      const mockForms: FormBlueprint[] = [];
      const mockData = {};
      (generateProjectMinterConfigurationForms as jest.Mock).mockResolvedValue({
        forms: mockForms,
        data: mockData,
      });

      const config =
        await abClient.getProjectMinterConfigurationContext(projectId);

      expect(generateProjectMinterConfigurationForms).toHaveBeenCalledWith({
        projectId,
        onConfigurationChange: expect.any(Function),
        clientContext: abClient.context,
      });
      expect(config.data).toBe(mockData);
      expect(config.forms).toBe(mockForms);
    });
  });

  describe("Subscriber Functionality", () => {
    const projectId = "test-project-id";

    beforeEach(() => {
      // Mock `generateProjectMinterConfigurationForms` to immediately invoke the `onConfigurationChange` callback
      // with dummy data to simulate a configuration change.
      (generateProjectMinterConfigurationForms as jest.Mock).mockImplementation(
        async ({ onConfigurationChange }) => {
          const mockForms: FormBlueprint[] = [];
          const mockData = {};
          onConfigurationChange({ forms: mockForms, data: mockData });
          return { forms: mockForms, data: mockData };
        }
      );
    });

    it("correctly subscribes and notifies subscribers of configuration changes", async () => {
      const config =
        await abClient.getProjectMinterConfigurationContext(projectId);
      const subscriberMock = jest.fn();

      // Subscribe
      config.subscribe(subscriberMock);

      // Simulate a configuration change
      await config.refresh();

      // Verify the subscriber was notified
      expect(subscriberMock).toHaveBeenCalledWith({
        forms: expect.any(Array),
        data: expect.any(Object),
      });
    });

    it("allows subscribers to unsubscribe", async () => {
      const config =
        await abClient.getProjectMinterConfigurationContext(projectId);
      const subscriberMock = jest.fn();

      // Subscribe and then immediately unsubscribe
      const unsubscribe = config.subscribe(subscriberMock);
      unsubscribe();

      // Simulate a configuration change
      await config.refresh();

      // Verify the subscriber was not notified
      expect(subscriberMock).not.toHaveBeenCalled();
    });

    it("handles multiple subscribers", async () => {
      const config =
        await abClient.getProjectMinterConfigurationContext(projectId);
      const firstSubscriberMock = jest.fn();
      const secondSubscriberMock = jest.fn();

      // Subscribe both
      config.subscribe(firstSubscriberMock);
      config.subscribe(secondSubscriberMock);

      // Simulate a configuration change
      await config.refresh();

      // Verify both subscribers were notified
      expect(firstSubscriberMock).toHaveBeenCalledTimes(1);
      expect(secondSubscriberMock).toHaveBeenCalledTimes(1);
    });
  });

  // Add tests for other methods within the ArtBlocksSDK class as needed
});
