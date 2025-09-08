// app/api/polls/route.ts

import { createClient } from "@/lib/supabase/server";
import { validateCreatePoll } from "@/lib/validation";
import { requireAuth, checkRateLimit, sanitizeError } from "@/lib/security";
import { NextResponse } from "next/server";
import { get } from "http";

// CREATE POLL
export async function POST(request: Request) {
  try {
    const clientIP = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!checkRateLimit(`create_poll_${clientIP}`, 10, 300000)) { // 10 requests per 5 minutes
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const authResult = await requireAuth();
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const formData = await request.formData();
    const question = formData.get("question") as string;
    const options = formData.getAll("options").filter(Boolean) as string[];

    const validation = validateCreatePoll({ question, options });
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
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
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ error: null }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}

// GET USER POLLS
export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return NextResponse.json({ polls: [], error: authResult.error }, { status: 401 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .eq("user_id", authResult.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ polls: [], error: sanitizeError(error) }, { status: 500 });
    }
    return NextResponse.json({ polls: data ?? [], error: null }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ polls: [], error: sanitizeError(error) }, { status: 500 });
  }
}