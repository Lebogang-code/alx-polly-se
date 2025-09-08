// app/api/polls/admin/route.ts

import { createClient } from "@/lib/supabase/server";
import { sanitizeError } from "@/lib/security";
import { NextResponse } from "next/server";

// ADMIN: GET ALL POLLS
export async function GET(request: Request) {
  try {
    const { requireAdmin } = await import("@/lib/security");
    const adminResult = await requireAdmin();
    if (!adminResult.success) {
      return NextResponse.json({ polls: [], error: adminResult.error }, { status: 401 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ polls: [], error: sanitizeError(error) }, { status: 500 });
    }
    return NextResponse.json({ polls: data ?? [], error: null }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ polls: [], error: sanitizeError(error) }, { status: 500 });
  }
}