/**
 * Tests for retry logic with exponential backoff
 */

import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';

import {
  isRetryableError,
  calculateBackoff,
  withRetry,
  createRetryWrapper,
} from '../../src/lib/retry.js';

describe('isRetryableError', () => {
  it('should return false for null/undefined', () => {
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
  });

  it('should return true for network errors', () => {
    const networkErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
      'EAI_AGAIN',
    ];

    networkErrors.forEach((code) => {
      const error = { code };
      expect(isRetryableError(error)).toBe(true);
    });
  });

  it('should return false for non-network error codes', () => {
    const error = { code: 'UNKNOWN_ERROR' };
    expect(isRetryableError(error)).toBe(false);
  });

  it('should return true for 5xx status codes', () => {
    const statusCodes = [500, 502, 503, 504];

    statusCodes.forEach((status) => {
      const error = { response: { status } };
      expect(isRetryableError(error)).toBe(true);
    });
  });

  it('should return true for 408 and 429 status codes', () => {
    expect(isRetryableError({ response: { status: 408 } })).toBe(true);
    expect(isRetryableError({ response: { status: 429 } })).toBe(true);
  });

  it('should return false for 4xx status codes (except 408, 429)', () => {
    const statusCodes = [400, 401, 403, 404, 422];

    statusCodes.forEach((status) => {
      const error = { response: { status } };
      expect(isRetryableError(error)).toBe(false);
    });
  });

  it('should return false for 2xx and 3xx status codes', () => {
    expect(isRetryableError({ response: { status: 200 } })).toBe(false);
    expect(isRetryableError({ response: { status: 301 } })).toBe(false);
  });

  it('should use custom retryable status codes', () => {
    const error = { response: { status: 418 } }; // I'm a teapot

    expect(isRetryableError(error)).toBe(false);
    expect(isRetryableError(error, [418])).toBe(true);
  });
});

describe('calculateBackoff', () => {
  it('should calculate exponential backoff correctly', () => {
    expect(calculateBackoff(0, 1000, 30000)).toBe(1000); // 2^0 * 1000 = 1000
    expect(calculateBackoff(1, 1000, 30000)).toBe(2000); // 2^1 * 1000 = 2000
    expect(calculateBackoff(2, 1000, 30000)).toBe(4000); // 2^2 * 1000 = 4000
    expect(calculateBackoff(3, 1000, 30000)).toBe(8000); // 2^3 * 1000 = 8000
  });

  it('should cap at maxDelay', () => {
    expect(calculateBackoff(10, 1000, 30000)).toBe(30000);
    expect(calculateBackoff(20, 1000, 30000)).toBe(30000);
  });

  it('should handle different base delays', () => {
    expect(calculateBackoff(0, 500, 30000)).toBe(500);
    expect(calculateBackoff(1, 500, 30000)).toBe(1000);
    expect(calculateBackoff(2, 500, 30000)).toBe(2000);
  });

  it('should handle different max delays', () => {
    expect(calculateBackoff(10, 1000, 5000)).toBe(5000);
    expect(calculateBackoff(5, 1000, 10000)).toBe(10000);
  });

  it('should use default values when not provided', () => {
    expect(calculateBackoff(0)).toBe(1000);
    expect(calculateBackoff(1)).toBe(2000);
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should succeed on first attempt if no error', async () => {
    const fn = jest.fn().mockResolvedValue('success');

    const promise = withRetry(fn, { maxRetries: 3 });

    // Fast-forward through any timers
    jest.runAllTimers();

    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on transient errors and succeed', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn, { maxRetries: 3, baseDelay: 100 });

    // Fast-forward through all timers
    await jest.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const error = { response: { status: 400 } };
    const fn = jest.fn().mockRejectedValue(error);

    await expect(withRetry(fn, { maxRetries: 3 })).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throw error after max retries exhausted', async () => {
    const error = { response: { status: 500 } };
    const fn = jest.fn().mockRejectedValue(error);

    const promise = withRetry(fn, { maxRetries: 2, baseDelay: 100 });

    // Fast-forward through all timers while the promise is still pending
    const expectPromise = expect(promise).rejects.toEqual(error);
    await jest.runAllTimersAsync();
    await expectPromise;

    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('should use exponential backoff delays', async () => {
    const error = { response: { status: 500 } };
    const fn = jest.fn().mockRejectedValue(error);
    const baseDelay = 1000;

    const promise = withRetry(fn, { maxRetries: 3, baseDelay });

    // Don't await, just start the retry process
    promise.catch(() => {});

    // First attempt fails immediately
    await jest.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);

    // Second attempt after baseDelay * 2^0 = 1000ms
    await jest.advanceTimersByTimeAsync(1000);
    expect(fn).toHaveBeenCalledTimes(2);

    // Third attempt after baseDelay * 2^1 = 2000ms
    await jest.advanceTimersByTimeAsync(2000);
    expect(fn).toHaveBeenCalledTimes(3);

    // Fourth attempt after baseDelay * 2^2 = 4000ms
    await jest.advanceTimersByTimeAsync(4000);
    expect(fn).toHaveBeenCalledTimes(4);

    // Finish the promise
    await jest.runAllTimersAsync();
  });

  it('should retry on network errors', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce({ code: 'ECONNRESET' })
      .mockRejectedValueOnce({ code: 'ETIMEDOUT' })
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn, { maxRetries: 3, baseDelay: 100 });

    await jest.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should respect custom retryable status codes', async () => {
    const error = { response: { status: 418 } }; // I'm a teapot
    const fn = jest.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn, {
      maxRetries: 2,
      baseDelay: 100,
      retryableStatusCodes: [418],
    });

    await jest.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry custom status code if not in retryableStatusCodes', async () => {
    const error = { response: { status: 418 } };
    const fn = jest.fn().mockRejectedValue(error);

    await expect(
      withRetry(fn, { maxRetries: 2, retryableStatusCodes: [500, 502] }),
    ).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should handle maxRetries = 0', async () => {
    const error = { response: { status: 500 } };
    const fn = jest.fn().mockRejectedValue(error);

    await expect(withRetry(fn, { maxRetries: 0 })).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('createRetryWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create a reusable retry wrapper', async () => {
    const retryWrapper = createRetryWrapper({ maxRetries: 2, baseDelay: 100 });

    const fn1 = jest.fn().mockResolvedValue('result1');
    const fn2 = jest.fn().mockResolvedValue('result2');

    const promise1 = retryWrapper(fn1);
    const promise2 = retryWrapper(fn2);

    await jest.runAllTimersAsync();

    const result1 = await promise1;
    const result2 = await promise2;

    expect(result1).toBe('result1');
    expect(result2).toBe('result2');
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('should apply retry logic to all wrapped functions', async () => {
    const retryWrapper = createRetryWrapper({ maxRetries: 2, baseDelay: 100 });

    const fn = jest.fn()
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockResolvedValueOnce('success');

    const promise = retryWrapper(fn);

    await jest.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
