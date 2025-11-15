/**
 * Tests for SkyFi API HTTP Client
 */

/* eslint-disable @typescript-eslint/unbound-method */

import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import axios from 'axios';
import type { AxiosError } from 'axios';

import {
  SkyFiAPIError,
  ConfigurationError,
  TimeoutError,
  RateLimitError,
} from '../../src/lib/errors.js';
import { SkyFiClient, createClient } from '../../src/skyfi/client.js';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger to avoid console spam in tests
jest.mock('../../src/lib/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  generateCorrelationId: jest.fn(() => 'test-correlation-id'),
}));

describe('SkyFiClient', () => {
  const mockApiKey = 'sk_test_12345';
  const mockBaseURL = 'https://api.test.com';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock axios.create to return a mock instance
    mockedAxios.create = jest.fn().mockReturnValue({
      request: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn((onFulfilled) => {
            // Store the interceptor for later use
            const mockInstance = (mockedAxios.create as jest.Mock).mock.results[0].value;
            mockInstance.requestInterceptor = onFulfilled;
            return 0;
          }),
        },
        response: {
          use: jest.fn(),
        },
      },
    });
  });

  describe('initialization', () => {
    it('should create client with valid configuration', () => {
      const client = new SkyFiClient({
        apiKey: mockApiKey,
        baseURL: mockBaseURL,
      });

      expect(client).toBeInstanceOf(SkyFiClient);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: mockBaseURL,
          headers: expect.objectContaining({
            'X-Skyfi-Api-Key': mockApiKey,
          }),
        }),
      );
    });

    it('should throw ConfigurationError if API key is missing', () => {
      expect(() => new SkyFiClient({ apiKey: '' })).toThrow(ConfigurationError);
    });

    it('should use default base URL if not provided', () => {
      const client = new SkyFiClient({ apiKey: mockApiKey });

      expect(client).toBeInstanceOf(SkyFiClient);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://app.skyfi.com/platform-api',
        }),
      );
    });

    it('should use default timeout if not provided', () => {
      const client = new SkyFiClient({ apiKey: mockApiKey });

      expect(client).toBeInstanceOf(SkyFiClient);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000,
        }),
      );
    });

    it('should set custom timeout', () => {
      const client = new SkyFiClient({
        apiKey: mockApiKey,
        timeout: 60000,
      });

      expect(client).toBeInstanceOf(SkyFiClient);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000,
        }),
      );
    });
  });

  describe('authentication', () => {
    it('should add X-Skyfi-Api-Key header to all requests', () => {
      // Create client to test authentication header setup
      // eslint-disable-next-line no-new
      new SkyFiClient({
        apiKey: mockApiKey,
        baseURL: mockBaseURL,
      });

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Skyfi-Api-Key': mockApiKey,
          }),
        }),
      );
    });
  });

  describe('request methods', () => {
    let client: SkyFiClient;
    let mockAxiosInstance: ReturnType<typeof mockedAxios.create>;

    beforeEach(() => {
      jest.useFakeTimers();

      client = new SkyFiClient({
        apiKey: mockApiKey,
        baseURL: mockBaseURL,
        retry: { maxRetries: 0 }, // Disable retries for simpler testing
        rateLimit: { requestsPerSecond: 100 }, // High limit to avoid rate limiting
      });

      mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[0].value;
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('get', () => {
      it('should make GET request', async () => {
        const mockResponse = {
          data: { result: 'success' },
          status: 200,
          headers: {},
          statusText: 'OK',
          config: {} as never,
        };

        mockAxiosInstance.request.mockResolvedValue(mockResponse);

        const promise = client.get('/test');
        jest.runAllTimers();
        const result = await promise;

        expect(result.data).toEqual({ result: 'success' });
        expect(result.status).toBe(200);
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            url: '/test',
          }),
        );
      });

      it('should pass query parameters', async () => {
        const mockResponse = {
          data: { result: 'success' },
          status: 200,
          headers: {},
          statusText: 'OK',
          config: {} as never,
        };

        mockAxiosInstance.request.mockResolvedValue(mockResponse);

        const promise = client.get('/test', {
          params: { key: 'value' },
        });
        jest.runAllTimers();
        await promise;

        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            url: '/test',
            params: { key: 'value' },
          }),
        );
      });
    });

    describe('post', () => {
      it('should make POST request with data', async () => {
        const mockResponse = {
          data: { id: '123' },
          status: 201,
          headers: {},
          statusText: 'Created',
          config: {} as never,
        };

        mockAxiosInstance.request.mockResolvedValue(mockResponse);

        const postData = { name: 'test' };
        const promise = client.post('/test', postData);
        jest.runAllTimers();
        const result = await promise;

        expect(result.data).toEqual({ id: '123' });
        expect(result.status).toBe(201);
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'POST',
            url: '/test',
            data: postData,
          }),
        );
      });
    });

    describe('put', () => {
      it('should make PUT request with data', async () => {
        const mockResponse = {
          data: { updated: true },
          status: 200,
          headers: {},
          statusText: 'OK',
          config: {} as never,
        };

        mockAxiosInstance.request.mockResolvedValue(mockResponse);

        const putData = { name: 'updated' };
        const promise = client.put('/test/123', putData);
        jest.runAllTimers();
        const result = await promise;

        expect(result.data).toEqual({ updated: true });
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'PUT',
            url: '/test/123',
            data: putData,
          }),
        );
      });
    });

    describe('delete', () => {
      it('should make DELETE request', async () => {
        const mockResponse = {
          data: { deleted: true },
          status: 200,
          headers: {},
          statusText: 'OK',
          config: {} as never,
        };

        mockAxiosInstance.request.mockResolvedValue(mockResponse);

        const promise = client.delete('/test/123');
        jest.runAllTimers();
        const result = await promise;

        expect(result.data).toEqual({ deleted: true });
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'DELETE',
            url: '/test/123',
          }),
        );
      });
    });
  });

  describe('error handling', () => {
    let client: SkyFiClient;
    let mockAxiosInstance: ReturnType<typeof mockedAxios.create>;

    beforeEach(() => {
      jest.useFakeTimers();

      client = new SkyFiClient({
        apiKey: mockApiKey,
        baseURL: mockBaseURL,
        retry: { maxRetries: 0 },
        rateLimit: { requestsPerSecond: 100 },
      });

      mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[0].value;
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should convert 4xx errors to SkyFiAPIError', async () => {
      const axiosError: Partial<AxiosError> = {
        response: {
          status: 400,
          data: { detail: 'Bad request' },
          headers: {},
          statusText: 'Bad Request',
          config: {} as never,
        },
        isAxiosError: true,
        config: {} as never,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 400',
      };

      mockAxiosInstance.request.mockRejectedValue(axiosError);

      const promise = client.get('/test');
      jest.runAllTimers();

      await expect(promise).rejects.toThrow(SkyFiAPIError);
      await expect(promise).rejects.toMatchObject({
        statusCode: 400,
        message: 'Bad request',
      });
    });

    it('should convert 5xx errors to SkyFiAPIError', async () => {
      const axiosError: Partial<AxiosError> = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
          headers: {},
          statusText: 'Internal Server Error',
          config: {} as never,
        },
        isAxiosError: true,
        config: {} as never,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 500',
      };

      mockAxiosInstance.request.mockRejectedValue(axiosError);

      const promise = client.get('/test');
      jest.runAllTimers();

      await expect(promise).rejects.toThrow(SkyFiAPIError);
      await expect(promise).rejects.toMatchObject({
        statusCode: 500,
        message: 'Internal server error',
      });
    });

    it('should convert timeout errors to TimeoutError', async () => {
      const axiosError: Partial<AxiosError> = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
        isAxiosError: true,
        config: {} as never,
        toJSON: () => ({}),
        name: 'AxiosError',
      };

      mockAxiosInstance.request.mockRejectedValue(axiosError);

      const promise = client.get('/test');
      jest.runAllTimers();

      await expect(promise).rejects.toThrow(TimeoutError);
    });

    it('should convert 429 errors to RateLimitError', async () => {
      const axiosError: Partial<AxiosError> = {
        response: {
          status: 429,
          data: { detail: 'Too many requests' },
          headers: { 'retry-after': '60' },
          statusText: 'Too Many Requests',
          config: {} as never,
        },
        isAxiosError: true,
        config: {} as never,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 429',
      };

      mockAxiosInstance.request.mockRejectedValue(axiosError);

      const promise = client.get('/test');
      jest.runAllTimers();

      await expect(promise).rejects.toThrow(RateLimitError);
      await expect(promise).rejects.toMatchObject({
        retryAfter: 60,
      });
    });

    it('should handle network errors', async () => {
      const axiosError: Partial<AxiosError> = {
        code: 'ECONNREFUSED',
        message: 'Connection refused',
        isAxiosError: true,
        config: {} as never,
        toJSON: () => ({}),
        name: 'AxiosError',
      };

      mockAxiosInstance.request.mockRejectedValue(axiosError);

      const promise = client.get('/test');
      jest.runAllTimers();

      await expect(promise).rejects.toThrow(SkyFiAPIError);
      await expect(promise).rejects.toMatchObject({
        statusCode: 0,
        apiErrorCode: 'ECONNREFUSED',
      });
    });
  });

  describe('retry integration', () => {
    let client: SkyFiClient;
    let mockAxiosInstance: ReturnType<typeof mockedAxios.create>;

    beforeEach(() => {
      jest.useFakeTimers();

      client = new SkyFiClient({
        apiKey: mockApiKey,
        baseURL: mockBaseURL,
        retry: { maxRetries: 2, baseDelay: 100 },
        rateLimit: { requestsPerSecond: 100 },
      });

      mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[0].value;
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should retry on 5xx errors', async () => {
      const axiosError: Partial<AxiosError> = {
        response: {
          status: 500,
          data: { detail: 'Server error' },
          headers: {},
          statusText: 'Internal Server Error',
          config: {} as never,
        },
        isAxiosError: true,
        config: {} as never,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 500',
      };

      const mockResponse = {
        data: { result: 'success' },
        status: 200,
        headers: {},
        statusText: 'OK',
        config: {} as never,
      };

      mockAxiosInstance.request
        .mockRejectedValueOnce(axiosError)
        .mockRejectedValueOnce(axiosError)
        .mockResolvedValueOnce(mockResponse);

      const promise = client.get('/test');
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result.data).toEqual({ result: 'success' });
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 4xx errors', async () => {
      const axiosError: Partial<AxiosError> = {
        response: {
          status: 400,
          data: { detail: 'Bad request' },
          headers: {},
          statusText: 'Bad Request',
          config: {} as never,
        },
        isAxiosError: true,
        config: {} as never,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 400',
      };

      mockAxiosInstance.request.mockRejectedValue(axiosError);

      const promise = client.get('/test');
      jest.runAllTimers();

      await expect(promise).rejects.toThrow(SkyFiAPIError);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limits', async () => {
      jest.useFakeTimers();

      const client = new SkyFiClient({
        apiKey: mockApiKey,
        baseURL: mockBaseURL,
        retry: { maxRetries: 0 },
        rateLimit: { requestsPerSecond: 2, bucketSize: 2 },
      });

      const mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[0].value;

      const mockResponse = {
        data: { result: 'success' },
        status: 200,
        headers: {},
        statusText: 'OK',
        config: {} as never,
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      // Make 3 requests (more than bucket size)
      const promise1 = client.get('/test1');
      const promise2 = client.get('/test2');
      const promise3 = client.get('/test3');

      // Allow first 2 to execute (they should get tokens immediately)
      await jest.advanceTimersByTimeAsync(0);
      await promise1;
      await promise2;

      // Third should still be queued (bucket empty)
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);

      // Advance time to refill bucket and allow third request
      await jest.advanceTimersByTimeAsync(600); // 600ms = enough time for refill at 2 req/sec
      await promise3;

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });
  });

  describe('getRateLimiterStatus', () => {
    it('should return rate limiter status', () => {
      const client = new SkyFiClient({
        apiKey: mockApiKey,
        rateLimit: { requestsPerSecond: 10, bucketSize: 10 },
      });

      const status = client.getRateLimiterStatus();

      expect(status).toHaveProperty('availableTokens');
      expect(status).toHaveProperty('queueLength');
      expect(status.availableTokens).toBe(10);
      expect(status.queueLength).toBe(0);
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      const client = new SkyFiClient({
        apiKey: mockApiKey,
      });

      expect(() => client.destroy()).not.toThrow();
    });
  });
});

describe('createClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    // Mock axios.create
    mockedAxios.create = jest.fn().mockReturnValue({
      request: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create client from environment variables', () => {
    process.env['SKYFI_API_KEY'] = 'sk_test_env';

    const client = createClient();

    expect(client).toBeInstanceOf(SkyFiClient);
    expect(mockedAxios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Skyfi-Api-Key': 'sk_test_env',
        }),
      }),
    );
  });

  it('should throw ConfigurationError if SKYFI_API_KEY is not set', () => {
    delete process.env['SKYFI_API_KEY'];

    expect(() => createClient()).toThrow(ConfigurationError);
    expect(() => createClient()).toThrow('SKYFI_API_KEY environment variable is required');
  });
});
