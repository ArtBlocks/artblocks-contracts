import {
  pollForSyncedMinterConfigUpdates,
  pollForProjectUpdates,
} from "./polling";
import ArtBlocksSDK from "../..";
import request from "graphql-request";
import { asyncPoll } from "../../utils/async-poll";

jest.mock("graphql-request");
jest.mock("../../utils/async-poll");

describe("polling", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const sdk = new ArtBlocksSDK({
    publicClient: {} as any,
    graphqlEndpoint: "https://test.com/graphql",
    jwt: "fake-jwt",
  });
  const projectId = "test-project-id";
  const transactionConfirmedAt = new Date();
  const updateProperties = ["property1", "property2"];

  describe("pollForSyncedMinterConfigUpdates", () => {
    it("should poll for synced minter config updates", async () => {
      (request as jest.Mock).mockResolvedValue({
        projects_metadata_by_pk: {
          minter_configuration: {
            properties_updated_at: {
              property1: new Date().toISOString(),
            },
          },
        },
      });

      (asyncPoll as jest.Mock).mockImplementation(async (callback) => {
        await callback();
      });

      await pollForSyncedMinterConfigUpdates(
        sdk,
        projectId,
        transactionConfirmedAt,
        updateProperties
      );

      expect(request).toHaveBeenCalled();
      expect(asyncPoll).toHaveBeenCalled();
    });

    it("should poll until the property is updated", async () => {
      // First call: the property is not updated yet
      (request as jest.Mock).mockResolvedValueOnce({
        projects_metadata_by_pk: {
          minter_configuration: {
            properties_updated_at: {
              property1: new Date(
                transactionConfirmedAt.getTime() - 1000
              ).toISOString(), // 1 second before the transaction
            },
          },
        },
      });

      // Second call: the property is updated
      (request as jest.Mock).mockResolvedValueOnce({
        projects_metadata_by_pk: {
          minter_configuration: {
            properties_updated_at: {
              property1: new Date(
                transactionConfirmedAt.getTime() + 1000
              ).toISOString(), // 1 second after the transaction
            },
          },
        },
      });

      // Mock asyncPoll to call the callback immediately
      (asyncPoll as jest.Mock).mockImplementation(async (callback) => {
        await callback();
        await callback();
      });

      await pollForSyncedMinterConfigUpdates(
        sdk,
        projectId,
        transactionConfirmedAt,
        updateProperties
      );

      // Check that request was called twice
      expect(request).toHaveBeenCalledTimes(2);
      // Check that asyncPoll was called once
      expect(asyncPoll).toHaveBeenCalledTimes(1);
    });

    it("should throw an error if the project is not found", async () => {
      (request as jest.Mock).mockResolvedValue({});

      (asyncPoll as jest.Mock).mockImplementation(async (callback) => {
        await callback();
      });

      await expect(
        pollForSyncedMinterConfigUpdates(
          sdk,
          projectId,
          transactionConfirmedAt,
          updateProperties
        )
      ).rejects.toThrow(`Could not find project with id ${projectId}`);
    });

    it("should throw an error if there is an API error", async () => {
      (request as jest.Mock).mockRejectedValue(new Error("API error"));

      (asyncPoll as jest.Mock).mockImplementation(async (callback) => {
        await callback();
      });

      await expect(
        pollForSyncedMinterConfigUpdates(
          sdk,
          projectId,
          transactionConfirmedAt,
          updateProperties
        )
      ).rejects.toThrow("API error");
    });
  });

  describe("pollForProjectUpdates", () => {
    it("should poll for project updates", async () => {
      (request as jest.Mock).mockResolvedValue({
        projects_metadata_by_pk: {
          properties_updated_at: {
            property1: new Date().toISOString(),
          },
        },
      });

      (asyncPoll as jest.Mock).mockImplementation(async (callback) => {
        await callback();
      });

      await pollForProjectUpdates(
        sdk,
        projectId,
        transactionConfirmedAt,
        updateProperties
      );

      expect(request).toHaveBeenCalled();
      expect(asyncPoll).toHaveBeenCalled();
    });

    it("should poll until the property is updated", async () => {
      // First call: the property is not updated yet
      (request as jest.Mock).mockResolvedValueOnce({
        projects_metadata_by_pk: {
          properties_updated_at: {
            property1: new Date(
              transactionConfirmedAt.getTime() - 1000
            ).toISOString(), // 1 second before the transaction
          },
        },
      });

      // Second call: the property is updated
      (request as jest.Mock).mockResolvedValueOnce({
        projects_metadata_by_pk: {
          properties_updated_at: {
            property1: new Date(
              transactionConfirmedAt.getTime() + 1000
            ).toISOString(), // 1 second after the transaction
          },
        },
      });

      // Mock asyncPoll to call the callback immediately
      (asyncPoll as jest.Mock).mockImplementation(async (callback) => {
        await callback();
        await callback();
      });

      await pollForProjectUpdates(
        sdk,
        projectId,
        transactionConfirmedAt,
        updateProperties
      );

      // Check that request was called twice
      expect(request).toHaveBeenCalledTimes(2);
      // Check that asyncPoll was called once
      expect(asyncPoll).toHaveBeenCalledTimes(1);
    });

    it("should throw an error if the project is not found", async () => {
      (request as jest.Mock).mockResolvedValue({});

      (asyncPoll as jest.Mock).mockImplementation(async (callback) => {
        await callback();
      });

      await expect(
        pollForProjectUpdates(
          sdk,
          projectId,
          transactionConfirmedAt,
          updateProperties
        )
      ).rejects.toThrow(`Could not find project with id ${projectId}`);
    });

    it("should throw an error if there is an API error", async () => {
      (request as jest.Mock).mockRejectedValue(new Error("API error"));

      (asyncPoll as jest.Mock).mockImplementation(async (callback) => {
        await callback();
      });

      await expect(
        pollForProjectUpdates(
          sdk,
          projectId,
          transactionConfirmedAt,
          updateProperties
        )
      ).rejects.toThrow("API error");
    });
  });
});
