import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { computeDashboard } from "@/lib/finance";
import { employeeByName } from "@/lib/roles";

export async function GET(req) {
  try {
    const roleName = new URL(req.url).searchParams.get("role");
    const actor = employeeByName(roleName);
    if (!actor) return NextResponse.json({ error: "Invalid demonstration role." }, { status: 400 });

    const db = supabaseAdmin();
    const [{ data: allSales, error: se }, { data: allExpenses, error: ee }, { data: employees, error: em }] =
      await Promise.all([
        db.from("sales").select("*").order("submitted_at", { ascending: false }),
        db.from("expenses").select("*").order("submitted_at", { ascending: false }),
        db.from("employees").select("*").order("id"),
      ]);
    if (se || ee || em) throw se || ee || em;

    let sales = [];
    let expenses = [];
    if (actor.role === "manager") {
      sales = allSales;
      expenses = allExpenses;
    } else if (actor.role === "salesperson") {
      sales = allSales.filter((s) => s.salesperson === actor.name);
    } else if (actor.role === "expense_reporter") {
      expenses = allExpenses.filter((e) => e.reporter === actor.name);
    }

    return NextResponse.json({
      actor,
      employees,
      sales,
      expenses,
      dashboard: actor.role === "manager" ? computeDashboard(allSales, allExpenses) : null,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
