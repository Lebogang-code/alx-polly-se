"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// CREATE POLL
export async function createPoll(formData: FormData) {
  const supabase = await createClient();

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
    return { error: "You must be logged in to create a poll." };
  }

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
}

// GET USER POLLS
export async function getUserPolls() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { polls: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { polls: [], error: error.message };
  return { polls: data ?? [], error: null };
}

// GET POLL BY ID
export async function getPollById(id: string) {
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

  if (error) return { poll: null, error: error.message };
  return { poll: data, error: null };
}

// SUBMIT VOTE
export async function submitVote(pollId: string, optionIndex: number) {
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

  if (error) return { error: error.message };
  return { error: null };
}

// DELETE POLL
export async function deletePoll(id: string) {
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
}

// UPDATE POLL
export async function updatePoll(pollId: string, formData: FormData) {
  const supabase = await createClient();

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
}
