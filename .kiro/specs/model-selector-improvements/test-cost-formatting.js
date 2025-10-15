/**
 * Test Script: Cost Formatting Verification
 * 
 * This script tests the formatCredits function with various input values
 * to verify correct formatting according to requirements 2.2 and 2.4
 * 
 * Run this in browser console or Node.js
 */

// Copy of the formatCredits function from model-selector.tsx
const formatCredits = (cost) => {
  if (cost === 0) return 'Grátis';
  if (cost < 0.01) return '<0.01';
  if (cost >= 1) return cost.toFixed(0);
  return cost.toFixed(3);
};

// Test cases from requirements
const testCases = [
  // Requirement examples
  { input: 0.001, expected: '<0.01', description: 'Very small cost' },
  { input: 0.025, expected: '0.025', description: 'Small fractional cost' },
  { input: 1, expected: '1', description: 'Exactly 1 credit' },
  { input: 20, expected: '20', description: 'Large integer cost' },
  
  // Edge cases
  { input: 0, expected: 'Grátis', description: 'Free model' },
  { input: 0.009, expected: '<0.01', description: 'Just below 0.01' },
  { input: 0.01, expected: '0.010', description: 'Exactly 0.01' },
  { input: 0.1, expected: '0.100', description: '0.1 credits' },
  { input: 0.5, expected: '0.500', description: '0.5 credits' },
  { input: 0.999, expected: '0.999', description: 'Just below 1' },
  { input: 1.5, expected: '2', description: '1.5 rounds to 2' },
  { input: 2, expected: '2', description: '2 credits' },
  { input: 10, expected: '10', description: '10 credits' },
  { input: 100, expected: '100', description: '100 credits' },
  { input: 999, expected: '999', description: 'Large cost' },
  
  // Decimal edge cases
  { input: 0.0001, expected: '<0.01', description: 'Very tiny cost' },
  { input: 0.00999, expected: '<0.01', description: 'Just under 0.01' },
  { input: 0.123, expected: '0.123', description: 'Three decimal places' },
  { input: 0.1234, expected: '0.123', description: 'Four decimals (truncated)' },
];

// Run tests
console.log('='.repeat(80));
console.log('COST FORMATTING TEST RESULTS');
console.log('='.repeat(80));
console.log('');

let passed = 0;
let failed = 0;
const failures = [];

testCases.forEach(({ input, expected, description }) => {
  const result = formatCredits(input);
  const status = result === expected ? '✅ PASS' : '❌ FAIL';
  
  if (result === expected) {
    passed++;
  } else {
    failed++;
    failures.push({ input, expected, result, description });
  }
  
  console.log(`${status} | Input: ${input.toString().padEnd(10)} | Expected: ${expected.padEnd(10)} | Got: ${result.padEnd(10)} | ${description}`);
});

console.log('');
console.log('='.repeat(80));
console.log(`SUMMARY: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
console.log('='.repeat(80));

if (failures.length > 0) {
  console.log('');
  console.log('FAILURES:');
  failures.forEach(({ input, expected, result, description }) => {
    console.log(`  ❌ ${description}`);
    console.log(`     Input: ${input}`);
    console.log(`     Expected: "${expected}"`);
    console.log(`     Got: "${result}"`);
    console.log('');
  });
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatCredits, testCases };
}
