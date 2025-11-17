# Deployment Guide

This guide covers deploying the SkyFi MCP server to AWS ECS Fargate.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [AWS Setup](#aws-setup)
- [Secrets Management](#secrets-management)
- [ECR Setup](#ecr-setup)
- [ECS Deployment](#ecs-deployment)
- [Using the Deployment Script](#using-the-deployment-script)
- [Service Configuration](#service-configuration)
- [Auto-Scaling](#auto-scaling)
- [Monitoring and Logs](#monitoring-and-logs)
- [Rolling Updates](#rolling-updates)
- [Rollback Procedures](#rollback-procedures)
- [Cost Optimization](#cost-optimization)
- [Security Best Practices](#security-best-practices)

## Overview

The SkyFi MCP server is designed to run on AWS ECS Fargate, providing:
- **Serverless container deployment** - No EC2 instance management
- **Auto-scaling** - Scale from 1 to 10 tasks based on load
- **High availability** - Multi-AZ deployment
- **Integrated monitoring** - CloudWatch logs and metrics
- **Secure secrets management** - AWS Secrets Manager integration

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Internet Gateway                    │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│          Application Load Balancer (ALB)             │
│                 (Port 80/443)                        │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              ECS Fargate Service                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Task 1     │  │   Task 2     │  │  Task N    │ │
│  │ (Container)  │  │ (Container)  │  │ (Container)│ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
└───────────────────────────────────────────────────────┘
         │                    │                │
         └────────────────────┼────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Secrets Manager  │
                    │   (API Keys)      │
                    └───────────────────┘
```

## Prerequisites

### Required Tools

1. **AWS CLI v2**
   ```bash
   # Install AWS CLI
   # macOS
   brew install awscli

   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install

   # Verify
   aws --version
   ```

2. **Docker**
   ```bash
   docker --version
   ```

3. **Terraform** (optional, for infrastructure as code)
   ```bash
   # macOS
   brew install terraform

   # Linux
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/

   # Verify
   terraform --version
   ```

### AWS Prerequisites

1. **AWS Account** with appropriate permissions
2. **VPC** with public and/or private subnets
3. **Security Groups** configured for HTTP/HTTPS traffic
4. **IAM User** with programmatic access

### Required IAM Permissions

Your IAM user/role needs:
- `ecr:*` - ECR repository and image management
- `ecs:*` - ECS cluster, service, and task management
- `iam:PassRole` - Pass execution and task roles
- `secretsmanager:*` - Manage secrets
- `logs:*` - CloudWatch logs
- `elasticloadbalancing:*` - ALB management (if using)
- `application-autoscaling:*` - Auto-scaling policies

## AWS Setup

### Step 1: Configure AWS CLI

```bash
# Configure AWS credentials
aws configure

# Enter your credentials:
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

### Step 2: Set Environment Variables

```bash
# Set your AWS account ID and region
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1

# Verify
echo "Account ID: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"
```

### Step 3: Create VPC Resources (if needed)

If you don't have a VPC:

```bash
# Create VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=skyfi-mcp-vpc}]'

# Create subnets (need at least 2 in different AZs)
aws ec2 create-subnet \
  --vpc-id vpc-xxxxxxxx \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a

aws ec2 create-subnet \
  --vpc-id vpc-xxxxxxxx \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b

# Create internet gateway
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=skyfi-mcp-igw}]'

# Attach to VPC
aws ec2 attach-internet-gateway \
  --vpc-id vpc-xxxxxxxx \
  --internet-gateway-id igw-xxxxxxxx
```

### Step 4: Create Security Groups

```bash
# Create security group
aws ec2 create-security-group \
  --group-name skyfi-mcp-sg \
  --description "Security group for SkyFi MCP server" \
  --vpc-id vpc-xxxxxxxx

# Allow HTTP traffic (port 3000)
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0

# Allow HTTPS traffic (if using ALB)
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

## Secrets Management

### Option 1: Using Terraform (Recommended)

```bash
cd infrastructure

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
aws_region       = "us-east-1"
environment      = "production"
application_name = "skyfi-mcp"
skyfi_api_key    = "YOUR_SKYFI_API_KEY"
openai_api_key   = "YOUR_OPENAI_API_KEY"
EOF

# Initialize Terraform
terraform init

# Review plan
terraform plan

# Apply configuration
terraform apply
```

This creates:
- IAM execution role with ECR and secrets access
- IAM task role with CloudWatch permissions
- Secrets Manager secrets for API keys
- SSM parameters for configuration

### Option 2: Manual Setup

```bash
# Create SkyFi API key secret
aws secretsmanager create-secret \
  --name skyfi-mcp/api-key \
  --description "SkyFi API key for MCP server" \
  --secret-string "YOUR_SKYFI_API_KEY" \
  --region $AWS_REGION

# Create OpenAI API key secret
aws secretsmanager create-secret \
  --name skyfi-mcp/openai-key \
  --description "OpenAI API key for demo agent" \
  --secret-string "YOUR_OPENAI_API_KEY" \
  --region $AWS_REGION

# Create SSM parameter for log level
aws ssm put-parameter \
  --name /skyfi-mcp/log-level \
  --value "info" \
  --type String \
  --region $AWS_REGION

# Verify secrets
aws secretsmanager list-secrets --region $AWS_REGION
```

### Update Secrets

```bash
# Update SkyFi API key
aws secretsmanager update-secret \
  --secret-id skyfi-mcp/api-key \
  --secret-string "NEW_SKYFI_API_KEY" \
  --region $AWS_REGION

# Update OpenAI API key
aws secretsmanager update-secret \
  --secret-id skyfi-mcp/openai-key \
  --secret-string "NEW_OPENAI_API_KEY" \
  --region $AWS_REGION
```

## ECR Setup

### Create ECR Repository

```bash
# Create repository
aws ecr create-repository \
  --repository-name skyfi-mcp \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256 \
  --region $AWS_REGION

# Set lifecycle policy (keep last 10 images)
aws ecr put-lifecycle-policy \
  --repository-name skyfi-mcp \
  --lifecycle-policy-text '{
    "rules": [{
      "rulePriority": 1,
      "description": "Keep last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {
        "type": "expire"
      }
    }]
  }' \
  --region $AWS_REGION
```

### Build and Push Docker Image

```bash
# Authenticate with ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build Docker image
docker build -t skyfi-mcp:latest .

# Tag for ECR
docker tag skyfi-mcp:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/skyfi-mcp:latest

# Push to ECR
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/skyfi-mcp:latest
```

## ECS Deployment

### Step 1: Create ECS Cluster

```bash
# Create Fargate cluster
aws ecs create-cluster \
  --cluster-name skyfi-mcp-cluster \
  --region $AWS_REGION \
  --tags key=Application,value=skyfi-mcp key=Environment,value=production
```

### Step 2: Create IAM Roles

#### Execution Role (for ECS)

```bash
# Create trust policy
cat > execution-role-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": "ecs-tasks.amazonaws.com"
    },
    "Action": "sts:AssumeRole"
  }]
}
EOF

# Create execution role
aws iam create-role \
  --role-name skyfi-mcp-execution-role \
  --assume-role-policy-document file://execution-role-trust-policy.json

# Attach AWS managed policy
aws iam attach-role-policy \
  --role-name skyfi-mcp-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Attach custom policy for secrets
cat > secrets-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "secretsmanager:GetSecretValue",
      "ssm:GetParameters"
    ],
    "Resource": [
      "arn:aws:secretsmanager:*:*:secret:skyfi-mcp/*",
      "arn:aws:ssm:*:*:parameter/skyfi-mcp/*"
    ]
  }]
}
EOF

aws iam put-role-policy \
  --role-name skyfi-mcp-execution-role \
  --policy-name SecretsAccess \
  --policy-document file://secrets-policy.json
```

#### Task Role (for application)

```bash
# Create task role
aws iam create-role \
  --role-name skyfi-mcp-task-role \
  --assume-role-policy-document file://execution-role-trust-policy.json

# Attach CloudWatch logs policy
cat > task-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ],
    "Resource": "arn:aws:logs:*:*:log-group:/ecs/skyfi-mcp-server:*"
  }]
}
EOF

