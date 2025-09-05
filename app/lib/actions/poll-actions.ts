"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateCreatePoll, validateVote, validatePollId } from "@/lib/validation";
import { requireAuth, requirePollOwnership, checkRateLimit, sanitizeError } from "@/lib/security";

/**
 * Creates a new poll with question and multiple choice options.
 * 
 * This is a core function of the polling app that enables authenticated users
 * to create polls that can be shared and voted on by others. It implements
 * comprehensive security measures including authentication, input validation,
 * rate limiting, and data sanitization.
 * 
 * @param formData - FormData containing poll question and options
 * @returns Promise<{error: string | null}> - Returns null on success, error message on failure
 * 
 * Security considerations:
 * - Requires user authentication to prevent anonymous poll creation
 * - Rate limiting prevents spam and abuse (10 polls per 5 minutes per IP)
 * - Input validation ensures data integrity and prevents XSS attacks
 * - Data sanitization removes potentially harmful content
 * - Poll ownership is established for future authorization checks
 * 
 * Validation rules:
 * - Question: 1-500 characters, required, trimmed
 * - Options: 2-10 options, each 1-200 characters, no duplicates
 * - All inputs are sanitized to remove HTML tags and JavaScript
 * 
 * Database operations:
 * 1. Validates user authentication and rate limits
 * 2. Sanitizes and validates input data
 * 3. Inserts poll record with user_id for ownership
 * 4. Revalidates polls page cache for immediate UI updates
 * 
 * Connected components:
 * - Used by poll creation form (/create page)
 * - Creates polls that appear in user dashboard
 * - Enables poll sharing and voting functionality
 * - Integrates with poll management and deletion features
 * 
 * Edge cases handled:
 * - Duplicate options are rejected
 * - Empty or whitespace-only inputs are rejected
 * - Rate limiting prevents abuse
 * - Database errors are sanitized before returning
 */
export async function createPoll(formData: FormData) {
  try {
    // Rate limiting check
    const clientIP = formData.get("clientIP") as string || "unknown";
    if (!checkRateLimit(`create_poll_${clientIP}`, 10, 300000)) { // 10 requests per 5 minutes
      return { error: "Too many requests. Please try again later." };
    }

    // Authentication check
    const authResult = await requireAuth();
    if (!authResult.success) {
      return { error: authResult.error };
    }

<<<<<<< HEAD
  // Input validation and sanitization
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return { error: "Please provide a valid question." };
  }
  if (!Array.isArray(options) || options.length < 2) {
    return { error: "Please provide at least two valid options." };
  }
  if (question.trim().length > 500) {
    return { error: "Question must be less than 500 characters." };
  }
  if (options.some(option => typeof option !== 'string' || option.trim().length === 0 || option.trim().length > 200)) {
    return { error: "All options must be valid and less than 200 characters." };
  }
  if (options.length > 10) {
    return { error: "Maximum 10 options allowed." };
  }

  // Sanitize inputs
  const sanitizedQuestion = question.trim();
  const sanitizedOptions = options.map(option => option.trim());

  // Check for duplicate options
  const uniqueOptions = [...new Set(sanitizedOptions)];
  if (uniqueOptions.length !== sanitizedOptions.length) {
    return { error: "Duplicate options are not allowed." };
=======
    const question = formData.get("question") as string;
    const options = formData.getAll("options").filter(Boolean) as string[];

    // Input validation and sanitization
    const validation = validateCreatePoll({ question, options });
    if (!validation.isValid) {
      return { error: validation.error };
    }

    const { sanitizedData } = validation;
    const supabase = await createClient();

    const { error } = await supabase.from("polls").insert([
      {
        user_id: authResult.user.id,
        question: sanitizedData.question,
        options: sanitizedData.options,
      },
    ]);

    if (error) {
      return { error: sanitizeError(error) };
    }

    revalidatePath("/polls");
    return { error: null };
  } catch (error) {
    return { error: sanitizeError(error) };
>>>>>>> 63ecfb34a19d38a5f2d32ffc33bafb1a27bc750c
  }
}

