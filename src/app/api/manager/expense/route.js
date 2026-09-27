import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { employeeByName } from "@/lib/roles";
import { syncExpense } from "@/lib/sheets";
import { sendTelegram } from "@/lib/telegram";

export async function POST(req) {
  try {
    const b = await req.json();
    const actor = employeeByName(b.actor);
    if (!actor || actor.role !== "manager") return NextResponse.json({ error: "Manager permission required." }, { status: 403 });
    if (!["A","B","Company overhead"].includes(b.allocation)) return NextResponse.json({ error: "Invalid allocation." }, { status: 400 });

    const db = supabaseAdmin();
    const { data: expense, error } = await db.from("expenses").select("*").eq("reference", b.reference).single();
    if (error || !expense) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    if (expense.status !== "Awaiting allocation") {
      return NextResponse.json({ ok: true, message: "Already allocated; totals unchanged.", expense });
    }

    const { data: approved, error: ue } = await db.from("expenses").update({
      final_allocation: b.allocation,
      status: "Allocated",
      sheets_sync_status: "pending",
      notification_status: expense.telegram_chat_id ? "pending" : "No Telegram recipient linked"
    }).eq("id", expense.id).select().single();
    if (ue) throw ue;

    try {
      await syncExpense(approved);
      await db.from("expenses").update({ sheets_sync_status: "synced" }).eq("id", approved.id);
      approved.sheets_sync_status = "synced";
    } catch {
      await db.from("expenses").update({ sheets_sync_status: "failed" }).eq("id", approved.id);
      approved.sheets_sync_status = "failed";
    }

    if (expense.telegram_chat_id) {
      const changed = expense.proposed_allocation !== b.allocation;
      const txt =
        `Expense ${expense.reference} — allocation ${changed ? "changed" : "confirmed"}. ` +
        `€${Number(expense.amount).toFixed(2)}: ${expense.description}. ` +
        `Proposed: ${expense.proposed_allocation}. Approved: ${b.allocation}.`;
      try {
        await sendTelegram(expense.telegram_chat_id, txt);
        await db.from("expenses").update({ notification_status: "sent" }).eq("id", approved.id);
        approved.notification_status = "sent";
      } catch {
        await db.from("expenses").update({ notification_status: "failed" }).eq("id", approved.id);
        approved.notification_status = "failed";
      }
    }

    return NextResponse.json({ ok: true, expense: approved });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
