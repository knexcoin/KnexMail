const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const crypto = require('crypto');
const { isReserved, validateHandleFormat, getSuggestion, getReservationReason, translateToEmoji, validateEmojiHandle } = require('./reserved-handles');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const sesClient = new SESClient({});

const TABLE_NAME = process.env.TABLE_NAME || 'knexmail-waitlist';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@knexmail.com';
const EMAILS_ENABLED = process.env.EMAILS_ENABLED === 'true';

// CORS headers for browser requests
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// ============================================================================
// DYNAMIC REWARD ALGORITHM - 50M KNEX Budget for 500M Users
// ============================================================================
// VISION: "When we get this right. Not if."
// Target: 500M crypto users onboard before end of year
// Budget: 50M KNEX (16.1% of 310M max supply)
// Strategy: Auto-adjusting rewards with vesting for sustainable viral growth
// ============================================================================
const GENESIS_LIMIT = 100;
const GENESIS_SIGNUP_BONUS = 10000;
const GENESIS_SUPER_REFERRAL_BONUS = 10000;
const GENESIS_SUPER_REFERRAL_LIMIT = 5;
const SHARE_BONUS = 1; // +1 KNEX for sharing

// Dynamic reward budget (50M KNEX = 16.7% of 310M total supply)
const TOTAL_REWARD_BUDGET = 50000000; // 50 Million KNEX
const GENESIS_ALLOCATED = GENESIS_LIMIT * GENESIS_SIGNUP_BONUS; // 1M KNEX for Genesis
const DYNAMIC_BUDGET = TOTAL_REWARD_BUDGET - GENESIS_ALLOCATED; // 49M KNEX for dynamic rewards

// Vesting configuration (for rewards > 100 KNEX)
const VESTING_THRESHOLD = 100;
const VESTING_SCHEDULE = {
  immediate: 0.25,    // 25% unlocked immediately
  month1: 0.25,       // 25% after 30 days of activity
  month2: 0.25,       // 25% after 60 days
  month3: 0.25        // 25% after 90 days
};

// Referral reward tiers
const REWARD_TIERS = [
  { count: 5, reward: 'Priority Access', icon: '⚡' },
  { count: 10, reward: 'Founding Member Badge', icon: '🏆' },
  { count: 25, reward: '1 Year Premium Free', icon: '💎' },
  { count: 50, reward: 'Lifetime VIP Status', icon: '👑' }
];

// Calculate dynamic reward based on user number and remaining budget
function calculateDynamicReward(userNumber, totalUsers, budgetRemaining) {
  // GENESIS 100 - Always fixed at 10,000 KNEX
  if (userNumber <= GENESIS_LIMIT) {
    return {
      baseReward: GENESIS_SIGNUP_BONUS,
      tier: 'GENESIS',
      vested: false,
      referralBonus: GENESIS_SUPER_REFERRAL_BONUS
    };
  }

  // Calculate exponential decay factor
  // Early users get significantly more, tapers off as user base grows
  const progress = (userNumber - GENESIS_LIMIT) / (500000000 - GENESIS_LIMIT); // 500M target
  const decayFactor = Math.exp(-4 * progress); // Exponential decay

  // Calculate base allocation per remaining user
  const usersRemaining = Math.max(500000000 - userNumber, 1);
  const budgetPerUser = budgetRemaining / usersRemaining;

  // Tiered multipliers based on user milestones
  let multiplier;
  let tier;

  if (userNumber <= 10000) {
    // Users 101-10,000: Ultra Early Adopters (250 KNEX avg)
    multiplier = 3.0;
    tier = 'ULTRA_EARLY';
  } else if (userNumber <= 100000) {
    // Users 10,001-100,000: Early Adopters (80 KNEX avg)
    multiplier = 1.8;
    tier = 'EARLY';
  } else if (userNumber <= 1000000) {
    // Users 100,001-1M: Growth Phase (20 KNEX avg)
    multiplier = 1.2;
    tier = 'GROWTH';
  } else if (userNumber <= 10000000) {
    // Users 1M-10M: Mainstream (5 KNEX avg)
    multiplier = 0.8;
    tier = 'MAINSTREAM';
  } else if (userNumber <= 100000000) {
    // Users 10M-100M: Mass Adoption (1 KNEX avg)
    multiplier = 0.4;
    tier = 'MASS';
  } else {
    // Users 100M+: Sustainability Phase (0.1-0.5 KNEX)
    multiplier = 0.2;
    tier = 'SUSTAINABILITY';
  }

  // Calculate final reward with decay
  let baseReward = budgetPerUser * multiplier * decayFactor;

  // Floor at 0.1 KNEX minimum (maintain psychological value)
  baseReward = Math.max(baseReward, 0.1);

  // Round to 2 decimal places
  baseReward = Math.round(baseReward * 100) / 100;

  // Determine if vesting applies
  const requiresVesting = baseReward > VESTING_THRESHOLD;

  // Referral bonus is 5% of signup bonus (minimum 0.05 KNEX)
  const referralBonus = Math.max(baseReward * 0.05, 0.05);

  return {
    baseReward,
    tier,
    vested: requiresVesting,
    referralBonus: Math.round(referralBonus * 100) / 100,
    vestingSchedule: requiresVesting ? VESTING_SCHEDULE : null
  };
}

