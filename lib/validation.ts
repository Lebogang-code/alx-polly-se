import { z } from 'zod';

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

// Sanitization functions
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

export function sanitizePollData(data: any) {
  return {
    question: sanitizeString(data.question),
    options: data.options.map((option: string) => sanitizeString(option))
  };
}

// Validation helper functions
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
