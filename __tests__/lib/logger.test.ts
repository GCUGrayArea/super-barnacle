/**
 * Tests for Winston logger configuration
 */

import {
  logger,
  createChildLogger,
  debug,
  info,
  warn,
  error,
  logError,
  withCorrelationId,
  generateCorrelationId,
} from '../../src/lib/logger';

// Mock winston to capture log calls
jest.mock('winston', () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(),
  };

  // Create a mock format function that returns a callable function
  const mockFormat = jest.fn((fn) => {
    // If it's a function, return a callable function
    if (typeof fn === 'function') {
      return jest.fn(() => 'customFormat');
    }
    return 'format';
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  const mockCombine = jest.fn((...args) => args);

  return {
    createLogger: jest.fn(() => mockLogger),
    format: Object.assign(mockFormat, {
      combine: mockCombine,
      colorize: jest.fn(() => 'colorize'),
      timestamp: jest.fn(() => 'timestamp'),
      printf: jest.fn(() => 'printf'),
      errors: jest.fn(() => 'errors'),
      json: jest.fn(() => 'json'),
    }),
    transports: {
      Console: jest.fn(),
    },
  };
});

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logger instance', () => {
    it('should create a winston logger instance', () => {
      expect(logger).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
    });
  });

  describe('debug', () => {
    it('should log debug messages', () => {
      debug('Test debug message');
      expect(logger.debug).toHaveBeenCalledWith('Test debug message', {});
    });

    it('should log debug messages with metadata', () => {
      const metadata = { correlationId: 'test-123', userId: 'user-1' };
      debug('Test debug message', metadata);
      expect(logger.debug).toHaveBeenCalledWith('Test debug message', metadata);
    });

    it('should sanitize sensitive fields in metadata', () => {
      const metadata = {
        apiKey: 'secret-key',
        password: 'secret-pass',
        userId: 'user-1',
      };
      debug('Test debug message', metadata);

      const call = (logger.debug as jest.Mock).mock.calls[0];
      const sanitizedMetadata = call[1];

      expect(sanitizedMetadata.apiKey).toBe('[REDACTED]');
      expect(sanitizedMetadata.password).toBe('[REDACTED]');
      expect(sanitizedMetadata.userId).toBe('user-1');
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      info('Test info message');
      expect(logger.info).toHaveBeenCalledWith('Test info message', {});
    });

    it('should log info messages with metadata', () => {
      const metadata = { correlationId: 'test-123' };
      info('Test info message', metadata);
      expect(logger.info).toHaveBeenCalledWith('Test info message', metadata);
    });

    it('should sanitize sensitive fields in metadata', () => {
      const metadata = {
        authorization: 'Bearer token',
        userId: 'user-1',
      };
      info('Test info message', metadata);

      const call = (logger.info as jest.Mock).mock.calls[0];
      const sanitizedMetadata = call[1];

      expect(sanitizedMetadata.authorization).toBe('[REDACTED]');
      expect(sanitizedMetadata.userId).toBe('user-1');
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      warn('Test warning message');
      expect(logger.warn).toHaveBeenCalledWith('Test warning message', {});
    });

    it('should log warning messages with metadata', () => {
      const metadata = { retryAttempt: 2 };
      warn('Test warning message', metadata);
      expect(logger.warn).toHaveBeenCalledWith('Test warning message', metadata);
    });

    it('should sanitize sensitive fields in metadata', () => {
      const metadata = {
        secret: 'my-secret',
        retryAttempt: 2,
      };
      warn('Test warning message', metadata);

      const call = (logger.warn as jest.Mock).mock.calls[0];
      const sanitizedMetadata = call[1];

      expect(sanitizedMetadata.secret).toBe('[REDACTED]');
      expect(sanitizedMetadata.retryAttempt).toBe(2);
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      error('Test error message');
      expect(logger.error).toHaveBeenCalledWith('Test error message', {});
    });

    it('should log error messages with metadata', () => {
      const metadata = { statusCode: 500, errorCode: 'INTERNAL_ERROR' };
      error('Test error message', metadata);
      expect(logger.error).toHaveBeenCalledWith('Test error message', metadata);
    });

    it('should sanitize sensitive fields in metadata', () => {
      const metadata = {
        token: 'secret-token',
        errorCode: 'AUTH_FAILED',
      };
      error('Test error message', metadata);

      const call = (logger.error as jest.Mock).mock.calls[0];
      const sanitizedMetadata = call[1];

      expect(sanitizedMetadata.token).toBe('[REDACTED]');
      expect(sanitizedMetadata.errorCode).toBe('AUTH_FAILED');
    });
  });

  describe('logError', () => {
    it('should log error with error object details', () => {
      const err = new Error('Something went wrong');
      err.stack = 'Error stack trace';

      logError('Operation failed', err);

      expect(logger.error).toHaveBeenCalledWith('Operation failed', {
        errorMessage: 'Something went wrong',
        errorName: 'Error',
        stack: 'Error stack trace',
      });
    });

    it('should log error with additional metadata', () => {
      const err = new Error('Something went wrong');
      const metadata = { correlationId: 'test-123', operation: 'searchArchives' };

      logError('Operation failed', err, metadata);

      expect(logger.error).toHaveBeenCalledWith('Operation failed', {
        correlationId: 'test-123',
        operation: 'searchArchives',
        errorMessage: 'Something went wrong',
        errorName: 'Error',
        stack: err.stack,
      });
    });

    it('should sanitize sensitive fields in metadata', () => {
      const err = new Error('Auth failed');
      const metadata = {
        apiKey: 'secret-key',
        operation: 'authenticate',
      };

      logError('Authentication failed', err, metadata);

      const call = (logger.error as jest.Mock).mock.calls[0];
      const sanitizedMetadata = call[1];

      expect(sanitizedMetadata.apiKey).toBe('[REDACTED]');
      expect(sanitizedMetadata.operation).toBe('authenticate');
    });
  });

  describe('createChildLogger', () => {
    it('should create a child logger with metadata', () => {
      const metadata = { correlationId: 'test-123', userId: 'user-1' };
      const mockChildLogger = { info: jest.fn() };
      (logger.child as jest.Mock).mockReturnValue(mockChildLogger);

      const childLogger = createChildLogger(metadata);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.child).toHaveBeenCalledWith(metadata);
      expect(childLogger).toBe(mockChildLogger);
    });

    it('should sanitize sensitive fields in metadata', () => {
      const metadata = {
        correlationId: 'test-123',
        apiKey: 'secret-key',
      };
      const mockChildLogger = { info: jest.fn() };
      (logger.child as jest.Mock).mockReturnValue(mockChildLogger);

      createChildLogger(metadata);

      const call = (logger.child as jest.Mock).mock.calls[0];
      const sanitizedMetadata = call[0];

      expect(sanitizedMetadata.correlationId).toBe('test-123');
      expect(sanitizedMetadata.apiKey).toBe('[REDACTED]');
    });
  });

  describe('withCorrelationId', () => {
    it('should create a child logger with correlation ID', () => {
      const mockChildLogger = { info: jest.fn() };
      (logger.child as jest.Mock).mockReturnValue(mockChildLogger);

      const correlationLogger = withCorrelationId('test-correlation-id');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.child).toHaveBeenCalledWith({ correlationId: 'test-correlation-id' });
      expect(correlationLogger).toBe(mockChildLogger);
    });
  });

  describe('generateCorrelationId', () => {
    it('should generate a unique correlation ID', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(typeof id1).toBe('string');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(typeof id2).toBe('string');
    });

    it('should generate correlation IDs with expected format', () => {
      const id = generateCorrelationId();

      // Should contain timestamp and random string separated by hyphen
      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('Sensitive field sanitization', () => {
    it('should sanitize nested objects', () => {
      const metadata = {
        user: {
          id: 'user-1',
          apiKey: 'secret-key',
        },
        operation: 'test',
      };

      info('Test message', metadata);

      const call = (logger.info as jest.Mock).mock.calls[0];
      const sanitizedMetadata = call[1];

      expect(sanitizedMetadata.user.id).toBe('user-1');
      expect(sanitizedMetadata.user.apiKey).toBe('[REDACTED]');
      expect(sanitizedMetadata.operation).toBe('test');
    });

    it('should sanitize arrays of objects', () => {
      const metadata = {
        items: [
          { id: '1', secret: 'secret-1' },
          { id: '2', secret: 'secret-2' },
        ],
      };

      info('Test message', metadata);

      const call = (logger.info as jest.Mock).mock.calls[0];
      const sanitizedMetadata = call[1];

      expect(sanitizedMetadata.items[0].id).toBe('1');
      expect(sanitizedMetadata.items[0].secret).toBe('[REDACTED]');
      expect(sanitizedMetadata.items[1].id).toBe('2');
      expect(sanitizedMetadata.items[1].secret).toBe('[REDACTED]');
    });

    it('should sanitize various sensitive field names', () => {
      const metadata = {
        apiKey: 'key1',
        api_key: 'key2',
        password: 'pass1',
        secret: 'secret1',
        token: 'token1',
        authorization: 'auth1',
        credentials: 'creds1',
        accessKey: 'access1',
        access_key: 'access2',
        secretKey: 'secret_key1',
        secret_key: 'secret_key2',
        privateKey: 'private1',
        private_key: 'private2',
        awsAccessKeyId: 'aws_access',
        awsSecretAccessKey: 'aws_secret',
        azureStorageAccountKey: 'azure_key',
        gcpServiceAccountKey: 'gcp_key',
        normalField: 'normal_value',
      };

      info('Test message', metadata);

      const call = (logger.info as jest.Mock).mock.calls[0];
      const sanitizedMetadata = call[1];

      // All sensitive fields should be redacted
      expect(sanitizedMetadata.apiKey).toBe('[REDACTED]');
      expect(sanitizedMetadata.api_key).toBe('[REDACTED]');
      expect(sanitizedMetadata.password).toBe('[REDACTED]');
      expect(sanitizedMetadata.secret).toBe('[REDACTED]');
      expect(sanitizedMetadata.token).toBe('[REDACTED]');
      expect(sanitizedMetadata.authorization).toBe('[REDACTED]');
      expect(sanitizedMetadata.credentials).toBe('[REDACTED]');
      expect(sanitizedMetadata.accessKey).toBe('[REDACTED]');
      expect(sanitizedMetadata.access_key).toBe('[REDACTED]');
      expect(sanitizedMetadata.secretKey).toBe('[REDACTED]');
      expect(sanitizedMetadata.secret_key).toBe('[REDACTED]');
      expect(sanitizedMetadata.privateKey).toBe('[REDACTED]');
      expect(sanitizedMetadata.private_key).toBe('[REDACTED]');
      expect(sanitizedMetadata.awsAccessKeyId).toBe('[REDACTED]');
      expect(sanitizedMetadata.awsSecretAccessKey).toBe('[REDACTED]');
      expect(sanitizedMetadata.azureStorageAccountKey).toBe('[REDACTED]');
      expect(sanitizedMetadata.gcpServiceAccountKey).toBe('[REDACTED]');

      // Normal field should not be redacted
      expect(sanitizedMetadata.normalField).toBe('normal_value');
    });

    it('should handle undefined metadata gracefully', () => {
      expect(() => info('Test message')).not.toThrow();
      expect(logger.info).toHaveBeenCalledWith('Test message', {});
    });

    it('should handle null values in metadata', () => {
      const metadata = {
        field1: null,
        field2: 'value',
      };

      info('Test message', metadata);

      const call = (logger.info as jest.Mock).mock.calls[0];
      const sanitizedMetadata = call[1];

      expect(sanitizedMetadata.field1).toBeNull();
      expect(sanitizedMetadata.field2).toBe('value');
    });
  });
});