aws iam put-role-policy \
  --role-name skyfi-mcp-task-role \
  --policy-name CloudWatchLogs \
  --policy-document file://task-policy.json
```

### Step 3: Register Task Definition

```bash
# Update infrastructure/ecs-task-definition.json with your values
cd infrastructure

# Replace placeholders
sed -e "s/ACCOUNT_ID/$AWS_ACCOUNT_ID/g" \
    -e "s/REGION/$AWS_REGION/g" \
    ecs-task-definition.json > task-definition.json

# Register task definition
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region $AWS_REGION
```

### Step 4: Create ECS Service

```bash
# Update infrastructure/ecs-service.json with your subnet and security group IDs

# Create service
aws ecs create-service \
  --cluster skyfi-mcp-cluster \
  --service-name skyfi-mcp-server \
  --cli-input-json file://ecs-service.json \
  --region $AWS_REGION
```

### Step 5: Verify Deployment

```bash
# Check service status
aws ecs describe-services \
  --cluster skyfi-mcp-cluster \
  --services skyfi-mcp-server \
  --region $AWS_REGION

# List running tasks
aws ecs list-tasks \
  --cluster skyfi-mcp-cluster \
  --service-name skyfi-mcp-server \
  --region $AWS_REGION

# Check task health
aws ecs describe-tasks \
  --cluster skyfi-mcp-cluster \
  --tasks TASK_ARN \
  --region $AWS_REGION
