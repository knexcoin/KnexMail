const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'knexmail-waitlist';

// CORS headers for browser requests
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Referral reward tiers
const REWARD_TIERS = [
  { count: 5, reward: 'Priority Access', icon: '⚡' },
  { count: 10, reward: 'Founding Member Badge', icon: '🏆' },
  { count: 25, reward: '1 Year Premium Free', icon: '💎' },
  { count: 50, reward: 'Lifetime VIP Status', icon: '👑' }
];

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

// Calculate tier progress
function getTierProgress(referralCount) {
  const unlockedTiers = REWARD_TIERS.filter(t => referralCount >= t.count);
  const nextTier = REWARD_TIERS.find(t => referralCount < t.count);

  return {
    referralCount,
    unlockedTiers,
    nextTier: nextTier ? {
      ...nextTier,
      remaining: nextTier.count - referralCount,
      progress: Math.round((referralCount / nextTier.count) * 100)
    } : null,
    allTiers: REWARD_TIERS
  };
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const path = event.path || event.resource || '';

  // Route: GET /stats - Get user stats by handle
  if (event.httpMethod === 'GET' && path.includes('/stats')) {
    return handleGetStats(event);
  }

  // Route: GET /leaderboard - Get top referrers
  if (event.httpMethod === 'GET' && path.includes('/leaderboard')) {
    return handleGetLeaderboard(event);
  }

  // Route: POST /signup - Create new signup
  if (event.httpMethod === 'POST') {
    return handleSignup(event);
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};

// GET /stats?handle=@username
async function handleGetStats(event) {
  try {
    let handle = event.queryStringParameters?.handle || '';
    handle = normalizeHandle(handle);

    if (!handle || !isValidHandle(handle)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid handle format' })
      };
    }

    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { handle }
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Handle not found' })
      };
    }

    const user = result.Item;
    const tierProgress = getTierProgress(user.referralCount);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        handle: user.handle,
        referralCode: user.referralCode,
        referralLink: `https://knexmail.com?ref=${user.referralCode}`,
        referralCount: user.referralCount,
        joinedAt: user.createdAt,
        tierProgress
      })
    };

  } catch (error) {
    console.error('Stats error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

// GET /leaderboard?limit=10
async function handleGetLeaderboard(event) {
  try {
    const limit = Math.min(parseInt(event.queryStringParameters?.limit) || 10, 25);

    // Scan and sort (for small datasets this is fine)
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      ProjectionExpression: 'handle, referralCount, reserved'
    }));

    // Filter out reserved handles
    const realUsers = (result.Items || []).filter(item => !item.reserved);

    const leaderboard = realUsers
      .filter(item => item.referralCount > 0)
      .sort((a, b) => b.referralCount - a.referralCount)
      .slice(0, limit)
      .map((item, index) => ({
        rank: index + 1,
        handle: item.handle,
        referralCount: item.referralCount
      }));

    // Get total waitlist count (excluding reserved)
    const totalCount = realUsers.length;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        leaderboard,
        totalWaitlist: totalCount,
        rewardTiers: REWARD_TIERS
      })
    };

  } catch (error) {
    console.error('Leaderboard error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

// POST /signup
async function handleSignup(event) {
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
      // Check if it's a reserved system handle
      if (existingUser.Item.reserved) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: 'This handle is reserved and not available'
          })
        };
      }
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

    // Return success with referral code and tier info
    const tierProgress = getTierProgress(0);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        handle,
        referralCode,
        referralLink: `https://knexmail.com?ref=${referralCode}`,
        referralCount: 0,
        tierProgress,
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
}