/**
 * Retrieves all polls in the system (admin-only function).
 * 
 * This administrative function provides system-wide poll visibility for
 * content moderation, analytics, and management purposes. It implements
 * strict role-based access control to ensure only authorized administrators
 * can access all user polls.
 * 
 * @returns Promise<{polls: Poll[], error: string | null}> - All polls or error
 * 
 * Security considerations:
 * - Requires admin role authentication (checked via requireAdmin)
 * - Admin role is verified through user metadata in Supabase
 * - Prevents unauthorized access to user-generated content
 * - All database errors are sanitized before returning
 * 
 * Database operations:
 * 1. Verifies admin authentication and authorization
 * 2. Queries all polls ordered by creation date (newest first)
 * 3. Returns complete poll data including user_id for ownership tracking
 * 
 * Connected components:
 * - Used by admin dashboard (/admin page)
 * - Enables poll moderation and content management
 * - Supports admin analytics and reporting features
 * - Integrates with admin poll deletion functionality
 * 
 * Edge cases handled:
 * - Non-admin users receive authorization error
 * - Database connection issues return empty array with error
 * - Missing or null poll data is handled gracefully
 */
export async function getAllPolls() {
  try {
    const { requireAdmin } = await import("@/lib/security");
    const adminResult = await requireAdmin();
    if (!adminResult.success) {
      return { polls: [], error: adminResult.error };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return { polls: [], error: sanitizeError(error) };
    }
    return { polls: data ?? [], error: null };
  } catch (error) {
    return { polls: [], error: sanitizeError(error) };
  }
}

// ADMIN: DELETE ANY POLL (with proper authorization)
export async function adminDeletePoll(id: string) {
  try {
    const { requireAdmin } = await import("@/lib/security");
    const adminResult = await requireAdmin();
    if (!adminResult.success) {
      return { error: adminResult.error };
    }

    // Validate poll ID format
    const idValidation = validatePollId(id);
    if (!idValidation.isValid) {
      return { error: idValidation.error };
    }

    const supabase = await createClient();
    
    // Delete associated votes first
    await supabase.from("votes").delete().eq("poll_id", id);
    
    // Delete the poll
    const { error } = await supabase
      .from("polls")
      .delete()
      .eq("id", id);

    if (error) {
      return { error: sanitizeError(error) };
    }
    
    revalidatePath("/admin");
    return { error: null };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
<<<<<<< HEAD

  const { error } = await supabase.from("polls").insert([
    {
      user_id: user.id,
      question: sanitizedQuestion,
      options: sanitizedOptions,
    },
  ]);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/polls");
  return { error: null };
=======
>>>>>>> 63ecfb34a19d38a5f2d32ffc33bafb1a27bc750c
}

// GET USER POLLS
/**
 * Retrieves all polls created by the currently authenticated user.
 * 
 * This function enables users to view and manage their own polls in the
 * dashboard. It implements user-specific data filtering to ensure users
 * can only access polls they have created, maintaining data privacy and
 * supporting poll ownership verification.
 * 
 * @returns Promise<{polls: Poll[], error: string | null}> - User's polls or error
 * 
 * Security considerations:
 * - Requires user authentication to access personal polls
 * - Filters polls by user_id to prevent unauthorized access
 * - Sanitizes database errors to prevent information leakage
 * - Maintains user data privacy and ownership boundaries
 * 
 * Database operations:
 * 1. Verifies user authentication status
 * 2. Queries polls filtered by authenticated user's ID
 * 3. Orders results by creation date (newest first)
 * 4. Returns user's polls for dashboard display
 * 
 * Connected components:
 * - Used by user dashboard (/dashboard page)
 * - Enables poll management and editing features
 * - Supports poll deletion and sharing functionality
 * - Integrates with poll creation and update workflows
 * 
 * Edge cases handled:
 * - Unauthenticated users receive authorization error
 * - Users with no polls receive empty array (not an error)
 * - Database errors return empty array with error message
 */
export async function getUserPolls() {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return { polls: [], error: authResult.error };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .eq("user_id", authResult.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { polls: [], error: sanitizeError(error) };
    }
    return { polls: data ?? [], error: null };
  } catch (error) {
    return { polls: [], error: sanitizeError(error) };
  }
}

