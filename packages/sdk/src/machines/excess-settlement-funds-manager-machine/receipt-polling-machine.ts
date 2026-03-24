import {
  GetReceiptsWithExcessSettlementFundsForUserQuery,
  ReceiptSettlementDataFragment,
} from "../../generated/graphql";
import { graphql } from "../../generated/index";
import { assign, fromPromise, sendParent, setup } from "xstate";
import {
  getMessageFromError,
  SUPPORTED_SETTLEMENT_CLAIM_MINTER_TYPES,
} from "../utils";
import { ArtBlocksClient } from "../..";

/**
 * TODO
 * - Potentially remove receipts from context and just send them to parent
 */

export const receiptSettlementDataFragment = graphql(/* GraphQL */ `
  fragment ReceiptSettlementData on receipt_metadata {
    id
    chain_id
    user_address
    project {
      id
      name
      index
      contract_address
      featured_token {
        media_url
      }
      vertical_name
      vertical {
        display_name
        category_name
      }
      contract {
        name
      }
    }

    minter {
      address
      minter_type
    }

    project_minter_configuration {
      extra_minter_details
    }
    excess_settlement_funds
  }
`);

export const getReceiptsWithExcessSettlementFundsForUserDocument = graphql(
  /* GraphQL */ `
    query GetReceiptsWithExcessSettlementFundsForUser(
      $profileId: Int!
      $supportedMinterTypes: [minter_type_names_enum!]!
    ) {
      receipt_metadata(
        where: {
          user: { profile_id: { _eq: $profileId } }
          excess_settlement_funds: { _neq: "0" }
          minter: { type: { type: { _in: $supportedMinterTypes } } }
          project_minter_configuration: {
            _or: [
              { complete: { _eq: true } }
              { auction_end_time: { _lt: "now()" } }
            ]
          }
        }
      ) {
        ...ReceiptSettlementData
      }
    }
  `
);

class SessionUnavailableError extends Error {
  constructor() {
    super("Authenticated user is unavailable");
    this.name = "SessionUnavailableError";
  }
}

const MAX_ERROR_COUNT = 5;

type GetReceiptsWithExcessSettlementFundsForUserResult = {
  receipt_metadata: GetReceiptsWithExcessSettlementFundsForUserQuery["receipt_metadata"];
};

type GetReceiptsWithExcessSettlementFundsForUserVariables = {
  profileId: number;
  supportedMinterTypes: Array<
    Exclude<(typeof SUPPORTED_SETTLEMENT_CLAIM_MINTER_TYPES)[number], undefined>
  >;
};

