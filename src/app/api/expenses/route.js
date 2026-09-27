import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { employeeByName } from "@/lib/roles";
import { syncExpense } from "@/lib/sheets";

export async function POST(req) {
  try {
    const b = await req.json();
    const actor = employeeByName(b.actor);
    if (!actor || actor.role !== "expense_reporter") {
      return NextResponse.json({ error: "Only Kevin can submit an expense." }, { status: 403 });
    }
    const required = ["reference","description","category","amount","allocation"];
    for (const k of required) if (!String(b[k] ?? "").trim()) {
      return NextResponse.json({ error: `Missing required field: ${k}` }, { status: 400 });
    }
    if (!["Materials","Travel","Other"].includes(b.category)) return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    if (!["A","B","Company overhead"].includes(b.allocation)) return NextResponse.json({ error: "Invalid allocation." }, { status: 400 });
    if (!(Number(b.amount) > 0)) return NextResponse.json({ error: "Amount must be greater than zero." }, { status: 400 });

    const db = supabaseAdmin();
    const { data: emp } = await db.from("employees").select("*").eq("name", actor.name).single();
    const overhead = b.allocation === "Company overhead";

    const row = {
      reference: b.reference.trim(),
      reporter: actor.name,
      description: b.description.trim(),
      category: b.category,
      amount: Number(b.amount),
      proposed_allocation: b.allocation,
      final_allocation: overhead ? "Company overhead" : null,
      status: overhead ? "Allocated" : "Awaiting allocation",
      telegram_chat_id: emp?.telegram_chat_id || null,
      sheets_sync_status: "pending",
      notification_status: null
    };

    const { data, error } = await db.from("expenses").insert(row).select().single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Duplicate reference." }, { status: 409 });
      throw error;
    }

    try {
      await syncExpense(data);
      await db.from("expenses").update({ sheets_sync_status: "synced" }).eq("id", data.id);
      data.sheets_sync_status = "synced";
    } catch {
      await db.from("expenses").update({ sheets_sync_status: "failed" }).eq("id", data.id);
      data.sheets_sync_status = "failed";
    }

    return NextResponse.json({ ok: true, expense: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
