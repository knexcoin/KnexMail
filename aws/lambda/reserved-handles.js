/**
 * KnexMail Reserved Handles
 *
 * This module contains all reserved handles that cannot be registered by users.
 * Handles are reserved for:
 * - Official KnexMail communication channels
 * - Brand protection
 * - Preventing abuse, scams, and offensive content
 * - Child safety
 *
 * @module reserved-handles
 * @version 1.0.0
 * @updated 2026-02-04
 */

// Official KnexMail Communication Handles
const OFFICIAL_HANDLES = [
  // System & Automated
  'admin', 'noreply', 'no-reply', 'donotreply', 'do-not-reply',
  'system', 'mailer', 'postmaster', 'mail', 'automated',
  'notifications', 'notify', 'alerts', 'bot', 'daemon',

  // Support & Customer Service
  'support', 'help', 'helpdesk', 'service', 'customerservice',
  'customer-service', 'customercare', 'care', 'contact', 'info',
  'feedback', 'suggestions', 'complaints',

  // Security & Trust
  'security', 'abuse', 'trust', 'safety', 'fraud',
  'antifraud', 'compliance', 'legal', 'privacy', 'dmca',
  'copyright', 'report', 'phishing', 'spam', 'antispam',

  // Marketing & Communications
  'marketing', 'news', 'newsletter', 'updates', 'announcements',
  'promo', 'promotions', 'offers', 'deals', 'sales', 'campaigns',

  // Billing & Finance
  'billing', 'payments', 'invoice', 'invoices', 'receipts',
  'finance', 'accounting', 'refunds', 'subscriptions',

  // Technical & Development
  'webmaster', 'hostmaster', 'devops', 'dev', 'developer',
  'developers', 'engineering', 'api', 'tech', 'technical',
  'status', 'monitoring',

  // Corporate & Executive
  'ceo', 'cto', 'cfo', 'coo', 'cmo', 'founder', 'founders',
  'executive', 'board', 'investors', 'press', 'media', 'pr',

  // Community & Social
  'community', 'social', 'events', 'moderator', 'moderators',
  'ambassador', 'ambassadors', 'partners', 'partnership'
];

// Brand Protection
const BRAND_HANDLES = [
  // KnexMail Variations
  'knexmail', 'knex-mail', 'knex', 'knexcoin', 'knex-coin',
  'knexpay', 'knex-pay', 'knexwallet', 'knex-wallet',
  'official', 'verified', 'team', 'staff',

  // Common Typos
  'knexmial', 'knexemail', 'knexxmail', 'knexmaail',
  'knexmal', 'knexmeil', 'kenxmail', 'knexmai'
];

// Generic/High-Value Handles
const GENERIC_HANDLES = [
  // Common
  'root', 'user', 'test', 'demo', 'example', 'sample',
  'guest', 'anonymous', 'anon', 'default', 'null',
  'undefined', 'unknown',

  // Single letters (a-z)
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',

  // Single numbers (0-9)
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',

  // Common words
  'email', 'inbox', 'message', 'messages', 'account',
  'profile', 'username', 'name'
];

// Profanity & Offensive Content
const PROFANITY_HANDLES = [
  // Explicit language
  'fuck', 'shit', 'ass', 'asshole', 'bitch', 'bastard',
  'damn', 'hell', 'cunt', 'dick', 'cock', 'pussy',
  'whore', 'slut', 'piss', 'crap', 'douche',

  // Slurs (strongly offensive)
  'fag', 'faggot', 'nigger', 'nigga', 'kike', 'chink',
  'spic', 'retard', 'retarded', 'moron', 'idiot',

  // Leetspeak variations
  'fuk', 'fck', 'fvck', 'phuck', 'sh1t', 'a55', 'a$$',
  'b1tch', 'd1ck', 'c0ck', 'pu$$y', 'wh0re', '5lut',
  'n1gger', 'n1gga', 'f4g',

  // Sexual content
  'sex', 'porn', 'porno', 'xxx', 'nude', 'nudes', 'naked',
  'anal', 'oral', 'blowjob', 'handjob', 'masturbate',
  'cum', 'jizz', 'orgasm', 'horny', 'erotic', 'fetish',
  'bdsm', 'kinky',

  // Hate speech
  'nazi', 'hitler', 'racist', 'racism', 'sexist', 'sexism',
  'homophobe', 'homophobic', 'transphobe', 'hate', 'kkk',
  'whitesupremacy', 'supremacist',

  // Violent content
  'kill', 'murder', 'rape', 'torture', 'violence', 'death',
  'suicide', 'terrorist', 'terror', 'bomb', 'shooter', 'massacre'
];

