/**
 * Health Check Tests
 *
 * Tests for the health check system including basic checks,
 * full checks with SkyFi API connectivity, and metrics integration.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { HealthChecker, HealthStatus } from '../../src/health/health-check.js';
import { MetricsCollector } from '../../src/health/metrics.js';
import { SkyFiClient } from '../../src/skyfi/client.js';

// Mock SkyFiClient
jest.mock('../../src/skyfi/client.js');

describe('HealthChecker', () => {
  const version = '1.0.0';
  let healthChecker: HealthChecker;
  let mockSkyFiClient: jest.Mocked<SkyFiClient>;
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    // Create mock SkyFi client
    mockSkyFiClient = {
      getPricing: jest.fn(),
    } as unknown as jest.Mocked<SkyFiClient>;

    // Create real metrics collector (without CloudWatch)
    metricsCollector = new MetricsCollector(undefined, 60000);

    // Create health checker
    healthChecker = new HealthChecker(version, mockSkyFiClient, metricsCollector);
  });

  afterEach(() => {
    // Clean up metrics collector to prevent test hangs
    if (metricsCollector) {
      metricsCollector.stop();
    }
  });

  describe('basicCheck', () => {
    it('should return healthy status for basic check', async () => {
      const result = await healthChecker.basicCheck();

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.version).toBe(version);
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.components.server.status).toBe(HealthStatus.HEALTHY);
      expect(result.components.skyfi.status).toBe(HealthStatus.HEALTHY);
      expect(result.components.skyfi.message).toContain('Not checked');
    });

    it('should track uptime correctly', async () => {
      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await healthChecker.basicCheck();

      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should have proper timestamp format', async () => {
      const result = await healthChecker.basicCheck();

      // Check ISO 8601 format
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
    });
  });

  describe('fullCheck', () => {
    it('should return healthy status when SkyFi API is reachable', async () => {
      // Mock successful SkyFi API response
      mockSkyFiClient.getPricing.mockResolvedValue({
        basePrice: 100,
        currency: 'USD',
      } as any);

      const result = await healthChecker.fullCheck({
        includeSkyFiCheck: true,
        includeMetrics: true,
        timeout: 5000,
      });

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.components.skyfi.status).toBe(HealthStatus.HEALTHY);
      expect(result.components.skyfi.message).toContain('reachable');
      expect(result.components.skyfi.responseTime).toBeDefined();
      expect(result.components.skyfi.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should return degraded status when SkyFi API is unreachable', async () => {
      // Mock failed SkyFi API response
      mockSkyFiClient.getPricing.mockRejectedValue(new Error('Network error'));

      const result = await healthChecker.fullCheck({
        includeSkyFiCheck: true,
        includeMetrics: true,
        timeout: 5000,
      });

      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.components.skyfi.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.components.skyfi.message).toContain('unreachable');
      expect(result.components.skyfi.responseTime).toBeDefined();
    });

    it('should timeout SkyFi check if it takes too long', async () => {
      // Mock slow SkyFi API response
      mockSkyFiClient.getPricing.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ basePrice: 100, currency: 'USD' } as any), 10000)
          )
      );

      const result = await healthChecker.fullCheck({
        includeSkyFiCheck: true,
        timeout: 100, // 100ms timeout
      });

      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.components.skyfi.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.components.skyfi.message).toContain('timeout');
    });

    it('should skip SkyFi check when disabled', async () => {
      const result = await healthChecker.fullCheck({
        includeSkyFiCheck: false,
        includeMetrics: true,
        timeout: 5000,
      });

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.components.skyfi.message).toContain('Not checked');
      expect(mockSkyFiClient.getPricing).not.toHaveBeenCalled();
    });

    it('should include metrics when available', async () => {
      // Record some metrics
      metricsCollector.recordRequest('test_tool');
      metricsCollector.recordLatency(100, 'test_tool');
      metricsCollector.recordError('TestError', 'test_tool');

      const result = await healthChecker.fullCheck({
        includeSkyFiCheck: false,
        includeMetrics: true,
        timeout: 5000,
      });

      expect(result.components.metrics).toBeDefined();
      expect(result.components.metrics?.status).toBe(HealthStatus.HEALTHY);
      expect(result.metrics).toBeDefined();
      expect(result.metrics?.requestCount).toBe(1);
      expect(result.metrics?.errorCount).toBe(1);
      expect(result.metrics?.averageResponseTime).toBe(100);
    });

    it('should exclude metrics when disabled', async () => {
      const result = await healthChecker.fullCheck({
        includeSkyFiCheck: false,
        includeMetrics: false,
        timeout: 5000,
      });

      expect(result.components.metrics).toBeUndefined();
      expect(result.metrics).toBeUndefined();
    });

    it('should handle metrics collector not available', async () => {
      const checkerWithoutMetrics = new HealthChecker(version, mockSkyFiClient, undefined);

      const result = await checkerWithoutMetrics.fullCheck({
        includeSkyFiCheck: false,
        includeMetrics: true,
        timeout: 5000,
      });

      expect(result.components.metrics).toBeUndefined();
      expect(result.metrics).toBeUndefined();
    });
  });

  describe('isReady', () => {
    it('should return true when server is ready', async () => {
      const result = await healthChecker.isReady();

      expect(result).toBe(true);
    });

    it('should not check external APIs for readiness', async () => {
      await healthChecker.isReady();

      expect(mockSkyFiClient.getPricing).not.toHaveBeenCalled();
    });
  });

  describe('isAlive', () => {
    it('should always return true when process is alive', async () => {
      const result = await healthChecker.isAlive();

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle SkyFi client not provided', async () => {
      const checkerWithoutClient = new HealthChecker(version, undefined, metricsCollector);

      const result = await checkerWithoutClient.fullCheck({
        includeSkyFiCheck: true,
        timeout: 5000,
      });

      expect(result.components.skyfi.status).toBe(HealthStatus.DEGRADED);
      expect(result.components.skyfi.message).toContain('not initialized');
    });

    it('should handle check with all options disabled', async () => {
      const result = await healthChecker.fullCheck({
        includeSkyFiCheck: false,
        includeMetrics: false,
        includeDeepCheck: false,
        timeout: 5000,
      });

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.components.server.status).toBe(HealthStatus.HEALTHY);
    });

    it('should use default config when no config provided', async () => {
      mockSkyFiClient.getPricing.mockResolvedValue({
        basePrice: 100,
        currency: 'USD',
      } as any);

      const result = await healthChecker.fullCheck();

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(mockSkyFiClient.getPricing).toHaveBeenCalled();
    });

    it('should handle SkyFi API throwing non-Error objects', async () => {
      mockSkyFiClient.getPricing.mockRejectedValue('string error');

      const result = await healthChecker.fullCheck({
        includeSkyFiCheck: true,
        timeout: 5000,
      });

      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.components.skyfi.status).toBe(HealthStatus.UNHEALTHY);
    });
  });

  describe('response time tracking', () => {
    it('should track response time for SkyFi check', async () => {
      mockSkyFiClient.getPricing.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ basePrice: 100, currency: 'USD' } as any), 50)
          )
      );

      const result = await healthChecker.fullCheck({
        includeSkyFiCheck: true,
        timeout: 5000,
      });

      expect(result.components.skyfi.responseTime).toBeGreaterThanOrEqual(50);
      expect(result.components.skyfi.responseTime).toBeLessThan(200);
    });

    it('should track response time even for failed checks', async () => {
      mockSkyFiClient.getPricing.mockImplementation(
        () =>
          new Promise((_, reject) => setTimeout(() => reject(new Error('API error')), 50))
      );

      const result = await healthChecker.fullCheck({
        includeSkyFiCheck: true,
        timeout: 5000,
      });

      expect(result.components.skyfi.responseTime).toBeGreaterThanOrEqual(50);
    });
  });

  describe('lastChecked timestamp', () => {
    it('should include lastChecked timestamp for all components', async () => {
      const result = await healthChecker.fullCheck({
        includeSkyFiCheck: false,
        includeMetrics: true,
      });

      expect(result.components.server.lastChecked).toBeDefined();
      expect(result.components.skyfi.lastChecked).toBeDefined();
      if (result.components.metrics) {
        expect(result.components.metrics.lastChecked).toBeDefined();
      }
    });

    it('should have recent timestamps', async () => {
      const beforeCheck = new Date();
      const result = await healthChecker.fullCheck();
      const afterCheck = new Date();

      const serverCheckTime = new Date(result.components.server.lastChecked);

      expect(serverCheckTime.getTime()).toBeGreaterThanOrEqual(beforeCheck.getTime());
      expect(serverCheckTime.getTime()).toBeLessThanOrEqual(afterCheck.getTime());
    });
  });
});
