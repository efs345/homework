export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function validateSplit(r, a, j) {
  const vals = [r, a, j].map(Number);
  if (vals.some((x) => Number.isNaN(x) || x < 0 || x > 100)) {
    return { ok: false, message: "Each commission share must be between 0% and 100%." };
  }
  if (Math.round(vals.reduce((s, x) => s + x, 0) * 100) !== 10000) {
    return { ok: false, message: "Commission shares must total exactly 100%." };
  }
  return { ok: true, values: vals };
}

export function calculateCommissions(amount, split) {
  const amountCents = Math.round(Number(amount) * 100);
  const poolCents = Math.round(amountCents * 0.10);
  const raw = split.map((pct) => (poolCents * pct) / 100);
  const cents = raw.map((x) => Math.round(x));
  let diff = poolCents - cents.reduce((s, x) => s + x, 0);

  if (diff !== 0) {
    const maxPct = Math.max(...split);
    // Tie-break: Richard, then Anastasia, then Jean-Claude.
    const recipient = split.findIndex((pct) => pct === maxPct);
    cents[recipient] += diff;
  }

  return {
    pool: poolCents / 100,
    individual: cents.map((x) => x / 100),
  };
}

export function computeDashboard(sales, expenses) {
  const approvedSales = sales.filter((s) => s.status === "Approved");
  const project = {
    A: { income: 0, commission: 0, expenses: 0, result: 0 },
    B: { income: 0, commission: 0, expenses: 0, result: 0 },
  };

  const earned = { Richard: 0, Anastasia: 0, "Jean-Claude": 0 };

  for (const s of approvedSales) {
    const commission =
      Number(s.richard_commission || 0) +
      Number(s.anastasia_commission || 0) +
      Number(s.jean_claude_commission || 0);

    project[s.project].income += Number(s.amount);
    project[s.project].commission += commission;
    earned.Richard += Number(s.richard_commission || 0);
    earned.Anastasia += Number(s.anastasia_commission || 0);
    earned["Jean-Claude"] += Number(s.jean_claude_commission || 0);
  }

  let overhead = 0;
  let awaiting = 0;
  let allExpenses = 0;

  for (const e of expenses) {
    allExpenses += Number(e.amount);
    if (e.status === "Awaiting allocation") {
      awaiting += Number(e.amount);
    } else if (e.final_allocation === "Company overhead") {
      overhead += Number(e.amount);
    } else if (e.final_allocation === "A" || e.final_allocation === "B") {
      project[e.final_allocation].expenses += Number(e.amount);
    }
  }

  for (const key of ["A", "B"]) {
    project[key].result =
      project[key].income - project[key].commission - project[key].expenses;
  }

  const totalIncome = project.A.income + project.B.income;
  const totalCommission = project.A.commission + project.B.commission;
  const companyResult = totalIncome - totalCommission - allExpenses;

  return {
    project,
    overhead,
    awaiting,
    companyResult,
    totalIncome,
    totalCommission,
    allocatedProjectExpenses: project.A.expenses + project.B.expenses,
    earned,
  };
}
