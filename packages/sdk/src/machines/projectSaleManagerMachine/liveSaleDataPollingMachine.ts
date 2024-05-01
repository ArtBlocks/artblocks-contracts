import { setup, assign, fromPromise, enqueueActions, sendParent } from "xstate";
import { Hex, getContract, PublicClient } from "viem";

import { iSharedMinterV0Abi } from "../abis/iSharedMinterV0Abi";
import { iGenArt721CoreContractV3BaseAbi } from "../abis/iGenArt721CoreContractV3BaseAbi";
import { LiveSaleData, ProjectDetails } from "./helpers";
import { getMessageFromError } from "../helpers";

const POLLING_DELAY = 10000;

type LiveSaleDataPollingMachineContext = {
  project: NonNullable<ProjectDetails>;
  publicClient: PublicClient;
  errorMessage?: string;
  liveSaleData?: LiveSaleData;
};

/**
 * TODO
 * - Potentially remove liveSaleData from context and instead only send it to parent
 * - Add retries before transitioning to error state
 */

/**
 * Defines the liveSaleDataMachine for managing the state of live sale data
 * polling for a given Art Blocks project.
 *
 * This state machine orchestrates the process of fetching live sale data for an
 * Art Blocks project, focusing on continuous polling to ensure up-to-date
 * information regarding the project's sale status.
 *
 * States:
 * - fetchingLiveSaleData: Initiates the fetching of live sale data, assuming
 *   that project details and a public client are already validated and
 *   available in the context. This state is the entry point for the machine.
 * - waiting: Introduces a delay between live sale data polling attempts to
 *   manage request frequency. After successfully fetching live sale data, this
 *   state is entered, and transitions back to fetchingLiveSaleData after a
 *   specified delay, facilitating continuous polling.
 * - error: Captures and handles errors that occur during the fetching of live
 *   sale data. This state is final and indicates an unrecoverable error in the
 *   polling process.
 *
 * Events:
 * - LIVE_SALE_DATA_FETCHED: Dispatched when live sale data has been
 *   successfully fetched and processed. This event can trigger transitions in
 *   parent machines, signaling that updated sale data is available.
 *
 */
export const liveSaleDataPollingMachine = setup({
  types: {
    input: {} as Pick<
      LiveSaleDataPollingMachineContext,
      "project" | "publicClient"
    >,
    context: {} as LiveSaleDataPollingMachineContext,
  },
  actors: {
    fetchLiveSaleData: fromPromise(
      async ({
        input: { project, publicClient },
      }: {
        input: Pick<
          LiveSaleDataPollingMachineContext,
          "project" | "publicClient"
        >;
      }) => {
        if (!project.minter_configuration?.minter) {
          throw new Error("Project has no minter configured");
        }

        const projectIndex = BigInt(project.id.split("-")[1]);

        const minterContract = getContract({
          address: project.minter_configuration.minter.address as Hex,
          abi: iSharedMinterV0Abi,
          client: publicClient,
        });

        const coreContract = getContract({
          address: project.contract.address as Hex,
          abi: iGenArt721CoreContractV3BaseAbi,
          client: publicClient,
        });

        const [priceInfo, projectStateData] = await Promise.all([
          minterContract.read.getPriceInfo([
            projectIndex,
            coreContract.address,
          ]),
          coreContract.read.projectStateData([projectIndex]),
        ]);

        const [isConfigured, tokenPriceInWei] = priceInfo;

        const [
          invocations,
          maxInvocations,
          active,
          paused,
          completedTimestamp,
        ] = projectStateData;

        return {
          tokenPriceInWei,
          invocations,
          maxInvocations,
          active,
          paused,
          completedTimestamp,
          isConfigured,
        };
      }
    ),
  },
  actions: {
    assignLiveSaleDataAndSendToParent: enqueueActions(
      ({ enqueue, self }, { liveSaleData }: { liveSaleData: LiveSaleData }) => {
        enqueue.assign({
          liveSaleData: liveSaleData,
        });

        if (self._parent) {
          enqueue.sendTo(self._parent, {
            type: "LIVE_SALE_DATA_FETCHED",
            data: liveSaleData,
          });
        }
      }
    ),
    assignErrorMessageFromError: assign({
      errorMessage: (_, { error }: { error: unknown }) =>
        getMessageFromError(error),
    }),
    sendErrorMessageToParent: sendParent(({ context }) => {
      return {
        type: "ERROR",
        data: context.errorMessage,
      };
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QBsCWA3MBlAhssAIjgC44AKA9smgHZQCyOAxgBao1gB0AZmMa+ygAZDNjyESOAMQQKHTu3QUA1lzSZc+IqUrVBjAfN782dERvHacCRRSYlUcgNoAGALqu3iUAAcKsVGJHGm8QAA9EABYADgBOTgB2AGYARhcU2LjYgCYUgDYEgBoQAE9EAFZszhdo6KSEhPK88qTsluzIgF9O4vUxLUldWgZmUy5jQ2FRTQlSKTAAJwWKBc4fZBJuFYBbTj6ZqyH9UfZxvknzftnrW3sg53dPUL8A+5CkcMQAWhTs6M4UuVIs0Uq0EnUXJlimUEJVqrUksCXOU0i4CrFur1ppZBlRhgYxpwAO44QKCKRhWCkYhcHDcGkLAAUqJcLgAlFJ9jidHjjoYuCSyXQnh8XmS5KEIghstkEpxYuVMnlctlIa0XEloYgZSlOJFIklWuUEhqUgk2uVuj0QDQKBA4KEuQMeXo6ATTs9-OL3qApT8EnkAUCQWCIVDSt8UjEAalYhqmpE0pEWpiQE7rkc3ScjOdTFMLM6cJ7XsFJYgUtFddE8q1VbkYgbwVqEF88i5ODWK7EEjka0lkXk8qn04deVn+cTSUE6MXvWXYQ1qrLatEZbFIglItlm7l4uvDUlq9FEy42sPsYXMyMJ4tlgtZ295z9WZxsmC8pXk9EXDEUs2MuUAKxIaMSnjWAYYlaQA */
  context: ({ input }) => ({
    project: input.project,
    publicClient: input.publicClient,
  }),
  id: "liveSaleDataPollingMachine",
  initial: "fetchingLiveSaleData",
  states: {
    fetchingLiveSaleData: {
      invoke: {
        src: "fetchLiveSaleData",
        input: ({ context }) => ({
          project: context.project,
          publicClient: context.publicClient,
        }),
        onDone: [
          {
            target: "waiting",
            actions: {
              type: "assignLiveSaleDataAndSendToParent",
              params: ({ event }) => {
                return {
                  liveSaleData: event.output,
                };
              },
            },
          },
        ],
        onError: [
          {
            target: "error",
            actions: {
              type: "assignErrorMessageFromError",
              params: ({ event }) => {
                return {
                  error: event.error,
                };
              },
            },
          },
        ],
      },
    },
    waiting: {
      after: {
        [POLLING_DELAY]: {
          target: "fetchingLiveSaleData",
        },
      },
    },
    error: {
      type: "final",
      entry: "sendErrorMessageToParent",
    },
  },
});