export const receiptPollingMachine = setup({
  types: {
    input: {} as {
      artblocksClient: ArtBlocksClient;
      pollingInterval: number;
      profileId: number;
    },
    context: {} as {
      artblocksClient: ArtBlocksClient;
      receipts?: ReceiptSettlementDataFragment[];
      errorMessageCounts: Record<string, number>;
      pollingInterval: number;
      profileId: number;
    },
  },
  actors: {
    fetchReceiptsForUser: fromPromise(
      async ({
        input,
      }: {
        input: {
          artblocksClient: ArtBlocksClient;
          pollingInterval?: number;
          profileId: number;
        };
      }): Promise<ReceiptSettlementDataFragment[]> => {
        const { artblocksClient, profileId } = input;

        if (profileId === null || profileId === undefined) {
          throw new SessionUnavailableError();
        }

        const res = await artblocksClient.graphqlRequest<
          GetReceiptsWithExcessSettlementFundsForUserResult,
          GetReceiptsWithExcessSettlementFundsForUserVariables
        >(getReceiptsWithExcessSettlementFundsForUserDocument, {
          profileId,
          supportedMinterTypes: SUPPORTED_SETTLEMENT_CLAIM_MINTER_TYPES,
        });
        const receipts = res.receipt_metadata;
        return receipts;
      }
    ),
  },
  actions: {
    assignReceipts: assign({
      receipts: (_, params: { receipts?: ReceiptSettlementDataFragment[] }) =>
        params.receipts,
    }),
    sendReceiptsToParent: sendParent(
      (_, params: { receipts: ReceiptSettlementDataFragment[] }) => {
        return {
          type: "RECEIPTS_FETCHED",
          receipts: params.receipts,
        };
      }
    ),
    assignErrorMessageCountsFromError: assign({
      errorMessageCounts: ({ context }, params: { error: unknown }) => {
        const errorMessage = getMessageFromError(params.error);
        return {
          ...context.errorMessageCounts,
          [errorMessage]: (context.errorMessageCounts[errorMessage] ?? 0) + 1,
        };
      },
    }),
    resetErrorMessageCounts: assign({
      errorMessageCounts: {},
    }),
  },
  guards: {
    isSessionUnavailableError: (_, { error }: { error: unknown }) => {
      return error instanceof SessionUnavailableError;
    },
    isMaxErrorCountReached: ({ context }, { error }: { error: unknown }) => {
      const errorMessage = getMessageFromError(error);
      return context.errorMessageCounts[errorMessage] + 1 >= MAX_ERROR_COUNT;
    },
  },
  delays: {
    pollingInterval: ({ context }) => context.pollingInterval,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCcwGMwEsAOAXACgPYA2xmAdlALICGaAFhWAHQBmYuDFUASulnlgBiCIXIsKAN0IBrFqgw4CJMpVpdxbDht78lsBFMJoauTGIDaABgC61m4lDZCsTGbGOQAD0QAWAOy+zABMwQBsAKz+AIz+cQDM8QAcEQA0IACeiPEAnPHMEQG+YcG+0Vahgf4AvtXpCgLKpNzqjJrsnG26ioJCYMjIhMjM2MSmrEMAtswNSkTNanRtLB06fD24BkYm7uT29p7OrruePghFIeFRsQnJaZmISdHMvjlvb-HRKfH+OWG19T0eHmqmoSyYWk63HWjWE-UGw1G4ymMyBTVBrQhqy6MP0hnI0h25j2tgs0QcSBARzcxNOfkCl0iMTi-kSKXSWQQwSsVmYSTC0V8SSS8SscWiwQBIFmwJULXBmgA7jQaZQhF5YLhTCwaKxcP0ABTlHlWACUQhl6PlGhYytVUAOlOpJ0pZxyEV5vmC0S+VjCb2iESeHMQJTCzDeVkFwTe4Wi-yl5EIEDgnktIOty0OLhpHldiAAtNFEsx-VZkv4RULvb4QwgC+GTTzRfEAmF-UKpem5YsbZC1mj4E6cy7QGcCylSzly0lK62kjW658gu7csa-RFRTU6tK0Rne8tmHazJRs8dafmEO6cswrHkrBF20G7zl-HXSv4+ck-WFil9K2E26Ahs+5gn28JDGeubkHSV7RDeVgpH8OS+FG8QRG8dYLi87z+OWuSVjkpS1LUQA */
  id: "receiptPollingMachine",
  initial: "fetchingReceipts",
  context: ({ input }) => ({
    artblocksClient: input.artblocksClient,
    errorMessageCounts: {},
    pollingInterval: input.pollingInterval,
    profileId: input.profileId,
  }),
  input: {},
  states: {
    fetchingReceipts: {
      description:
        "Fetches receipts with excess settlement funds for the user.",
      invoke: {
        src: "fetchReceiptsForUser",
        input: ({ context }) => ({
          artblocksClient: context.artblocksClient,
          profileId: context.profileId,
        }),
        onDone: {
          description:
            "Assigns the fetched receipts and sends them to parent. Transition to waiting state before polling again.",
          target: "waiting",
          actions: [
            {
              type: "assignReceipts",
              params({ event }) {
                return { receipts: event.output };
              },
            },
            {
              type: "sendReceiptsToParent",
              params: ({ event }) => {
                return {
                  receipts: event.output,
                };
              },
            },
            "resetErrorMessageCounts",
          ],
        },
        onError: [
          {
            description:
              "If we've hit the same error too many times transition to the error state to stop polling.",
            target: "error",
            guard: {
              type: "isMaxErrorCountReached",
              params: ({ event }) => {
                return {
                  error: event.error,
                };
              },
            },
          },
          {
            description:
              "If fetching receipts fails, first assume the error is transient and retry after a delay.",
            target: "waiting",
            actions: [
              {
                type: "assignErrorMessageCountsFromError",
                params({ event }) {
                  return { error: event.error };
                },
              },
            ],
          },
        ],
      },
    },
    waiting: {
      after: {
        pollingInterval: "fetchingReceipts",
      },
    },
    error: {
      description: "Fetching receipts has failed too many times. Stop polling.",
      type: "final",
    },
  },
});