// GET POLL BY ID
/**
 * Retrieves a specific poll by its unique identifier.
 * 
 * This function enables poll viewing and voting by fetching complete poll
 * data including question, options, and metadata. It serves as the foundation
 * for poll display, voting interfaces, and poll sharing functionality.
 * 
 * @param id - The unique poll identifier (UUID format)
 * @returns Promise<{poll: Poll | null, error: string | null}> - Poll data or error
 * 
 * Security considerations:
 * - Validates poll ID format to prevent injection attacks
 * - Public access (no authentication required for viewing)
 * - Sanitizes database errors to prevent information disclosure
 * - Input validation prevents malformed ID attacks
 * 
 * Validation rules:
 * - Poll ID must be valid UUID format
 * - ID cannot be empty, null, or contain only whitespace
 * - Rejects malformed or potentially malicious identifiers
 * 
 * Database operations:
 * 1. Validates poll ID format and structure
 * 2. Queries single poll record by ID
 * 3. Returns complete poll data for display and voting
 * 
 * Connected components:
 * - Used by poll viewing page (/polls/[id])
 * - Enables voting interface and poll sharing
 * - Supports QR code generation for poll access
 * - Integrates with vote submission and results display
 * 
 * Edge cases handled:
 * - Invalid or malformed poll IDs return validation error
 * - Non-existent polls return null with appropriate error
 * - Database connection issues return null with error message
 */
export async function getPollById(id: string) {
<<<<<<< HEAD
  const supabase = await createClient();
  
  // Input validation
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return { poll: null, error: "Invalid poll ID." };
  }
  
  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("id", id.trim())
    .single();
=======
  try {
    // Validate poll ID format
    const idValidation = validatePollId(id);
    if (!idValidation.isValid) {
      return { poll: null, error: idValidation.error };
    }
>>>>>>> 63ecfb34a19d38a5f2d32ffc33bafb1a27bc750c

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return { poll: null, error: sanitizeError(error) };
    }
    return { poll: data, error: null };
  } catch (error) {
    return { poll: null, error: sanitizeError(error) };
  }
}

// SUBMIT VOTE
/**
 * Submits a vote for a specific poll option.
 * 
 * This is a core voting function that enables users to participate in polls
 * by selecting their preferred option. It implements comprehensive validation,
 * duplicate vote prevention, and supports both authenticated and anonymous
 * voting while maintaining vote integrity.
 * 
 * @param pollId - The unique identifier of the poll to vote on
 * @param optionIndex - The zero-based index of the selected option
 * @returns Promise<{error: string | null}> - Returns null on success, error on failure
 * 
 * Security considerations:
 * - Rate limiting prevents vote spam and manipulation
 * - Input validation ensures data integrity
 * - Duplicate vote detection for authenticated users
 * - Anonymous voting support with IP-based tracking
 * - Sanitized error messages prevent information leakage
 * 
 * Validation rules:
 * - Poll ID must be valid UUID format
 * - Option index must be non-negative integer
 * - Option index must be within poll's available options
 * - Poll must exist and be accessible
 * 
 * Voting logic:
 * 1. Validates poll existence and option availability
 * 2. Checks for existing votes (authenticated users only)
 * 3. Prevents duplicate voting by same user
 * 4. Records vote with user ID (if authenticated) or anonymously
 * 5. Updates vote counts for real-time results
 * 
 * Connected components:
 * - Used by voting interface on poll pages
 * - Integrates with poll results display
 * - Supports real-time vote count updates
 * - Enables anonymous and authenticated voting flows
 * 
 * Edge cases handled:
 * - Invalid poll IDs return validation error
 * - Out-of-range option indices are rejected
 * - Duplicate votes from same user are prevented
 * - Non-existent polls return appropriate error
 * - Database errors are sanitized and returned
 */
