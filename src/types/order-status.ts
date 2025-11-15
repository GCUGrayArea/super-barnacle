/**
 * Order status types for SkyFi orders
 *
 * @packageDocumentation
 */

/**
 * Order type enum
 */
export enum OrderType {
  ARCHIVE = 'ARCHIVE',
  TASKING = 'TASKING',
}

/**
 * Delivery status enum
 *
 * Represents all possible states an order can be in during its lifecycle.
 */
export enum DeliveryStatus {
  /** Order has been created */
  CREATED = 'CREATED',
  /** Order processing has started */
  STARTED = 'STARTED',
  /** Payment processing failed */
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  /** Internal platform error occurred */
  PLATFORM_FAILED = 'PLATFORM_FAILED',
  /** Order sent to satellite provider */
  PROVIDER_PENDING = 'PROVIDER_PENDING',
  /** Provider has captured/retrieved the imagery */
  PROVIDER_COMPLETE = 'PROVIDER_COMPLETE',
  /** Provider was unable to fulfill the order */
  PROVIDER_FAILED = 'PROVIDER_FAILED',
  /** Internal processing of imagery has started */
  PROCESSING_PENDING = 'PROCESSING_PENDING',
  /** Processing is complete */
  PROCESSING_COMPLETE = 'PROCESSING_COMPLETE',
  /** Processing failed */
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  /** Delivery to storage bucket has started */
  DELIVERY_PENDING = 'DELIVERY_PENDING',
  /** Imagery successfully delivered to storage */
  DELIVERY_COMPLETED = 'DELIVERY_COMPLETED',
  /** Delivery to storage failed */
  DELIVERY_FAILED = 'DELIVERY_FAILED',
  /** Additional image processing in progress */
  INTERNAL_IMAGE_PROCESSING_PENDING = 'INTERNAL_IMAGE_PROCESSING_PENDING',
}

/**
 * Delivery event information
 */
export interface DeliveryEventInfo {
  /** The delivery status */
  status: DeliveryStatus;
  /** Event timestamp */
  timestamp: string;
  /** Optional note coming with the status change */
  message: string | null;
}

/**
 * Helper functions for interpreting order status
 */
export class OrderStatusHelper {
  /**
   * Check if an order is in a final state
   *
   * @param status - Order status to check
   * @returns True if status is final (no more changes expected)
   */
  static isFinal(status: DeliveryStatus): boolean {
    return (
      status === DeliveryStatus.DELIVERY_COMPLETED ||
      status === DeliveryStatus.PAYMENT_FAILED ||
      status === DeliveryStatus.PLATFORM_FAILED ||
      status === DeliveryStatus.PROVIDER_FAILED ||
      status === DeliveryStatus.PROCESSING_FAILED ||
      status === DeliveryStatus.DELIVERY_FAILED
    );
  }

  /**
   * Check if an order failed
   *
   * @param status - Order status to check
   * @returns True if status indicates failure
   */
  static isFailed(status: DeliveryStatus): boolean {
    return (
      status === DeliveryStatus.PAYMENT_FAILED ||
      status === DeliveryStatus.PLATFORM_FAILED ||
      status === DeliveryStatus.PROVIDER_FAILED ||
      status === DeliveryStatus.PROCESSING_FAILED ||
      status === DeliveryStatus.DELIVERY_FAILED
    );
  }

  /**
   * Check if an order completed successfully
   *
   * @param status - Order status to check
   * @returns True if order completed successfully
   */
  static isComplete(status: DeliveryStatus): boolean {
    return status === DeliveryStatus.DELIVERY_COMPLETED;
  }

  /**
   * Check if an order is in progress
   *
   * @param status - Order status to check
   * @returns True if order is still being processed
   */
  static isInProgress(status: DeliveryStatus): boolean {
    return !this.isFinal(status);
  }

  /**
   * Get a human-readable description of the order status
   *
   * @param status - Order status
   * @returns Human-readable status description
   */
  static getStatusDescription(status: DeliveryStatus): string {
    const descriptions: Record<DeliveryStatus, string> = {
      [DeliveryStatus.CREATED]: 'Order has been created and is queued for processing',
      [DeliveryStatus.STARTED]: 'Order processing has begun',
      [DeliveryStatus.PAYMENT_FAILED]:
        'Payment processing failed. Please check your payment method.',
      [DeliveryStatus.PLATFORM_FAILED]:
        'An internal platform error occurred. Please contact support.',
      [DeliveryStatus.PROVIDER_PENDING]: 'Order has been sent to the satellite provider',
      [DeliveryStatus.PROVIDER_COMPLETE]: 'Provider has successfully captured/retrieved the imagery',
      [DeliveryStatus.PROVIDER_FAILED]:
        'Provider was unable to fulfill the order. Please contact support.',
      [DeliveryStatus.PROCESSING_PENDING]: 'Imagery is being processed',
      [DeliveryStatus.PROCESSING_COMPLETE]: 'Imagery processing is complete',
      [DeliveryStatus.PROCESSING_FAILED]:
        'Imagery processing failed. Please contact support.',
      [DeliveryStatus.DELIVERY_PENDING]: 'Imagery is being delivered to your storage bucket',
      [DeliveryStatus.DELIVERY_COMPLETED]: 'Imagery has been successfully delivered',
      [DeliveryStatus.DELIVERY_FAILED]:
        'Delivery to storage failed. Please check your delivery configuration.',
      [DeliveryStatus.INTERNAL_IMAGE_PROCESSING_PENDING]:
        'Additional image processing is in progress',
    };
    return descriptions[status] ?? 'Unknown status';
  }
}
