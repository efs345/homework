import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { employeeByName } from "@/lib/roles";

export async function POST(req) {
  try {
    const b = await req.json();
    const actor = employeeByName(b.actor);
    if (!actor || actor.role !== "manager") return NextResponse.json({ error: "Manager permission required." }, { status: 403 });
    if (!employeeByName(b.employee)) return NextResponse.json({ error: "Unknown employee." }, { status: 400 });
    if (!String(b.telegramUserId || "").trim() || !String(b.telegramChatId || "").trim()) {
      return NextResponse.json({ error: "Telegram user ID and chat ID are required." }, { status: 400 });
    }

    const db = supabaseAdmin();
    // Remove this Telegram identity from any previous fictional employee.
    await db.from("employees")
      .update({ telegram_user_id: null, telegram_chat_id: null })
      .eq("telegram_user_id", String(b.telegramUserId).trim());

    const { data, error } = await db.from("employees").update({
      telegram_user_id: String(b.telegramUserId).trim(),
      telegram_chat_id: String(b.telegramChatId).trim()
    }).eq("name", b.employee).select().single();
    if (error) throw error;

    return NextResponse.json({ ok: true, employee: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
