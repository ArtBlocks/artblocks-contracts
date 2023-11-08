import get from "lodash/get";
import { TransformProjectMinterConfigurationFormValuesArgs } from "../types";

/**
 * This function calculates the half life in seconds from the auction details.
 *
 * HalfLife comes from the following formula: (t_f - t_i) / ((h_c + 1)*z + h_c*(1-z))
 * and the variables are defined as follows:
 *
 * 1. t_f and t_i are the final and initial timestamps (seconds)
 * 2. h_c is the number of completed half lives at end of auction
 *  - thus, h_c = floor((log(p_i/p_f) / log(2))
 *    - where p_i and p_f are initial and final prices, in wei
 * 3. z = (p_f - y1) / (y2 - y1), where:
 *  - y1 = p_i / (2 ** (h_c)) = price at the last fully-completed half life
 *  - y2 = y1 / 2 = price at the next fully completed half life, after the auction is complete
 *
 *  Note: we don't use a standard decay function because our auction linearly interpolates between half life points
 *
 * @param startPriceInEther - The starting price in Ether.
 * @param endPriceInEther - The ending price in Ether.
 * @param startTime - The starting time.
 * @param endTime - The ending time.
 * @returns The half life in seconds.
 */
function calculateHalfLifeSecondsFromAuctionDetails(
  startPriceInEther: number,
  endPriceInEther: number,
  startTime: number,
  endTime: number
) {
  // calc intermediate terms
  const priceRatio = startPriceInEther / endPriceInEther;

  const completedHalfLives = Math.floor(Math.log(priceRatio) / Math.log(2));
  const y1 = startPriceInEther / Math.pow(2, completedHalfLives);
  const y2 = y1 / 2;
  const z = (endPriceInEther - y1) / (y2 - y1);

  const halfLifeSeconds = Math.round(
    (endTime - startTime) /
      ((completedHalfLives + 1) * z + completedHalfLives * (1 - z))
  );

  return halfLifeSeconds.toString();
}

/**
 * Processes auction details from form values and calculates the half-life in seconds.
 * Assumes that the startPrice and basePrice are given in Ether, and startTime and endTime
 * are ISO date strings that need to be transformed into Unix timestamps. An implicit
 * precondition is that form values have already been transformed to fit these expected types.
 * Throws an error if any of the required form values are not in the expected string format.
 *
 * @param {TransformProjectMinterConfigurationFormValuesArgs} args - An object containing
 *        the form values to be processed.
 * @returns {string} The calculated half-life as a string representing the number of seconds.
 */
export function processAuctionDetailsToHalfLifeSeconds(
  args: TransformProjectMinterConfigurationFormValuesArgs
): string {
  const { formValues } = args;

  // TODO: We're assuming the start price and base price are in ETH
  // and not wei. We're also assuming that startTime and endTime are
  // datetimes and not unix timestamps. This is only the case because
  // we tranform the values before adding them to the initial form values.
  // We should probably include this assumption in the schema instead of
  // having it be implicit here.
  const startTime: unknown = get(formValues, "extra_minter_details.startTime");
  const endTime: unknown = get(
    formValues,
    "extra_minter_details.approximateDAExpEndTime"
  );
  const startPrice: unknown = get(
    formValues,
    "extra_minter_details.startPrice"
  );
  const basePrice: unknown = get(formValues, "base_price");

  if (
    typeof startTime !== "string" ||
    typeof endTime !== "string" ||
    typeof startPrice !== "string" ||
    typeof basePrice !== "string"
  ) {
    throw new Error("Unexpected form value for auction details.");
  }

  const startTimeUnixTimestamp = Math.floor(
    new Date(startTime).getTime() / 1000
  );
  const endTimeUnixTimestamp = Math.floor(new Date(endTime).getTime() / 1000);

  return calculateHalfLifeSecondsFromAuctionDetails(
    Number(startPrice),
    Number(basePrice),
    startTimeUnixTimestamp,
    endTimeUnixTimestamp
  );
}
