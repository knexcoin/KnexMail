/**
 * Test script for handle validation
 * Run with: node test-validation.js
 */

const { validateHandleFormat, isReserved, getSuggestion, getReservationReason } = require('./reserved-handles');

// Test cases
const testCases = [
  // Valid handles
  { input: 'john', expected: true, description: 'Simple name' },
  { input: 'john.doe', expected: true, description: 'Name with dot' },
  { input: 'user123', expected: true, description: 'Name with numbers' },
  { input: 'cool.guy.99', expected: true, description: 'Multiple dots and numbers' },
  { input: 'test.user.2024', expected: true, description: 'Dots and year' },
  { input: 'a.b.c', expected: true, description: 'Single letters with dots' },
  { input: '1user', expected: true, description: 'Starts with number' },
  { input: 'user1', expected: true, description: 'Ends with number' },

  // Invalid handles - format
  { input: '.john', expected: false, description: 'Starts with dot' },
  { input: 'john.', expected: false, description: 'Ends with dot' },
  { input: 'john..doe', expected: false, description: 'Consecutive dots' },
  { input: 'j', expected: false, description: 'Too short' },
  { input: 'a'.repeat(65), expected: false, description: 'Too long (65 chars)' },
  { input: 'john_doe', expected: false, description: 'Contains underscore' },
  { input: 'john-doe', expected: false, description: 'Contains hyphen' },
  { input: 'John.Doe', expected: true, description: 'Uppercase (normalizes to lowercase)' },
  { input: 'john@smith', expected: false, description: 'Contains @ symbol' },
  { input: 'john!doe', expected: false, description: 'Contains special char' },
  { input: 'a.b.c.d.e', expected: false, description: 'Too many dots (5)' },

  // Invalid handles - patterns
  { input: '192.168.1.1', expected: false, description: 'IP address' },
  { input: 'gmail.com', expected: false, description: 'Email domain (blocked)' },
  { input: 'yahoo.com', expected: false, description: 'Email domain (blocked)' },

  // Reserved handles
  { input: 'admin', expected: false, description: 'Reserved (system)' },
  { input: 'support', expected: false, description: 'Reserved (system)' },
  { input: 'noreply', expected: false, description: 'Reserved (system)' },
  { input: 'knexmail', expected: false, description: 'Reserved (brand)' },
  { input: 'knex', expected: false, description: 'Reserved (brand)' },
];

console.log('\n🧪 Testing Handle Validation\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const validation = validateHandleFormat(test.input);
  const reserved = isReserved(test.input);

  // Consider handle invalid if either format is bad OR it's reserved
  const isValid = validation.valid && !reserved;
  const testPassed = isValid === test.expected;

  if (testPassed) {
    passed++;
    console.log(`✅ Test ${index + 1}: ${test.description}`);
    console.log(`   Input: "${test.input}" → ${isValid ? 'Valid' : 'Invalid'}`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: ${test.description}`);
    console.log(`   Input: "${test.input}"`);
    console.log(`   Expected: ${test.expected ? 'Valid' : 'Invalid'}`);
    console.log(`   Got: ${isValid ? 'Valid' : 'Invalid'}`);

    if (!validation.valid) {
      console.log(`   Error: ${validation.error}`);
    }
    if (reserved) {
      console.log(`   Reason: ${getReservationReason(test.input)}`);
    }

    // Show suggestion for invalid handles
    if (!isValid) {
      const suggestion = getSuggestion(test.input);
      console.log(`   Suggestion: ${suggestion}`);
    }
  }
  console.log('');
});

console.log('='.repeat(80));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
  console.log('\n🎉 All tests passed!\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} test(s) failed.\n`);
  process.exit(1);
}
