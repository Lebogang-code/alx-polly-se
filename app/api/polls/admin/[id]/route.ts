// app/api/polls/admin/[id]/route.ts

import { createClient } from "@/lib/supabase/server";
import { validatePollId } from "@/lib/validation";
import { sanitizeError } from "@/lib/security";
import { NextResponse } from "next/server";

// ADMIN: DELETE ANY POLL
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { requireAdmin } = await import("@/lib/security");
    const adminResult = await requireAdmin();
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: 401 });
    }

    const id = params.id;
    const idValidation = validatePollId(id);
    if (!idValidation.isValid) {
      return NextResponse.json({ error: idValidation.error }, { status: 400 });
    }

    const supabase = await createClient();
    
    await supabase.from("votes").delete().eq("poll_id", id);
    
    const { error } = await supabase
      .from("polls")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }
    
    return NextResponse.json({ err
      or: null }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}