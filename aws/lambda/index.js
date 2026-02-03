const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const sesClient = new SESClient({});

const TABLE_NAME = process.env.TABLE_NAME || 'knexmail-waitlist';
const FROM_EMAIL = process.env.FROM_EMAIL || 'hello@knexmail.com';
const EMAILS_ENABLED = process.env.EMAILS_ENABLED === 'true';

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

// Allowed email providers
const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'aol.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'protonmail.com',
  'proton.me'
];

// Validate email format and provider
function isValidEmail(email) {
  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return false;
  }

  // Extract domain from email
  const domain = email.toLowerCase().split('@')[1];

  // Check if domain is in allowed list
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
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

// Email Templates
function getWelcomeEmailHtml(handle, referralCode, referralLink) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to KnexMail!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%); border-radius: 16px; border: 1px solid rgba(0, 212, 255, 0.2);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #00d4ff, #00ff88); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                KnexMail
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px;">Welcome to the Waitlist! 🎉</h2>
              <p style="margin: 0 0 20px; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
                Hey <strong style="color: #00d4ff;">${handle}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
                You've successfully reserved your handle on KnexMail! You're now part of an exclusive group getting early access to the future of email.
              </p>

              <!-- Referral Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 212, 255, 0.1); border-radius: 12px; border: 1px solid rgba(0, 212, 255, 0.3); margin: 30px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Referral Code</p>
                    <p style="margin: 0 0 20px; color: #00d4ff; font-size: 28px; font-weight: 700; font-family: monospace;">${referralCode}</p>
                    <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Referral Link</p>
                    <p style="margin: 0; color: #00ff88; font-size: 14px; word-break: break-all;">
                      <a href="${referralLink}" style="color: #00ff88; text-decoration: none;">${referralLink}</a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Rewards -->
              <p style="margin: 0 0 15px; color: #ffffff; font-size: 18px; font-weight: 600;">Earn Rewards by Referring Friends:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 8px 0; color: #b0b0b0; font-size: 14px;">⚡ 5 referrals → Priority Access</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #b0b0b0; font-size: 14px;">🏆 10 referrals → Founding Member Badge</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #b0b0b0; font-size: 14px;">💎 25 referrals → 1 Year Premium Free</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #b0b0b0; font-size: 14px;">👑 50 referrals → Lifetime VIP Status</td>
                </tr>
              </table>

              <p style="margin: 0 0 30px; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
                Share your link with friends and climb the leaderboard!
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #00d4ff, #00ff88); border-radius: 8px;">
                    <a href="https://knexmail.com" style="display: inline-block; padding: 14px 32px; color: #000000; font-size: 16px; font-weight: 600; text-decoration: none;">
                      Check Your Stats
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0; color: #666666; font-size: 12px;">
                © 2025 KnexMail. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getReferralNotificationHtml(handle, newReferralCount, referrerCode) {
  const tierProgress = getTierProgress(newReferralCount);
  const nextTierText = tierProgress.nextTier
    ? `Only ${tierProgress.nextTier.remaining} more to unlock "${tierProgress.nextTier.reward}"!`
    : "You've unlocked all tiers! 🎉";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Referral!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%); border-radius: 16px; border: 1px solid rgba(0, 255, 136, 0.2);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #00d4ff, #00ff88); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                KnexMail
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="margin: 0 0 20px; color: #00ff88; font-size: 28px; text-align: center;">🎉 New Referral!</h2>
              <p style="margin: 0 0 20px; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
                Hey <strong style="color: #00d4ff;">${handle}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
                Someone just joined the KnexMail waitlist using your referral code! 🚀
              </p>

              <!-- Stats Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 255, 136, 0.1); border-radius: 12px; border: 1px solid rgba(0, 255, 136, 0.3); margin: 30px 0;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Total Referrals</p>
                    <p style="margin: 0 0 20px; color: #00ff88; font-size: 48px; font-weight: 700;">${newReferralCount}</p>
                    <p style="margin: 0; color: #b0b0b0; font-size: 14px;">${nextTierText}</p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 30px; color: #b0b0b0; font-size: 16px; line-height: 1.6; text-align: center;">
                Keep sharing your link to unlock more rewards!
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background: linear-gradient(135deg, #00d4ff, #00ff88); border-radius: 8px;">
                          <a href="https://knexmail.com" style="display: inline-block; padding: 14px 32px; color: #000000; font-size: 16px; font-weight: 600; text-decoration: none;">
                            View Leaderboard
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0; color: #666666; font-size: 12px;">
                © 2025 KnexMail. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Send email via SES
async function sendEmail(toEmail, subject, htmlBody) {
  if (!EMAILS_ENABLED) {
    console.log('Emails disabled, skipping:', subject, 'to', toEmail);
    return;
  }

  try {
    await sesClient.send(new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [toEmail]
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8'
          }
        }
      }
    }));
    console.log('Email sent successfully to:', toEmail);
  } catch (error) {
    console.error('Failed to send email:', error);
    // Don't throw - email failure shouldn't break signup
  }
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
    let referrerToNotify = null;
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
          referrerToNotify = referrer;

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

    // Send welcome email to new user
    const referralLink = `https://knexmail.com?ref=${referralCode}`;
    await sendEmail(
      email,
      '🎉 Welcome to KnexMail - You\'re on the Waitlist!',
      getWelcomeEmailHtml(handle, referralCode, referralLink)
    );

    // Send notification to referrer if applicable
    if (referrerToNotify && referrerToNotify.email && !referrerToNotify.reserved) {
      const newCount = (referrerToNotify.referralCount || 0) + 1;
      await sendEmail(
        referrerToNotify.email,
        `🎉 Someone joined KnexMail using your referral! (${newCount} total)`,
        getReferralNotificationHtml(referrerToNotify.handle, newCount, referrerToNotify.referralCode)
      );
    }

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
