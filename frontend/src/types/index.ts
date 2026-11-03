export interface Category {
  id: number;
  user_id: number;
  name: string;
  type: "income" | "expense";
}

export interface Wallet {
  id: number;
  user_id: number;
  name: string;
  type: "cash" | "bank" | "ewallet" | "investment";
  color: string;
  icon: string;
  initial_balance: string;
  is_default: boolean;
  balance?: number;
  transfer_fee?: number;
  transfer_fee_type?: "sender" | "receiver";
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
  wallet_id?: number | null;
  transfer_id?: string | null;
  wallet?: Wallet | null;
}

export interface DashboardSummary {
  income: number;
  expense: number;
  balance: number;
}

export interface DashboardMeta {
  total_balance?: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  monthly: MonthlyData[];
  expense_by_category: ExpenseByCategory[];
  recent_transactions: Transaction[];
  wallets?: Wallet[];
  meta?: DashboardMeta;
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

export interface BudgetItem {
  id?: number | null;
  category_id: number;
  category: Category;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: "safe" | "warning" | "exceeded";
  has_budget: boolean;
}

export interface BudgetSummary {
  total_budget: number;
  total_spent: number;
  remaining: number;
  overall_percentage: number;
  alerts_count: number;
}

export interface BudgetResponse {
  meta: {
    month: number;
    year: number;
  };
  summary: BudgetSummary;
  budgets: BudgetItem[];
}

export interface DebtPayment {
  id: number;
  debt_id: number;
  wallet_id?: number | null;
  wallet?: Wallet | null;
  transaction_id?: number | null;
  amount: string | number;
  payment_date: string;
  notes: string | null;
  created_at?: string;
}

export interface DebtItem {
  id: number;
  user_id: number;
  type: "debt" | "receivable";
  person_name: string;
  amount: string | number;
  paid_amount: string | number;
  remaining?: number;
  percentage?: number;
  due_date: string | null;
  description: string | null;
  status: "unpaid" | "partial" | "paid";
  payments?: DebtPayment[];
  created_at?: string;
}

export interface DebtSummary {
  total_debt: number;
  total_receivable: number;
  overdue_count: number;
  upcoming_count: number;
}

export interface DebtResponse {
  summary: DebtSummary;
  debts: DebtItem[];
}

export interface InsightData {

