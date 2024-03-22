// Taken from https://gist.githubusercontent.com/douglascayers/346e061fb7c1f38da00ee98c214464ae/raw/822a12f17bc9eb51115bd148293d1dd338e08a52/async-poller.ts

/**
 * Interface representing the data structure expected to be returned by the async function passed to `asyncPoll`.
 * @template T The type of the data property.
 */
export interface AsyncData<T> {
  /** Indicates whether the polling should continue or not. */
  done: boolean;
  /** The data obtained from the async operation, if any. */
  data?: T;
}

/**
 * Type definition for the async function to be polled.
 * @template T The type of the data expected to be returned by the async function.
 */
interface AsyncFunction<T> {
  /** Function that returns a promise resolving to AsyncData<T>. */
  (): PromiseLike<AsyncData<T>>;
}

/**
 * Polls an asynchronous function until a condition is met or a timeout occurs.
 * @template T The type of the data expected to be returned by the async
 * function.
 * @param fn The asynchronous function to poll. This function
 * should return a promise that resolves with an object implementing the
 * AsyncData interface.
 * @param [pollInterval=5000] The interval, in milliseconds, between
 * each poll attempt. Defaults to 5 seconds.
 * @param [pollTimeout=30000] The maximum amount of time, in
 * milliseconds, to continue polling before giving up. Defaults to 30 seconds.
 * @returns A promise that resolves with the data of type T when
 * the polling condition is met or rejects with an error if the timeout is
 * reached.
 */
export async function asyncPoll<T>(
  fn: AsyncFunction<T>,
  pollInterval = 5000,
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
