import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { employeeByName } from "@/lib/roles";
import { validateSplit, calculateCommissions } from "@/lib/finance";
import { syncSale } from "@/lib/sheets";
import { sendTelegram } from "@/lib/telegram";

export async function POST(req) {
  try {
    const b = await req.json();
    const actor = employeeByName(b.actor);
    if (!actor || actor.role !== "manager") return NextResponse.json({ error: "Manager permission required." }, { status: 403 });

    const split = validateSplit(b.richard, b.anastasia, b.jeanClaude);
    if (!split.ok) return NextResponse.json({ error: split.message }, { status: 400 });

    const db = supabaseAdmin();
    const { data: sale, error } = await db.from("sales").select("*").eq("reference", b.reference).single();
    if (error || !sale) return NextResponse.json({ error: "Sale not found." }, { status: 404 });
    if (sale.status === "Approved") return NextResponse.json({ ok: true, message: "Already approved; totals unchanged.", sale });

    const calc = calculateCommissions(sale.amount, split.values);
    const update = {
      approved_richard_pct: split.values[0],
      approved_anastasia_pct: split.values[1],
      approved_jean_claude_pct: split.values[2],
      richard_commission: calc.individual[0],
      anastasia_commission: calc.individual[1],
      jean_claude_commission: calc.individual[2],
      status: "Approved",
      sheets_sync_status: "pending",
      notification_status: sale.telegram_chat_id ? "pending" : "No Telegram recipient linked"
    };

    const { data: approved, error: ue } = await db.from("sales").update(update).eq("id", sale.id).select().single();
    if (ue) throw ue;

    try {
      await syncSale(approved);
      await db.from("sales").update({ sheets_sync_status: "synced" }).eq("id", approved.id);
      approved.sheets_sync_status = "synced";
    } catch {
      await db.from("sales").update({ sheets_sync_status: "failed" }).eq("id", approved.id);
      approved.sheets_sync_status = "failed";
    }

    const changed =
      Number(sale.proposed_richard_pct) !== split.values[0] ||
      Number(sale.proposed_anastasia_pct) !== split.values[1] ||
      Number(sale.proposed_jean_claude_pct) !== split.values[2];

    if (sale.telegram_chat_id) {
      const txt =
        `Sale ${sale.reference} approved${changed ? " — commission split changed" : ""}. ` +
        `Sale €${Number(sale.amount).toFixed(2)}; total commission €${calc.pool.toFixed(2)}. ` +
        `Richard: ${Number(sale.proposed_richard_pct)}% → ${split.values[0]}% (€${calc.individual[0].toFixed(2)}). ` +
        `Anastasia: ${Number(sale.proposed_anastasia_pct)}% → ${split.values[1]}% (€${calc.individual[1].toFixed(2)}). ` +
        `Jean-Claude: ${Number(sale.proposed_jean_claude_pct)}% → ${split.values[2]}% (€${calc.individual[2].toFixed(2)}).`;
      try {
        await sendTelegram(sale.telegram_chat_id, txt);
        await db.from("sales").update({ notification_status: "sent" }).eq("id", approved.id);
        approved.notification_status = "sent";
      } catch {
        await db.from("sales").update({ notification_status: "failed" }).eq("id", approved.id);
        approved.notification_status = "failed";
      }
    }

    return NextResponse.json({ ok: true, sale: approved });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
