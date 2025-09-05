import { createClient } from '@/lib/supabase/server';
import { validatePollId } from './validation';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface SecurityResult {
  success: boolean;
  error?: string;
  user?: any;
}

// Check if user is authenticated
export async function requireAuth(): Promise<SecurityResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      return { success: false, error: 'Authentication failed' };
    }
    
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }
    
    return { success: true, user };
  } catch (error) {
    return { success: false, error: 'Authentication error' };
  }
}

// Check if user owns a poll
export async function requirePollOwnership(pollId: string): Promise<SecurityResult> {
  try {
    // Validate poll ID format
    const idValidation = validatePollId(pollId);
    if (!idValidation.isValid) {
      return { success: false, error: idValidation.error };
    }

    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult;
    }

    const supabase = await createClient();
    const { data: poll, error } = await supabase
      .from('polls')
      .select('user_id')
      .eq('id', pollId)
      .single();

    if (error || !poll) {
      return { success: false, error: 'Poll not found' };
    }

    if (poll.user_id !== authResult.user.id) {
      return { success: false, error: 'Access denied' };
    }

    return { success: true, user: authResult.user };
  } catch (error) {
    return { success: false, error: 'Authorization error' };
  }
}

// Check if user is admin
export async function requireAdmin(): Promise<SecurityResult> {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult;
    }

    // Check if user email is in admin list
    const adminEmails = process.env.ADMIN_EMAIL?.split(',') || [];
    if (!adminEmails.includes(authResult.user.email)) {
      return { success: false, error: 'Admin access required' };
    }

    return { success: true, user: authResult.user };
  } catch (error) {
    return { success: false, error: 'Admin check error' };
  }
}

// Rate limiting function
export function checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 900000): boolean {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Sanitize error messages for production
export function sanitizeError(error: any): string {
  if (process.env.NODE_ENV === 'development') {
    return error.message || 'An error occurred';
  }
  
  // In production, return generic error messages
  if (error.message?.includes('duplicate key')) {
    return 'This item already exists';
  }
  if (error.message?.includes('foreign key')) {
    return 'Invalid reference';
  }
  if (error.message?.includes('not found')) {
    return 'Resource not found';
  }
  
  return 'An error occurred. Please try again.';
}

// CSRF protection helper
export function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Validate CSRF token
export function validateCSRFToken(token: string, sessionToken: string): boolean {
  return token === sessionToken;
}

// Secure headers for API responses
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
