"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateCreatePoll, validateVote, validatePollId } from "@/lib/validation";
import { requireAuth, requirePollOwnership, checkRateLimit, sanitizeError } from "@/lib/security";

// CREATE POLL
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
}

// GET USER POLLS
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
export async function getPollById(id: string) {
  try {
    // Validate poll ID format
    const idValidation = validatePollId(id);
    if (!idValidation.isValid) {
      return { poll: null, error: idValidation.error };
    }

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
export async function submitVote(pollId: string, optionIndex: number) {
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
export async function deletePoll(id: string) {
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
}

// UPDATE POLL
export async function updatePoll(pollId: string, formData: FormData) {
  try {
    // Check ownership before update
    const ownershipResult = await requirePollOwnership(pollId);
    if (!ownershipResult.success) {
      return { error: ownershipResult.error };
    }

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
}
