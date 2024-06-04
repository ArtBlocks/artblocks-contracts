import { asyncPoll, AsyncData } from "./async-poll";

describe("asyncPoll", () => {
  jest.useFakeTimers();

  const createAsyncFunction = (data: AsyncData<string>, delay: number = 0) => {
    return jest.fn(
      () =>
        new Promise<AsyncData<string>>((resolve) => {
          setTimeout(() => resolve(data), delay);
        })
    );
  };

  afterEach(() => {
    jest.clearAllTimers();
  });

  it("resolves immediately if condition is met", async () => {
    const asyncFn = createAsyncFunction({ done: true, data: "Success" });
    const result = asyncPoll(asyncFn, 1000, 5000);

    await jest.runAllTimersAsync();

    await expect(result).resolves.toEqual("Success");
    expect(asyncFn).toHaveBeenCalledTimes(1);
  });

  it("keeps polling until condition is met", async () => {
    let callCount = 0;
    const asyncFn = jest.fn().mockImplementation(() => {
      callCount++;
      return callCount === 3
        ? Promise.resolve({ done: true, data: "Success" })
        : Promise.resolve({ done: false });
    });

    const result = asyncPoll(asyncFn, 100, 5000);

    await jest.advanceTimersByTimeAsync(300);

    await expect(result).resolves.toEqual("Success");
    expect(asyncFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  }, 10000);

  it("rejects with a timeout error if condition is never met", async () => {
    const asyncFn = createAsyncFunction({ done: false }, 100);

    const result = asyncPoll(asyncFn, 100, 500);

    const assertionPromise = expect(result).rejects.toThrow(
      "Timeout reached in async poller"
    );
    await jest.advanceTimersByTimeAsync(500);
    await assertionPromise;
    // The `asyncFn` is called three times within a 500ms window due to the
    // combination of its execution time and the delay before retrying. Each
    // call to `asyncFn` takes 100ms to complete, followed by a 100ms delay
    // before the next retry is initiated. This timing results in the following
    // sequence: 1st call (100ms) + 1st delay (100ms) + 2nd call (100ms) + 2nd
    // delay (100ms) + 3rd call (100ms) = 500ms total. Therefore, within the
    // 500ms window allocated by `pollTimeout`, there's only enough time for
    // `asyncFn` to be called three times.
    expect(asyncFn).toHaveBeenCalledTimes(3);
  });

  it("rejects immediately if the async function rejects", async () => {
    const asyncFn = jest.fn(() =>
      Promise.reject(new Error("Async function error"))
    );
    const result = asyncPoll(asyncFn, 100, 5000);

    jest.runAllTimers();

    await expect(result).rejects.toThrow("Async function error");
    expect(asyncFn).toHaveBeenCalledTimes(1);
  });
});
