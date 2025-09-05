// Security test utilities for manual testing
// This file is for development/testing purposes only

import { validatePollId, validateCreatePoll, validateVote } from './validation';
import { checkRateLimit } from './security';

export function runSecurityTests() {
  console.log('🔒 Running Security Tests...\n');

  // Test 1: Poll ID Validation
  console.log('Test 1: Poll ID Validation');
  console.log('Valid UUID:', validatePollId('123e4567-e89b-12d3-a456-426614174000').isValid);
  console.log('Invalid ID:', validatePollId('invalid-id').isValid);
  console.log('Empty ID:', validatePollId('').isValid);
  console.log('');

  // Test 2: Poll Creation Validation
  console.log('Test 2: Poll Creation Validation');
  const validPoll = validateCreatePoll({
    question: 'What is your favorite color?',
    options: ['Red', 'Blue', 'Green']
  });
  console.log('Valid poll:', validPoll.isValid);

  const invalidPoll = validateCreatePoll({
    question: '',
    options: ['Only one option']
  });
  console.log('Invalid poll (empty question, one option):', invalidPoll.isValid);

  const longQuestion = validateCreatePoll({
    question: 'A'.repeat(501), // Too long
    options: ['Red', 'Blue']
  });
  console.log('Invalid poll (question too long):', longQuestion.isValid);
  console.log('');

  // Test 3: Vote Validation
  console.log('Test 3: Vote Validation');
  const validVote = validateVote({
    pollId: '123e4567-e89b-12d3-a456-426614174000',
    optionIndex: 0
  });
  console.log('Valid vote:', validVote.isValid);

  const invalidVote = validateVote({
    pollId: 'invalid-id',
    optionIndex: -1
  });
  console.log('Invalid vote:', invalidVote.isValid);
  console.log('');

  // Test 4: Rate Limiting
  console.log('Test 4: Rate Limiting');
  const testKey = 'test_user_123';
  console.log('First request (should pass):', checkRateLimit(testKey, 3, 60000));
  console.log('Second request (should pass):', checkRateLimit(testKey, 3, 60000));
  console.log('Third request (should pass):', checkRateLimit(testKey, 3, 60000));
  console.log('Fourth request (should fail):', checkRateLimit(testKey, 3, 60000));
  console.log('');

  console.log('✅ Security tests completed!');
}

// Uncomment the line below to run tests in development
// runSecurityTests();
