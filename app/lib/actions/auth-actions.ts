'use server';

import { createClient } from '@/lib/supabase/server';
import { LoginFormData, RegisterFormData } from '../types';
import { validateLogin, validateRegister } from '@/lib/validation';
import { checkRateLimit, sanitizeError } from '@/lib/security';

/**
 * Authenticates a user with email and password using Supabase Auth.
 * 
 * This function is critical for the app's security as it handles user authentication,
 * which is required for all poll creation, voting, and management operations.
 * It integrates with Supabase's built-in authentication system and includes
 * error sanitization to prevent information leakage.
 * 
 * @param data - User login credentials containing email and password
 * @returns Promise<{error: string | null}> - Returns null on success, error message on failure
 * 
 * Security considerations:
 * - Uses Supabase's secure authentication flow with JWT tokens
 * - Errors are sanitized to prevent sensitive information exposure
 * - Integrates with middleware for session management
 * - Rate limiting should be applied at the middleware level
 * 
 * Authentication flow:
 * 1. Receives user credentials from login form
 * 2. Passes credentials to Supabase Auth API
 * 3. Supabase validates credentials against user database
 * 4. On success: Sets secure HTTP-only cookies for session management
 * 5. On failure: Returns sanitized error message
 * 
 * Connected components:
 * - Used by login page form submission
 * - Triggers session creation handled by middleware
 * - Enables access to protected routes and poll operations
 */
export async function login(data: LoginFormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

    if (error) {
      return { error: sanitizeError(error) };
    }

    // Success: no error
    return { error: null };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

/**
 * Registers a new user account with email, password, and name using Supabase Auth.
 * 
 * This function creates new user accounts that can then create polls, vote, and
 * manage their polling data. It's the entry point for new users into the system
 * and establishes their identity for all future operations.
 * 
 * @param data - User registration data containing name, email, and password
 * @returns Promise<{error: string | null}> - Returns null on success, error message on failure
 * 
 * Security considerations:
 * - Password strength validation should be performed before calling this function
 * - Email verification is handled by Supabase (configurable)
 * - User metadata (name) is stored securely in Supabase Auth
 * - Errors are sanitized to prevent information disclosure
 * 
 * Registration flow:
 * 1. Receives user registration data from signup form
 * 2. Passes data to Supabase Auth API with user metadata
 * 3. Supabase creates user account and sends verification email (if enabled)
 * 4. User profile is created with provided name in metadata
 * 5. Returns success/error status
 * 
 * Connected components:
 * - Used by registration page form submission
 * - Creates user identity for poll ownership and voting
 * - Enables user to access dashboard and create polls
 * 
 * Edge cases handled:
 * - Duplicate email addresses (Supabase returns appropriate error)
 * - Invalid email formats (should be validated client-side first)
 * - Weak passwords (should be validated client-side first)
 */
export async function register(data: RegisterFormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
      },
    },
  });

    if (error) {
      return { error: sanitizeError(error) };
    }

    // Success: no error
    return { error: null };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

/**
 * Logs out the current user by clearing their authentication session.
 * 
 * This function is essential for security as it properly terminates user sessions,
 * preventing unauthorized access if a device is shared or compromised. It clears
 * all authentication tokens and cookies.
 * 
 * @returns Promise<{error: string | null}> - Returns null on success, error message on failure
 * 
 * Security considerations:
 * - Clears all authentication tokens and session cookies
 * - Invalidates the user's JWT token on the server side
 * - Prevents session hijacking by properly terminating sessions
 * - Should redirect user to public pages after successful logout
 * 
 * Logout flow:
 * 1. Calls Supabase Auth signOut method
 * 2. Supabase clears HTTP-only cookies and JWT tokens
 * 3. User session is terminated on both client and server
 * 4. User loses access to protected routes and poll operations
 * 
 * Connected components:
 * - Used by header dropdown menu logout option
 * - Triggers redirect to login page or home page
 * - Clears user context throughout the application
 */
export async function logout() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: sanitizeError(error) };
    }
    return { error: null };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

/**
 * Retrieves the currently authenticated user's information from the session.
 * 
 * This function is used throughout the app to determine user identity for
 * authorization decisions, poll ownership verification, and UI personalization.
 * It's a critical function for maintaining security boundaries between users.
 * 
 * @returns Promise<User | null> - Returns user object if authenticated, null otherwise
 * 
 * Security considerations:
 * - Only returns user data if valid session exists
 * - User data includes ID, email, and metadata (name)
 * - Used for authorization checks in server actions
 * - Does not expose sensitive authentication tokens
 * 
 * Usage patterns:
 * - Called by server components to check authentication status
 * - Used in server actions to verify user identity
 * - Enables conditional rendering based on auth status
 * - Critical for poll ownership verification
 * 
 * Connected components:
 * - Used by all protected server components and actions
 * - Enables user-specific data filtering (my polls, etc.)
 * - Required for poll creation, voting, and management operations
 * 
 * Edge cases:
 * - Returns null if session is expired or invalid
 * - Handles network errors gracefully
 * - Used in middleware for route protection
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch (error) {
    return null;
  }
}

/**
 * Retrieves the current authentication session information.
 * 
 * This function provides access to the full session object including tokens
 * and expiration information. It's used primarily for session validation
 * and debugging authentication issues.
 * 
 * @returns Promise<Session | null> - Returns session object if valid, null otherwise
 * 
 * Security considerations:
 * - Contains JWT tokens and should be handled carefully
 * - Used for session validation in middleware
 * - Expiration times are checked automatically by Supabase
 * - Should not expose tokens to client-side code
 * 
 * Usage patterns:
 * - Used by middleware for route protection
 * - Session validation for server-side operations
 * - Debugging authentication flows
 * - Token refresh is handled automatically by Supabase
 * 
 * Connected components:
 * - Used by authentication middleware
 * - Supports automatic token refresh
 * - Enables persistent login across browser sessions
 */
export async function getSession() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch (error) {
    return null;
  }
}
