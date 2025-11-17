/**
 * Health Check System
 *
 * Provides comprehensive health checking for the MCP server,
 * including connectivity tests and component status validation.
 */

import { SkyFiClient } from '../skyfi/client.js';
import { logger } from '../lib/logger.js';
import { MetricsCollector } from './metrics.js';

/**
 * Health status levels
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

/**
 * Component health check result
 */
export interface ComponentHealth {
  status: HealthStatus;
  message?: string;
  responseTime?: number;
  lastChecked: string;
}

/**
 * Overall health check response
 */
export interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: string;
  version: string;
  uptime: number;
  components: {
    server: ComponentHealth;
    skyfi: ComponentHealth;
    metrics?: ComponentHealth;
  };
  metrics?: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
  };
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  includeDeepCheck: boolean;
  includeSkyFiCheck: boolean;
  includeMetrics: boolean;
  timeout: number;
}

/**
 * HealthChecker class
 *
 * Manages health checks for the MCP server and its dependencies.
 */
export class HealthChecker {
  private startTime: number;
  private skyfiClient?: SkyFiClient;
  private metricsCollector?: MetricsCollector;
  private version: string;

  constructor(version: string, skyfiClient?: SkyFiClient, metricsCollector?: MetricsCollector) {
    this.version = version;
    this.startTime = Date.now();
    this.skyfiClient = skyfiClient;
    this.metricsCollector = metricsCollector;
  }

  /**
   * Perform a basic health check (fast, lightweight)
   */
  async basicCheck(): Promise<HealthCheckResponse> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: HealthStatus.HEALTHY,
      timestamp,
      version: this.version,
      uptime,
      components: {
        server: {
          status: HealthStatus.HEALTHY,
          message: 'Server is running',
          lastChecked: timestamp,
        },
        skyfi: {
          status: HealthStatus.HEALTHY,
          message: 'Not checked (basic health check)',
          lastChecked: timestamp,
        },
      },
    };
  }

  /**
   * Perform a comprehensive health check (includes connectivity tests)
   */
  async fullCheck(config: Partial<HealthCheckConfig> = {}): Promise<HealthCheckResponse> {
    const fullConfig: HealthCheckConfig = {
      includeDeepCheck: true,
      includeSkyFiCheck: true,
      includeMetrics: true,
      timeout: 5000,
      ...config,
    };

    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Check server component (always healthy if we're running)
    const serverHealth: ComponentHealth = {
      status: HealthStatus.HEALTHY,
      message: 'Server is running',
      lastChecked: timestamp,
    };

    // Check SkyFi API connectivity (if enabled and client available)
    let skyfiHealth: ComponentHealth;
    if (fullConfig.includeSkyFiCheck && this.skyfiClient) {
      skyfiHealth = await this.checkSkyFiConnectivity(fullConfig.timeout);
    } else if (fullConfig.includeSkyFiCheck && !this.skyfiClient) {
      // If check is requested but client not initialized, report degraded
      skyfiHealth = {
        status: HealthStatus.DEGRADED,
        message: 'SkyFi client not initialized',
        lastChecked: timestamp,
      };
    } else {
      // Check not requested
      skyfiHealth = {
        status: HealthStatus.HEALTHY,
        message: 'Not checked',
        lastChecked: timestamp,
      };
    }

    // Check metrics collector (if available)
    let metricsHealth: ComponentHealth | undefined;
    if (fullConfig.includeMetrics && this.metricsCollector) {
      metricsHealth = this.checkMetricsCollector();
    }

    // Determine overall status
    let overallStatus = HealthStatus.HEALTHY;
    if (skyfiHealth.status === HealthStatus.UNHEALTHY) {
      overallStatus = HealthStatus.DEGRADED; // Degraded if SkyFi is down (not critical)
    }

    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp,
      version: this.version,
      uptime,
      components: {
        server: serverHealth,
        skyfi: skyfiHealth,
      },
    };

    if (metricsHealth) {
      response.components.metrics = metricsHealth;
    }

    // Include metrics summary if available
    if (fullConfig.includeMetrics && this.metricsCollector) {
      const metrics = this.metricsCollector.getMetricsSummary();
      response.metrics = {
        requestCount: metrics.totalRequests,
        errorCount: metrics.totalErrors,
        averageResponseTime: metrics.avgResponseTime,
      };
    }

    return response;
  }

  /**
   * Check SkyFi API connectivity
   */
  private async checkSkyFiConnectivity(timeout: number): Promise<ComponentHealth> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    if (!this.skyfiClient) {
      return {
        status: HealthStatus.DEGRADED,
        message: 'SkyFi client not initialized',
        lastChecked: timestamp,
      };
    }

    try {
      // Attempt a simple API call with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), timeout);
      });

      // Try to get pricing info as a lightweight connectivity test
      const checkPromise = this.skyfiClient.getPricing({});

      await Promise.race([checkPromise, timeoutPromise]);

      const responseTime = Date.now() - startTime;

      return {
        status: HealthStatus.HEALTHY,
        message: 'SkyFi API is reachable',
        responseTime,
        lastChecked: timestamp,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.warn('SkyFi API health check failed', {
        error: errorMessage,
        responseTime,
      });

      return {
        status: HealthStatus.UNHEALTHY,
        message: `SkyFi API unreachable: ${errorMessage}`,
        responseTime,
        lastChecked: timestamp,
      };
    }
  }

  /**
   * Check metrics collector status
   */
  private checkMetricsCollector(): ComponentHealth {
    const timestamp = new Date().toISOString();

    if (!this.metricsCollector) {
      return {
        status: HealthStatus.DEGRADED,
        message: 'Metrics collector not initialized',
        lastChecked: timestamp,
      };
    }

    try {
      const metrics = this.metricsCollector.getMetricsSummary();

      return {
        status: HealthStatus.HEALTHY,
        message: `Collecting metrics (${metrics.totalRequests} requests tracked)`,
        lastChecked: timestamp,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        status: HealthStatus.DEGRADED,
        message: `Metrics collector error: ${errorMessage}`,
        lastChecked: timestamp,
      };
    }
  }

  /**
   * Get readiness status (for Kubernetes/ECS readiness probes)
   *
   * Readiness checks if the server is ready to accept traffic.
   * Returns true only if all critical components are healthy.
   */
  async isReady(): Promise<boolean> {
    const health = await this.fullCheck({
      includeSkyFiCheck: false, // Don't check external APIs for readiness
      includeMetrics: false,
      timeout: 2000,
    });

    return health.status === HealthStatus.HEALTHY;
  }

  /**
   * Get liveness status (for Kubernetes/ECS liveness probes)
   *
   * Liveness checks if the server process is alive and responsive.
   * Should always return true if the server is running.
   */
  async isAlive(): Promise<boolean> {
    // If this code is executing, the server is alive
    return true;
  }
}