// Scam & Fraud Prevention
const SCAM_HANDLES = [
  // Company impersonation
  'google', 'microsoft', 'apple', 'amazon', 'facebook', 'meta',
  'twitter', 'instagram', 'paypal', 'venmo', 'cashapp',
  'coinbase', 'binance', 'kraken', 'blockchain', 'bitcoin',
  'ethereum', 'crypto', 'irs', 'fbi', 'government', 'federal',
  'treasury', 'bank',

  // Scam keywords
  'winner', 'prizes', 'lottery', 'jackpot', 'claim', 'refund',
  'verify', 'verification', 'confirm', 'suspend', 'suspended',
  'locked', 'unlock', 'restore', 'recovery', 'reset',
  'urgent', 'action-required', 'immediate', 'expires',
  'limited-time',

  // Financial scams
  'free-money', 'freemoney', 'cash-prize', 'inheritance',
  'millionaire', 'investment', 'trader', 'trading', 'forex',
  'profit', 'guaranteed', 'roi', 'double-your-money',
  'ponzi', 'pyramid', 'mlm'
];

// Illegal Activity
const ILLEGAL_HANDLES = [
  // Drugs
  'drugs', 'cocaine', 'heroin', 'meth', 'methamphetamine',
  'weed', 'marijuana', 'cannabis', 'pills', 'pharmacy',
  'prescription', 'opioid', 'fentanyl', 'dealer', 'dealing',

  // Weapons
  'guns', 'firearms', 'weapons', 'ammunition', 'ammo', 'explosives',

  // Illegal services
  'hacker', 'hacking', 'cracker', 'exploit', 'malware',
  'virus', 'ransomware', 'darknet', 'darkweb', 'hitman',
  'assassin', 'counterfeit', 'fake-id'
];

// Child Safety
const CHILD_SAFETY_HANDLES = [
  // CSAM prevention
  'child', 'children', 'kid', 'kids', 'minor', 'minors',
  'teen', 'teens', 'teenager', 'underage', 'loli', 'lolita',
  'pedo', 'pedophile', 'cp', 'preteen', 'youngster',
  'schoolgirl', 'schoolboy', 'jailbait'
];

// Religious & Political (Reserved to prevent conflict/impersonation)
const SENSITIVE_HANDLES = [
  // Religious
  'god', 'jesus', 'christ', 'allah', 'muhammad', 'prophet',
  'buddha', 'religion',

  // Political
  'president', 'congress', 'senate', 'democrat', 'republican',
  'liberal', 'conservative', 'politics', 'election', 'vote', 'voting'
];

// Combine all reserved handles into one Set
const RESERVED_HANDLES = new Set([
  ...OFFICIAL_HANDLES,
  ...BRAND_HANDLES,
  ...GENERIC_HANDLES,
  ...PROFANITY_HANDLES,
  ...SCAM_HANDLES,
  ...ILLEGAL_HANDLES,
  ...CHILD_SAFETY_HANDLES,
  ...SENSITIVE_HANDLES
]);

/**
 * Check if a handle is reserved
 * @param {string} handle - The handle to check (without @ symbol)
 * @returns {boolean} True if reserved, false otherwise
 */
