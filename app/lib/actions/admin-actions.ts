"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Define admin user IDs (in a real app, this would be in a database or environment variable)
const ADMIN_USER_IDS = [
  // Add actual admin user IDs here
  // For demo purposes, this list is empty - no one has admin access
];

// Check if user is admin
export async function isUserAdmin(userId: string): Promise<boolean> {
  return ADMIN_USER_IDS.includes(userId);
}

// Admin function to delete any poll
export async function adminDeletePoll(id: string) {
  const supabase = await createClient();
  
  // Input validation
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return { error: "Invalid poll ID." };
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
    return { error: "You must be logged in to perform this action." };
  }

  // Check if user is admin
  const isAdmin = await isUserAdmin(user.id);
  if (!isAdmin) {
    return { error: "Unauthorized: Admin access required." };
  }

  // Delete the poll (admin can delete any poll)
  const { error } = await supabase
    .from("polls")
    .delete()
    .eq("id", id.trim());
    
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/polls");
  return { error: null };
}

// Admin function to get all polls
export async function adminGetAllPolls() {
  const supabase = await createClient();

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { polls: [], error: userError.message };
  }
  if (!user) {
    return { polls: [], error: "You must be logged in to perform this action." };
  }

  // Check if user is admin
  const isAdmin = await isUserAdmin(user.id);
  if (!isAdmin) {
    return { polls: [], error: "Unauthorized: Admin access required." };
  }

  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { polls: [], error: error.message };
  return { polls: data ?? [], error: null };
}