export async function submitVote(pollId: string, optionIndex: number) {
<<<<<<< HEAD
  const supabase = await createClient();
  
  // Input validation
  if (!pollId || typeof pollId !== 'string' || pollId.trim().length === 0) {
    return { error: "Invalid poll ID." };
  }
  if (typeof optionIndex !== 'number' || optionIndex < 0 || !Number.isInteger(optionIndex)) {
    return { error: "Invalid option selected." };
  }

  // Verify poll exists and get its options to validate optionIndex
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("options")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return { error: "Poll not found." };
  }

  if (optionIndex >= poll.options.length) {
    return { error: "Invalid option selected." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Require login to vote for better security
  if (!user) return { error: 'You must be logged in to vote.' };

  // Check if user has already voted on this poll
  const { data: existingVote } = await supabase
    .from("votes")
    .select("id")
    .eq("poll_id", pollId)
    .eq("user_id", user.id)
    .single();

  if (existingVote) {
    return { error: "You have already voted on this poll." };
  }

  const { error } = await supabase.from("votes").insert([
    {
      poll_id: pollId,
      user_id: user.id,
      option_index: optionIndex,
    },
  ]);
=======
  try {
    // Rate limiting check
    if (!checkRateLimit(`vote_${pollId}`, 5, 60000)) { // 5 votes per minute per poll
      return { error: "Too many votes. Please try again later." };
    }

    // Input validation
    const validation = validateVote({ pollId, optionIndex });
    if (!validation.isValid) {
      return { error: validation.error };
    }

    const supabase = await createClient();
    
    // Check if poll exists and get options count
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("options")
      .eq("id", pollId)
      .single();
>>>>>>> 63ecfb34a19d38a5f2d32ffc33bafb1a27bc750c

    if (pollError || !poll) {
      return { error: "Poll not found" };
    }

    // Validate option index
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return { error: "Invalid option selected" };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check for existing vote from this user (if authenticated)
    if (user) {
      const { data: existingVote } = await supabase
        .from("votes")
        .select("id")
        .eq("poll_id", pollId)
        .eq("user_id", user.id)
        .single();

      if (existingVote) {
        return { error: "You have already voted on this poll" };
      }
    }

    const { error } = await supabase.from("votes").insert([
      {
        poll_id: pollId,
        user_id: user?.id ?? null,
        option_index: optionIndex,
      },
    ]);

    if (error) {
      return { error: sanitizeError(error) };
    }
    return { error: null };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

// DELETE POLL
/**
 * Deletes a poll and all associated votes (owner-only operation).
 * 
 * This function enables poll creators to remove their polls from the system,
 * including all associated vote data. It implements strict ownership verification
 * to ensure only poll creators can delete their own polls, maintaining data
 * security and user control over their content.
 * 
 * @param id - The unique identifier of the poll to delete
 * @returns Promise<{error: string | null}> - Returns null on success, error on failure
 * 
 * Security considerations:
 * - Requires poll ownership verification (user must be poll creator)
 * - Authentication required to prevent unauthorized deletions
 * - Cascading deletion removes associated vote data
 * - Double-checks ownership at database level for extra security
 * - Sanitizes all error messages to prevent information leakage
 * 
 * Database operations:
 * 1. Verifies user authentication and poll ownership
 * 2. Deletes all associated votes first (referential integrity)
 * 3. Deletes the poll record with ownership verification
 * 4. Revalidates polls page cache for immediate UI updates
 * 
 * Connected components:
 * - Used by poll management interface in user dashboard
 * - Integrates with poll listing and editing features
 * - Supports bulk poll management operations
 * - Maintains referential integrity with voting system
 * 
 * Edge cases handled:
 * - Non-owners cannot delete polls (ownership verification)
 * - Unauthenticated users receive authorization error
 * - Non-existent polls return appropriate error
 * - Database constraint violations are handled gracefully
 * - Orphaned votes are prevented through cascading deletion
 */
export async function deletePoll(id: string) {
<<<<<<< HEAD
  const supabase = await createClient();
  
  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: userError.message };
  }
  if (!user) {
    return { error: "You must be logged in to delete a poll." };
  }

  // Only allow deleting polls owned by the user
  const { error } = await supabase
    .from("polls")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
    
  if (error) return { error: error.message };
  revalidatePath("/polls");
  return { error: null };
=======
  try {
    // Check ownership before deletion
    const ownershipResult = await requirePollOwnership(id);
    if (!ownershipResult.success) {
      return { error: ownershipResult.error };
    }

    const supabase = await createClient();
    
    // Delete associated votes first
    await supabase.from("votes").delete().eq("poll_id", id);
    
    // Delete the poll
    const { error } = await supabase
      .from("polls")
      .delete()
      .eq("id", id)
      .eq("user_id", ownershipResult.user.id); // Double-check ownership

    if (error) {
      return { error: sanitizeError(error) };
    }
    
    revalidatePath("/polls");
    return { error: null };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

// ADMIN: GET ALL POLLS (with proper authorization)
export async function getAllPolls() {
  try {
    const { requireAdmin } = await import("@/lib/security");
    const adminResult = await requireAdmin();
    if (!adminResult.success) {
      return { polls: [], error: adminResult.error };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return { polls: [], error: sanitizeError(error) };
    }
    return { polls: data ?? [], error: null };
  } catch (error) {
    return { polls: [], error: sanitizeError(error) };
  }
}

// ADMIN: DELETE ANY POLL (with proper authorization)
export async function adminDeletePoll(id: string) {
  try {
    const { requireAdmin } = await import("@/lib/security");
    const adminResult = await requireAdmin();
    if (!adminResult.success) {
      return { error: adminResult.error };
    }

    // Validate poll ID format
    const idValidation = validatePollId(id);
    if (!idValidation.isValid) {
      return { error: idValidation.error };
    }

    const supabase = await createClient();
    
    // Delete associated votes first
    await supabase.from("votes").delete().eq("poll_id", id);
    
    // Delete the poll
    const { error } = await supabase
      .from("polls")
      .delete()
      .eq("id", id);

    if (error) {
      return { error: sanitizeError(error) };
    }
    
    revalidatePath("/admin");
    return { error: null };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
>>>>>>> 63ecfb34a19d38a5f2d32ffc33bafb1a27bc750c
}

// UPDATE POLL
export async function updatePoll(pollId: string, formData: FormData) {
  try {
    // Check ownership before update
    const ownershipResult = await requirePollOwnership(pollId);
    if (!ownershipResult.success) {
      return { error: ownershipResult.error };
    }

<<<<<<< HEAD
  // Input validation for pollId
  if (!pollId || typeof pollId !== 'string' || pollId.trim().length === 0) {
    return { error: "Invalid poll ID." };
  }

  const question = formData.get("question") as string;
  const options = formData.getAll("options").filter(Boolean) as string[];

  // Input validation and sanitization
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return { error: "Please provide a valid question." };
  }
  if (!Array.isArray(options) || options.length < 2) {
    return { error: "Please provide at least two valid options." };
  }
  if (question.trim().length > 500) {
    return { error: "Question must be less than 500 characters." };
  }
  if (options.some(option => typeof option !== 'string' || option.trim().length === 0 || option.trim().length > 200)) {
    return { error: "All options must be valid and less than 200 characters." };
  }
  if (options.length > 10) {
    return { error: "Maximum 10 options allowed." };
  }

  // Sanitize inputs
  const sanitizedQuestion = question.trim();
  const sanitizedOptions = options.map(option => option.trim());

  // Check for duplicate options
  const uniqueOptions = [...new Set(sanitizedOptions)];
  if (uniqueOptions.length !== sanitizedOptions.length) {
    return { error: "Duplicate options are not allowed." };
  }

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: userError.message };
  }
  if (!user) {
    return { error: "You must be logged in to update a poll." };
  }

  // Only allow updating polls owned by the user
  const { error } = await supabase
    .from("polls")
    .update({ question: sanitizedQuestion, options: sanitizedOptions })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
=======
    const question = formData.get("question") as string;
    const options = formData.getAll("options").filter(Boolean) as string[];

    // Input validation and sanitization
    const validation = validateCreatePoll({ question, options });
    if (!validation.isValid) {
      return { error: validation.error };
    }

    const { sanitizedData } = validation;
    const supabase = await createClient();

    // Only allow updating polls owned by the user
    const { error } = await supabase
      .from("polls")
      .update({ 
        question: sanitizedData.question, 
        options: sanitizedData.options 
      })
      .eq("id", pollId)
      .eq("user_id", ownershipResult.user.id);

    if (error) {
      return { error: sanitizeError(error) };
    }

    revalidatePath("/polls");
    return { error: null };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

// ADMIN: GET ALL POLLS (with proper authorization)
export async function getAllPolls() {
  try {
    const { requireAdmin } = await import("@/lib/security");
    const adminResult = await requireAdmin();
    if (!adminResult.success) {
      return { polls: [], error: adminResult.error };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return { polls: [], error: sanitizeError(error) };
    }
    return { polls: data ?? [], error: null };
  } catch (error) {
    return { polls: [], error: sanitizeError(error) };
  }
}

// ADMIN: DELETE ANY POLL (with proper authorization)
export async function adminDeletePoll(id: string) {
  try {
    const { requireAdmin } = await import("@/lib/security");
    const adminResult = await requireAdmin();
    if (!adminResult.success) {
      return { error: adminResult.error };
    }

    // Validate poll ID format
    const idValidation = validatePollId(id);
    if (!idValidation.isValid) {
      return { error: idValidation.error };
    }

    const supabase = await createClient();
    
    // Delete associated votes first
    await supabase.from("votes").delete().eq("poll_id", id);
    
    // Delete the poll
    const { error } = await supabase
      .from("polls")
      .delete()
      .eq("id", id);

    if (error) {
      return { error: sanitizeError(error) };
    }
    
    revalidatePath("/admin");
    return { error: null };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
>>>>>>> 63ecfb34a19d38a5f2d32ffc33bafb1a27bc750c
}
