/**
 * Tests for custom error classes
 */

import {
  SkyFiError,
  SkyFiAPIError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ConfigurationError,
  TimeoutError,
  isSkyFiError,
  isSkyFiAPIError,
  isValidationError,
  isAuthenticationError,
  isNotFoundError,
  isRateLimitError,
  isConfigurationError,
  isTimeoutError,
} from '../../src/lib/errors';

describe('SkyFiError', () => {
  it('should create a SkyFiError with message and code', () => {
    const error = new SkyFiError('Test error', 'TEST_ERROR');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SkyFiError);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.name).toBe('SkyFiError');
  });

  it('should create a SkyFiError with context', () => {
    const context = { userId: '123', action: 'test' };
    const error = new SkyFiError('Test error', 'TEST_ERROR', context);

    expect(error.context).toEqual(context);
  });

  it('should have a stack trace', () => {
    const error = new SkyFiError('Test error', 'TEST_ERROR');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('SkyFiError');
  });
});

describe('SkyFiAPIError', () => {
  it('should create a SkyFiAPIError with status code', () => {
    const error = new SkyFiAPIError('API failed', 500);

    expect(error).toBeInstanceOf(SkyFiError);
    expect(error).toBeInstanceOf(SkyFiAPIError);
    expect(error.message).toBe('API failed');
    expect(error.code).toBe('SKYFI_API_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('SkyFiAPIError');
  });

  it('should create a SkyFiAPIError with API error code', () => {
    const error = new SkyFiAPIError('API failed', 400, 'INVALID_PARAMETER');

    expect(error.apiErrorCode).toBe('INVALID_PARAMETER');
  });

  it('should create a SkyFiAPIError with context', () => {
    const context = { endpoint: '/archives', method: 'POST' };
    const error = new SkyFiAPIError('API failed', 500, undefined, context);

    expect(error.context).toEqual(context);
  });
});

describe('ValidationError', () => {
  it('should create a ValidationError with message', () => {
    const error = new ValidationError('Invalid input');

    expect(error).toBeInstanceOf(SkyFiError);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.name).toBe('ValidationError');
  });

  it('should create a ValidationError with field', () => {
    const error = new ValidationError('Invalid AOI', 'aoi');

    expect(error.field).toBe('aoi');
  });

  it('should create a ValidationError with multiple errors', () => {
    const errors = [
      { field: 'aoi', message: 'AOI is required' },
      { field: 'fromDate', message: 'Invalid date format' },
    ];
    const error = new ValidationError('Validation failed', undefined, errors);

    expect(error.errors).toEqual(errors);
  });

  it('should create a ValidationError with context', () => {
    const context = { operation: 'searchArchives' };
    const error = new ValidationError('Invalid input', undefined, undefined, context);

    expect(error.context).toEqual(context);
  });
});

describe('AuthenticationError', () => {
  it('should create an AuthenticationError', () => {
    const error = new AuthenticationError('Invalid API key');

    expect(error).toBeInstanceOf(SkyFiError);
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toBe('Invalid API key');
    expect(error.code).toBe('AUTHENTICATION_ERROR');
    expect(error.name).toBe('AuthenticationError');
  });

  it('should create an AuthenticationError with context', () => {
    const context = { apiKey: '[REDACTED]' };
    const error = new AuthenticationError('Invalid API key', context);

    expect(error.context).toEqual(context);
  });
});

describe('NotFoundError', () => {
  it('should create a NotFoundError', () => {
    const error = new NotFoundError('Resource not found');

    expect(error).toBeInstanceOf(SkyFiError);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe('Resource not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('NotFoundError');
  });

  it('should create a NotFoundError with resource type and ID', () => {
    const error = new NotFoundError('Order not found', 'order', 'order-123');

    expect(error.resourceType).toBe('order');
    expect(error.resourceId).toBe('order-123');
  });

  it('should create a NotFoundError with context', () => {
    const context = { userId: '123' };
    const error = new NotFoundError('Order not found', 'order', 'order-123', context);

    expect(error.context).toEqual(context);
  });
});

describe('RateLimitError', () => {
  it('should create a RateLimitError', () => {
    const error = new RateLimitError('Rate limit exceeded');

    expect(error).toBeInstanceOf(SkyFiError);
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.code).toBe('RATE_LIMIT_ERROR');
    expect(error.name).toBe('RateLimitError');
  });

  it('should create a RateLimitError with retry after', () => {
    const error = new RateLimitError('Rate limit exceeded', 60);

    expect(error.retryAfter).toBe(60);
  });

  it('should create a RateLimitError with context', () => {
    const context = { endpoint: '/archives' };
    const error = new RateLimitError('Rate limit exceeded', 60, context);

    expect(error.context).toEqual(context);
  });
});