  meta: {
    month: number;
    year: number;
    is_current_month: boolean;
    passed_days: number;
    total_days: number;
  };
  comparison: {
    current_expense: number;
    prev_expense: number;
    diff_amount: number;
    percentage_change: number;
    is_increased: boolean;
  };
  top_spending: {
    most_expensive_category: {
      name: string;
      total: number;
      percentage: number;
    } | null;
    categories: Array<{
      name: string;
      total: number;
      percentage: number;
    }>;
  };
  projection: {
    daily_average: number;
    projected_month_expense: number;
    current_balance: number;
    projected_end_balance: number;
  };
  health: {
    savings_ratio: number;
    status: string;
    color: string;
  };
  tips: Array<{
    type: "good" | "warning" | "danger";
    title: string;
    desc: string;
  }>;
}

export interface NetWorthData {
  net_worth: number;
  summary: {
    total_assets: number;
    total_liabilities: number;
    total_wallets: number;
    total_receivables: number;
    debt_to_asset_ratio: number;
    health_status: string;
    health_color: string;
  };
  asset_breakdown: Array<{
    name: string;
    total: number;
    color: string;
    type: string;
  }>;
  details: {
    wallets: Wallet[];
    receivables: Array<{
      id: number;
      person_name: string;
      remaining: number;
      due_date: string | null;
    }>;
    debts: Array<{
      id: number;
      person_name: string;
      remaining: number;
      due_date: string | null;
    }>;
  };
}

export interface CalendarEvent {
  type: "debt" | "receivable" | "salary" | "recurring";
  title: string;
  amount: number;
  person_name?: string;
  id?: number;
  is_recurring?: boolean;
  category?: string | null;
  wallet?: string | null;
}

export interface CalendarDayData {
  day: number;
  date: string;
  day_of_week: number;
  expense: number;
  income: number;
  transactions_count: number;
  transactions: Transaction[];
  events: CalendarEvent[];
  has_events: boolean;
  heatmap_level: number; // 0 to 4
}

export interface CalendarResponse {
  meta: {
    month: number;
    year: number;
    days_in_month: number;
    start_day_of_week: number;
  };
  summary: {
    total_expense: number;
    total_income: number;
    max_daily_expense: number;
    peak_day: {
      day: number;
      date: string;
      amount: number;
    } | null;
    total_events: number;
  };
  calendar_days: CalendarDayData[];
}

export interface RecurringTransaction {
  id: number;
  user_id: number;
  wallet_id?: number | null;
  category_id?: number | null;
  name: string;
  type: "income" | "expense";
  amount: string | number;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  billing_day: number;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  notes?: string | null;
  wallet?: Wallet | null;
  category?: Category | null;
  created_at?: string;
}

export interface RecurringResponse {
  summary: {
    total_monthly_expense: number;
    total_monthly_income: number;
    net_commitment: number;
    active_count: number;
    total_count: number;
  };
  projection: {
    next_month_name: string;
    projected_fixed_cost: number;
    projected_income: number;
  };
  recurring_transactions: RecurringTransaction[];
}

export interface SavingsGoalDeposit {
  id: number;
  savings_goal_id: number;
  wallet_id?: number | null;
  wallet?: Wallet | null;
  transaction_id?: number | null;
  amount: number;
  deposit_date: string;
  notes?: string | null;
  created_at?: string;
}

export interface SavingsGoal {
  id: number;
  user_id: number;
  wallet_id?: number | null;
  wallet?: Wallet | null;
  name: string;
  target_amount: number;
  current_amount: number;
  remaining_amount: number;
  percentage: number;
  target_date?: string | null;
  color: string;
  icon: string;
  status: "active" | "achieved" | "paused";
  notes?: string | null;
  eta_text?: string | null;
  eta_months?: number | null;
  required_monthly_savings?: number | null;
  deposits_count?: number;
  deposits?: SavingsGoalDeposit[];
  created_at?: string;
  updated_at?: string;
}

export interface SavingsGoalResponse {
  goals: SavingsGoal[];
  summary: {
    total_target: number;
    total_collected: number;
    active_goals: number;
    achieved_goals: number;
    overall_percentage: number;
  };
}

export interface SafeToSpendBreakdownItem {
  name: string;
  amount: number;
  due_date?: string | null;
}

export interface SafeToSpendResponse {
  total_balance: number;
  total_reserved: number;
  safe_to_spend_total: number;
  daily_safe_to_spend: number;
  days_until_payday: number;
  next_payday: string;
  health_status: string;
  health_color: string;
  breakdown: {
    remaining_recurring: number;
    recurring_items: SafeToSpendBreakdownItem[];
    remaining_debts: number;
    debt_items: SafeToSpendBreakdownItem[];
    remaining_savings: number;
    savings_items: SafeToSpendBreakdownItem[];
    remaining_budget_needs: number;
  };
  estimated_salary: number | null;
}

export interface PaydayPillar {
  label: string;
  percentage: number;
  amount: number;
  icon: string;
  color: string;
  goals?: Array<{
    id: number;
    name: string;
    target_amount: number;
    current_amount: number;
    remaining: number;
    recommended_amount: number;
  }>;
}

export interface PaydayPlannerResponse {
  salary_amount: number;
  source: string;
  wallets: Wallet[];
  proportions: {
    needs: PaydayPillar;
    bills: PaydayPillar;
    savings: PaydayPillar;
    wants: PaydayPillar;
  };
}

export interface CustodialSavingsTransaction {
  id: number;
  custodial_saving_id: number;
  wallet_id?: number | null;
  wallet?: Wallet | null;
  transaction_id?: number | null;
  type: "deposit" | "withdraw";
  amount: string | number;
  transaction_date: string;
  notes?: string | null;
  created_at?: string;
}

export interface CustodialSaving {
  id: number;
  user_id: number;
  name: string;
  holder_name: string;
  monthly_amount: number;
  total_amount: number;
  color: string;
  icon: string;
  status: "active" | "withdrawn" | "closed";
  notes?: string | null;
  is_this_month_paid?: boolean;
  logs?: CustodialSavingsTransaction[];
  created_at?: string;
  updated_at?: string;
}

export interface CustodialSavingsResponse {
  savings: CustodialSaving[];
  summary: {
    total_active_amount: number;
    total_withdrawn_amount: number;
    active_count: number;
    total_count: number;
    paid_this_month_count: number;
  };
}

