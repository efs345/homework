export const EMPLOYEES = [
  { name: 'Richard "Call Me Dick" Darling', short: "Richard", role: "salesperson" },
  { name: "Anastasia Ferrari", short: "Anastasia", role: "salesperson" },
  { name: "Jean-Claude Bērziņš", short: "Jean-Claude", role: "salesperson" },
  { name: "Kevin von Whatever", short: "Kevin", role: "expense_reporter" },
  { name: "Svetlana de Monte Carlo", short: "Svetlana", role: "manager" },
];

export function employeeByName(name) {
  return EMPLOYEES.find((e) => e.name === name);
}

export function shortName(name) {
  return employeeByName(name)?.short || name;
}
