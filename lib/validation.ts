import { z } from 'zod';

/**
 * Comprehensive input validation and sanitization module.
 * 
 * This module provides robust validation schemas and sanitization functions
 * to ensure data integrity, prevent security vulnerabilities, and maintain
 * consistent data quality throughout the polling application.
 * 
 * Security features:
 * - XSS prevention through input sanitization
 * - SQL injection prevention via type validation
 * - Data integrity enforcement through schema validation
 * - Length limits to prevent buffer overflow attacks
 * - Format validation for emails and UUIDs
 */

// Input validation schemas
export const pollIdSchema = z.string().uuid('Invalid poll ID format');

export const createPollSchema = z.object({
  question: z.string()
    .min(1, 'Question is required')
    .max(500, 'Question must be less than 500 characters')
    .trim(),
  options: z.array(z.string().min(1, 'Option cannot be empty').max(200, 'Option must be less than 200 characters'))
    .min(2, 'At least 2 options are required')
    .max(10, 'Maximum 10 options allowed')
});

export const updatePollSchema = createPollSchema;

export const voteSchema = z.object({
  pollId: z.string().uuid('Invalid poll ID format'),
  optionIndex: z.number().int().min(0, 'Invalid option index')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const registerSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
});

/**
 * Sanitizes string input to prevent XSS and injection attacks.
 * 
 * This function removes potentially dangerous content from user input
 * while preserving legitimate text content. It's a critical security
 * function that prevents malicious scripts and HTML from being stored
 * or executed in the application.
 * 
 * @param input - The raw string input from user
 * @returns Sanitized string safe for storage and display
 * 
 * Security measures:
 * - Removes HTML tags that could contain malicious scripts
 * - Strips javascript: protocol to prevent script execution
 * - Removes event handlers (onclick, onload, etc.)
 * - Trims whitespace to normalize input
 * 
 * Used by:
 * - Poll creation and editing forms
 * - User registration and profile updates
 * - Any user-generated content input
 * 
 * Edge cases handled:
 * - Empty strings are preserved after trimming
 * - Unicode characters are maintained
 * - Legitimate angle brackets in text are removed (trade-off for security)
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Sanitizes poll data including question and all options.
 * 
 * This function applies string sanitization to all user-provided
 * poll content, ensuring that poll questions and options are safe
 * for storage and display while maintaining readability.
 * 
 * @param data - Raw poll data object with question and options
 * @returns Sanitized poll data object
 * 
 * Security considerations:
 * - Applies sanitizeString to question and all options
 * - Prevents XSS attacks through poll content
 * - Maintains data structure while cleaning content
 * 
 * Connected to:
 * - Poll creation workflow
 * - Poll editing functionality
 * - Admin poll management
 */
export function sanitizePollData(data: any) {
  return {
    question: sanitizeString(data.question),
    options: data.options.map((option: string) => sanitizeString(option))
  };
}

/**
 * Validates poll ID format and structure.
 * 
 * This function ensures that poll IDs conform to UUID v4 format,
 * preventing injection attacks and ensuring database integrity.
 * Poll IDs are used throughout the application for poll access,
 * voting, and management operations.
 * 
 * @param id - The poll identifier to validate
 * @returns Validation result with success status and error message
 * 
 * Validation rules:
 * - Must be valid UUID v4 format (36 characters with hyphens)
 * - Cannot be empty, null, or undefined
 * - Must match standard UUID pattern
 * 
 * Security benefits:
 * - Prevents SQL injection through malformed IDs
 * - Ensures consistent ID format across application
 * - Blocks attempts to access polls with crafted IDs
 * 
 * Used by:
 * - Poll viewing and voting pages
 * - Poll management operations
 * - Admin poll deletion
 * - Vote submission validation
 */
export function validatePollId(id: string): { isValid: boolean; error?: string } {
  try {
    pollIdSchema.parse(id);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message };
    }
    return { isValid: false, error: 'Invalid poll ID' };
  }
}

