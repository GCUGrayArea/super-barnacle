#!/bin/bash
#
# SkyFi MCP Server - ECS Fargate Deployment Script
#
# This script automates the deployment of the SkyFi MCP server to AWS ECS Fargate.
# It handles Docker image building, ECR push, task definition registration, and service updates.
#
# Prerequisites:
# - AWS CLI installed and configured
# - Docker installed and running
# - Appropriate IAM permissions for ECR, ECS, and IAM
#
# Usage:
#   ./deploy.sh [OPTIONS]
#
# Options:
#   --region REGION          AWS region (default: us-east-1)
#   --account-id ACCOUNT_ID  AWS account ID (required)
#   --cluster CLUSTER        ECS cluster name (default: skyfi-mcp-cluster)
#   --service SERVICE        ECS service name (default: skyfi-mcp-server)
#   --image-tag TAG          Docker image tag (default: latest)
#   --skip-build             Skip Docker build step
#   --skip-push              Skip ECR push step
#   --help                   Show this help message
#

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Default configuration
REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID=""
CLUSTER="skyfi-mcp-cluster"
SERVICE="skyfi-mcp-server"
IMAGE_TAG="latest"
SKIP_BUILD=false
SKIP_PUSH=false
ECR_REPO="skyfi-mcp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show help
show_help() {
    head -n 25 "$0" | tail -n 20
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --region)
            REGION="$2"
            shift 2
            ;;
        --account-id)
            ACCOUNT_ID="$2"
            shift 2
            ;;
        --cluster)
            CLUSTER="$2"
            shift 2
            ;;
        --service)
            SERVICE="$2"
            shift 2
            ;;
        --image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-push)
            SKIP_PUSH=true
            shift
            ;;
        --help)
            show_help
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            ;;
    esac
done

# Validate required parameters
if [ -z "$ACCOUNT_ID" ]; then
    log_error "AWS account ID is required. Use --account-id ACCOUNT_ID"
    exit 1
fi

# Derived values
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE_URI="${ECR_REGISTRY}/${ECR_REPO}:${IMAGE_TAG}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

log_info "SkyFi MCP Server Deployment"
log_info "============================"
log_info "Region:         $REGION"
log_info "Account ID:     $ACCOUNT_ID"
log_info "Cluster:        $CLUSTER"
log_info "Service:        $SERVICE"
log_info "Image Tag:      $IMAGE_TAG"
log_info "Image URI:      $IMAGE_URI"
log_info ""

# Step 1: Authenticate with ECR
log_info "Step 1: Authenticating with ECR..."
if aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"; then
    log_success "Successfully authenticated with ECR"
else
    log_error "Failed to authenticate with ECR"
    exit 1
fi

# Step 2: Build Docker image
if [ "$SKIP_BUILD" = false ]; then
    log_info "Step 2: Building Docker image..."
    cd "$PROJECT_ROOT"

    if docker build -t "${ECR_REPO}:${IMAGE_TAG}" -f Dockerfile .; then
        log_success "Docker image built successfully"
    else
        log_error "Failed to build Docker image"
        exit 1
    fi

    # Tag for ECR
    docker tag "${ECR_REPO}:${IMAGE_TAG}" "$IMAGE_URI"
    log_success "Image tagged: $IMAGE_URI"
else
    log_warn "Skipping Docker build (--skip-build)"
fi

# Step 3: Create ECR repository if it doesn't exist
log_info "Step 3: Ensuring ECR repository exists..."
if aws ecr describe-repositories --region "$REGION" --repository-names "$ECR_REPO" &> /dev/null; then
    log_success "ECR repository '$ECR_REPO' already exists"
else
    log_warn "ECR repository '$ECR_REPO' does not exist. Creating..."
    if aws ecr create-repository \
        --region "$REGION" \
        --repository-name "$ECR_REPO" \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256 &> /dev/null; then
        log_success "ECR repository created successfully"
    else
        log_error "Failed to create ECR repository"
        exit 1
    fi
fi

