import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { employeeByName } from "@/lib/roles";
import { syncSale, syncExpense } from "@/lib/sheets";

export async function POST(req) {
  try {
    const b = await req.json();
    const actor = employeeByName(b.actor);
    if (!actor) return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    const db = supabaseAdmin();

    if (b.type === "sale") {
      const { data } = await db.from("sales").select("*").eq("reference", b.reference).single();
      if (!data) return NextResponse.json({ error: "Sale not found." }, { status: 404 });
      if (actor.role !== "manager" && data.salesperson !== actor.name) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      await syncSale(data);
      await db.from("sales").update({ sheets_sync_status: "synced" }).eq("id", data.id);
    } else if (b.type === "expense") {
      const { data } = await db.from("expenses").select("*").eq("reference", b.reference).single();
      if (!data) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
      if (actor.role !== "manager" && data.reporter !== actor.name) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      await syncExpense(data);
      await db.from("expenses").update({ sheets_sync_status: "synced" }).eq("id", data.id);
    } else return NextResponse.json({ error: "Invalid type." }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
