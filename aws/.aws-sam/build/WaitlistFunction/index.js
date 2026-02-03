const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'knexmail-waitlist';

// CORS headers for browser requests
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Generate unique referral code: KNEX-XXXXXX
function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'KNEX-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate handle format (@username)
function isValidHandle(handle) {
  const handleRegex = /^@[a-zA-Z0-9_]{1,30}$/;
  return handleRegex.test(handle);
}

// Normalize handle (lowercase, ensure @ prefix)
function normalizeHandle(handle) {
  let normalized = handle.trim().toLowerCase();
  if (!normalized.startsWith('@')) {
    normalized = '@' + normalized;
  }
  return normalized;
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    let { handle, email, referral } = body;

    // Normalize and validate inputs
    handle = normalizeHandle(handle || '');
    email = (email || '').trim().toLowerCase();
    referral = (referral || '').trim().toUpperCase();

    // Validation
    if (!handle || !isValidHandle(handle)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid handle. Use @username format (letters, numbers, underscores only)'
        })
      };
    }

    if (!email || !isValidEmail(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email address' })
      };
    }

    // Check if handle already exists
    const existingUser = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { handle }
    }));

    if (existingUser.Item) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'This handle is already reserved',
          existingReferralCode: existingUser.Item.referralCode
        })
      };
    }

    // Generate unique referral code (with collision check)
    let referralCode;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      referralCode = generateReferralCode();

      // Check if code exists using GSI
      const codeCheck = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'referralCode-index',
        KeyConditionExpression: 'referralCode = :code',
        ExpressionAttributeValues: { ':code': referralCode }
      }));

      if (!codeCheck.Items || codeCheck.Items.length === 0) {
        isUnique = true;
      }
      attempts++;
    }

    // Validate referral code if provided
    let referredBy = null;
    if (referral && referral.startsWith('KNEX-')) {
      const referrerQuery = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'referralCode-index',
        KeyConditionExpression: 'referralCode = :code',
        ExpressionAttributeValues: { ':code': referral }
      }));

      if (referrerQuery.Items && referrerQuery.Items.length > 0) {
        const referrer = referrerQuery.Items[0];

        // Prevent self-referral
        if (referrer.handle !== handle) {
          referredBy = referral;

          // Increment referrer's count
          await docClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { handle: referrer.handle },
            UpdateExpression: 'SET referralCount = referralCount + :inc',
            ExpressionAttributeValues: { ':inc': 1 }
          }));
        }
      }
    }

    // Create new waitlist entry
    const newUser = {
      handle,
      email,
      referralCode,
      referredBy,
      referralCount: 0,
      createdAt: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: newUser
    }));

    // Return success with referral code
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        handle,
        referralCode,
        referralLink: `https://knexmail.com?ref=${referralCode}`,
        message: referredBy
          ? 'Welcome! You were referred by a friend.'
          : 'Welcome to the KnexMail waitlist!'
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
