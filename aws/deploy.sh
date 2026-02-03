#!/bin/bash

# KnexMail Waitlist - AWS Deployment Script
# ==========================================

set -e

STACK_NAME="knexmail-waitlist"
REGION="us-east-1"  # Change if needed

echo "🚀 KnexMail Waitlist - AWS Deployment"
echo "======================================"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo "❌ AWS SAM CLI not found. Install it first:"
    echo "   https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
    exit 1
fi

# Check AWS credentials
echo "📋 Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Run:"
    echo "   aws configure"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✅ Using AWS Account: $ACCOUNT_ID"

# Install Lambda dependencies
echo ""
echo "📦 Installing Lambda dependencies..."
cd lambda
npm install --production
cd ..

# Build with SAM
echo ""
echo "🔨 Building SAM application..."
sam build

# Deploy with SAM
echo ""
echo "🚀 Deploying to AWS..."
sam deploy \
    --stack-name $STACK_NAME \
    --region $REGION \
    --capabilities CAPABILITY_IAM \
    --resolve-s3 \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset

# Get outputs
echo ""
echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""

API_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text)

echo "🔗 Your API URL:"
echo "   $API_URL"
echo ""
echo "📝 Update your website's main.js with this URL"
echo ""
echo "🧪 Test with:"
echo "   curl -X POST $API_URL \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"handle\": \"@test\", \"email\": \"test@example.com\"}'"