function isReserved(handle) {
  if (!handle || typeof handle !== 'string') {
    return true; // Invalid handles are considered reserved
  }

  // Normalize: lowercase and remove @ symbol if present
  const normalized = handle.toLowerCase().replace(/^@/, '');

  // Check exact match
  if (RESERVED_HANDLES.has(normalized)) {
    return true;
  }

  // Check wildcard patterns
  if (isWildcardMatch(normalized)) {
    return true;
  }

  // Check for suspicious patterns
  if (isSuspiciousPattern(normalized)) {
    return true;
  }

  return false;
}

/**
 * Check wildcard patterns for reserved prefixes/suffixes
 * @param {string} handle - Normalized handle
 * @returns {boolean} True if matches wildcard pattern
 */
function isWildcardMatch(handle) {
  // Anything starting with 'knex'
  if (handle.startsWith('knex')) {
    return true;
  }

  // Anything containing 'admin'
  if (handle.includes('admin')) {
    return true;
  }

  // Anything starting with 'support'
  if (handle.startsWith('support')) {
    return true;
  }

  // Anything ending with 'official'
  if (handle.endsWith('official')) {
    return true;
  }

  // Anything containing 'verify' or 'verification'
  if (handle.includes('verify') || handle.includes('verification')) {
    return true;
  }

  return false;
}

/**
 * Validate handle format (STRICT: a-z, 0-9, dot only)
 * @param {string} handle - The handle to validate (without @ symbol)
 * @returns {object} { valid: boolean, normalized: string|null, error: string|null }
 */
function validateHandleFormat(handle) {
  if (!handle || typeof handle !== 'string') {
    return { valid: false, normalized: null, error: 'Handle is required' };
  }

  // Normalize: lowercase and trim
  const normalized = handle.toLowerCase().trim();

  // Length check (2-64 chars)
  if (normalized.length < 2) {
    return { valid: false, normalized: null, error: 'Handle must be at least 2 characters' };
  }
  if (normalized.length > 64) {
    return { valid: false, normalized: null, error: 'Handle must be 64 characters or less' };
  }

  // Must start with alphanumeric
  if (!/^[a-z0-9]/.test(normalized)) {
    return { valid: false, normalized: null, error: 'Handle must start with a letter or number' };
  }

  // Must end with alphanumeric
  if (!/[a-z0-9]$/.test(normalized)) {
    return { valid: false, normalized: null, error: 'Handle must end with a letter or number' };
  }

  // Only allow a-z, 0-9, and dot
  if (!/^[a-z0-9.]+$/.test(normalized)) {
    return { valid: false, normalized: null, error: 'Handle can only contain lowercase letters, numbers, and dots' };
  }

  // No consecutive dots
  if (/\.{2,}/.test(normalized)) {
    return { valid: false, normalized: null, error: 'Handle cannot contain consecutive dots (..)' };
  }

  // Limit dots to max 3
  const dotCount = (normalized.match(/\./g) || []).length;
  if (dotCount > 3) {
    return { valid: false, normalized: null, error: 'Handle cannot contain more than 3 dots' };
  }

  // Block IP address patterns
  if (/^\d+\.\d+\.\d+\.\d+$/.test(normalized)) {
    return { valid: false, normalized: null, error: 'Handle cannot look like an IP address' };
  }

  // Block common domain names
  const blockedDomains = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'icloud.com', 'protonmail.com', 'knexmail.com', 'mail.com',
    'aol.com', 'zoho.com', 'fastmail.com', 'hey.com'
  ];
  if (blockedDomains.includes(normalized)) {
    return { valid: false, normalized: null, error: 'This handle is reserved' };
  }

  return { valid: true, normalized, error: null };
}

/**
 * Check for suspicious patterns (homographs, special chars, etc.)
 * @param {string} handle - Normalized handle
 * @returns {boolean} True if suspicious
 */
