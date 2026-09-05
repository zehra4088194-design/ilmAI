import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type LedgerMonth = { month: string; collected: number; expenses: number };
export type ExpenseRow = {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  paid_via: string;
};

function monthLabel(month: string) {
  const [year, m] = month.split('-');
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

// Simple accounting page: fees collected vs expenses, month by month, no charting library — plain
// bars sized with CSS so it stays dependency-free and matches the rest of the ERP's UI.
export function LedgerSummary({
  summary,
  expenses,
  totalCollected,
  totalExpenses,
  netBalance,
  currency,
}: {
  summary: LedgerMonth[];
  expenses: ExpenseRow[];
  totalCollected: number;
  totalExpenses: number;
  netBalance: number;
  currency: string;
}) {
  const maxValue = Math.max(1, ...summary.flatMap((m) => [m.collected, m.expenses]));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-muted-foreground text-xs font-medium">Fees collected (12 mo)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{currency} {totalCollected.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-muted-foreground text-xs font-medium">Expenses (12 mo)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{currency} {totalExpenses.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-muted-foreground text-xs font-medium">Net balance</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>{currency} {netBalance.toLocaleString()}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Collected vs expenses, by month</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 overflow-x-auto pb-2">
            {summary.map((m) => (
              <div key={m.month} className="flex min-w-[52px] flex-col items-center gap-1">
                <div className="flex h-32 items-end gap-1">
                  <div
                    className="w-4 rounded-t bg-emerald-500"
                    style={{ height: `${Math.max(2, (m.collected / maxValue) * 100)}%` }}
                    title={`Collected ${currency} ${m.collected.toLocaleString()}`}
                  />
                  <div
                    className="w-4 rounded-t bg-red-400"
                    style={{ height: `${Math.max(2, (m.expenses / maxValue) * 100)}%` }}
                    title={`Expenses ${currency} ${m.expenses.toLocaleString()}`}
                  />
                </div>
                <span className="text-muted-foreground text-[10px]">{monthLabel(m.month)}</span>
              </div>
            ))}
          </div>
          <div className="text-muted-foreground mt-2 flex gap-4 text-[11px]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" />Collected</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-400" />Expenses</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent expenses</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="text-muted-foreground border-b text-left text-xs">
              <tr><th className="py-2">Date</th><th>Category</th><th>Description</th><th>Paid via</th><th className="text-right">Amount</th></tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b last:border-0">
                  <td className="py-2">{expense.expense_date}</td>
                  <td className="capitalize">{expense.category}</td>
                  <td>{expense.description}</td>
                  <td className="capitalize">{expense.paid_via}</td>
                  <td className="text-right font-medium">{currency} {Number(expense.amount).toLocaleString()}</td>
                </tr>
              ))}
              {!expenses.length && (
                <tr><td colSpan={5} className="text-muted-foreground py-6 text-center">No expenses recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
