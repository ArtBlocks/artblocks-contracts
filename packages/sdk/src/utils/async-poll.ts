// Taken from https://gist.githubusercontent.com/douglascayers/346e061fb7c1f38da00ee98c214464ae/raw/822a12f17bc9eb51115bd148293d1dd338e08a52/async-poller.ts
/**
 * The function you pass to `asyncPoll` should return a promise
 * that resolves with object that satisfies this interface.
 *
 * The `done` property indicates to the async poller whether to
 * continue polling or not.
 *
 * When done is `true` that means you've got what you need
 * and the poller will resolve with `data`.
 *
 * When done is `false` that means you don't have what you need
 * and the poller will continue polling.
 */

export interface AsyncData<T> {
  done: boolean;
  data?: T;
}

interface AsyncFunction<T> {
  (): PromiseLike<AsyncData<T>>;
}

export async function asyncPoll<T>(
  /**
   * Function to call periodically until it resolves or rejects.
   *
   * It should resolve as soon as possible indicating if it found
   * what it was looking for or not. If not then it will be reinvoked
   * after the `pollInterval` if we haven't timed out.
   *
   * Rejections will stop the polling and be propagated.
   */
  fn: AsyncFunction<T>,
  /**
   * Milliseconds to wait before attempting to resolve the promise again.
   * The promise won't be called concurrently. This is the wait period
   * after the promise has resolved/rejected before trying again for a
   * successful resolve so long as we haven't timed out.
   *
   * Default 5 seconds.
   */
  pollInterval = 5000,
  /**
   * Max time to keep polling to receive a successful resolved response.
   * If the promise never resolves before the timeout then this method
   * rejects with a timeout error.
   *
   * Default 30 seconds.
   */
  pollTimeout = 30000
): Promise<T> {
  const endTime = new Date().getTime() + pollTimeout;
  const checkCondition = (
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: Error) => void
  ): void => {
    Promise.resolve(fn())
      .then((result) => {
        const currentTime = new Date().getTime();
        if (result.done) {
          resolve(result.data as T);
        } else if (currentTime < endTime) {
          setTimeout(checkCondition, pollInterval, resolve, reject);
        } else {
          reject(new Error("Timeout reached in async poller"));
        }
      })
      .catch((err) => {
        reject(err);
      });
  };
  return new Promise(checkCondition);
}
