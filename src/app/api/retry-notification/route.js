import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { employeeByName } from "@/lib/roles";
import { sendTelegram } from "@/lib/telegram";

export async function POST(req) {
  try {
    const b = await req.json();
    const actor = employeeByName(b.actor);
    if (!actor || actor.role !== "manager") return NextResponse.json({ error: "Manager permission required." }, { status: 403 });
    const db = supabaseAdmin();

    if (b.type === "sale") {
      const { data: s } = await db.from("sales").select("*").eq("reference", b.reference).single();
      if (!s?.telegram_chat_id) throw new Error("No Telegram recipient linked.");
      const pool = Number(s.richard_commission) + Number(s.anastasia_commission) + Number(s.jean_claude_commission);
      const txt =
        `Sale ${s.reference} approved. Sale €${Number(s.amount).toFixed(2)}; total commission €${pool.toFixed(2)}. ` +
        `Richard: ${s.approved_richard_pct}% (€${Number(s.richard_commission).toFixed(2)}). ` +
        `Anastasia: ${s.approved_anastasia_pct}% (€${Number(s.anastasia_commission).toFixed(2)}). ` +
        `Jean-Claude: ${s.approved_jean_claude_pct}% (€${Number(s.jean_claude_commission).toFixed(2)}).`;
      await sendTelegram(s.telegram_chat_id, txt);
      await db.from("sales").update({ notification_status: "sent" }).eq("id", s.id);
    } else if (b.type === "expense") {
      const { data: e } = await db.from("expenses").select("*").eq("reference", b.reference).single();
      if (!e?.telegram_chat_id) throw new Error("No Telegram recipient linked.");
      const txt = `Expense ${e.reference} — allocation confirmed. €${Number(e.amount).toFixed(2)}: ${e.description}. Approved: ${e.final_allocation}.`;
      await sendTelegram(e.telegram_chat_id, txt);
      await db.from("expenses").update({ notification_status: "sent" }).eq("id", e.id);
    } else throw new Error("Invalid type.");

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
