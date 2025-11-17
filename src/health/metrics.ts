/**
 * Metrics Collection System
 *
 * Collects and aggregates application metrics for monitoring and observability.
 */

import { logger } from '../lib/logger.js';
import { CloudWatchPublisher } from '../lib/cloudwatch.js';

/**
 * Metric types
 */
export enum MetricType {
  REQUEST = 'request',
  ERROR = 'error',
  LATENCY = 'latency',
  TOOL_CALL = 'tool_call',
}

/**
 * Metric data point
 */
export interface MetricDataPoint {
  type: MetricType;
  name: string;
  value: number;
  timestamp: Date;
  dimensions?: Record<string, string>;
}

/**
 * Metrics summary
 */
export interface MetricsSummary {
  totalRequests: number;
  totalErrors: number;
  avgResponseTime: number;
  requestsPerMinute: number;
  errorRate: number;
  toolCalls: Record<string, number>;
  since: string;
}

/**
 * Time window for metrics aggregation
 */
interface TimeWindow {
  requests: number;
  errors: number;
  latencies: number[];
  toolCalls: Map<string, number>;
  windowStart: Date;
}

/**
 * MetricsCollector class
 *
 * Collects, aggregates, and optionally publishes metrics to CloudWatch.
 */
export class MetricsCollector {
  private currentWindow: TimeWindow;
  private allTimeMetrics: {
    totalRequests: number;
    totalErrors: number;
    totalLatency: number;
    toolCalls: Map<string, number>;
  };
  private cloudWatchPublisher?: CloudWatchPublisher;
  private windowDuration: number; // milliseconds
  private startTime: Date;
  private publishInterval?: NodeJS.Timeout;
  private windowRotationInterval?: NodeJS.Timeout;

  constructor(
    cloudWatchPublisher?: CloudWatchPublisher,
    windowDuration: number = 60000 // 1 minute default
  ) {
    this.cloudWatchPublisher = cloudWatchPublisher;
    this.windowDuration = windowDuration;
    this.startTime = new Date();

    this.currentWindow = this.createNewWindow();
    this.allTimeMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      totalLatency: 0,
      toolCalls: new Map(),
    };

    // Auto-rotate windows
    this.startWindowRotation();

