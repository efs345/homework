"use client";

import { useEffect, useMemo, useState } from "react";

const employees = [
  { name: 'Richard "Call Me Dick" Darling', label: "Richard — Salesperson", role: "salesperson" },
  { name: "Anastasia Ferrari", label: "Anastasia — Salesperson", role: "salesperson" },
  { name: "Jean-Claude Bērziņš", label: "Jean-Claude — Salesperson", role: "salesperson" },
  { name: "Kevin von Whatever", label: "Kevin — Expense reporter", role: "expense_reporter" },
  { name: "Svetlana de Monte Carlo", label: "Svetlana — Manager", role: "manager" },
];

const money = (x) => `€${Number(x || 0).toFixed(2)}`;

async function api(url, body) {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export default function Home() {
  const [role, setRole] = useState(employees[0].name);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("");
  const actor = employees.find((e) => e.name === role);

  const load = async () => {
    try {
      const d = await api(`/api/data?role=${encodeURIComponent(role)}`);
      setData(d);
    } catch (e) { setMsg(e.message); }
  };
  useEffect(() => { load(); }, [role]);

  return (
    <main>
      <h1>Friends Included Finance System</h1>
      <div className="small">Wedding Guests for Hire — Day 4 homework</div>
      <div className="small">Student: {process.env.NEXT_PUBLIC_STUDENT_NAME || "Vladislavs Grigorjevs"}</div>

      <div className="card">
        <label>Demonstration role</label>
        <select value={role} onChange={(e) => { setRole(e.target.value); setMsg(""); }}>
          {employees.map((e) => <option key={e.name} value={e.name}>{e.label}</option>)}
        </select>
        <div className="small">Permissions are also checked by the server, not only by hidden buttons.</div>
      </div>

      {msg && <div className="msg">{msg}</div>}

      {actor.role === "salesperson" && <SaleForm actor={role} done={(m) => { setMsg(m); load(); }} />}
      {actor.role === "expense_reporter" && <ExpenseForm actor={role} done={(m) => { setMsg(m); load(); }} />}
      {actor.role === "manager" && <Manager data={data} actor={role} done={(m) => { setMsg(m); load(); }} />}

      <Records data={data} actor={role} reload={load} setMsg={setMsg} />

      <div className="card links">
        <h2>Project links</h2>
        <a href={process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || "#"} target="_blank">Telegram bot</a>
        <span className="small">Add the Google Sheets and GitHub links here after deployment.</span>
      </div>
    </main>
  );
}

function SaleForm({ actor, done }) {
  const [f, setF] = useState({ reference:"",customer:"",project:"A",description:"",amount:"",richard:"",anastasia:"",jeanClaude:"" });
  const submit = async (e) => {
    e.preventDefault();
    try {
      const d = await api("/api/sales", { ...f, actor });
      done(`Sale ${d.sale.reference} saved. Status: ${d.sale.status}. Sheets: ${d.sale.sheets_sync_status}.`);
      setF({ reference:"",customer:"",project:"A",description:"",amount:"",richard:"",anastasia:"",jeanClaude:"" });
    } catch (e) { done(e.message); }
  };
  return <div className="card"><h2>Submit sale</h2><form onSubmit={submit}>
    <div className="grid two">
      <Field label="Reference" value={f.reference} set={(v)=>setF({...f,reference:v})} />
      <Field label="Customer" value={f.customer} set={(v)=>setF({...f,customer:v})} />
    </div>
    <label>Project</label><select value={f.project} onChange={e=>setF({...f,project:e.target.value})}><option>A</option><option>B</option></select>
    <label>Description</label><textarea value={f.description} onChange={e=>setF({...f,description:e.target.value})} />
    <Field label="Amount (€)" type="number" step="0.01" value={f.amount} set={(v)=>setF({...f,amount:v})} />
    <div className="grid three">
      <Field label="Richard %" type="number" value={f.richard} set={(v)=>setF({...f,richard:v})} />
      <Field label="Anastasia %" type="number" value={f.anastasia} set={(v)=>setF({...f,anastasia:v})} />
      <Field label="Jean-Claude %" type="number" value={f.jeanClaude} set={(v)=>setF({...f,jeanClaude:v})} />
    </div>
    <button>Submit sale</button>
  </form></div>;
}

function ExpenseForm({ actor, done }) {
  const [f, setF] = useState({ reference:"",description:"",category:"Materials",amount:"",allocation:"A" });
  const submit = async (e) => {
    e.preventDefault();
    try {
      const d = await api("/api/expenses", { ...f, actor });
      done(`Expense ${d.expense.reference} saved. Status: ${d.expense.status}. Sheets: ${d.expense.sheets_sync_status}.`);
      setF({ reference:"",description:"",category:"Materials",amount:"",allocation:"A" });
    } catch (e) { done(e.message); }
  };
  return <div className="card"><h2>Submit expense</h2><form onSubmit={submit}>
    <Field label="Reference" value={f.reference} set={(v)=>setF({...f,reference:v})} />
    <label>Description</label><textarea value={f.description} onChange={e=>setF({...f,description:e.target.value})} />
    <label>Category</label><select value={f.category} onChange={e=>setF({...f,category:e.target.value})}><option>Materials</option><option>Travel</option><option>Other</option></select>
    <Field label="Amount (€)" type="number" step="0.01" value={f.amount} set={(v)=>setF({...f,amount:v})} />
    <label>Proposed allocation</label><select value={f.allocation} onChange={e=>setF({...f,allocation:e.target.value})}><option>A</option><option>B</option><option>Company overhead</option></select>
    <button>Submit expense</button>
  </form></div>;
}

function Manager({ data, actor, done }) {
  if (!data) return null;
  const d = data.dashboard;
  return <>
    <div className="card"><h2>Financial dashboard</h2>
      <table><thead><tr><th>Measure</th><th>Project A</th><th>Project B</th><th>Company</th></tr></thead>
      <tbody>
        <tr><td>Approved income</td><td>{money(d.project.A.income)}</td><td>{money(d.project.B.income)}</td><td>{money(d.totalIncome)}</td></tr>
        <tr><td>Commission expense</td><td>{money(d.project.A.commission)}</td><td>{money(d.project.B.commission)}</td><td>{money(d.totalCommission)}</td></tr>
        <tr><td>Allocated project expenses</td><td>{money(d.project.A.expenses)}</td><td>{money(d.project.B.expenses)}</td><td>{money(d.allocatedProjectExpenses)}</td></tr>
        <tr><td>Company overhead</td><td>—</td><td>—</td><td>{money(d.overhead)}</td></tr>
        <tr><td>Expenses awaiting allocation</td><td>—</td><td>—</td><td>{money(d.awaiting)}</td></tr>
        <tr><td><b>Result</b></td><td><b>{money(d.project.A.result)}</b></td><td><b>{money(d.project.B.result)}</b></td><td><b>{money(d.companyResult)}</b></td></tr>
      </tbody></table>
      <p><b>Commission earned:</b> Richard {money(d.earned.Richard)}; Anastasia {money(d.earned.Anastasia)}; Jean-Claude {money(d.earned["Jean-Claude"])}.</p>
    </div>

    <div className="grid two">
      <div className="card"><h2>Pending sale approvals</h2>
        {data.sales.filter(s=>s.status==="Pending approval").map(s=><SaleApproval key={s.id} sale={s} actor={actor} done={done} />)}
        {!data.sales.some(s=>s.status==="Pending approval") && <div className="small">No pending sales.</div>}
      </div>
      <div className="card"><h2>Pending expense allocations</h2>
        {data.expenses.filter(e=>e.status==="Awaiting allocation").map(e=><ExpenseApproval key={e.id} expense={e} actor={actor} done={done} />)}
        {!data.expenses.some(e=>e.status==="Awaiting allocation") && <div className="small">No pending expenses.</div>}
      </div>
    </div>

    <Setup actor={actor} employees={data.employees} done={done} />
  </>;
}

function SaleApproval({ sale, actor, done }) {
  const [r,setR]=useState(sale.proposed_richard_pct);
  const [a,setA]=useState(sale.proposed_anastasia_pct);
  const [j,setJ]=useState(sale.proposed_jean_claude_pct);
  const submit=async()=>{
    try{
      const d=await api("/api/manager/sale",{actor,reference:sale.reference,richard:r,anastasia:a,jeanClaude:j});
      done(`Sale ${sale.reference} approved. Sheets: ${d.sale.sheets_sync_status}. Telegram: ${d.sale.notification_status}.`);
    }catch(e){done(e.message)}
  };
  return <div className="card">
    <b>{sale.reference}</b> — {sale.customer}, Project {sale.project}, {money(sale.amount)}
    <div className="small">{sale.description}</div>
    <div className="small">Original split: {sale.proposed_richard_pct}/{sale.proposed_anastasia_pct}/{sale.proposed_jean_claude_pct}%</div>
    <div className="grid three">
      <Field label="Richard %" type="number" value={r} set={setR}/>
      <Field label="Anastasia %" type="number" value={a} set={setA}/>
      <Field label="Jean-Claude %" type="number" value={j} set={setJ}/>
    </div>
    <button onClick={submit}>Approve sale</button>
  </div>;
}

function ExpenseApproval({ expense, actor, done }) {
  const [allocation,setAllocation]=useState(expense.proposed_allocation);
  const submit=async()=>{
    try{
      const d=await api("/api/manager/expense",{actor,reference:expense.reference,allocation});
      done(`Expense ${expense.reference} allocated to ${allocation}. Sheets: ${d.expense.sheets_sync_status}. Telegram: ${d.expense.notification_status}.`);
    }catch(e){done(e.message)}
  };
  return <div className="card">
    <b>{expense.reference}</b> — {money(expense.amount)}
    <div className="small">{expense.description}</div>
    <div className="small">Proposed: {expense.proposed_allocation}</div>
    <label>Final allocation</label>
    <select value={allocation} onChange={e=>setAllocation(e.target.value)}><option>A</option><option>B</option><option>Company overhead</option></select>
    <button onClick={submit}>Confirm allocation</button>
  </div>;
}

function Setup({ actor, employees, done }) {
  const [employee,setEmployee]=useState(employees?.[0]?.name || "");
  const [uid,setUid]=useState("");
  const [cid,setCid]=useState("");
  const [base,setBase]=useState("");
  const link=async()=>{
    try{await api("/api/manager/link",{actor,employee,telegramUserId:uid,telegramChatId:cid});done(`Telegram linked to ${employee}.`)}
    catch(e){done(e.message)}
  };
  const webhook=async()=>{
    try{const d=await api("/api/manager/webhook",{actor,baseUrl:base});done(`Telegram webhook set to ${d.url}`)}
    catch(e){done(e.message)}
  };
  return <div className="card"><h2>Manager setup</h2>
    <p className="small">In Telegram send <b>/whoami</b>, then enter the returned IDs here. Changing a link later does not change chat IDs already stored on old submissions.</p>
    <label>Employee</label><select value={employee} onChange={e=>setEmployee(e.target.value)}>{employees?.map(e=><option key={e.id} value={e.name}>{e.name}</option>)}</select>
    <div className="grid two">
      <Field label="Telegram user ID" value={uid} set={setUid}/>
      <Field label="Telegram chat ID" value={cid} set={setCid}/>
    </div>
    <button onClick={link}>Link Telegram account</button>
    <hr />
    <Field label="Deployed Vercel base URL" value={base} set={setBase} placeholder="https://your-project.vercel.app"/>
    <button onClick={webhook}>Set Telegram webhook</button>
  </div>;
}

function Records({ data, actor, reload, setMsg }) {
  if (!data) return null;
  const retry = async(type,reference)=>{
    try{await api("/api/retry-sync",{actor,type,reference});setMsg(`Sheets sync retried for ${reference}.`);reload()}
    catch(e){setMsg(e.message)}
  };
  const retryNotif = async(type,reference)=>{
    try{await api("/api/retry-notification",{actor,type,reference});setMsg(`Telegram notification retried for ${reference}.`);reload()}
    catch(e){setMsg(e.message)}
  };
  return <div className="card"><h2>Records</h2>
    {data.sales.length>0 && <><h3>Sales</h3><div style={{overflowX:"auto"}}><table><thead><tr><th>Ref</th><th>Salesperson</th><th>Customer</th><th>Project</th><th>Amount</th><th>Proposal</th><th>Approved</th><th>Commission €</th><th>Status</th><th>Sheets</th><th>Telegram</th></tr></thead>
    <tbody>{data.sales.map(s=><tr key={s.id}><td>{s.reference}</td><td>{s.salesperson}</td><td>{s.customer}</td><td>{s.project}</td><td>{money(s.amount)}</td><td>{s.proposed_richard_pct}/{s.proposed_anastasia_pct}/{s.proposed_jean_claude_pct}</td><td>{s.approved_richard_pct==null?"—":`${s.approved_richard_pct}/${s.approved_anastasia_pct}/${s.approved_jean_claude_pct}`}</td><td>{money(Number(s.richard_commission)+Number(s.anastasia_commission)+Number(s.jean_claude_commission))}</td><td>{s.status}</td><td>{s.sheets_sync_status}{s.sheets_sync_status==="failed"&&<button className="secondary" onClick={()=>retry("sale",s.reference)}>Retry</button>}</td><td>{s.notification_status||"—"}{actor==="Svetlana de Monte Carlo"&&s.notification_status==="failed"&&<button className="secondary" onClick={()=>retryNotif("sale",s.reference)}>Retry</button>}</td></tr>)}</tbody></table></div></>}
    {data.expenses.length>0 && <><h3>Expenses</h3><div style={{overflowX:"auto"}}><table><thead><tr><th>Ref</th><th>Reporter</th><th>Description</th><th>Category</th><th>Amount</th><th>Proposed</th><th>Final</th><th>Status</th><th>Sheets</th><th>Telegram</th></tr></thead>
    <tbody>{data.expenses.map(e=><tr key={e.id}><td>{e.reference}</td><td>{e.reporter}</td><td>{e.description}</td><td>{e.category}</td><td>{money(e.amount)}</td><td>{e.proposed_allocation}</td><td>{e.final_allocation||"—"}</td><td>{e.status}</td><td>{e.sheets_sync_status}{e.sheets_sync_status==="failed"&&<button className="secondary" onClick={()=>retry("expense",e.reference)}>Retry</button>}</td><td>{e.notification_status||"—"}{actor==="Svetlana de Monte Carlo"&&e.notification_status==="failed"&&<button className="secondary" onClick={()=>retryNotif("expense",e.reference)}>Retry</button>}</td></tr>)}</tbody></table></div></>}
  </div>;
}

function Field({label,value,set,type="text",step,placeholder}) {
  return <div><label>{label}</label><input type={type} step={step} value={value} placeholder={placeholder} onChange={e=>set(e.target.value)} /></div>;
}
