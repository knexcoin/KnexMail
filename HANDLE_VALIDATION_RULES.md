# KnexMail Handle Validation Rules

**Last Updated:** 2026-02-04

---

## Valid Characters

**Allowed:** `a-z` (lowercase letters), `0-9` (numbers), `.` (dot)

**NOT Allowed:**
- Uppercase letters (A-Z)
- Underscores (_)
- Hyphens (-)
- Special characters (!@#$%^&* etc.)
- Spaces
- Unicode/accented characters (é, ñ, etc.)

---

## Format Rules

### ✅ Must Follow:
1. **Length:** 2-64 characters
2. **Start:** Must begin with letter or number (NOT dot)
3. **End:** Must end with letter or number (NOT dot)
4. **Dots:** Maximum 3 dots total
5. **No consecutive dots:** `..` is invalid
6. **Case-insensitive:** All handles normalized to lowercase

### ❌ Cannot Be:
- IP addresses (`192.168.1.1`)
- Common email domains (`gmail.com`, `yahoo.com`, etc.)
- Reserved system handles (see RESERVED_HANDLES.md)

---

## Examples

### ✅ Valid Handles:
```
john
john.doe
user123
cool.guy.99
alice.b
test.user
user2024
a.b.c
```

### ❌ Invalid Handles:
```
.john           → Starts with dot
john.           → Ends with dot
john..doe       → Consecutive dots
j               → Too short (< 2 chars)
john-doe        → Contains hyphen
john_doe        → Contains underscore
John.Doe        → Contains uppercase (auto-converted to lowercase)
josé            → Contains accented character
john@smith      → Contains @ symbol
192.168.1.1     → Looks like IP address
gmail.com       → Reserved domain name
a.b.c.d.e       → Too many dots (>3)
admin           → Reserved handle
knexmail        → Reserved for brand
```

---

## Email Address Formation

Handles become email addresses by appending `@knexmail.com`:

```
Handle: john.doe
Email:  john.doe@knexmail.com

Handle: user123
Email:  user123@knexmail.com
```

---

## Validation Flow

```javascript
// User input
Input: "John.Doe"

// Step 1: Normalize (lowercase, trim)
Normalized: "john.doe"

// Step 2: Validate format
✓ Length: 8 chars (2-64 ✓)
✓ Starts with: 'j' (letter ✓)
✓ Ends with: 'e' (letter ✓)
✓ Characters: a-z and dot only ✓
✓ No consecutive dots ✓
✓ Dot count: 1 (max 3 ✓)
✓ Not IP address ✓
✓ Not blocked domain ✓

// Step 3: Check if reserved
Check against ~500+ reserved handles

// Step 4: Check availability in database
Query DynamoDB for existing user

// Result
✓ Available!
```

---

## Error Messages

| Error | Message | Example |
|-------|---------|---------|
| Too short | "Handle must be at least 2 characters" | `@j` |
| Too long | "Handle must be 64 characters or less" | 65+ chars |
| Bad start | "Handle must start with a letter or number" | `@.john` |
| Bad end | "Handle must end with a letter or number" | `@john.` |
| Invalid chars | "Handle can only contain lowercase letters, numbers, and dots" | `@john_doe` |
| Consecutive dots | "Handle cannot contain consecutive dots (..)" | `@john..doe` |
| Too many dots | "Handle cannot contain more than 3 dots" | `@a.b.c.d.e` |
| IP pattern | "Handle cannot look like an IP address" | `@192.168.1.1` |
| Reserved domain | "This handle is reserved" | `@gmail.com` |
| Reserved handle | "Handle is not available" + reason | `@admin` |
| Already taken | "Handle is already taken" | (existing user) |

---

## Suggestion Algorithm

When a handle is invalid or taken, the system suggests alternatives:

### For Reserved Handles:
```
admin → admin2847 (random number)
knex → knex472 (random number)
test → test9103 (random number)
```

### For Taken Handles:
```
john → john.2024 (adds dot + number)
user → user.99 (adds dot + number)
```

---

## Frontend Validation

### HTML Input Pattern:
```html
<input
  type="text"
  pattern="[a-z0-9][a-z0-9.]{0,62}[a-z0-9]"
  title="Lowercase letters, numbers, and dots only.
         Must start and end with letter or number."
  minlength="2"
  maxlength="64"
/>
```

### JavaScript Real-Time Validation:
```javascript
function validateHandle(input) {
  // Remove @ if present
  let handle = input.replace(/^@/, '').toLowerCase();

  // Check format
  const regex = /^[a-z0-9][a-z0-9.]{0,62}[a-z0-9]$/;
  if (!regex.test(handle)) {
    return { valid: false, error: 'Invalid format' };
  }

  // Check consecutive dots
  if (/\.{2,}/.test(handle)) {
    return { valid: false, error: 'No consecutive dots' };
  }

  // Check dot count
  const dotCount = (handle.match(/\./g) || []).length;
  if (dotCount > 3) {
    return { valid: false, error: 'Max 3 dots' };
  }

  return { valid: true };
}
```

---

## Database Schema

### DynamoDB Table Structure:
```javascript
{
  handle: '@john.doe',           // Primary key (normalized with @)
  email: 'user@example.com',     // User's signup email
  referralCode: 'KNEX-ABC123',   // Unique referral code
  knexEarned: 250,               // Total KNEX earned
  reserved: false,               // True for system handles
  createdAt: '2026-02-04T...',   // ISO timestamp
  // ... other fields
}
```

### Reserved Handles:
```javascript
{
  handle: '@admin',
  reserved: true,
  reservedReason: 'System/Brand Protection',
  createdAt: '2026-02-04T...'
}
```

---

## Implementation Files

1. **`/aws/lambda/reserved-handles.js`**
   - Reserved handle list (~500+ handles)
   - Validation logic
   - Suggestion generator

2. **`/aws/lambda/index.js`**
   - Main Lambda handler
   - Signup validation
   - Database checks

3. **`/docs/index.html`**
   - Frontend form validation
   - Real-time feedback

---

## Testing Checklist

### Valid Formats:
- [ ] Single word: `john`
- [ ] With dot: `john.doe`
- [ ] With numbers: `user123`
- [ ] Multiple dots: `a.b.c`
- [ ] Starts with number: `1user`
- [ ] Ends with number: `user1`

### Invalid Formats:
- [ ] Starts with dot: `.john`
- [ ] Ends with dot: `john.`
- [ ] Consecutive dots: `john..doe`
- [ ] Contains underscore: `john_doe`
- [ ] Contains hyphen: `john-doe`
- [ ] Contains uppercase: `John` (should normalize)
- [ ] Too short: `a`
- [ ] Too long: 65+ characters
- [ ] IP address: `192.168.1.1`
- [ ] Domain: `gmail.com`

### Reserved Handles:
- [ ] System: `admin`, `support`, `noreply`
- [ ] Brand: `knexmail`, `knex`, `knexcoin`
- [ ] Profanity: (filtered list)
- [ ] Scam: `verify`, `confirm`, `winner`

---

## Performance Considerations

- **Validation Speed:** O(1) regex checks
- **Reserved Check:** O(1) Set lookup
- **Database Check:** O(1) DynamoDB GetItem
- **Total Latency:** <50ms typical

---

## Security Notes

1. **No Unicode attacks:** ASCII-only prevents homograph attacks
2. **No lookalikes:** Strict character set prevents confusion
3. **No injection:** Input sanitized before DB operations
4. **Rate limiting:** IP-based signup limits
5. **Reserved protection:** Prevents brand impersonation

---

## Future Enhancements

- [ ] Premium handles (3-letter, dictionary words)
- [ ] Handle transfers/trading
- [ ] Vanity handles for brands
- [ ] International handles (with punycode)
- [ ] Handle aliases

---

**Last Updated:** 2026-02-04
**Maintained By:** KnexMail Development Team
**Version:** 1.0.0
