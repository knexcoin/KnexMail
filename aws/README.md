# KnexMail Waitlist - AWS Infrastructure

Serverless waitlist system with referral tracking for KnexMail.

## Architecture

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Website    │────▶│ API Gateway │────▶│    Lambda    │
│ knexmail.com │     │   /signup   │     │   Function   │
└──────────────┘     └─────────────┘     └──────┬───────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │   DynamoDB   │
                                         │   Waitlist   │
                                         └──────────────┘
```

## Prerequisites

1. **AWS Account** - [Sign up](https://aws.amazon.com/)
2. **AWS CLI** - [Install](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
3. **AWS SAM CLI** - [Install](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
4. **Node.js 18+** - [Install](https://nodejs.org/)

## Setup

### 1. Configure AWS CLI

```bash
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., `us-east-1`)
- Default output format: `json`

### 2. Deploy

```bash
cd /Users/david/KnexWallet/KnexMail/aws
chmod +x deploy.sh
./deploy.sh
```

### 3. Update Website

After deployment, update `docs/js/main.js` with the API URL:

```javascript
const API_URL = 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/signup';
```

## API Reference

### POST /signup

Create a new waitlist entry.

**Request:**
```json
{
  "handle": "@username",
  "email": "user@example.com",
  "referral": "KNEX-A7X3M9"  // optional
}
```

**Success Response (200):**
```json
{
  "success": true,
  "handle": "@username",
  "referralCode": "KNEX-B2Y8K4",
  "referralLink": "https://knexmail.com?ref=KNEX-B2Y8K4",
  "message": "Welcome to the KnexMail waitlist!"
}
```

**Error Responses:**

- `400` - Invalid handle or email
- `409` - Handle already taken
- `500` - Server error

## Database Schema

**Table: knexmail-waitlist**

| Field | Type | Description |
|-------|------|-------------|
| handle | String (PK) | User's @handle |
| email | String | Email address |
| referralCode | String (GSI) | Unique KNEX-XXXXXX code |
| referredBy | String | Referral code used to sign up |
| referralCount | Number | How many referrals this user has |
| createdAt | String | ISO timestamp |

## Cost

**Free Tier (12 months):**
- Lambda: 1M requests/month free
- API Gateway: 1M calls/month free
- DynamoDB: 25GB storage, 25 WCU/RCU free

**After Free Tier:**
- Estimated $0-1/month for typical waitlist usage

## Monitoring

View logs and metrics:

```bash
# View Lambda logs
sam logs -n knexmail-waitlist --stack-name knexmail-waitlist --tail

# View in AWS Console
# https://console.aws.amazon.com/lambda
# https://console.aws.amazon.com/dynamodb
# https://console.aws.amazon.com/apigateway
```

## Cleanup

To delete all resources:

```bash
aws cloudformation delete-stack --stack-name knexmail-waitlist
```

## Files

```
aws/
├── template.yaml      # SAM/CloudFormation template
├── deploy.sh          # Deployment script
├── README.md          # This file
└── lambda/
    ├── index.js       # Lambda function code
    └── package.json   # Node.js dependencies
```
