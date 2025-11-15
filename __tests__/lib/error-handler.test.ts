/**
 * Tests for error handler
 */

import {
  toErrorResponse,
  handleError,
  withErrorHandling,
  isErrorResponse,
  getErrorStatusCode,
  formatErrorMessage,
} from '../../src/lib/error-handler';
import {
  SkyFiError,
  SkyFiAPIError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ConfigurationError,
  TimeoutError,
} from '../../src/lib/errors';
import * as logger from '../../src/lib/logger';

// Mock the logger
jest.mock('../../src/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
  logError: jest.fn(),
}));

describe('Error Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set NODE_ENV to test to control stack trace inclusion
    process.env.NODE_ENV = 'test';
  });

  describe('toErrorResponse', () => {
    describe('SkyFiError', () => {
      it('should convert SkyFiError to error response', () => {
        const error = new SkyFiError('Test error', 'TEST_ERROR');
        const response = toErrorResponse(error);

        expect(response).toEqual({
          code: 'TEST_ERROR',
          message: 'Test error',
          stack: expect.any(String),
        });
      });

      it('should not include stack trace in production', () => {
        process.env.NODE_ENV = 'production';
        const error = new SkyFiError('Test error', 'TEST_ERROR');
        const response = toErrorResponse(error);

        expect(response.stack).toBeUndefined();
      });

      it('should include stack trace when explicitly requested', () => {
        process.env.NODE_ENV = 'production';
        const error = new SkyFiError('Test error', 'TEST_ERROR');
        const response = toErrorResponse(error, { includeStack: true });

        expect(response.stack).toBeDefined();
      });
    });

    describe('SkyFiAPIError', () => {
      it('should convert SkyFiAPIError to error response', () => {
        const error = new SkyFiAPIError('API failed', 500);
        const response = toErrorResponse(error);

        expect(response).toEqual({
          code: 'SKYFI_API_ERROR',
          message: 'API failed',
          statusCode: 500,
          stack: expect.any(String),
        });
      });

      it('should include API error code if present', () => {
        const error = new SkyFiAPIError('API failed', 400, 'INVALID_PARAM');
        const response = toErrorResponse(error);

        expect(response.details).toEqual({ apiErrorCode: 'INVALID_PARAM' });
      });
    });

    describe('ValidationError', () => {
      it('should convert ValidationError to error response', () => {
        const error = new ValidationError('Invalid input', 'aoi');
        const response = toErrorResponse(error);

        expect(response).toEqual({
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { field: 'aoi' },
          stack: expect.any(String),
        });
      });

      it('should include multiple errors if present', () => {
        const errors = [
          { field: 'aoi', message: 'AOI is required' },
          { field: 'date', message: 'Invalid date' },
        ];
        const error = new ValidationError('Validation failed', undefined, errors);
        const response = toErrorResponse(error);

        expect(response.details).toEqual({ errors });
      });
    });

    describe('NotFoundError', () => {
      it('should convert NotFoundError to error response', () => {
        const error = new NotFoundError('Order not found', 'order', 'order-123');
        const response = toErrorResponse(error);

        expect(response).toEqual({
          code: 'NOT_FOUND',
          message: 'Order not found',
          statusCode: 404,
          details: {
            resourceType: 'order',
            resourceId: 'order-123',
          },
          stack: expect.any(String),
        });
      });
    });

    describe('RateLimitError', () => {
      it('should convert RateLimitError to error response', () => {
        const error = new RateLimitError('Rate limit exceeded', 60);
        const response = toErrorResponse(error);

        expect(response).toEqual({
          code: 'RATE_LIMIT_ERROR',
          message: 'Rate limit exceeded',
          statusCode: 429,
          details: { retryAfter: 60 },
          stack: expect.any(String),
        });
      });
    });

    describe('AuthenticationError', () => {
      it('should convert AuthenticationError to error response', () => {
        const error = new AuthenticationError('Invalid API key');
        const response = toErrorResponse(error);

        expect(response).toEqual({
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid API key',
          statusCode: 401,
          stack: expect.any(String),
        });
      });
    });

    describe('TimeoutError', () => {
      it('should convert TimeoutError to error response', () => {
        const error = new TimeoutError('Request timed out', 30000);
        const response = toErrorResponse(error);

        expect(response).toEqual({
          code: 'TIMEOUT_ERROR',
          message: 'Request timed out',
          statusCode: 408,
          details: { timeoutMs: 30000 },
          stack: expect.any(String),
        });
      });
    });

    describe('Standard Error', () => {
      it('should convert standard Error to error response', () => {
        const error = new Error('Something went wrong');
        const response = toErrorResponse(error);

        expect(response).toEqual({
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong',
          stack: expect.any(String),
        });
      });
    });

    describe('Unknown errors', () => {
      it('should convert string to error response', () => {
        const response = toErrorResponse('Error message');

        expect(response).toEqual({
          code: 'UNKNOWN_ERROR',
          message: 'Error message',
        });
      });

      it('should handle null', () => {
        const response = toErrorResponse(null);

        expect(response).toEqual({
          code: 'UNKNOWN_ERROR',
          message: 'An unknown error occurred',
        });
      });

      it('should handle undefined', () => {
        const response = toErrorResponse(undefined);

        expect(response).toEqual({
          code: 'UNKNOWN_ERROR',
          message: 'An unknown error occurred',
        });
      });
    });
  });

  describe('handleError', () => {
    it('should log and convert error', () => {
      const error = new SkyFiError('Test error', 'TEST_ERROR');
      const response = handleError(error);

      expect(logger.logError).toHaveBeenCalled();
      expect(response).toEqual({
        code: 'TEST_ERROR',
        message: 'Test error',
        stack: expect.any(String),
      });
    });

    it('should include correlation ID in logs', () => {
      const error = new SkyFiError('Test error', 'TEST_ERROR');
      handleError(error, { correlationId: 'test-123' });

      expect(logger.logError).toHaveBeenCalledWith(
        'Error occurred',
        error,
        expect.objectContaining({ correlationId: 'test-123' }),
      );
    });

    it('should include context in logs', () => {
      const error = new SkyFiError('Test error', 'TEST_ERROR');
      const context = { operation: 'searchArchives', userId: 'user-1' };
      handleError(error, { context });

      expect(logger.logError).toHaveBeenCalledWith(
        'Error occurred',
        error,
        expect.objectContaining(context),
      );
    });

    it('should log SkyFiAPIError with status code', () => {
      const error = new SkyFiAPIError('API failed', 500, 'SERVER_ERROR');
      handleError(error);

      expect(logger.logError).toHaveBeenCalledWith(
        'Error occurred',
        error,
        expect.objectContaining({
          errorCode: 'SKYFI_API_ERROR',
          statusCode: 500,
          apiErrorCode: 'SERVER_ERROR',
        }),
      );
    });

    it('should log ValidationError with field', () => {
      const error = new ValidationError('Invalid AOI', 'aoi');
      handleError(error);

      expect(logger.logError).toHaveBeenCalledWith(
        'Error occurred',
        error,
        expect.objectContaining({
          errorCode: 'VALIDATION_ERROR',
          field: 'aoi',
        }),
      );
    });

    it('should log NotFoundError with resource details', () => {
      const error = new NotFoundError('Order not found', 'order', 'order-123');
      handleError(error);

      expect(logger.logError).toHaveBeenCalledWith(
        'Error occurred',
        error,
        expect.objectContaining({
          errorCode: 'NOT_FOUND',
          resourceType: 'order',
          resourceId: 'order-123',
        }),
      );
    });

    it('should handle unknown errors', () => {
      const error = 'String error';
      handleError(error);

      expect(logger.logger.error).toHaveBeenCalledWith(
        'Unknown error occurred',
        expect.objectContaining({
          error: 'String error',
        }),
      );
    });
  });

  describe('withErrorHandling', () => {
    it('should wrap async function and handle success', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = withErrorHandling(mockFn);

      const result = await wrappedFn('arg1', 'arg2');

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should wrap async function and handle errors', async () => {
      const error = new SkyFiError('Test error', 'TEST_ERROR');
      const mockFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = withErrorHandling(mockFn);

      const result = await wrappedFn('arg1');

      expect(isErrorResponse(result)).toBe(true);
      expect(result).toEqual({
        code: 'TEST_ERROR',
        message: 'Test error',
        stack: expect.any(String),
      });
    });

    it('should include error handling options', async () => {
      const error = new SkyFiError('Test error', 'TEST_ERROR');
      const mockFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = withErrorHandling(mockFn, {
        correlationId: 'test-123',
        context: { operation: 'test' },
      });

      await wrappedFn('arg1');

      expect(logger.logError).toHaveBeenCalledWith(
        'Error occurred',
        error,
        expect.objectContaining({
          correlationId: 'test-123',
          operation: 'test',
        }),
      );
    });
  });

  describe('isErrorResponse', () => {
    it('should return true for error response', () => {
      const errorResponse = {
        code: 'TEST_ERROR',
        message: 'Test error',
      };

      expect(isErrorResponse(errorResponse)).toBe(true);
    });

    it('should return false for non-error response', () => {
      expect(isErrorResponse('error')).toBe(false);
      expect(isErrorResponse(123)).toBe(false);
      expect(isErrorResponse(null)).toBe(false);
      expect(isErrorResponse(undefined)).toBe(false);
      expect(isErrorResponse({ message: 'error' })).toBe(false);
      expect(isErrorResponse({ code: 'ERROR' })).toBe(false);
    });
  });

  describe('getErrorStatusCode', () => {
    it('should return 500 for SkyFiAPIError with 500 status', () => {
      const error = new SkyFiAPIError('Server error', 500);
      expect(getErrorStatusCode(error)).toBe(500);
    });

    it('should return 404 for NotFoundError', () => {
      const error = new NotFoundError('Not found');
      expect(getErrorStatusCode(error)).toBe(404);
    });

    it('should return 401 for AuthenticationError', () => {
      const error = new AuthenticationError('Unauthorized');
      expect(getErrorStatusCode(error)).toBe(401);
    });

    it('should return 400 for ValidationError', () => {
      const error = new ValidationError('Invalid input');
      expect(getErrorStatusCode(error)).toBe(400);
    });

    it('should return 429 for RateLimitError', () => {
      const error = new RateLimitError('Rate limit exceeded');
      expect(getErrorStatusCode(error)).toBe(429);
    });

    it('should return 408 for TimeoutError', () => {
      const error = new TimeoutError('Timeout');
      expect(getErrorStatusCode(error)).toBe(408);
    });

    it('should return 500 for ConfigurationError', () => {
      const error = new ConfigurationError('Config error');
      expect(getErrorStatusCode(error)).toBe(500);
    });

    it('should return 500 for unknown errors', () => {
      const error = new Error('Unknown error');
      expect(getErrorStatusCode(error)).toBe(500);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format ValidationError', () => {
      const error = new ValidationError('Invalid input', 'aoi');
      const message = formatErrorMessage(error);

      expect(message).toBe('Invalid input');
    });

    it('should format ValidationError with multiple errors', () => {
      const errors = [
        { field: 'aoi', message: 'AOI is required' },
        { field: 'date', message: 'Invalid date' },
      ];
      const error = new ValidationError('Validation failed', undefined, errors);
      const message = formatErrorMessage(error);

      expect(message).toBe('Validation failed: AOI is required, Invalid date');
    });

    it('should format AuthenticationError', () => {
      const error = new AuthenticationError('Invalid API key');
      const message = formatErrorMessage(error);

      expect(message).toBe('Authentication failed. Please check your API credentials.');
    });

    it('should format RateLimitError', () => {
      const error = new RateLimitError('Rate limit exceeded', 60);
      const message = formatErrorMessage(error);

      expect(message).toBe('Rate limit exceeded. Please retry after 60 seconds.');
    });

    it('should format RateLimitError without retry after', () => {
      const error = new RateLimitError('Rate limit exceeded');
      const message = formatErrorMessage(error);

      expect(message).toBe('Rate limit exceeded.');
    });

    it('should format NotFoundError', () => {
      const error = new NotFoundError('Order not found');
      const message = formatErrorMessage(error);

      expect(message).toBe('Order not found');
    });

    it('should format SkyFiAPIError', () => {
      const error = new SkyFiAPIError('API failed', 500);
      const message = formatErrorMessage(error);

      expect(message).toBe('SkyFi API error: API failed');
    });

    it('should format ConfigurationError', () => {
      const error = new ConfigurationError('Missing API key');
      const message = formatErrorMessage(error);

      expect(message).toBe('Configuration error: Missing API key');
    });

    it('should format standard Error', () => {
      const error = new Error('Something went wrong');
      const message = formatErrorMessage(error);

      expect(message).toBe('Something went wrong');
    });

    it('should format unknown errors', () => {
      const message = formatErrorMessage('Unknown error');

      expect(message).toBe('An unexpected error occurred. Please try again.');
    });
  });
});
