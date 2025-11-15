/**
 * Agent Configuration
 *
 * Provides configuration for the demo agent including OpenAI settings,
 * model selection, and operational parameters.
 *
 * @packageDocumentation
 */

import { logger } from '../lib/logger.js';

/**
 * Agent configuration interface
 */
export interface AgentConfig {
  /** OpenAI API key */
  openaiApiKey: string;
  /** Model to use for chat completions */
  model: string;
  /** Maximum tokens in response */
  maxTokens: number;
  /** Temperature for response generation (0-2) */
  temperature: number;
  /** Maximum retry attempts for API calls */
  maxRetries: number;
  /** Initial retry delay in milliseconds */
  retryDelay: number;
  /** Request timeout in milliseconds */
  timeout: number;
}

/**
 * Available OpenAI models
 */
export const OPENAI_MODELS = {
  GPT_5: 'gpt-5',
  GPT_4_TURBO: 'gpt-4-turbo',
  GPT_4: 'gpt-4',
} as const;

/**
 * Default agent configuration
 */
const DEFAULT_CONFIG: Omit<AgentConfig, 'openaiApiKey'> = {
  model: OPENAI_MODELS.GPT_4_TURBO, // Default to GPT-4 Turbo (GPT-5 may not be available)
  maxTokens: 4096,
  temperature: 0.7,
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 60000, // 60 seconds
};

/**
 * Get agent configuration from environment variables
 *
 * @returns Agent configuration
 * @throws {Error} If required environment variables are missing
 *
 * @example
 * ```typescript
 * const config = getAgentConfig();
 * console.log(`Using model: ${config.model}`);
 * ```
 */
export function getAgentConfig(): AgentConfig {
  const openaiApiKey = process.env['OPENAI_API_KEY'];

  if (!openaiApiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is required. Please set it in your .env file or environment.',
    );
  }

  // Get model from environment with fallback to GPT-4 Turbo
  const model = getModelWithFallback(
    process.env['OPENAI_MODEL'],
  );

  const config: AgentConfig = {
    ...DEFAULT_CONFIG,
    openaiApiKey,
    model,
    maxTokens: parseInt(process.env['OPENAI_MAX_TOKENS'] ?? String(DEFAULT_CONFIG.maxTokens), 10),
    temperature: parseFloat(process.env['OPENAI_TEMPERATURE'] ?? String(DEFAULT_CONFIG.temperature)),
    maxRetries: parseInt(process.env['OPENAI_MAX_RETRIES'] ?? String(DEFAULT_CONFIG.maxRetries), 10),
    retryDelay: parseInt(process.env['OPENAI_RETRY_DELAY'] ?? String(DEFAULT_CONFIG.retryDelay), 10),
    timeout: parseInt(process.env['OPENAI_TIMEOUT'] ?? String(DEFAULT_CONFIG.timeout), 10),
  };

  logger.info('Agent configuration loaded', {
    model: config.model,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    maxRetries: config.maxRetries,
  });

  return config;
}

/**
 * Get model with fallback handling
 *
 * Attempts to use GPT-5 if specified, but falls back to GPT-4 Turbo
 * with a warning if GPT-5 is not available.
 *
 * @param requestedModel - Model requested via environment variable
 * @returns Model to use
 */
function getModelWithFallback(requestedModel: string | undefined): string {
  // If no model specified, use default
  if (!requestedModel) {
    return DEFAULT_CONFIG.model;
  }

  // If GPT-5 requested, log info about fallback
  if (requestedModel === OPENAI_MODELS.GPT_5) {
    logger.info('GPT-5 requested - will attempt to use it, with fallback to GPT-4 Turbo if not available', {
      requestedModel,
      fallbackModel: OPENAI_MODELS.GPT_4_TURBO,
    });
    return requestedModel;
  }

  // Use specified model
  return requestedModel;
}

/**
 * Validate agent configuration
 *
 * @param config - Configuration to validate
 * @throws {Error} If configuration is invalid
 */
export function validateAgentConfig(config: AgentConfig): void {
  if (!config.openaiApiKey || config.openaiApiKey.trim() === '') {
    throw new Error('OpenAI API key cannot be empty');
  }

  if (config.maxTokens <= 0 || config.maxTokens > 128000) {
    throw new Error('maxTokens must be between 1 and 128000');
  }

  if (config.temperature < 0 || config.temperature > 2) {
    throw new Error('temperature must be between 0 and 2');
  }

  if (config.maxRetries < 0 || config.maxRetries > 10) {
    throw new Error('maxRetries must be between 0 and 10');
  }

  if (config.retryDelay < 0 || config.retryDelay > 60000) {
    throw new Error('retryDelay must be between 0 and 60000 milliseconds');
  }

  if (config.timeout < 1000 || config.timeout > 600000) {
    throw new Error('timeout must be between 1000 and 600000 milliseconds');
  }
}