// Get current budget status
async function getBudgetStatus() {
  const totalCount = await getTotalWaitlistCount();

  // Calculate total KNEX distributed so far
  const allUsers = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    ProjectionExpression: 'knexEarned',
    FilterExpression: 'attribute_not_exists(reserved) OR reserved = :false',
    ExpressionAttributeValues: {
      ':false': false
    }
  }));

  const totalDistributed = (allUsers.Items || []).reduce((sum, user) => {
    return sum + (user.knexEarned || 0);
  }, 0);

  const budgetRemaining = TOTAL_REWARD_BUDGET - totalDistributed;

  return {
    totalBudget: TOTAL_REWARD_BUDGET,
    totalDistributed,
    budgetRemaining,
    totalUsers: totalCount,
    utilizationPercent: Math.round((totalDistributed / TOTAL_REWARD_BUDGET) * 100 * 100) / 100
  };
}

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

// Validate handle format (uses strict a-z, 0-9, dot only validation)
function isValidHandle(handle) {
  // Remove @ prefix for validation
  const withoutAt = handle.replace(/^@/, '');
  const validation = validateHandleFormat(withoutAt);
  return validation.valid;
}

// Normalize handle (lowercase, ensure @ prefix)
function normalizeHandle(handle) {
  let normalized = handle.trim().toLowerCase();

  // Remove @ prefix temporarily for validation
  const withoutAt = normalized.replace(/^@/, '');

  // Validate and get normalized version
  const validation = validateHandleFormat(withoutAt);

  // Return with @ prefix
  if (validation.valid && validation.normalized) {
    return '@' + validation.normalized;
  }

  // Fallback: just add @ if not present
  if (!normalized.startsWith('@')) {
    normalized = '@' + normalized;
  }
  return normalized;
}

// Hash IP address with SHA-256
function hashIP(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

// Get client IP from event
function getClientIP(event) {
  // Try various headers in order of preference
  const ip = event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
             event.headers?.['x-real-ip'] ||
             event.requestContext?.identity?.sourceIp ||
             event.requestContext?.http?.sourceIp ||
             '0.0.0.0';
  return ip;
}

// Check if IP has already signed up
async function isIPUsed(ipHash) {
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'ipHash = :ipHash',
    ExpressionAttributeValues: {
      ':ipHash': ipHash
    },
    Select: 'COUNT'
  }));
  return (result.Count || 0) > 0;
}

// Mask username for privacy - show first and last letter
function maskHandle(handle) {
  // Remove @ prefix
  const username = handle.replace('@', '');
  const domain = '@knexmail.com';

  if (username.length <= 2) {
    return `${username[0]}***${domain}`;
  }

  const first = username[0];
  const last = username[username.length - 1];
  const masked = `${first}***${last}${domain}`;

  return masked;
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

// Get current GENESIS count
async function getGenesisCount() {
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'genesisStatus = :true',
    ExpressionAttributeValues: {
      ':true': true
    },
    Select: 'COUNT'
  }));

  return result.Count || 0;
}

// Get total waitlist count (all real users, excluding reserved handles)
async function getTotalWaitlistCount() {
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'attribute_not_exists(reserved) OR reserved = :false',
    ExpressionAttributeValues: {
      ':false': false
    },
    Select: 'COUNT'
  }));

  return result.Count || 0;
}

// Check if GENESIS window is still open
async function isGenesisWindowOpen() {
  const count = await getGenesisCount();
  return count < GENESIS_LIMIT;
}

