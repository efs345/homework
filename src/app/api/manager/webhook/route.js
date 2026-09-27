import { NextResponse } from "next/server";
import { employeeByName } from "@/lib/roles";
import { setTelegramWebhook } from "@/lib/telegram";

export async function POST(req) {
  try {
    const b = await req.json();
    const actor = employeeByName(b.actor);
    if (!actor || actor.role !== "manager") return NextResponse.json({ error: "Manager permission required." }, { status: 403 });
    if (!/^https:\/\//.test(b.baseUrl || "")) return NextResponse.json({ error: "Enter the HTTPS Vercel base URL." }, { status: 400 });
    const data = await setTelegramWebhook(b.baseUrl);
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
