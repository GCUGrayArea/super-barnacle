#
# SkyFi MCP Server - Terraform Configuration for Secrets Manager and IAM
#
# This Terraform configuration creates:
# - AWS Secrets Manager secrets for sensitive credentials
# - SSM Parameter Store parameters for non-sensitive configuration
# - IAM roles and policies for ECS task execution and task runtime
#
# Prerequisites:
# - Terraform >= 1.0
# - AWS provider configured
#
# Usage:
#   terraform init
#   terraform plan
#   terraform apply
#

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
  default     = "production"
}

variable "application_name" {
  description = "Application name"
  type        = string
  default     = "skyfi-mcp"
}

variable "skyfi_api_key" {
  description = "SkyFi API key (will be stored in Secrets Manager)"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key (will be stored in Secrets Manager)"
  type        = string
  sensitive   = true
}

# Data sources
data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# ============================================================================
# Secrets Manager - Sensitive Credentials
# ============================================================================

# SkyFi API Key Secret
resource "aws_secretsmanager_secret" "skyfi_api_key" {
  name        = "${var.application_name}/api-key"
  description = "SkyFi API key for satellite imagery ordering"

  recovery_window_in_days = 7

  tags = {
    Application = var.application_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "skyfi_api_key" {
  secret_id     = aws_secretsmanager_secret.skyfi_api_key.id
  secret_string = var.skyfi_api_key
}

# OpenAI API Key Secret
resource "aws_secretsmanager_secret" "openai_api_key" {
  name        = "${var.application_name}/openai-key"
  description = "OpenAI API key for demo agent"

  recovery_window_in_days = 7

  tags = {
    Application = var.application_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "openai_api_key" {
  secret_id     = aws_secretsmanager_secret.openai_api_key.id
  secret_string = var.openai_api_key
}

# ============================================================================
# SSM Parameter Store - Non-Sensitive Configuration
# ============================================================================

resource "aws_ssm_parameter" "log_level" {
  name        = "/${var.application_name}/log-level"
  description = "Logging level for the application"
  type        = "String"
  value       = "info"

  tags = {
    Application = var.application_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_ssm_parameter" "port" {
  name        = "/${var.application_name}/port"
  description = "Application server port"
  type        = "String"
  value       = "3000"

  tags = {
    Application = var.application_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_ssm_parameter" "skyfi_api_base_url" {
  name        = "/${var.application_name}/skyfi-api-base-url"
  description = "SkyFi API base URL"
  type        = "String"
  value       = "https://api.skyfi.com/v1"

  tags = {
    Application = var.application_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ============================================================================
# IAM Role - ECS Task Execution Role
# ============================================================================
# This role is used by ECS to pull images from ECR, write logs to CloudWatch,
# and retrieve secrets from Secrets Manager and SSM Parameter Store.

resource "aws_iam_role" "ecs_execution_role" {
  name        = "${var.application_name}-execution-role"
  description = "ECS task execution role for ${var.application_name}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Application = var.application_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Attach AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Custom policy for secrets access
resource "aws_iam_role_policy" "ecs_execution_secrets_policy" {
  name = "${var.application_name}-execution-secrets-policy"
  role = aws_iam_role.ecs_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.skyfi_api_key.arn,
          aws_secretsmanager_secret.openai_api_key.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Resource = [
          aws_ssm_parameter.log_level.arn,
          aws_ssm_parameter.port.arn,
          aws_ssm_parameter.skyfi_api_base_url.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/ecs/${var.application_name}-server*"
      }
    ]
  })
}

# ============================================================================
# IAM Role - ECS Task Role
# ============================================================================
# This role is used by the application running in the container.
# Grant only the minimum permissions needed for the application to function.

resource "aws_iam_role" "ecs_task_role" {
  name        = "${var.application_name}-task-role"
  description = "ECS task role for ${var.application_name}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Application = var.application_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Custom policy for application runtime permissions
resource "aws_iam_role_policy" "ecs_task_policy" {
  name = "${var.application_name}-task-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # CloudWatch Logs - for application logging
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/ecs/${var.application_name}-server*"
      },
      {
        # CloudWatch Metrics - for custom metrics (optional)
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "cloudwatch:namespace" = var.application_name
          }
        }
      }
    ]
  })
}

# ============================================================================
# Outputs
# ============================================================================

output "execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_execution_role.arn
}

output "task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task_role.arn
}

output "skyfi_api_key_secret_arn" {
  description = "ARN of the SkyFi API key secret"
  value       = aws_secretsmanager_secret.skyfi_api_key.arn
}

output "openai_api_key_secret_arn" {
  description = "ARN of the OpenAI API key secret"
  value       = aws_secretsmanager_secret.openai_api_key.arn
}

output "log_level_parameter_arn" {
  description = "ARN of the log level SSM parameter"
  value       = aws_ssm_parameter.log_level.arn
}

# Example terraform.tfvars file:
# ============================================================================
# aws_region      = "us-east-1"
# environment     = "production"
# application_name = "skyfi-mcp"
# skyfi_api_key   = "your-skyfi-api-key-here"
# openai_api_key  = "your-openai-api-key-here"
# ============================================================================
