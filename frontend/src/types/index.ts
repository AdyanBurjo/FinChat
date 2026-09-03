export interface Category {
  id: number;
  user_id: number;
  name: string;
  type: "income" | "expense";
}

export interface Transaction {
  id: number;
  user_id: number;
  category_id: number | null;
  type: "income" | "expense";
  amount: string;
  description: string | null;
  transaction_date: string;
  source: string;
  category?: Category | null;
}

export interface DashboardSummary {
  income: number;
  expense: number;
  balance: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  monthly: MonthlyData[];
  expense_by_category: ExpenseByCategory[];
  recent_transactions: Transaction[];
}

export interface MonthlyData {
  month: string;
  income: number | string;
  expense: number | string;
}

export interface ExpenseByCategory {
  name: string;
  total: number | string;
}