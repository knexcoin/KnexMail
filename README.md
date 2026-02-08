# KnexMail

Encrypted email service with emoji-to-ASCII handle system, built on AWS serverless infrastructure.

**Live**: [knexmail.com](https://knexmail.com)

---

## Handle System

KnexMail uses a unique emoji-to-ASCII mapping for human-friendly email addresses:

| Feature | Detail |
|---------|--------|
| **Format** | Lowercase ASCII (`a-z`, `0-9`, `.`) mapped to emoji display |
| **Combinations** | 6.4 billion possible handles (vs ~100K traditional) |
| **Validation** | NFKD normalization, homograph protection, reserved handle list |
| **Display** | Emoji rendering in UI, ASCII stored on backend |

### Security

- Homograph attack protection
- Phishing resistance via unique emoji identifiers
- Credential stuffing defense
- Rate limiting per handle and IP

---

## Reward System

50,000,000 KNEX allocated for user acquisition with exponential decay tiers:

| Tier | Users | Reward |
|------|-------|--------|
| Early Adopter | 1 - 10,000 | 500 KNEX |
| Growth | 10,001 - 100,000 | 100 KNEX |
| Scale | 100,001 - 1,000,000 | 10 KNEX |
| Mature | 1,000,001+ | 1 KNEX |

Dynamic rewards adjust based on network velocity and engagement metrics.

---

## Transaction Integration (Memo Type 0x05)

KnexMail handles are linked to KNEX transactions via the typed memo envelope system. When a transaction references a KnexMail handle, the memo carries a type `0x05` payload:

| Field | Size | Description |
|-------|------|-------------|
| `handle_hash` | 20B | `SHA-256(handle)[0:20]` — truncated hash of lowercase ASCII handle |
| `context` | ≤233B | Optional UTF-8 context (payment note, invoice ref, etc.) |

This allows wallets and explorers to resolve the recipient's KnexMail handle from the transaction memo, enabling human-readable transaction descriptions like "Payment to user.handle" instead of raw 50-char Base62 addresses.

---

## Infrastructure

| Component | Service |
|-----------|---------|
| **Compute** | AWS Lambda (serverless) |
| **API** | API Gateway (REST + WebSocket) |
| **Database** | DynamoDB (single-table design) |
| **Email** | Amazon SES |
| **DNS** | Route 53 |
| **CDN** | CloudFront |

---

## Directory Structure

```
KnexMail/
├── aws/                          # Lambda functions and SAM templates
├── docs/                         # Architecture documentation
├── EMOJI_EMAIL_STANDARD.md       # Emoji-to-ASCII mapping specification
├── EMOJI_HANDLES.json            # Handle registry
├── HANDLE_VALIDATION_RULES.md    # Validation and normalization rules
├── RESERVED_HANDLES.md           # Reserved handle list
├── DYNAMIC_REWARDS_IMPLEMENTATION.md  # Reward tier logic
├── dns-records.csv               # DNS configuration
├── KnexMail_Terms_of_Service.txt
├── KnexMail_Privacy_Policy.txt
└── KnexMail_Cookie_Policy.txt
```

---

## License

Copyright 2026 KnexCoin. All rights reserved.

Built by [Distributed Ledger Technologies](https://distributedledgertechnologies.com).
