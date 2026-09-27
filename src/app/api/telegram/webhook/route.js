import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { validateSplit } from "@/lib/finance";
import { syncSale, syncExpense } from "@/lib/sheets";
import { sendTelegram } from "@/lib/telegram";

function parts(text) {
  return text.split("|").map((x) => x.trim());
}

export async function POST(req) {
  try {
    const update = await req.json();
    const msg = update.message;
    if (!msg?.text || !msg.from?.id || !msg.chat?.id) return NextResponse.json({ ok: true });

    const userId = String(msg.from.id);
    const chatId = String(msg.chat.id);
    const text = msg.text.trim();
    const db = supabaseAdmin();

    if (text === "/whoami") {
      await sendTelegram(chatId, `Telegram user ID: ${userId}\nTelegram chat ID: ${chatId}`);
      return NextResponse.json({ ok: true });
    }

    const { data: employee } = await db.from("employees").select("*").eq("telegram_user_id", userId).maybeSingle();
    if (!employee) {
      await sendTelegram(chatId, "Your Telegram account is not linked to a fictional employee. Ask the manager to link it.");
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/sale")) {
      if (employee.role !== "salesperson") {
        await sendTelegram(chatId, "Permission denied: only salespeople can submit sales.");
        return NextResponse.json({ ok: true });
      }

      const p = parts(text.replace(/^\/sale\s*/, ""));
      if (p.length !== 8) {
        await sendTelegram(chatId, "Use: /sale REF | Customer | A/B | Description | Amount | Richard% | Anastasia% | Jean-Claude%");
        return NextResponse.json({ ok: true });
      }
      const [reference, customer, project, description, amount, r, a, j] = p;
      if (!reference || !customer || !["A","B"].includes(project) || !description || !(Number(amount) > 0)) {
        await sendTelegram(chatId, "Sale rejected: check reference, customer, project A/B, description, and positive amount.");
        return NextResponse.json({ ok: true });
      }
      const split = validateSplit(r,a,j);
      if (!split.ok) {
        await sendTelegram(chatId, `Sale rejected: ${split.message}`);
        return NextResponse.json({ ok: true });
      }

      const { data, error } = await db.from("sales").insert({
        reference, salesperson: employee.name, customer, project, description, amount: Number(amount),
        proposed_richard_pct: split.values[0], proposed_anastasia_pct: split.values[1], proposed_jean_claude_pct: split.values[2],
        status: "Pending approval", telegram_chat_id: chatId, sheets_sync_status: "pending"
      }).select().single();

      if (error) {
        await sendTelegram(chatId, error.code === "23505" ? "Sale rejected: duplicate reference." : `Sale failed: ${error.message}`);
        return NextResponse.json({ ok: true });
      }

      try {
        await syncSale(data);
        await db.from("sales").update({ sheets_sync_status: "synced" }).eq("id", data.id);
      } catch {
        await db.from("sales").update({ sheets_sync_status: "failed" }).eq("id", data.id);
      }

      await sendTelegram(chatId, `Recorded ${reference}. €${Number(amount).toFixed(2)}, Project ${project}, status: Pending approval.`);
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/expense")) {
      if (employee.role !== "expense_reporter") {
        await sendTelegram(chatId, "Permission denied: only Kevin can submit expenses.");
        return NextResponse.json({ ok: true });
      }
      const p = parts(text.replace(/^\/expense\s*/, ""));
      if (p.length !== 5) {
        await sendTelegram(chatId, "Use: /expense REF | Description | Materials/Travel/Other | Amount | A/B/Company overhead");
        return NextResponse.json({ ok: true });
      }
      const [reference, description, category, amount, allocation] = p;
      if (!reference || !description || !["Materials","Travel","Other"].includes(category) || !(Number(amount) > 0) ||
          !["A","B","Company overhead"].includes(allocation)) {
        await sendTelegram(chatId, "Expense rejected: check required fields, category, positive amount, and allocation.");
        return NextResponse.json({ ok: true });
      }
      const overhead = allocation === "Company overhead";
      const { data, error } = await db.from("expenses").insert({
        reference, reporter: employee.name, description, category, amount: Number(amount),
        proposed_allocation: allocation,
        final_allocation: overhead ? "Company overhead" : null,
        status: overhead ? "Allocated" : "Awaiting allocation",
        telegram_chat_id: chatId, sheets_sync_status: "pending"
      }).select().single();

      if (error) {
        await sendTelegram(chatId, error.code === "23505" ? "Expense rejected: duplicate reference." : `Expense failed: ${error.message}`);
        return NextResponse.json({ ok: true });
      }

      try {
        await syncExpense(data);
        await db.from("expenses").update({ sheets_sync_status: "synced" }).eq("id", data.id);
      } catch {
        await db.from("expenses").update({ sheets_sync_status: "failed" }).eq("id", data.id);
      }

      await sendTelegram(chatId, `Recorded ${reference}. €${Number(amount).toFixed(2)}, proposed allocation: ${allocation}, status: ${overhead ? "Allocated" : "Awaiting allocation"}.`);
      return NextResponse.json({ ok: true });
    }

    await sendTelegram(chatId,
      "Commands:\n/whoami\n/sale REF | Customer | A/B | Description | Amount | Richard% | Anastasia% | Jean-Claude%\n/expense REF | Description | Materials/Travel/Other | Amount | A/B/Company overhead"
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: true });
  }
}
