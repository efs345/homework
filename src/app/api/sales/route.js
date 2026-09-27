import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { employeeByName } from "@/lib/roles";
import { validateSplit } from "@/lib/finance";
import { syncSale } from "@/lib/sheets";

export async function POST(req) {
  try {
    const b = await req.json();
    const actor = employeeByName(b.actor);
    if (!actor || actor.role !== "salesperson") {
      return NextResponse.json({ error: "Only a salesperson can submit a sale." }, { status: 403 });
    }

    const required = ["reference","customer","project","description","amount"];
    for (const k of required) if (!String(b[k] ?? "").trim()) {
      return NextResponse.json({ error: `Missing required field: ${k}` }, { status: 400 });
    }
    if (!["A","B"].includes(b.project)) return NextResponse.json({ error: "Project must be A or B." }, { status: 400 });
    if (!(Number(b.amount) > 0)) return NextResponse.json({ error: "Amount must be greater than zero." }, { status: 400 });

    const split = validateSplit(b.richard, b.anastasia, b.jeanClaude);
    if (!split.ok) return NextResponse.json({ error: split.message }, { status: 400 });

    const db = supabaseAdmin();
    const { data: emp } = await db.from("employees").select("*").eq("name", actor.name).single();

    const row = {
      reference: b.reference.trim(),
      salesperson: actor.name,
      customer: b.customer.trim(),
      project: b.project,
      description: b.description.trim(),
      amount: Number(b.amount),
      proposed_richard_pct: split.values[0],
      proposed_anastasia_pct: split.values[1],
      proposed_jean_claude_pct: split.values[2],
      status: "Pending approval",
      telegram_chat_id: emp?.telegram_chat_id || null,
      sheets_sync_status: "pending",
      notification_status: null
    };

    const { data, error } = await db.from("sales").insert(row).select().single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Duplicate reference." }, { status: 409 });
      throw error;
    }

    try {
      await syncSale(data);
      await db.from("sales").update({ sheets_sync_status: "synced" }).eq("id", data.id);
      data.sheets_sync_status = "synced";
    } catch {
      await db.from("sales").update({ sheets_sync_status: "failed" }).eq("id", data.id);
      data.sheets_sync_status = "failed";
    }

    return NextResponse.json({ ok: true, sale: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
