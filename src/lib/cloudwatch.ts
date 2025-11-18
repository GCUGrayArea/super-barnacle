/**
 * AWS CloudWatch Integration
 *
 * Publishes custom metrics and alarms to AWS CloudWatch for monitoring and alerting.
 */

import { logger } from './logger.js';
import { MetricDataPoint, MetricType } from '../health/metrics.js';

/**
 * CloudWatch configuration
 */
export interface CloudWatchConfig {
  enabled: boolean;
  namespace: string;
  region: string;
  batchSize: number;
  flushInterval: number; // milliseconds
}

/**
 * CloudWatch Publisher
 *
 * Batches and publishes metrics to AWS CloudWatch.
 * Can be disabled for local development or non-AWS environments.
 */
export class CloudWatchPublisher {
  private config: CloudWatchConfig;
  private metricQueue: MetricDataPoint[] = [];
  private flushTimer?: NodeJS.Timeout;
  private cloudWatch?: any; // AWS CloudWatch SDK client (optional)

  constructor(config: CloudWatchConfig) {
    this.config = config;

    if (this.config.enabled) {
      this.initializeCloudWatch();
      this.startFlushTimer();
      logger.info('CloudWatch publisher initialized', {
        namespace: config.namespace,
        region: config.region,
      });
    } else {
      logger.info('CloudWatch publisher disabled (metrics will be logged only)');
    }
  }

  /**
   * Initialize CloudWatch SDK client
   */
  private async initializeCloudWatch(): Promise<void> {
    try {
      // Dynamically import AWS SDK only if CloudWatch is enabled
      // This prevents requiring AWS SDK for local development
      // @ts-expect-error - AWS SDK is optional dependency
      const { CloudWatchClient } = await import('@aws-sdk/client-cloudwatch');

      this.cloudWatch = new CloudWatchClient({
        region: this.config.region,
      });

      logger.info('CloudWatch client initialized', {
        region: this.config.region,
      });
    } catch (error) {
      logger.warn('Failed to initialize CloudWatch client (AWS SDK may not be installed)', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.config.enabled = false;
    }
  }

  /**
   * Publish a metric data point
   */
  publishMetric(metric: MetricDataPoint): void {
    if (!this.config.enabled) {
      // Log metrics even when CloudWatch is disabled
      logger.debug('Metric (not published to CloudWatch)', {
        type: metric.type,
        name: metric.name,
        value: metric.value,
        dimensions: metric.dimensions,
      });
      return;
    }

    // Add to queue
    this.metricQueue.push(metric);

    // Flush if batch size reached
    if (this.metricQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush queued metrics to CloudWatch
   */
  async flush(): Promise<void> {
    if (this.metricQueue.length === 0 || !this.config.enabled || !this.cloudWatch) {
      return;
    }

    const metricsToSend = this.metricQueue.splice(0, this.config.batchSize);

    try {
      // Dynamically import PutMetricDataCommand only when needed
      // @ts-expect-error - AWS SDK is optional dependency
      const { PutMetricDataCommand } = await import('@aws-sdk/client-cloudwatch');

      const metricData = metricsToSend.map((metric) => {
        const dimensions = metric.dimensions
          ? Object.entries(metric.dimensions).map(([name, value]) => ({
              Name: name,
              Value: value,
            }))
          : undefined;

        return {
          MetricName: metric.name,
          Value: metric.value,
          Timestamp: metric.timestamp,
          Unit: this.getMetricUnit(metric.type),
          Dimensions: dimensions,
        };
      });

      const command = new PutMetricDataCommand({
        Namespace: this.config.namespace,
        MetricData: metricData,
      });

      await this.cloudWatch.send(command);

      logger.debug('Published metrics to CloudWatch', {
        count: metricsToSend.length,
        namespace: this.config.namespace,
      });
    } catch (error) {
      logger.error('Failed to publish metrics to CloudWatch', {
        error: error instanceof Error ? error.message : 'Unknown error',
        metricsCount: metricsToSend.length,
      });

      // Re-queue failed metrics for retry
      this.metricQueue.unshift(...metricsToSend);
    }
  }

  /**
   * Stop the publisher and flush remaining metrics
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Flush any remaining metrics
    await this.flush();

    logger.info('CloudWatch publisher stopped');
  }

  /**
   * Get CloudWatch metric unit for a metric type
   */
  private getMetricUnit(type: MetricType): string {
    switch (type) {
      case MetricType.LATENCY:
        return 'Milliseconds';
      case MetricType.REQUEST:
      case MetricType.ERROR:
      case MetricType.TOOL_CALL:
        return 'Count';
      default:
        return 'None';
    }
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }
}

/**
 * Create CloudWatch publisher from environment variables
 */
export function createCloudWatchPublisher(): CloudWatchPublisher | undefined {
  const enabled = process.env['CLOUDWATCH_ENABLED'] === 'true';

  if (!enabled) {
    return undefined;
  }

  const config: CloudWatchConfig = {
    enabled: true,
    namespace: process.env['CLOUDWATCH_NAMESPACE'] ?? 'SkyFi/MCP',
    region: process.env['AWS_REGION'] ?? process.env['AWS_DEFAULT_REGION'] ?? 'us-east-1',
    batchSize: parseInt(process.env['CLOUDWATCH_BATCH_SIZE'] ?? '20', 10),
    flushInterval: parseInt(process.env['CLOUDWATCH_FLUSH_INTERVAL'] ?? '60000', 10),
  };

  return new CloudWatchPublisher(config);
}

/**
 * CloudWatch Alarm Configuration
 *
 * This is a reference configuration for creating CloudWatch alarms.
 * Alarms should be created through AWS Console, CLI, or Infrastructure as Code (Terraform).
 */
export const RECOMMENDED_ALARMS = {
  highErrorRate: {
    metricName: 'ErrorRate',
    namespace: 'SkyFi/MCP',
    statistic: 'Average',
    period: 300, // 5 minutes
    threshold: 5, // 5% error rate
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods: 2,
    description: 'Alert when error rate exceeds 5% for 10 minutes',
  },
  highResponseTime: {
    metricName: 'AverageResponseTime',
    namespace: 'SkyFi/MCP',
    statistic: 'Average',
    period: 300, // 5 minutes
    threshold: 5000, // 5 seconds
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods: 2,
    description: 'Alert when average response time exceeds 5 seconds for 10 minutes',
  },
  lowRequestVolume: {
    metricName: 'RequestsPerMinute',
    namespace: 'SkyFi/MCP',
    statistic: 'Average',
    period: 900, // 15 minutes
    threshold: 0.1, // Less than 1 request per 10 minutes
    comparisonOperator: 'LessThanThreshold',
    evaluationPeriods: 1,
    description: 'Alert when request volume is abnormally low (may indicate outage)',
  },
  skyfiApiErrors: {
    metricName: 'Errors',
    namespace: 'SkyFi/MCP',
    dimensions: [
      {
        Name: 'ErrorType',
        Value: 'SkyFiAPIError',
      },
    ],
    statistic: 'Sum',
    period: 300, // 5 minutes
    threshold: 10,
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods: 1,
    description: 'Alert when SkyFi API errors exceed 10 in 5 minutes',
  },
};