function isSuspiciousPattern(handle) {
  // Already validated by validateHandleFormat, but keep for backwards compat

  // Only numbers
  if (/^\d+$/.test(handle)) {
    return true;
  }

  // Consecutive dots
  if (/\.{2,}/.test(handle)) {
    return true;
  }

  // Starts or ends with dot
  if (/^\.|\.$/.test(handle)) {
    return true;
  }

  // Contains @ symbol (looks like email)
  if (handle.includes('@')) {
    return true;
  }

  // Too short (< 2 chars)
  if (handle.length < 2) {
    return true;
  }

  // Contains anything other than a-z, 0-9, dot
  if (!/^[a-z0-9.]+$/.test(handle)) {
    return true;
  }

  return false;
}

/**
 * Get suggestion for reserved handle
 * @param {string} handle - The reserved handle
 * @returns {string} Suggested alternative
 */
function getSuggestion(handle) {
  const normalized = handle.toLowerCase().replace(/^@/, '');

  // If it's a common word, suggest adding a number
  if (GENERIC_HANDLES.includes(normalized)) {
    const randomNum = Math.floor(Math.random() * 9999);
    return `${normalized}${randomNum}`;
  }

  // If it starts with 'knex', suggest variation
  if (normalized.startsWith('knex')) {
    return `${normalized}${Math.floor(Math.random() * 999)}`;
  }

  // Default: add random suffix (dots only, no underscores)
  return `${normalized}.${Math.floor(Math.random() * 9999)}`;
}

/**
 * Get total count of reserved handles
 * @returns {number} Total reserved handles
 */
function getReservedCount() {
  return RESERVED_HANDLES.size;
}

/**
 * Get reason why handle is reserved
 * @param {string} handle - The handle to check
 * @returns {string|null} Reason or null if not reserved
 */
function getReservationReason(handle) {
  const normalized = handle.toLowerCase().replace(/^@/, '');

  if (OFFICIAL_HANDLES.includes(normalized)) {
    return 'Reserved for official KnexMail communication';
  }
  if (BRAND_HANDLES.includes(normalized)) {
    return 'Reserved for brand protection';
  }
  if (GENERIC_HANDLES.includes(normalized)) {
    return 'Reserved for system use';
  }
  if (PROFANITY_HANDLES.includes(normalized)) {
    return 'Offensive or inappropriate content';
  }
  if (SCAM_HANDLES.includes(normalized)) {
    return 'Scam/fraud prevention';
  }
  if (ILLEGAL_HANDLES.includes(normalized)) {
    return 'Illegal activity prevention';
  }
  if (CHILD_SAFETY_HANDLES.includes(normalized)) {
    return 'Child safety protection';
  }
  if (SENSITIVE_HANDLES.includes(normalized)) {
    return 'Reserved to prevent conflict';
  }
  if (isWildcardMatch(normalized)) {
    return 'Matches reserved pattern';
  }
  if (isSuspiciousPattern(normalized)) {
    return 'Suspicious pattern detected';
  }

  return null;
}

// Export for use in Lambda
module.exports = {
  RESERVED_HANDLES,
  isReserved,
  getSuggestion,
  getReservedCount,
  getReservationReason,
  validateHandleFormat  // Export new validation function
};

// For debugging
if (require.main === module) {
  console.log(`Total reserved handles: ${getReservedCount()}`);
  console.log('\nTesting some handles:');

  const testHandles = [
    'admin',
    'john',
    'knexmail',
    'fuck',
    'test123',
    'support-team',
    'normaluser'
  ];

  testHandles.forEach(handle => {
    const reserved = isReserved(handle);
    const reason = getReservationReason(handle);
    console.log(`\n@${handle}:`);
    console.log(`  Reserved: ${reserved}`);
    if (reserved) {
      console.log(`  Reason: ${reason}`);
      console.log(`  Suggestion: @${getSuggestion(handle)}`);
    }
  });
}
