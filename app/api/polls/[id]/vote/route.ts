// app/api/polls/[id]/vote/route.ts

import { createClient } from "@/lib/supabase/server";
import { validateVote } from "@/lib/validation";
import { checkRateLimit, sanitizeError } from "@/lib/security";
import { NextResponse } from "next/server";

// SUBMIT VOTE
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const pollId = params.id;
    if (!checkRateLimit(`vote_${pollId}`, 5, 60000)) { // 5 votes per minute per poll
      return NextResponse.json({ error: "Too many votes. Please try again later." }, { status: 429 });
    }

    const { optionIndex } = await request.json();

    const validation = validateVote({ pollId, optionIndex });
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("options")
      .eq("id", pollId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return NextResponse.json({ error: "Invalid option selected" }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: existingVote } = await supabase
        .from("votes")
        .select("id")
        .eq("poll_id", pollId)
        .eq("user_id", user.id)
        .single();

      if (existingVote) {
        return NextResponse.json({ error: "You have already voted on this poll" }, { status: 409 });
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
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }
    return NextResponse.json({ error: null }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}