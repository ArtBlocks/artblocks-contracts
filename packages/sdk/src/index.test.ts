import ArtBlocksSDK from "./index";
import { PublicClient } from "viem";
import { generateProjectMinterConfigurationForms } from "./minter-configuration";
import { FormBlueprint } from "./types";

// Mocking the external dependencies
jest.mock("./minter-configuration", () => ({
  generateProjectMinterConfigurationForms: jest.fn(),
}));

describe("ArtBlocksSDK", () => {
  let sdk: ArtBlocksSDK;
  const mockPublicClient = {} as PublicClient; // Mock as needed
  const graphqlEndpoint = "https://test.graphql.endpoint";
  const jwt = "test-jwt";

  beforeEach(() => {
    sdk = new ArtBlocksSDK({
      publicClient: mockPublicClient,
      graphqlEndpoint,
      jwt,
    });
  });

  describe("constructor", () => {
    it("initializes with the correct properties", () => {
      expect(sdk.publicClient).toBe(mockPublicClient);
      expect(sdk.graphqlEndpoint).toBe(graphqlEndpoint);
      expect(sdk.jwt).toBe(jwt);
      // Assuming the constructor does something with the jwt to determine if the user is staff
      // This is a simplified example. Adjust according to your actual jwt parsing logic.
      expect(sdk.userIsStaff).toBe(false); // or true, based on your jwt mock
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

      const config = await sdk.getProjectMinterConfiguration(projectId);

      expect(generateProjectMinterConfigurationForms).toHaveBeenCalledWith({
        projectId,
        onConfigurationChange: expect.any(Function),
        sdk,
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
      const config = await sdk.getProjectMinterConfiguration(projectId);
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
      const config = await sdk.getProjectMinterConfiguration(projectId);
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
      const config = await sdk.getProjectMinterConfiguration(projectId);
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