    // Start CloudWatch publishing if enabled
    if (this.cloudWatchPublisher) {
      this.startCloudWatchPublishing();
    }
  }

  /**
   * Record a request metric
   */
  recordRequest(toolName?: string): void {
    this.currentWindow.requests += 1;
    this.allTimeMetrics.totalRequests += 1;

    if (toolName) {
      this.incrementToolCall(toolName);
    }

    logger.debug('Request metric recorded', {
      tool: toolName,
      totalRequests: this.allTimeMetrics.totalRequests,
    });
  }

  /**
   * Record an error metric
   */
  recordError(errorType?: string, toolName?: string): void {
    this.currentWindow.errors += 1;
    this.allTimeMetrics.totalErrors += 1;

    // Publish to CloudWatch immediately for errors
    if (this.cloudWatchPublisher) {
      this.cloudWatchPublisher.publishMetric({
        type: MetricType.ERROR,
        name: 'Errors',
        value: 1,
        timestamp: new Date(),
        dimensions: {
          ErrorType: errorType ?? 'Unknown',
          Tool: toolName ?? 'Unknown',
        },
      });
    }

    logger.debug('Error metric recorded', {
      errorType,
      tool: toolName,
      totalErrors: this.allTimeMetrics.totalErrors,
    });
  }

  /**
   * Record a latency metric (in milliseconds)
   */
  recordLatency(latencyMs: number, toolName?: string): void {
    this.currentWindow.latencies.push(latencyMs);
    this.allTimeMetrics.totalLatency += latencyMs;

    // Publish to CloudWatch
    if (this.cloudWatchPublisher) {
      this.cloudWatchPublisher.publishMetric({
        type: MetricType.LATENCY,
        name: 'ResponseTime',
        value: latencyMs,
        timestamp: new Date(),
        dimensions: {
          Tool: toolName ?? 'Unknown',
        },
      });
    }

    logger.debug('Latency metric recorded', {
      latencyMs,
      tool: toolName,
    });
  }

  /**
   * Record a tool call
   */
  recordToolCall(toolName: string): void {
    this.incrementToolCall(toolName);

    // Publish to CloudWatch
    if (this.cloudWatchPublisher) {
      this.cloudWatchPublisher.publishMetric({
        type: MetricType.TOOL_CALL,
        name: 'ToolCalls',
        value: 1,
        timestamp: new Date(),
        dimensions: {
          ToolName: toolName,
        },
      });
    }
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): MetricsSummary {
    const now = new Date();
    const uptimeMs = now.getTime() - this.startTime.getTime();
    const uptimeMinutes = uptimeMs / 60000;

    const avgResponseTime =
      this.allTimeMetrics.totalRequests > 0
        ? this.allTimeMetrics.totalLatency / this.allTimeMetrics.totalRequests
        : 0;

    const requestsPerMinute =
      uptimeMinutes > 0 ? this.allTimeMetrics.totalRequests / uptimeMinutes : 0;

    const errorRate =
      this.allTimeMetrics.totalRequests > 0
        ? this.allTimeMetrics.totalErrors / this.allTimeMetrics.totalRequests
        : 0;

    const toolCalls: Record<string, number> = {};
    this.allTimeMetrics.toolCalls.forEach((count, toolName) => {
      toolCalls[toolName] = count;
    });

    return {
      totalRequests: this.allTimeMetrics.totalRequests,
      totalErrors: this.allTimeMetrics.totalErrors,
      avgResponseTime: Math.round(avgResponseTime),
      requestsPerMinute: Math.round(requestsPerMinute * 100) / 100,
      errorRate: Math.round(errorRate * 10000) / 100, // percentage with 2 decimals
      toolCalls,
      since: this.startTime.toISOString(),
    };
  }

  /**
   * Get current window metrics (last N minutes)
   */
  getCurrentWindowMetrics(): {
    requests: number;
    errors: number;
    avgLatency: number;
    windowDurationSeconds: number;
  } {
    const avgLatency =
      this.currentWindow.latencies.length > 0
        ? this.currentWindow.latencies.reduce((a, b) => a + b, 0) /
          this.currentWindow.latencies.length
        : 0;

    return {
      requests: this.currentWindow.requests,
      errors: this.currentWindow.errors,
      avgLatency: Math.round(avgLatency),
      windowDurationSeconds: this.windowDuration / 1000,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.currentWindow = this.createNewWindow();
    this.allTimeMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      totalLatency: 0,
      toolCalls: new Map(),
    };
    this.startTime = new Date();

    logger.info('Metrics reset');
  }

  /**
   * Stop metrics collection and cleanup
   */
  stop(): void {
    if (this.publishInterval) {
      clearInterval(this.publishInterval);
      this.publishInterval = undefined;
    }

    if (this.windowRotationInterval) {
      clearInterval(this.windowRotationInterval);
      this.windowRotationInterval = undefined;
    }

    logger.info('Metrics collector stopped');
  }

  /**
   * Create a new time window
   */
  private createNewWindow(): TimeWindow {
    return {
      requests: 0,
      errors: 0,
      latencies: [],
      toolCalls: new Map(),
      windowStart: new Date(),
    };
  }

  /**
   * Increment tool call counter
   */
  private incrementToolCall(toolName: string): void {
    const currentCount = this.currentWindow.toolCalls.get(toolName) ?? 0;
    this.currentWindow.toolCalls.set(toolName, currentCount + 1);

    const allTimeCount = this.allTimeMetrics.toolCalls.get(toolName) ?? 0;
    this.allTimeMetrics.toolCalls.set(toolName, allTimeCount + 1);
  }

  /**
   * Start automatic window rotation
   */
  private startWindowRotation(): void {
    this.windowRotationInterval = setInterval(() => {
      logger.debug('Rotating metrics window', {
        previousWindow: this.getCurrentWindowMetrics(),
      });

      this.currentWindow = this.createNewWindow();
    }, this.windowDuration);
  }

  /**
   * Start CloudWatch metric publishing
   */
  private startCloudWatchPublishing(): void {
    if (!this.cloudWatchPublisher) {
      return;
    }

    // Publish aggregate metrics every minute
    this.publishInterval = setInterval(() => {
      const summary = this.getMetricsSummary();

      this.cloudWatchPublisher!.publishMetric({
        type: MetricType.REQUEST,
        name: 'TotalRequests',
        value: summary.totalRequests,
        timestamp: new Date(),
      });

      this.cloudWatchPublisher!.publishMetric({
        type: MetricType.REQUEST,
        name: 'RequestsPerMinute',
        value: summary.requestsPerMinute,
        timestamp: new Date(),
      });

      this.cloudWatchPublisher!.publishMetric({
        type: MetricType.ERROR,
        name: 'ErrorRate',
        value: summary.errorRate,
        timestamp: new Date(),
      });

      this.cloudWatchPublisher!.publishMetric({
        type: MetricType.LATENCY,
        name: 'AverageResponseTime',
        value: summary.avgResponseTime,
        timestamp: new Date(),
      });

      logger.debug('Published aggregate metrics to CloudWatch', summary);
    }, 60000); // Every minute
  }
}