// Email Templates
function getWelcomeEmailHtml(handle, email, referralCode, referralLink) {
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
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 100%; background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%); border-radius: 16px; border: 1px solid rgba(0, 212, 255, 0.2); box-shadow: 0 8px 32px rgba(0, 212, 255, 0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0 0 10px; font-size: 42px; font-weight: 800; background: linear-gradient(135deg, #00d4ff, #00ff88); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: -1px;">
                KnexMail
              </h1>
              <p style="margin: 0; color: #00ff88; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Email That Pays You</p>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding: 20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 255, 136, 0.05); border-radius: 12px; border: 2px solid rgba(0, 255, 136, 0.2);">
                <tr>
                  <td style="padding: 30px; text-align: center;">
                    <p style="margin: 0 0 10px; font-size: 48px;">🎉</p>
                    <h2 style="margin: 0 0 10px; color: #ffffff; font-size: 28px; font-weight: 700;">Welcome to KnexMail, ${handle}!</h2>
                    <p style="margin: 0; color: #00ff88; font-size: 16px; font-weight: 600;">You're officially on the waitlist!</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- What Happens Next -->
          <tr>
            <td style="padding: 20px 40px;">
              <h3 style="margin: 0 0 15px; color: #00d4ff; font-size: 20px; font-weight: 700;">✨ What Happens Next?</h3>
              <p style="margin: 0 0 15px; color: #e0e0e0; font-size: 16px; line-height: 1.7;">
                Congratulations! You've successfully reserved <strong style="color: #00d4ff;">${handle}</strong> on KnexMail.
              </p>
              <p style="margin: 0 0 15px; color: #b0b0b0; font-size: 15px; line-height: 1.7;">
                When we launch, <strong style="color: #ffffff;">${email}</strong> will become:
              </p>
              <div style="background: rgba(0, 255, 136, 0.1); border-left: 4px solid #00ff88; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
                <p style="margin: 0; color: #00ff88; font-size: 14px; line-height: 1.6;">
                  <strong>💰 Dynamic Rewards Active!</strong> Your signup bonus adjusts based on real-time user growth. Early adopters get significantly more KNEX—join now to maximize your rewards before they decrease!
                </p>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right: 12px; font-size: 24px;">✉️</td>
                        <td style="color: #e0e0e0; font-size: 15px; line-height: 1.5;">Your encrypted email address</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right: 12px; font-size: 24px;">💰</td>
                        <td style="color: #e0e0e0; font-size: 15px; line-height: 1.5;">Your KnexCoin wallet address</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right: 12px; font-size: 24px;">🔑</td>
                        <td style="color: #e0e0e0; font-size: 15px; line-height: 1.5;">Your Web3 identity</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 136, 0, 0.1); border-left: 4px solid #ff8800; border-radius: 8px; margin-top: 20px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #ffaa00; font-size: 14px; line-height: 1.6;">
                      <strong>💡 Pro Tip:</strong> Your handle ${handle} will be permanently linked to your 24-word passphrase when we launch. Keep it safe!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Referral Section -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(0, 255, 136, 0.15)); border-radius: 16px; border: 2px solid rgba(0, 212, 255, 0.3); box-shadow: 0 4px 16px rgba(0, 212, 255, 0.2);">
                <tr>
                  <td style="padding: 30px;">
                    <h3 style="margin: 0 0 20px; color: #ffffff; font-size: 22px; font-weight: 700; text-align: center;">🚀 Want to Skip the Line?</h3>
                    <p style="margin: 0 0 25px; color: #e0e0e0; font-size: 15px; line-height: 1.6; text-align: center;">
                      Share your unique referral link and unlock exclusive rewards!
                    </p>

                    <!-- Referral Code -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 0, 0, 0.3); border-radius: 10px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <p style="margin: 0 0 8px; color: #00d4ff; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Your Referral Code</p>
                          <p style="margin: 0; color: #00ff88; font-size: 32px; font-weight: 800; font-family: 'Courier New', monospace; letter-spacing: 3px;">${referralCode}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Referral Link -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 0, 0, 0.3); border-radius: 10px;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0 0 8px; color: #00d4ff; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; text-align: center;">Your Referral Link</p>
                          <p style="margin: 0; color: #00ff88; font-size: 14px; word-break: break-all; text-align: center;">
                            <a href="${referralLink}" style="color: #00ff88; text-decoration: none; font-weight: 600;">${referralLink}</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Reward Tiers -->
          <tr>
            <td style="padding: 20px 40px;">
              <h3 style="margin: 0 0 20px; color: #ffffff; font-size: 20px; font-weight: 700; text-align: center;">🏆 Referral Reward Tiers</h3>

              <!-- Tier 1 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 68, 68, 0.1); border-left: 4px solid #ff4444; border-radius: 8px; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 40px; font-size: 28px;">🔥</td>
                        <td>
                          <p style="margin: 0 0 4px; color: #ffffff; font-size: 16px; font-weight: 700;">5 Referrals → Priority Access</p>
                          <p style="margin: 0; color: #b0b0b0; font-size: 13px;">Skip the waitlist and get early access!</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Tier 2 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 193, 7, 0.1); border-left: 4px solid #ffc107; border-radius: 8px; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 40px; font-size: 28px;">🏆</td>
                        <td>
                          <p style="margin: 0 0 4px; color: #ffffff; font-size: 16px; font-weight: 700;">10 Referrals → Founding Member</p>
                          <p style="margin: 0; color: #b0b0b0; font-size: 13px;">Exclusive badge and recognition</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Tier 3 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(156, 39, 176, 0.1); border-left: 4px solid #9c27b0; border-radius: 8px; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 40px; font-size: 28px;">💎</td>
                        <td>
                          <p style="margin: 0 0 4px; color: #ffffff; font-size: 16px; font-weight: 700;">25 Referrals → 1 Year Premium</p>
                          <p style="margin: 0; color: #b0b0b0; font-size: 13px;">Free premium tier for one full year</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Tier 4 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 215, 0, 0.15); border-left: 4px solid #ffd700; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 40px; font-size: 28px;">👑</td>
                        <td>
                          <p style="margin: 0 0 4px; color: #ffd700; font-size: 16px; font-weight: 700;">50 Referrals → Lifetime VIP</p>
                          <p style="margin: 0; color: #b0b0b0; font-size: 13px;">Lifetime premium access + VIP perks</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Track Progress CTA -->
          <tr>
            <td style="padding: 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background: linear-gradient(135deg, #00d4ff, #00ff88); border-radius: 10px; box-shadow: 0 4px 16px rgba(0, 212, 255, 0.3);">
                          <a href="https://knexmail.com/stats?email=${encodeURIComponent(email)}" style="display: inline-block; padding: 16px 40px; color: #000000; font-size: 16px; font-weight: 700; text-decoration: none; letter-spacing: 0.5px;">
                            📊 Track Your Progress
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Stay Connected -->
          <tr>
            <td style="padding: 20px 40px 30px;">
              <h3 style="margin: 0 0 15px; color: #ffffff; font-size: 18px; font-weight: 700; text-align: center;">🌐 Stay Connected</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 15px;">
                          <a href="https://knexmail.com" style="color: #00d4ff; text-decoration: none; font-size: 14px; font-weight: 600;">🌐 Website</a>
                        </td>
                        <td style="padding: 8px 15px;">
                          <a href="https://x.com/knexcoins" style="color: #00d4ff; text-decoration: none; font-size: 14px; font-weight: 600;">𝕏 Twitter</a>
                        </td>
                        <td style="padding: 8px 15px;">
                          <a href="https://discord.gg/rt4hJzkxWr" style="color: #00d4ff; text-decoration: none; font-size: 14px; font-weight: 600;">💬 Discord</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin: 15px 0 0; color: #888888; font-size: 13px; text-align: center; line-height: 1.6;">
                Questions? Just reply to this email – we'd love to hear from you!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 40px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0 0 10px; color: #b0b0b0; font-size: 14px; font-weight: 600;">
                Welcome to the revolution! 🚀
              </p>
              <p style="margin: 0 0 10px; color: #00ff88; font-size: 13px;">
                The KnexMail Team
              </p>
              <p style="margin: 0; color: #666666; font-size: 11px;">
                © 2026 KnexMail. All rights reserved.
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