# Step 4: Push image to ECR
if [ "$SKIP_PUSH" = false ]; then
    log_info "Step 4: Pushing image to ECR..."
    if docker push "$IMAGE_URI"; then
        log_success "Image pushed to ECR: $IMAGE_URI"
    else
        log_error "Failed to push image to ECR"
        exit 1
    fi
else
    log_warn "Skipping ECR push (--skip-push)"
fi

# Step 5: Update task definition with actual values
log_info "Step 5: Preparing task definition..."
TASK_DEF_FILE="${SCRIPT_DIR}/ecs-task-definition.json"
TASK_DEF_TEMP="/tmp/ecs-task-definition-${IMAGE_TAG}.json"

# Replace placeholders in task definition
sed -e "s|ACCOUNT_ID|${ACCOUNT_ID}|g" \
    -e "s|REGION|${REGION}|g" \
    -e "s|ACCOUNT_ID\.dkr\.ecr\.REGION\.amazonaws\.com/skyfi-mcp:latest|${IMAGE_URI}|g" \
    "$TASK_DEF_FILE" > "$TASK_DEF_TEMP"

log_success "Task definition prepared: $TASK_DEF_TEMP"

# Step 6: Register new task definition
log_info "Step 6: Registering new task definition..."
TASK_DEF_ARN=$(aws ecs register-task-definition \
    --region "$REGION" \
    --cli-input-json file://"$TASK_DEF_TEMP" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

if [ -n "$TASK_DEF_ARN" ]; then
    log_success "Task definition registered: $TASK_DEF_ARN"
else
    log_error "Failed to register task definition"
    exit 1
fi

# Step 7: Update ECS service
log_info "Step 7: Updating ECS service..."
if aws ecs update-service \
    --region "$REGION" \
    --cluster "$CLUSTER" \
    --service "$SERVICE" \
    --task-definition "$TASK_DEF_ARN" \
    --force-new-deployment \
    --query 'service.serviceName' \
    --output text &> /dev/null; then
    log_success "ECS service update initiated"
else
    log_error "Failed to update ECS service"
    log_warn "You may need to create the service first using ecs-service.json"
    exit 1
fi

# Step 8: Wait for service to stabilize
log_info "Step 8: Waiting for service to stabilize (this may take a few minutes)..."
if aws ecs wait services-stable \
    --region "$REGION" \
    --cluster "$CLUSTER" \
    --services "$SERVICE"; then
    log_success "Service is stable and running the new task definition"
else
    log_error "Service failed to stabilize within the timeout period"
    log_warn "Check ECS console for deployment status and errors"
    exit 1
fi

# Step 9: Verify deployment
log_info "Step 9: Verifying deployment..."
RUNNING_COUNT=$(aws ecs describe-services \
    --region "$REGION" \
    --cluster "$CLUSTER" \
    --services "$SERVICE" \
    --query 'services[0].runningCount' \
    --output text)

DESIRED_COUNT=$(aws ecs describe-services \
    --region "$REGION" \
    --cluster "$CLUSTER" \
    --services "$SERVICE" \
    --query 'services[0].desiredCount' \
    --output text)

if [ "$RUNNING_COUNT" -eq "$DESIRED_COUNT" ]; then
    log_success "Deployment successful!"
    log_success "Running tasks: $RUNNING_COUNT / $DESIRED_COUNT"
else
    log_warn "Deployment may not be fully complete"
    log_warn "Running tasks: $RUNNING_COUNT / $DESIRED_COUNT"
fi

# Cleanup
rm -f "$TASK_DEF_TEMP"

log_info ""
log_success "=========================================="
log_success "Deployment completed successfully!"
log_success "=========================================="
log_info "Image:     $IMAGE_URI"
log_info "Task Def:  $TASK_DEF_ARN"
log_info "Service:   $SERVICE"
log_info "Cluster:   $CLUSTER"
log_info ""
log_info "To view logs:"
log_info "  aws logs tail /ecs/skyfi-mcp-server --follow --region $REGION"
log_info ""
log_info "To check service status:"
log_info "  aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION"