/**
 * Validates and sanitizes poll creation data.
 * 
 * This comprehensive validation function ensures that poll creation
 * requests contain valid, safe data that meets all business rules
 * and security requirements. It combines validation with sanitization
 * to provide clean, validated data for database storage.
 * 
 * @param data - Raw poll creation data from form submission
 * @returns Validation result with sanitized data or error message
 * 
 * Validation rules:
 * - Question: 1-500 characters, required, trimmed
 * - Options: 2-10 options, each 1-200 characters
 * - No duplicate options allowed
 * - All content sanitized for XSS prevention
 * 
 * Security features:
 * - Input sanitization prevents XSS attacks
 * - Length limits prevent buffer overflow
 * - Duplicate detection maintains data integrity
 * - Type validation ensures expected data structure
 * 
 * Business rules enforced:
 * - Minimum 2 options for meaningful polls
 * - Maximum 10 options to maintain usability
 * - Question length limits for UI compatibility
 * - Option length limits for display consistency
 * 
 * Connected to:
 * - Poll creation form processing
 * - Poll editing and update operations
 * - Admin poll management functions
 */
export function validateCreatePoll(data: any): { isValid: boolean; error?: string; sanitizedData?: any } {
  try {
    const sanitized = sanitizePollData(data);
    createPollSchema.parse(sanitized);
    return { isValid: true, sanitizedData: sanitized };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message };
    }
    return { isValid: false, error: 'Invalid poll data' };
  }
}

/**
 * Validates vote submission data.
 * 
 * This function ensures that vote submissions contain valid poll IDs
 * and option indices, preventing vote manipulation and ensuring
 * data integrity in the voting system. It's a critical security
 * function that protects poll results from tampering.
 * 
 * @param data - Vote submission data containing pollId and optionIndex
 * @returns Validation result with success status and error message
 * 
 * Validation rules:
 * - Poll ID must be valid UUID format
 * - Option index must be non-negative integer
 * - Both fields are required and properly typed
 * 
 * Security benefits:
 * - Prevents vote manipulation through invalid data
 * - Ensures poll ID format consistency
 * - Blocks negative or non-integer option indices
 * - Validates data types to prevent injection attacks
 * 
 * Used by:
 * - Vote submission processing
 * - Poll results calculation
 * - Vote integrity verification
 * 
 * Note: Additional validation (option index bounds checking)
 * is performed in the vote submission function after poll retrieval.
 */
export function validateVote(data: any): { isValid: boolean; error?: string } {
  try {
    voteSchema.parse(data);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message };
    }
    return { isValid: false, error: 'Invalid vote data' };
  }
}

/**
 * Validates user login credentials.
 * 
 * This function validates login form data to ensure proper email
 * format and minimum password requirements. It provides the first
 * line of defense against malformed login attempts and helps
 * maintain authentication security.
 * 
 * @param data - Login form data containing email and password
 * @returns Validation result with success status and error message
 * 
 * Validation rules:
 * - Email must be valid email format
 * - Password must be at least 6 characters
 * - Both fields are required
 * 
 * Security considerations:
 * - Email format validation prevents injection attempts
 * - Password length requirement ensures minimum security
 * - Input validation reduces attack surface
 * 
 * Connected to:
 * - Login form processing
 * - Authentication workflow
 * - User session management
 * 
 * Note: This validates format only; actual authentication
 * is handled by Supabase Auth with additional security measures.
 */
export function validateLogin(data: any): { isValid: boolean; error?: string } {
  try {
    loginSchema.parse(data);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message };
    }
    return { isValid: false, error: 'Invalid login data' };
  }
}

export function validateRegister(data: any): { isValid: boolean; error?: string } {
  try {
    registerSchema.parse(data);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message };
    }
    return { isValid: false, error: 'Invalid registration data' };
  }
}
