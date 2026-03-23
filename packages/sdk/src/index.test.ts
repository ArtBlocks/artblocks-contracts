import { ArtBlocksClient } from "./index";
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
  const mockPublicClientResolver = () => mockPublicClient;
  const graphqlEndpoint = "https://test.graphql.endpoint";
  const jwt = "test-jwt";
  const testChainId = 1;

  beforeEach(() => {
    abClient = new ArtBlocksClient({
      publicClientResolver: mockPublicClientResolver,
      graphqlEndpoint,
      authToken: jwt,
    });
  });

  describe("constructor", () => {
    it("initializes with the correct properties", () => {
      expect(abClient.getPublicClient(testChainId)).toBe(mockPublicClient);
      expect(abClient.context.authContext).toBeUndefined();

      const headers =
        typeof abClient.context.graphqlClient.requestConfig.headers ===
        "function"
          ? abClient.context.graphqlClient.requestConfig.headers()
          : abClient.context.graphqlClient.requestConfig.headers;
      expect(abClient.context.graphqlClient).toBeInstanceOf(GraphQLClient);
      expect((abClient.context.graphqlClient as any).url).toBe(graphqlEndpoint);
      expect(headers).toHaveProperty("Authorization", `Bearer ${jwt}`);
    });

    it("omits the authorization header when authToken is not provided", () => {
      const unauthenticatedClient = new ArtBlocksClient({
        publicClientResolver: mockPublicClientResolver,
        graphqlEndpoint,
      });

      const headers =
        typeof unauthenticatedClient.context.graphqlClient.requestConfig
          .headers === "function"
          ? unauthenticatedClient.context.graphqlClient.requestConfig.headers()
          : unauthenticatedClient.context.graphqlClient.requestConfig.headers;

      expect(headers).toEqual({});
    });
  });

  describe("auth and wallet context helpers", () => {
    it("updates auth and wallet state explicitly", () => {
      const walletClient = {
        account: {
          address: "0x0000000000000000000000000000000000000001",
        },
      } as any;

      expect(abClient.getWalletClient()).toBeUndefined();
      expect(abClient.getAuthContext()).toBeUndefined();
      expect(abClient.getProfileId()).toBeNull();
      expect(abClient.hasAuthenticatedUser()).toBe(false);

      abClient.setWalletClient(walletClient);
      abClient.setAuthContext({
        profileId: 123,
        userIsStaff: true,
      });

      expect(abClient.getWalletClient()).toBe(walletClient);
      expect(abClient.getAuthContext()).toEqual({
        profileId: 123,
        userIsStaff: true,
      });
      expect(abClient.getProfileId()).toBe(123);
      expect(abClient.hasAuthenticatedUser()).toBe(true);

      abClient.setAuthContext({
        profileId: null,
        userIsStaff: false,
      });

      expect(abClient.getProfileId()).toBeNull();
      expect(abClient.hasAuthenticatedUser()).toBe(false);
    });

    it("updates graphql authorization headers when authToken changes", () => {
      abClient.setAuthToken("next-token");
      expect(
        (abClient.context.graphqlClient as any).requestConfig.headers
      ).toEqual({
        Authorization: "Bearer next-token",
      });

      abClient.setAuthToken(undefined);
      expect(
        (abClient.context.graphqlClient as any).requestConfig.headers
      ).toEqual({});
    });
  });

  describe("graphqlRequest", () => {
    it("forwards requests to the underlying graphql client", async () => {
      const requestSpy = jest
        .spyOn(abClient.context.graphqlClient, "request")
        .mockResolvedValue({ viewer: { id: "123" } });

      await expect(
        abClient.graphqlRequest("query Viewer { viewer { id } }")
      ).resolves.toEqual({ viewer: { id: "123" } });

      expect(requestSpy).toHaveBeenCalledWith("query Viewer { viewer { id } }");
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

      const config = await abClient.getProjectMinterConfigurationContext(
        projectId,
        testChainId
      );

      expect(generateProjectMinterConfigurationForms).toHaveBeenCalledWith({
        projectId,
        chainId: testChainId,
        onConfigurationChange: expect.any(Function),
        clientContext: abClient.context,
      });
      expect(config.data).toBe(mockData);
      expect(config.forms).toBe(mockForms);
    });

    it("throws an error if getProjectMinterConfigurationContext is called without a publicClientResolver in context", async () => {
      abClient.setPublicClientResolver(undefined);
      const projectId = "test-project-id";

      await expect(
        abClient.getProjectMinterConfigurationContext(projectId, testChainId)
      ).rejects.toThrow(
        "A publicClientResolver is required to get project minter configuration context"
      );
    });

    it("throws an error if refresh is called after the publicClientResolver is removed", async () => {
      const projectId = "test-project-id";
      const mockForms: FormBlueprint[] = [];
      const mockData = {};
      (generateProjectMinterConfigurationForms as jest.Mock).mockResolvedValue({
        forms: mockForms,
        data: mockData,
      });

      const config = await abClient.getProjectMinterConfigurationContext(
        projectId,
        testChainId
      );

      abClient.setPublicClientResolver(undefined);

      await expect(config.refresh()).rejects.toThrow(
        "A publicClientResolver is required to get project minter configuration context"
      );
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
      const config = await abClient.getProjectMinterConfigurationContext(
        projectId,
        testChainId
      );
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
      const config = await abClient.getProjectMinterConfigurationContext(
        projectId,
        testChainId
      );
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
      const config = await abClient.getProjectMinterConfigurationContext(
        projectId,
        testChainId
      );
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