describe('ConfigurationError', () => {
  it('should create a ConfigurationError', () => {
    const error = new ConfigurationError('Missing API key');

    expect(error).toBeInstanceOf(SkyFiError);
    expect(error).toBeInstanceOf(ConfigurationError);
    expect(error.message).toBe('Missing API key');
    expect(error.code).toBe('CONFIGURATION_ERROR');
    expect(error.name).toBe('ConfigurationError');
  });

  it('should create a ConfigurationError with parameter', () => {
    const error = new ConfigurationError('Missing API key', 'SKYFI_API_KEY');

    expect(error.parameter).toBe('SKYFI_API_KEY');
  });

  it('should create a ConfigurationError with context', () => {
    const context = { environment: 'production' };
    const error = new ConfigurationError('Missing API key', 'SKYFI_API_KEY', context);

    expect(error.context).toEqual(context);
  });
});

describe('TimeoutError', () => {
  it('should create a TimeoutError', () => {
    const error = new TimeoutError('Request timed out');

    expect(error).toBeInstanceOf(SkyFiError);
    expect(error).toBeInstanceOf(TimeoutError);
    expect(error.message).toBe('Request timed out');
    expect(error.code).toBe('TIMEOUT_ERROR');
    expect(error.name).toBe('TimeoutError');
  });

  it('should create a TimeoutError with timeout duration', () => {
    const error = new TimeoutError('Request timed out', 30000);

    expect(error.timeoutMs).toBe(30000);
  });

  it('should create a TimeoutError with context', () => {
    const context = { url: 'https://api.skyfi.com/archives' };
    const error = new TimeoutError('Request timed out', 30000, context);

    expect(error.context).toEqual(context);
  });
});

describe('Error Type Guards', () => {
  describe('isSkyFiError', () => {
    it('should return true for SkyFiError', () => {
      const error = new SkyFiError('Test', 'TEST');
      expect(isSkyFiError(error)).toBe(true);
    });

    it('should return true for SkyFiError subclasses', () => {
      expect(isSkyFiError(new SkyFiAPIError('Test', 500))).toBe(true);
      expect(isSkyFiError(new ValidationError('Test'))).toBe(true);
      expect(isSkyFiError(new AuthenticationError('Test'))).toBe(true);
    });

    it('should return false for standard Error', () => {
      const error = new Error('Test');
      expect(isSkyFiError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isSkyFiError('error')).toBe(false);
      expect(isSkyFiError(null)).toBe(false);
      expect(isSkyFiError(undefined)).toBe(false);
      expect(isSkyFiError({})).toBe(false);
    });
  });

  describe('isSkyFiAPIError', () => {
    it('should return true for SkyFiAPIError', () => {
      const error = new SkyFiAPIError('Test', 500);
      expect(isSkyFiAPIError(error)).toBe(true);
    });

    it('should return false for other SkyFiError types', () => {
      expect(isSkyFiAPIError(new ValidationError('Test'))).toBe(false);
      expect(isSkyFiAPIError(new SkyFiError('Test', 'TEST'))).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should return true for ValidationError', () => {
      const error = new ValidationError('Test');
      expect(isValidationError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isValidationError(new SkyFiAPIError('Test', 500))).toBe(false);
      expect(isValidationError(new Error('Test'))).toBe(false);
    });
  });

  describe('isAuthenticationError', () => {
    it('should return true for AuthenticationError', () => {
      const error = new AuthenticationError('Test');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isAuthenticationError(new ValidationError('Test'))).toBe(false);
    });
  });

  describe('isNotFoundError', () => {
    it('should return true for NotFoundError', () => {
      const error = new NotFoundError('Test');
      expect(isNotFoundError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isNotFoundError(new ValidationError('Test'))).toBe(false);
    });
  });

  describe('isRateLimitError', () => {
    it('should return true for RateLimitError', () => {
      const error = new RateLimitError('Test');
      expect(isRateLimitError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isRateLimitError(new ValidationError('Test'))).toBe(false);
    });
  });

  describe('isConfigurationError', () => {
    it('should return true for ConfigurationError', () => {
      const error = new ConfigurationError('Test');
      expect(isConfigurationError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isConfigurationError(new ValidationError('Test'))).toBe(false);
    });
  });

  describe('isTimeoutError', () => {
    it('should return true for TimeoutError', () => {
      const error = new TimeoutError('Test');
      expect(isTimeoutError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isTimeoutError(new ValidationError('Test'))).toBe(false);
    });
  });
});