function getTierMilestoneEmailHtml(handle, tier, referralCount) {
  const tierData = {
    5: { icon: '🔥', title: 'Priority Access Unlocked!', reward: 'Priority Access', color: '#ff4444', gradient: 'linear-gradient(135deg, #ff4444, #ff6b6b)' },
    10: { icon: '🏆', title: 'Founding Member Status!', reward: 'Founding Member Badge', color: '#ffc107', gradient: 'linear-gradient(135deg, #ffc107, #ffeb3b)' },
    25: { icon: '💎', title: '1 Year Premium Unlocked!', reward: '1 Year Premium Free', color: '#9c27b0', gradient: 'linear-gradient(135deg, #9c27b0, #ce93d8)' },
    50: { icon: '👑', title: 'Lifetime VIP Achieved!', reward: 'Lifetime VIP Status', color: '#ffd700', gradient: 'linear-gradient(135deg, #ffd700, #fff176)' }
  };

  const data = tierData[tier];
  if (!data) return '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Milestone Unlocked!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 100%; background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%); border-radius: 16px; border: 2px solid ${data.color}; box-shadow: 0 8px 32px rgba(0, 212, 255, 0.2);">

          <!-- Celebration Header -->
          <tr>
            <td style="padding: 50px 40px 30px; text-align: center; background: ${data.gradient}; border-radius: 14px 14px 0 0;">
              <p style="margin: 0 0 15px; font-size: 80px; line-height: 1;">${data.icon}</p>
              <h1 style="margin: 0 0 10px; color: #000000; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">
                ${data.title}
              </h1>
              <p style="margin: 0; color: rgba(0, 0, 0, 0.8); font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">
                Milestone Achieved
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 30px;">
              <p style="margin: 0 0 20px; color: #e0e0e0; font-size: 18px; line-height: 1.6; text-align: center;">
                Congratulations <strong style="color: #00d4ff;">${handle}</strong>! 🎊
              </p>
              <p style="margin: 0 0 30px; color: #b0b0b0; font-size: 16px; line-height: 1.7; text-align: center;">
                You've reached <strong style="color: #ffffff;">${referralCount} referrals</strong> and unlocked an incredible reward!
              </p>

              <!-- Reward Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(${tier === 50 ? '255, 215, 0' : tier === 25 ? '156, 39, 176' : tier === 10 ? '255, 193, 7' : '255, 68, 68'}, 0.15); border: 2px solid ${data.color}; border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 30px; text-align: center;">
                    <p style="margin: 0 0 10px; color: ${data.color}; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">Your Reward</p>
                    <p style="margin: 0 0 15px; font-size: 60px; line-height: 1;">${data.icon}</p>
                    <p style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; line-height: 1.3;">
                      ${data.reward}
                    </p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 255, 136, 0.1); border-left: 4px solid #00ff88; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; color: #00ff88; font-size: 15px; line-height: 1.6;">
                      <strong>✨ What This Means:</strong><br>
                      ${tier === 50 ? 'You\'re a true KnexMail legend! Enjoy lifetime premium access with all VIP perks forever. Thank you for believing in us from the start!' :
                        tier === 25 ? 'You\'ve earned a full year of premium features absolutely free. You\'re making a real impact!' :
                        tier === 10 ? 'You\'re officially a Founding Member! Your badge will showcase your early supporter status forever.' :
                        'You\'ll get Priority Access when we launch – no more waiting in line!'}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 30px; color: #b0b0b0; font-size: 15px; line-height: 1.6; text-align: center;">
                ${tier < 50 ? `Keep going! The next milestone is waiting for you. 🚀` : `You've unlocked everything! You're a KnexMail legend! 🌟`}
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background: linear-gradient(135deg, #00d4ff, #00ff88); border-radius: 10px; box-shadow: 0 4px 16px rgba(0, 212, 255, 0.3);">
                          <a href="https://knexmail.com" style="display: inline-block; padding: 16px 40px; color: #000000; font-size: 16px; font-weight: 700; text-decoration: none;">
                            🏆 View Leaderboard
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
              <p style="margin: 0 0 10px; color: #b0b0b0; font-size: 14px; font-weight: 600;">
                You're amazing! Keep spreading the word! 💚
              </p>
              <p style="margin: 0 0 5px; color: #00ff88; font-size: 13px;">
                The KnexMail Team
              </p>
              <p style="margin: 0; color: #666666; font-size: 11px;">
                © 2026 KnexMail. All rights reserved.
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

// GENESIS Welcome Email Template
function getGenesisWelcomeEmailHtml(handle, genesisNumber, referralCode, referralLink) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🔥 YOU'RE A GENESIS MEMBER!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%); min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background: rgba(10, 10, 10, 0.95); border: 2px solid #00FF88; border-radius: 16px; box-shadow: 0 0 40px rgba(0, 255, 136, 0.3);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #00FF88 0%, #00D4FF 100%); border-radius: 14px 14px 0 0;">
              <h1 style="margin: 0; color: #000000; font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">
                🔥 TODAY IS YOUR LUCKY DAY! 🔥
              </h1>
            </td>
          </tr>

          <!-- GENESIS Badge -->
          <tr>
            <td style="padding: 30px 40px; text-align: center;">
              <div style="display: inline-block; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 20px 40px; border-radius: 50px; box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4);">
                <p style="margin: 0; color: #000000; font-size: 24px; font-weight: 900;">
                  👑 GENESIS MEMBER #${genesisNumber}
                </p>
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px; color: #FFFFFF; font-size: 18px; font-weight: 600; text-align: center;">
                Welcome to KnexMail, <span style="color: #00FF88;">${handle}</span>!
              </p>

              <p style="margin: 0 0 30px; color: #CCCCCC; font-size: 16px; line-height: 1.6; text-align: center;">
                You just became one of the first 100 people EVER to join KnexMail. This is HUGE! 🚀
              </p>

              <!-- Rewards Box -->
              <div style="background: rgba(0, 255, 136, 0.1); border: 2px solid #00FF88; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                <h2 style="margin: 0 0 20px; color: #00FF88; font-size: 20px; font-weight: 700; text-align: center;">
                  🎁 YOUR GENESIS REWARDS
                </h2>

                <div style="margin-bottom: 15px;">
                  <p style="margin: 0 0 5px; color: #FFFFFF; font-size: 16px; font-weight: 600;">
                    ✓ Instant Reward: 10,000 KNEX
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 14px;">
                    (That's 1,000x the normal signup bonus!)
                  </p>
                </div>

                <div style="margin-bottom: 15px;">
                  <p style="margin: 0 0 5px; color: #FFFFFF; font-size: 16px; font-weight: 600;">
                    ✓ GENESIS Badge: Forever
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 14px;">
                    Exclusive status that can NEVER be earned again
                  </p>
                </div>

                <div>
                  <p style="margin: 0 0 5px; color: #FFFFFF; font-size: 16px; font-weight: 600;">
                    ✓ Super Referral Power: 5x 10,000 KNEX
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 14px;">
                    Your first 5 referrals ALSO get 10,000 KNEX each!
                  </p>
                </div>
              </div>

              <!-- Total Potential -->
              <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center;">
                <p style="margin: 0 0 5px; color: #000000; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                  Total Potential Earnings
                </p>
                <p style="margin: 0; color: #000000; font-size: 32px; font-weight: 900;">
                  60,000 KNEX
                </p>
                <p style="margin: 5px 0 0; color: #000000; font-size: 12px;">
                  (10K signup + 5 referrals × 10K each)
                </p>
              </div>

              <!-- Referral Link -->
              <div style="background: rgba(0, 212, 255, 0.1); border: 2px solid #00D4FF; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 15px; color: #00D4FF; font-size: 18px; font-weight: 700; text-align: center;">
                  🎯 YOUR SUPER REFERRAL LINK
                </h3>

                <p style="margin: 0 0 15px; color: #CCCCCC; font-size: 14px; line-height: 1.6; text-align: center;">
                  Share this link with friends. The first 5 people who sign up get 10,000 KNEX too!
                </p>

                <div style="background: rgba(0, 0, 0, 0.5); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                  <p style="margin: 0; color: #00FF88; font-size: 14px; font-family: monospace; word-break: break-all; text-align: center;">
                    ${referralLink}
                  </p>
                </div>

                <div style="text-align: center;">
                  <p style="margin: 0 0 10px; color: #FFFFFF; font-size: 16px; font-weight: 600;">
                    Referral Code: <span style="color: #00D4FF;">${referralCode}</span>
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    Super Referrals Used: 0 / 5
                  </p>
                </div>
              </div>

              <!-- Important Note -->
              <div style="background: rgba(255, 215, 0, 0.1); border-left: 4px solid #FFD700; padding: 15px; margin-bottom: 30px;">
                <p style="margin: 0 0 10px; color: #FFD700; font-size: 14px; font-weight: 600;">
                  ⚡ IMPORTANT: Window Closing Soon!
                </p>
                <p style="margin: 0; color: #CCCCCC; font-size: 13px; line-height: 1.5;">
                  After 100 signups, the waitlist goes invite-only. Your friends will NEED a referral code to join. Share your link NOW while the window is still open!
                </p>
              </div>

              <!-- After 5 Referrals -->
              <div style="text-align: center; margin-bottom: 20px;">
                <p style="margin: 0 0 5px; color: #999999; font-size: 13px;">
                  After your 5 super referrals:
                </p>
                <p style="margin: 0; color: #CCCCCC; font-size: 14px;">
                  Continue earning <span style="color: #00FF88; font-weight: 600;">5 KNEX</span> per referral (unlimited)
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0 0 10px; color: #00FF88; font-size: 16px; font-weight: 700;">
                Welcome to the future of email 🚀
              </p>
              <p style="margin: 0; color: #666666; font-size: 12px;">
                © 2026 KnexMail. All rights reserved.
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

  // Route: GET /genesis-status - Get GENESIS window status
  if (event.httpMethod === 'GET' && path.includes('/genesis-status')) {
    return handleGetGenesisStatus(event);
  }

  // Route: GET /check - Check handle availability
  if (event.httpMethod === 'GET' && path.includes('/check')) {
    return handleCheckAvailability(event);
  }

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

// GET /genesis-status - Get GENESIS window status
async function handleGetGenesisStatus(event) {
  try {
    const genesisCount = await getGenesisCount();
    const totalCount = await getTotalWaitlistCount();
    const isOpen = genesisCount < GENESIS_LIMIT;
    const spotsLeft = Math.max(0, GENESIS_LIMIT - genesisCount);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        genesisCount,
        genesisLimit: GENESIS_LIMIT,
        totalWaitlistCount: totalCount,
        isOpen,
        spotsLeft,
        windowClosed: !isOpen
      })
    };

  } catch (error) {
    console.error('Genesis status error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Unable to get GENESIS status' })
    };
  }
}

