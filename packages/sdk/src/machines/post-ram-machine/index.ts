import { assign, fromPromise, setup } from "xstate";
import { ArtBlocksClient } from "../..";
import {
  BidDetailsFragment,
  GetUserBidsDocument,
} from "../../generated/graphql";
import { ProjectDetails } from "../project-sale-manager-machine/utils";
import { getMessageFromError } from "../utils";

export type PostRAMMachineEvents = {
  type: "RESET";
};

export type PostRAMMachineContext = {
  // Client used to interact with ArtBlocks API with access to walletClient and publicClient
  artblocksClient: ArtBlocksClient;
  // Details of the project relevant to sale
  project: NonNullable<ProjectDetails>;
  // Error message that may arise during the bidding process
  errorMessage?: string;
  // List of user bids for the current project
  userBids: Array<BidDetailsFragment>;
};

export type PostRAMMachineInput = Pick<
  PostRAMMachineContext,
  "artblocksClient" | "project"
>;

export const postRAMMachine = setup({
  types: {
    input: {} as PostRAMMachineInput,
    context: {} as PostRAMMachineContext,
    events: {} as PostRAMMachineEvents,
  },
  actors: {
    fetchUserBids: fromPromise(
      async ({
        input,
      }: {
        input: Pick<PostRAMMachineContext, "artblocksClient" | "project">;
      }): Promise<Array<BidDetailsFragment>> => {
        const { artblocksClient, project } = input;
        const publicClient = artblocksClient.getPublicClient(project.chain_id);
        const walletClient = artblocksClient.getWalletClient();

        if (!publicClient) {
          throw new Error("Public client unavailable");
        }

        // This shouldn't happen but is necessary for type checking
        if (!walletClient?.account) {
          throw new Error("Wallet client not connected");
        }

        const bids = await artblocksClient.graphqlRequest(GetUserBidsDocument, {
          projectId: project.id,
          chainId: project.chain_id,
          userAddress: walletClient.account.address.toLowerCase(),
        });

        return bids.project_ranked_bids;
      }
    ),
  },
  actions: {
    assignErrorMessageFromError: assign({
      errorMessage: (
        _,
        params: { error: unknown; fallbackMessage?: string }
      ) => {
        return getMessageFromError(params.error, params.fallbackMessage);
      },
    }),
    assignUserBids: assign({
      userBids: (_, params: { userBids: Array<BidDetailsFragment> }) =>
        params.userBids,
    }),
  },
}).createMachine({
  id: "postRAMBidMachine",
  context: ({ input }) => ({
    artblocksClient: input.artblocksClient,
    project: input.project,
    userBids: [],
  }),
  initial: "fetchingUserBids",
  states: {
    fetchingUserBids: {
      invoke: {
        src: "fetchUserBids",
        input: ({ context }) => ({
          artblocksClient: context.artblocksClient,
          project: context.project,
        }),
        onDone: [
          {
            target: "saleComplete",
            actions: {
              type: "assignUserBids",
              params: ({ event }) => ({
                userBids: event.output,
              }),
            },
          },
        ],
        onError: {
          target: "error",
          actions: {
            type: "assignErrorMessageFromError",
            params: ({ event }) => ({
              error: event.error,
            }),
          },
        },
      },
    },
    saleComplete: {},
    error: {
      on: {
        RESET: {
          target: "fetchingUserBids",
        },
      },
    },
  },
});
