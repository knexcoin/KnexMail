// Script to reserve handles in DynamoDB
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'knexmail-waitlist';

// All reserved handles
const RESERVED_HANDLES = [
  // Official & System (25)
  'admin', 'support', 'help', 'team', 'knexmail', 'knexcoin', 'knexpay', 'official',
  'system', 'noreply', 'contact', 'info', 'security', 'abuse', 'postmaster',
  'webmaster', 'mailer-daemon', 'no-reply', 'donotreply', 'notifications',
  'alerts', 'newsletter', 'updates', 'announcements', 'status',

  // Founder / Company (15)
  'david', 'systemthreat', 'founder', 'ceo', 'cto', 'cfo', 'coo', 'staff',
  'employee', 'intern', 'hr', 'legal', 'compliance', 'finance', 'operations',

  // Features & Services (20)
  'api', 'dev', 'beta', 'alpha', 'test', 'testing', 'staging', 'prod',
  'production', 'sandbox', 'demo', 'trial', 'billing', 'payments', 'sales',
  'marketing', 'press', 'media', 'partners', 'affiliates',

  // Common Words (25)
  'mail', 'email', 'inbox', 'account', 'user', 'profile', 'settings', 'login',
  'signup', 'register', 'password', 'reset', 'verify', 'confirm', 'welcome',
  'home', 'dashboard', 'app', 'mobile', 'web', 'desktop', 'android', 'ios',
  'windows', 'mac',

  // Religious & Political (20)
  'god', 'jesus', 'christ', 'allah', 'muhammad', 'buddha', 'satan', 'devil',
  'trump', 'biden', 'obama', 'clinton', 'putin', 'hitler', 'nazi', 'isis',
  'terrorist', 'hamas', 'israel', 'palestine',

  // Celebrities & Famous (15)
  'elon', 'musk', 'bezos', 'zuckerberg', 'gates', 'jobs', 'wozniak', 'satoshi',
  'nakamoto', 'vitalik', 'buterin', 'dorsey', 'sama', 'altman', 'openai',

  // Crypto & Finance (20)
  'bitcoin', 'ethereum', 'crypto', 'blockchain', 'wallet', 'token', 'nft',
  'defi', 'web3', 'solana', 'cardano', 'ripple', 'doge', 'shiba', 'binance',
  'coinbase', 'ftx', 'bank', 'money', 'cash',

  // Brands & Trademarks (15)
  'google', 'apple', 'microsoft', 'amazon', 'facebook', 'meta', 'twitter',
  'instagram', 'tiktok', 'snapchat', 'discord', 'telegram', 'whatsapp',
  'signal', 'protonmail',

  // Vulgar & Abuse Prevention (15)
  'fuck', 'shit', 'ass', 'bitch', 'dick', 'pussy', 'cock', 'cunt', 'nigger',
  'faggot', 'porn', 'sex', 'xxx', 'nude', 'naked',

  // Technical Reserved (15)
  'root', 'administrator', 'localhost', 'null', 'undefined', 'void', 'error',
  '404', '500', 'config', 'debug', 'log', 'temp', 'tmp', 'cache',

  // Single Letters (26)
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',

  // Single Numbers (10)
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
];

async function reserveHandles() {
  console.log(`Reserving ${RESERVED_HANDLES.length} handles...`);

  let success = 0;
  let failed = 0;

  for (const handle of RESERVED_HANDLES) {
    const normalizedHandle = '@' + handle.toLowerCase();

    try {
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          handle: normalizedHandle,
          email: 'reserved@knexmail.com',
          referralCode: `RESERVED-${handle.toUpperCase()}`,
          referredBy: null,
          referralCount: 0,
          reserved: true,
          createdAt: new Date().toISOString()
        },
        ConditionExpression: 'attribute_not_exists(handle)'
      }));

      console.log(`✓ Reserved: ${normalizedHandle}`);
      success++;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        console.log(`- Already exists: ${normalizedHandle}`);
      } else {
        console.error(`✗ Failed: ${normalizedHandle} - ${error.message}`);
        failed++;
      }
    }
  }

  console.log(`\nDone! Reserved: ${success}, Failed: ${failed}`);
}

reserveHandles();