```

## Using the Deployment Script

The included deployment script automates the entire process:

### Basic Usage

```bash
cd infrastructure

# Make script executable (already done)
chmod +x deploy.sh

# Deploy with minimal options
./deploy.sh --account-id $AWS_ACCOUNT_ID
```

### Advanced Usage

```bash
# Deploy to specific region with custom tag
./deploy.sh \
  --account-id $AWS_ACCOUNT_ID \
  --region us-west-2 \
  --image-tag v1.2.3 \
  --cluster production-cluster \
  --service skyfi-mcp-production

# Deploy without rebuilding image
./deploy.sh \
  --account-id $AWS_ACCOUNT_ID \
  --skip-build

# Deploy without pushing to ECR (if already pushed)
./deploy.sh \
  --account-id $AWS_ACCOUNT_ID \
  --skip-push
```

### Deployment Steps

The script performs:
1. ✅ ECR authentication
2. ✅ Docker image build
3. ✅ ECR repository creation (if needed)
4. ✅ Image push to ECR
5. ✅ Task definition registration
6. ✅ Service update with new task definition
7. ✅ Wait for service stabilization
8. ✅ Deployment verification

### Script Options

```bash
./deploy.sh --help
```

Options:
- `--region REGION` - AWS region (default: us-east-1)
- `--account-id ACCOUNT_ID` - AWS account ID (required)
- `--cluster CLUSTER` - ECS cluster name (default: skyfi-mcp-cluster)
- `--service SERVICE` - ECS service name (default: skyfi-mcp-server)
- `--image-tag TAG` - Docker image tag (default: latest)
- `--skip-build` - Skip Docker build step
- `--skip-push` - Skip ECR push step
- `--help` - Show help message

## Service Configuration

### Resource Limits

Configured in `infrastructure/ecs-task-definition.json`:

```json
{
  "cpu": "512",      // 0.5 vCPU
  "memory": "1024"   // 1 GB RAM
}
```

Adjust based on your needs:
- **Development**: 256 CPU / 512 MB
- **Production (light)**: 512 CPU / 1024 MB
- **Production (heavy)**: 1024 CPU / 2048 MB

### Health Checks

```json
{
  "healthCheck": {
    "command": ["CMD-SHELL", "node -e \"...health check...\""],
    "interval": 30,
    "timeout": 10,
    "retries": 3,
    "startPeriod": 40
  }
}
```

The health check:
- Runs every 30 seconds
- Times out after 10 seconds
- Retries 3 times before marking unhealthy
- Waits 40 seconds before starting checks

## Auto-Scaling

### Configure Auto-Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/skyfi-mcp-cluster/skyfi-mcp-server \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 \
  --max-capacity 10 \
  --region $AWS_REGION

# Create CPU-based scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/skyfi-mcp-cluster/skyfi-mcp-server \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name skyfi-mcp-cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://infrastructure/ecs-autoscaling.json \
  --region $AWS_REGION
```

### Scaling Configuration

In `infrastructure/ecs-autoscaling.json`:
- **Target CPU**: 70%
- **Target Memory**: 80%
- **Scale-out cooldown**: 60 seconds
- **Scale-in cooldown**: 300 seconds

### Manual Scaling

```bash
# Scale to 5 tasks
aws ecs update-service \
  --cluster skyfi-mcp-cluster \
  --service skyfi-mcp-server \
  --desired-count 5 \
  --region $AWS_REGION
```

## Monitoring and Logs

### CloudWatch Logs

```bash
# Tail logs in real-time
aws logs tail /ecs/skyfi-mcp-server --follow --region $AWS_REGION

# View logs from last hour
aws logs tail /ecs/skyfi-mcp-server --since 1h --region $AWS_REGION

# Search logs
aws logs filter-log-events \
  --log-group-name /ecs/skyfi-mcp-server \
  --filter-pattern "ERROR" \
  --region $AWS_REGION
```

