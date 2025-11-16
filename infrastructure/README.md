# SkyFi MCP Server - Infrastructure Configuration

This directory contains the AWS ECS Fargate deployment configuration for the SkyFi MCP server.

## Contents

- **ecs-task-definition.json** - ECS Fargate task definition with resource limits, health checks, and logging
- **ecs-service.json** - ECS service configuration with load balancer integration
- **ecs-autoscaling.json** - Auto-scaling policies for 1-10 tasks based on CPU/memory
- **deploy.sh** - Automated deployment script for building, pushing, and deploying
- **secrets-manager.tf** - Terraform configuration for secrets and IAM roles
- **iam-policies/** - IAM policy documents (optional reference)

## Prerequisites

Before deploying, ensure you have:

1. **AWS CLI** installed and configured with appropriate credentials
2. **Docker** installed and running
3. **Terraform** (optional, for secrets management)
4. **AWS Account** with permissions for:
   - ECR (Elastic Container Registry)
   - ECS (Elastic Container Service)
   - IAM (Identity and Access Management)
   - CloudWatch Logs
   - Secrets Manager / SSM Parameter Store
   - Application Load Balancer (optional)

## Setup Instructions

### 1. Create AWS Resources (First-Time Setup)

#### Option A: Using Terraform (Recommended)

```bash
# Navigate to infrastructure directory
cd infrastructure

# Initialize Terraform
terraform init

# Create terraform.tfvars with your values
cat > terraform.tfvars <<EOF
aws_region       = "us-east-1"
environment      = "production"
application_name = "skyfi-mcp"
skyfi_api_key    = "your-skyfi-api-key-here"
openai_api_key   = "your-openai-api-key-here"
EOF

# Review the plan
terraform plan

# Apply the configuration
terraform apply
```

This will create:
- IAM execution role and task role
- Secrets Manager secrets for API keys
- SSM parameters for configuration

#### Option B: Manual Setup

Create the secrets manually:

```bash
# Create SkyFi API key secret
aws secretsmanager create-secret \
    --name skyfi-mcp/api-key \
    --description "SkyFi API key" \
    --secret-string "your-skyfi-api-key-here" \
    --region us-east-1

# Create OpenAI API key secret
aws secretsmanager create-secret \
    --name skyfi-mcp/openai-key \
    --description "OpenAI API key" \
    --secret-string "your-openai-api-key-here" \
    --region us-east-1

# Create SSM parameters
aws ssm put-parameter \
    --name /skyfi-mcp/log-level \
    --value "info" \
    --type String \
    --region us-east-1
```

### 2. Update Configuration Files

Update the following placeholders in the JSON files:

**ecs-task-definition.json:**
- `ACCOUNT_ID` - Your AWS account ID
- `REGION` - Your AWS region (e.g., us-east-1)

**ecs-service.json:**
- `subnet-xxxxxxxx`, `subnet-yyyyyyyy` - Your VPC subnet IDs
- `sg-xxxxxxxxx` - Your security group ID
- `REGION` - Your AWS region
- `ACCOUNT_ID` - Your AWS account ID
- Target group ARN (if using load balancer)

### 3. Create ECS Cluster

```bash
aws ecs create-cluster \
    --cluster-name skyfi-mcp-cluster \
    --region us-east-1 \
    --tags key=Application,value=skyfi-mcp
```

### 4. Create Application Load Balancer (Optional)

If you need external access to the MCP server:

```bash
# Create target group
aws elbv2 create-target-group \
    --name skyfi-mcp-tg \
    --protocol HTTP \
    --port 3000 \
    --target-type ip \
    --vpc-id vpc-xxxxxxxx \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --region us-east-1

# Create load balancer (requires at least 2 subnets in different AZs)
aws elbv2 create-load-balancer \
    --name skyfi-mcp-alb \
    --subnets subnet-xxxxxxxx subnet-yyyyyyyy \
    --security-groups sg-xxxxxxxxx \
    --scheme internet-facing \
    --type application \
    --region us-east-1
```

### 5. Deploy the Application

Use the automated deployment script:

```bash
# Make script executable (already done)
chmod +x deploy.sh

# Deploy with your AWS account ID
./deploy.sh --account-id 123456789012 --region us-east-1

# Or with custom options
./deploy.sh \
    --account-id 123456789012 \
    --region us-east-1 \
    --cluster skyfi-mcp-cluster \
    --service skyfi-mcp-server \
    --image-tag v1.0.0
```

The deployment script will:
1. Authenticate with ECR
2. Build the Docker image
3. Create ECR repository (if needed)
4. Push image to ECR
5. Register new ECS task definition
6. Update ECS service
7. Wait for deployment to stabilize
8. Verify the deployment

### 6. Set Up Auto-Scaling (Optional)

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
    --service-namespace ecs \
    --resource-id service/skyfi-mcp-cluster/skyfi-mcp-server \
    --scalable-dimension ecs:service:DesiredCount \
    --min-capacity 1 \
    --max-capacity 10 \
    --region us-east-1

# Create CPU-based scaling policy
aws application-autoscaling put-scaling-policy \
    --service-namespace ecs \
    --resource-id service/skyfi-mcp-cluster/skyfi-mcp-server \
    --scalable-dimension ecs:service:DesiredCount \
    --policy-name skyfi-mcp-cpu-scaling \
    --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration file://ecs-autoscaling.json \
    --region us-east-1
```

## Monitoring and Troubleshooting

### View Logs

```bash
# Tail logs in real-time
aws logs tail /ecs/skyfi-mcp-server --follow --region us-east-1

# View recent logs
aws logs tail /ecs/skyfi-mcp-server --since 1h --region us-east-1
```

### Check Service Status

```bash
# Describe service
aws ecs describe-services \
    --cluster skyfi-mcp-cluster \
    --services skyfi-mcp-server \
    --region us-east-1

# List running tasks
aws ecs list-tasks \
    --cluster skyfi-mcp-cluster \
    --service-name skyfi-mcp-server \
    --region us-east-1
```

### Health Check

```bash
# Test health endpoint (replace with your ALB DNS or public IP)
curl http://your-alb-dns-name.us-east-1.elb.amazonaws.com/health

# Expected response:
# {
#   "status": "healthy",
#   "name": "skyfi-mcp-server",
#   "version": "1.0.0",
#   "timestamp": "2025-11-15T12:00:00.000Z",
#   "transports": 0
# }
```

### Troubleshooting

**Task fails to start:**
- Check CloudWatch logs for application errors
- Verify secrets exist in Secrets Manager
- Ensure IAM roles have correct permissions
- Check security group allows traffic on port 3000

**Health checks failing:**
- Verify container is listening on port 3000
- Check security group allows health check traffic
- Review health check configuration in task definition
- Examine application logs for startup errors

**Cannot pull image from ECR:**
- Verify ECR repository exists
- Check execution role has ECR pull permissions
- Ensure image was pushed successfully

## IAM Permissions Required

The deployment requires the following IAM permissions:

**For deployment script:**
- `ecr:*` - ECR repository and image management
- `ecs:RegisterTaskDefinition` - Register new task definitions
- `ecs:UpdateService` - Update service with new task definition
- `ecs:DescribeServices` - Check service status
- `iam:PassRole` - Pass execution and task roles to ECS

**For task execution role:**
- `ecr:GetAuthorizationToken` - Authenticate with ECR
- `ecr:BatchCheckLayerAvailability` - Check image layers
- `ecr:GetDownloadUrlForLayer` - Download image layers
- `ecr:BatchGetImage` - Get image manifest
- `logs:CreateLogGroup` - Create log groups
- `logs:CreateLogStream` - Create log streams
- `logs:PutLogEvents` - Write log events
- `secretsmanager:GetSecretValue` - Read secrets
- `ssm:GetParameters` - Read SSM parameters

**For task role:**
- `logs:CreateLogStream` - Create log streams
- `logs:PutLogEvents` - Write log events
- `cloudwatch:PutMetricData` - Publish custom metrics

See `secrets-manager.tf` for complete IAM role definitions.

## Resource Limits

The task definition is configured with:
- **CPU:** 512 units (0.5 vCPU)
- **Memory:** 1024 MB (1 GB)
- **Auto-scaling:** 1-10 tasks based on CPU and memory utilization

These limits can be adjusted in `ecs-task-definition.json` based on your workload.

## Cost Estimation

Approximate AWS costs (us-east-1 pricing):
- **Fargate:** ~$0.04/hour per task (512 CPU, 1GB memory) = ~$29/month for 1 task
- **ALB:** ~$16.20/month base + data processing
- **CloudWatch Logs:** ~$0.50/GB ingested + $0.03/GB stored
- **Secrets Manager:** $0.40/month per secret
- **Data Transfer:** $0.09/GB outbound (after free tier)

**Estimated monthly cost:** $50-100 for a single task with moderate traffic.

## Security Best Practices

1. **Secrets Management:**
   - Never commit secrets to git
   - Use Secrets Manager or SSM Parameter Store
   - Rotate API keys regularly

2. **Network Security:**
   - Use private subnets for tasks (with NAT gateway)
   - Configure security groups with least privilege
   - Enable VPC flow logs for network monitoring

3. **IAM:**
   - Follow principle of least privilege
   - Use separate execution and task roles
   - Regularly audit IAM policies

4. **Container Security:**
   - Run as non-root user (already configured in Dockerfile)
   - Scan images for vulnerabilities (enabled in ECR)
   - Keep base images up to date

5. **Monitoring:**
   - Enable CloudWatch Container Insights
   - Set up alarms for high error rates
   - Monitor task health and auto-scaling metrics

## Additional Resources

- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/intro.html)
- [AWS Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
- [ECS Task Definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html)
- [Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html)

## Support

For issues or questions:
1. Check CloudWatch logs first
2. Review this README and troubleshooting section
3. Consult AWS documentation
4. Contact the development team
