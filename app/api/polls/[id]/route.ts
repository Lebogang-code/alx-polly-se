// app/api/polls/[id]/route.ts

import { createClient } from "@/lib/supabase/server";
import { validatePollId, validateCreatePoll } from "@/lib/validation";
import { requirePollOwnership, sanitizeError } from "@/lib/security";
import { NextResponse } from "next/server";

// GET POLL BY ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const idValidation = validatePollId(id);
    if (!idValidation.isValid) {
      return NextResponse.json({ poll: null, error: idValidation.error }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ poll: null, error: sanitizeError(error) }, { status: 404 });
    }
    return NextResponse.json({ poll: data, error: null }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ poll: null, error: sanitizeError(error) }, { status: 500 });
  }
}

// DELETE POLL
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const ownershipResult = await requirePollOwnership(id);
    if (!ownershipResult.success) {
      return NextResponse.json({ error: ownershipResult.error }, { status: 401 });
    }

    const supabase = await createClient();
    
    await supabase.from("votes").delete().eq("poll_id", id);
    
    const { error } = await supabase
      .from("polls")
      .delete()
      .eq("id", id)
      .eq("user_id", ownershipResult.user.id);

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }
    
    return NextResponse.json({ error: null }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}

// UPDATE POLL
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const pollId = params.id;
        const ownershipResult = await requirePollOwnership(pollId);
        if (!ownershipResult.success) {
            return NextResponse.json({ error: ownershipResult.error }, { status: 401 });
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

        const { error } = await supabase
            .from("polls")
            .update({ 
                question: sanitizedData.question, 
                options: sanitizedData.options 
            })
            .eq("id", pollId)
            .eq("user_id", ownershipResult.user.id);

        if (error) {
            return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
        }

        return NextResponse.json({ error: null }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }
}