### CloudWatch Metrics

Key metrics to monitor:
- `CPUUtilization` - Task CPU usage
- `MemoryUtilization` - Task memory usage
- `HealthyHostCount` - Number of healthy tasks
- `TargetResponseTime` - Response time (if using ALB)

### Create Alarms

```bash
# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name skyfi-mcp-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=skyfi-mcp-server Name=ClusterName,Value=skyfi-mcp-cluster
```

## Rolling Updates

### Deploy New Version

```bash
# Build and tag new version
docker build -t skyfi-mcp:v1.2.0 .
docker tag skyfi-mcp:v1.2.0 \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/skyfi-mcp:v1.2.0

# Push new version
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/skyfi-mcp:v1.2.0

# Deploy using script
./infrastructure/deploy.sh \
  --account-id $AWS_ACCOUNT_ID \
  --image-tag v1.2.0
```

### Update Strategy

ECS performs rolling updates:
1. Start new task with new version
2. Wait for new task to be healthy
3. Stop old task
4. Repeat until all tasks updated

Configuration in `ecs-service.json`:
```json
{
  "deploymentConfiguration": {
    "maximumPercent": 200,
    "minimumHealthyPercent": 100
  }
}
```

This ensures:
- Zero downtime
- Always 100% capacity available
- Up to 200% capacity during deployment

## Rollback Procedures

### Automatic Rollback

ECS automatically rolls back if:
- New tasks fail health checks
- New tasks exit immediately
- Deployment doesn't stabilize within timeout

### Manual Rollback

```bash
# List task definitions
aws ecs list-task-definitions \
  --family-prefix skyfi-mcp-server \
  --region $AWS_REGION

# Update service to previous task definition
aws ecs update-service \
  --cluster skyfi-mcp-cluster \
  --service skyfi-mcp-server \
  --task-definition skyfi-mcp-server:PREVIOUS_REVISION \
  --force-new-deployment \
  --region $AWS_REGION
```

### Rollback with Deployment Script

```bash
# Deploy previous image tag
./infrastructure/deploy.sh \
  --account-id $AWS_ACCOUNT_ID \
  --image-tag v1.1.0 \
  --skip-build
```

## Cost Optimization

### Estimated Costs (us-east-1)

**Fargate Compute**:
- 0.5 vCPU, 1 GB memory: ~$0.04/hour
- 1 task 24/7: ~$29/month
- 3 tasks 24/7: ~$87/month

**Additional Services**:
- ALB: ~$16/month + data processing
- CloudWatch Logs: ~$0.50/GB ingested
- Secrets Manager: $0.40/secret/month
- Data Transfer: $0.09/GB outbound

**Total Monthly Cost**:
- Development (1 task): ~$50-75
- Production (3 tasks): ~$120-150

### Cost Reduction Tips

1. **Use Fargate Spot** (save up to 70%):
   ```json
   {
     "capacityProviderStrategy": [{
       "capacityProvider": "FARGATE_SPOT",
       "weight": 2
     }, {
       "capacityProvider": "FARGATE",
       "weight": 1
     }]
   }
   ```

2. **Right-size resources**: Monitor usage and adjust CPU/memory

3. **Enable log retention**:
   ```bash
   aws logs put-retention-policy \
     --log-group-name /ecs/skyfi-mcp-server \
     --retention-in-days 7
   ```

4. **Use Reserved Capacity** for predictable workloads

## Security Best Practices

### 1. Secrets Management
- ✅ Use AWS Secrets Manager
- ✅ Rotate secrets regularly
- ✅ Never commit secrets to git
- ✅ Use IAM roles, not access keys

### 2. Network Security
- ✅ Use private subnets for tasks
- ✅ Minimal security group rules
- ✅ Enable VPC Flow Logs
- ✅ Use ALB with SSL/TLS

### 3. Container Security
- ✅ Run as non-root user
- ✅ Scan images for vulnerabilities
- ✅ Use minimal base images
- ✅ Keep dependencies updated

### 4. Access Control
- ✅ Use IAM roles for tasks
- ✅ Principle of least privilege
- ✅ Enable CloudTrail logging
- ✅ Regular security audits

### 5. Monitoring
- ✅ Enable Container Insights
- ✅ Set up CloudWatch alarms
- ✅ Monitor for anomalies
- ✅ Regular log reviews

---

[← Back to Local Development](local-development.md) | [Next: Troubleshooting →](troubleshooting.md)