// GET /check?handle=@username - Check if handle is available
async function handleCheckAvailability(event) {
  try {
    let handle = event.queryStringParameters?.handle || '';
    handle = normalizeHandle(handle);

    if (!handle || !isValidHandle(handle)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid handle format', available: false })
      };
    }

    // Check if handle exists in database
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { handle }
    }));

    const available = !result.Item;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        handle,
        available
      })
    };

  } catch (error) {
    console.error('Check availability error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Unable to check availability', available: false })
    };
  }
}

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
    // Always limit to top 10
    const limit = 10;

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
        handle: maskHandle(item.handle), // Mask for privacy
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

    // Validation - check format first
    const withoutAt = handle.replace(/^@/, '');
    const validation = validateHandleFormat(withoutAt);

    if (!validation.valid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: validation.error || 'Invalid handle format',
          suggestion: validation.error ? getSuggestion(withoutAt) : null
        })
      };
    }

    // Check if handle is reserved
    if (isReserved(withoutAt)) {
      const reason = getReservationReason(withoutAt);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Handle is not available',
          reason: reason,
          suggestion: getSuggestion(withoutAt)
        })
      };
    }

    // Validate emoji handle rules (max 3 emojis)
    const emojiValidation = validateEmojiHandle(withoutAt);
    if (!emojiValidation.valid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: emojiValidation.error,
          emojiCount: emojiValidation.emojiCount
        })
      };
    }

    // Get emoji translation for display
    const emojiTranslation = translateToEmoji(withoutAt);

    if (!email || !isValidEmail(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email address' })
      };
    }

    // Get client IP and hash it
    const clientIP = getClientIP(event);
    const ipHash = hashIP(clientIP);

    // Check IP usage (1 signup per IP)
    const ipAlreadyUsed = await isIPUsed(ipHash);
    if (ipAlreadyUsed) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Only one signup allowed per IP address. If you already signed up, check your email for your referral code.'
        })
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

    // Check if email is already used (scan for duplicate emails)
    const emailCheck = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'email = :email AND #reserved <> :true',
      ExpressionAttributeNames: {
        '#reserved': 'reserved'
      },
      ExpressionAttributeValues: {
        ':email': email,
        ':true': true
      },
      Limit: 1
    }));

    if (emailCheck.Items && emailCheck.Items.length > 0) {
      const existingHandle = emailCheck.Items[0].handle;
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: `This email is already registered with handle ${existingHandle}. Each email can only reserve one handle.`
        })
      };
    }

    // Check GENESIS window status
    const genesisWindowOpen = await isGenesisWindowOpen();
    const genesisCount = await getGenesisCount();

    // If window closed and no referral code, reject
    if (!genesisWindowOpen && !referral) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'GENESIS window closed. Waitlist is now invite-only. You need a referral code to join.',
          genesisWindowClosed: true
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

    // Get current budget status for dynamic reward calculation
    const budgetStatus = await getBudgetStatus();
    const totalUsers = budgetStatus.totalUsers;
    const nextUserNumber = totalUsers + 1;

    // Calculate dynamic reward for this user
    const rewardCalc = calculateDynamicReward(
      nextUserNumber,
      totalUsers,
      budgetStatus.budgetRemaining
    );

    // Validate referral code if provided
    let referredBy = null;
    let referrerToNotify = null;
    let isGenesisReferral = false;
    let newUserSignupBonus = rewardCalc.baseReward;
    let referrerBonus = rewardCalc.referralBonus;

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

          // Check if referrer is GENESIS and has super referrals left
          const isReferrerGenesis = referrer.genesisStatus === true;
          const referrerGenesisCount = referrer.genesisReferralCount || 0;

          if (isReferrerGenesis && referrerGenesisCount < GENESIS_SUPER_REFERRAL_LIMIT) {
            // This is a super referral!
            isGenesisReferral = true;
            newUserSignupBonus = GENESIS_SUPER_REFERRAL_BONUS;
            referrerBonus = GENESIS_SUPER_REFERRAL_BONUS;

            // Increment referrer's GENESIS referral count
            await docClient.send(new UpdateCommand({
              TableName: TABLE_NAME,
              Key: { handle: referrer.handle },
              UpdateExpression: 'SET genesisReferralCount = if_not_exists(genesisReferralCount, :zero) + :inc, referralCount = if_not_exists(referralCount, :zero) + :inc, knexEarned = if_not_exists(knexEarned, :zero) + :bonus',
              ExpressionAttributeValues: {
                ':inc': 1,
                ':zero': 0,
                ':bonus': GENESIS_SUPER_REFERRAL_BONUS
              }
            }));
          } else {
            // Dynamic referral bonus (uses calculated referrerBonus)
            await docClient.send(new UpdateCommand({
              TableName: TABLE_NAME,
              Key: { handle: referrer.handle },
              UpdateExpression: 'SET referralCount = if_not_exists(referralCount, :zero) + :inc, knexEarned = if_not_exists(knexEarned, :zero) + :bonus',
              ExpressionAttributeValues: {
                ':inc': 1,
                ':zero': 0,
                ':bonus': referrerBonus
              }
            }));
          }
        }
      }
    }

    // Determine if this user is GENESIS
    const isGenesisMember = genesisWindowOpen;
    const genesisNumber = isGenesisMember ? genesisCount + 1 : null;

    // Create new waitlist entry with vesting data
    const newUser = {
      handle,
      email,
      referralCode,
      referredBy,
      referralCount: 0,
      genesisStatus: isGenesisMember,
      genesisNumber: genesisNumber,
      genesisReferralCount: 0,
      knexEarned: newUserSignupBonus,
      knexVested: rewardCalc.vested,
      knexImmediate: rewardCalc.vested ? Math.round(newUserSignupBonus * VESTING_SCHEDULE.immediate * 100) / 100 : newUserSignupBonus,
      rewardTier: rewardCalc.tier,
      userNumber: nextUserNumber,
      superReferralGiven: isGenesisReferral,
      ipHash, // SHA-256 hash of IP address
      createdAt: new Date().toISOString(),
      vestingStartDate: rewardCalc.vested ? new Date().toISOString() : null,
      // Emoji translation fields
      displayHandle: emojiTranslation.emoji || handle,
      isEmojiHandle: emojiTranslation.isEmojiHandle || false,
      emojiCount: emojiTranslation.emojiCount || 0
      // EMAIL VERIFICATION (commented out for now - uncomment when ready)
      // emailVerified: false,
      // verificationToken: crypto.randomBytes(32).toString('hex'),
      // verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: newUser
    }));

    // Send appropriate welcome email
    const referralLink = `https://knexmail.com?ref=${referralCode}`;

    if (isGenesisMember) {
      // Send GENESIS welcome email
      await sendEmail(
        email,
        `🔥 YOU'RE GENESIS MEMBER #${genesisNumber}!`,
        getGenesisWelcomeEmailHtml(handle, genesisNumber, referralCode, referralLink)
      );
    } else {
      // Send regular welcome email
      await sendEmail(
        email,
        `🎉 Welcome to KnexMail, ${handle}!`,
        getWelcomeEmailHtml(handle, email, referralCode, referralLink)
      );
    }

    // Send notification to referrer if applicable
    if (referrerToNotify && referrerToNotify.email && !referrerToNotify.reserved) {
      const oldCount = referrerToNotify.referralCount || 0;
      const newCount = oldCount + 1;

      // Send referral notification
      await sendEmail(
        referrerToNotify.email,
        `🎉 New Referral! You now have ${newCount} ${newCount === 1 ? 'referral' : 'referrals'}`,
        getReferralNotificationHtml(referrerToNotify.handle, newCount, referrerToNotify.referralCode)
      );

      // Check if they hit a tier milestone (5, 10, 25, 50)
      const milestones = [5, 10, 25, 50];
      const hitMilestone = milestones.find(m => newCount === m);

      if (hitMilestone) {
        // Send tier milestone email
        const tierData = REWARD_TIERS.find(t => t.count === hitMilestone);
        await sendEmail(
          referrerToNotify.email,
          `${tierData.icon} Milestone Unlocked: ${tierData.reward}!`,
          getTierMilestoneEmailHtml(referrerToNotify.handle, hitMilestone, newCount)
        );
      }
    }

    // Return success with referral code, GENESIS info, tier info, and vesting details
    const tierProgress = getTierProgress(0);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        handle,
        displayHandle: emojiTranslation.emoji || handle,
        email: `${handle}@knexmail.com`,
        displayEmail: emojiTranslation.emoji ? `${emojiTranslation.emoji}@knexmail.com` : `${handle}@knexmail.com`,
        isEmojiHandle: emojiTranslation.isEmojiHandle || false,
        emojiCount: emojiTranslation.emojiCount || 0,
        referralCode,
        referralLink: `https://knexmail.com?ref=${referralCode}`,
        referralCount: 0,
        genesisStatus: isGenesisMember,
        genesisNumber: genesisNumber,
        userNumber: nextUserNumber,
        rewardTier: rewardCalc.tier,
        knexEarned: newUserSignupBonus,
        knexImmediate: rewardCalc.vested ? Math.round(newUserSignupBonus * VESTING_SCHEDULE.immediate * 100) / 100 : newUserSignupBonus,
        vested: rewardCalc.vested,
        vestingSchedule: rewardCalc.vestingSchedule,
        superReferralGiven: isGenesisReferral,
        tierProgress,
        budgetStatus: {
          totalBudget: budgetStatus.totalBudget,
          budgetRemaining: budgetStatus.budgetRemaining,
          utilizationPercent: budgetStatus.utilizationPercent
        },
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
