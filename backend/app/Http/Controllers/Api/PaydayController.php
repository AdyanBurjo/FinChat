<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\Debt;
use App\Models\RecurringTransaction;
use App\Models\SavingsGoal;
use App\Models\SavingsGoalDeposit;
use App\Models\Transaction;
use App\Models\Wallet;
use App\Models\Category;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaydayController extends Controller
{
    /**
     * Get Safe to Spend analysis for the current user.
     */
    public function safeToSpend(Request $request)
    {
        $user = $request->user();
        $now = Carbon::now();
        $currentMonth = $now->month;
        $currentYear = $now->year;
        $today = $now->copy()->startOfDay();

        // 1. Total Current Wallet Balances
        $wallets = Wallet::where('user_id', $user->id)->get();
        $totalBalance = 0;
        foreach ($wallets as $wallet) {
            $totalIncome = (float) Transaction::where('wallet_id', $wallet->id)->where('type', 'income')->sum('amount');
            $totalExpense = (float) Transaction::where('wallet_id', $wallet->id)->where('type', 'expense')->sum('amount');
            $balance = (float) $wallet->initial_balance + $totalIncome - $totalExpense;
            $totalBalance += $balance;
        }

        // 2. Remaining Recurring Expenses this month
        $recurringExpenses = RecurringTransaction::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('type', 'expense')
            ->get();

        $remainingRecurring = 0;
        $recurringItems = [];
        foreach ($recurringExpenses as $rec) {
            // Check if billing day is today or upcoming this month
            // and has not been logged as transaction yet
            $billingDay = min($rec->billing_day, $now->daysInMonth);
            $billDate = Carbon::create($currentYear, $currentMonth, $billingDay)->startOfDay();

            // Has it been transacted this month?
            $hasTransacted = Transaction::where('user_id', $user->id)
                ->whereMonth('transaction_date', $currentMonth)
                ->whereYear('transaction_date', $currentYear)
                ->where('amount', $rec->amount)
                ->exists();

            if (!$hasTransacted && $billDate->gte($today)) {
                $amount = (float) $rec->amount;
                $remainingRecurring += $amount;
                $recurringItems[] = [
                    'name' => $rec->name,
                    'amount' => $amount,
                    'due_date' => $billDate->format('Y-m-d'),
                ];
            }
        }

        // 3. Unpaid Debts (Cicilan/Hutang yang harus dibayar) due this month
        $unpaidDebts = Debt::where('user_id', $user->id)
            ->where('type', 'debt')
            ->whereIn('status', ['unpaid', 'partial'])
            ->get();

        $remainingDebts = 0;
        $debtItems = [];
        foreach ($unpaidDebts as $d) {
            $paid = (float) $d->payments()->sum('amount');
            $rem = max(0, (float) $d->amount - $paid);
            if ($rem > 0) {
                $isDueSoon = false;
                if ($d->due_date) {
                    $dueDate = Carbon::parse($d->due_date);
                    if ($dueDate->year === $currentYear && $dueDate->month === $currentMonth) {
                        $isDueSoon = true;
                    }
                } else {
                    $isDueSoon = true; // no due date, count as current liability
                }

                if ($isDueSoon) {
                    $remainingDebts += $rem;
                    $debtItems[] = [
                        'name' => "Hutang ke " . $d->person_name,
                        'amount' => $rem,
                        'due_date' => $d->due_date ? Carbon::parse($d->due_date)->format('Y-m-d') : null,
                    ];
                }
            }
        }

        // 4. Monthly Savings Commitments (target tabungan aktif)
        $activeGoals = SavingsGoal::where('user_id', $user->id)
            ->where('status', 'active')
            ->get();

        $remainingSavings = 0;
        $savingsItems = [];
        foreach ($activeGoals as $goal) {
            $rem = max(0, (float) $goal->target_amount - (float) $goal->current_amount);
            if ($rem > 0) {
                // Calculate monthly required or fallback to remaining / 6 or min(rem, 500k)
                $monthlyTarget = 0;
                if ($goal->target_date) {
                    $targetDate = Carbon::parse($goal->target_date)->startOfDay();
                    $daysLeft = $today->diffInDays($targetDate, false);
                    if ($daysLeft > 0) {
                        $monthsLeft = max(0.5, round($daysLeft / 30.4, 1));
                        $monthlyTarget = round($rem / $monthsLeft, 0);
                    } else {
                        $monthlyTarget = $rem;
                    }
                } else {
                    $monthlyTarget = min($rem, 500000);
                }

                // Check how much has been deposited into this goal this month
                $depositedThisMonth = (float) $goal->deposits()
                    ->whereMonth('deposit_date', $currentMonth)
                    ->whereYear('deposit_date', $currentYear)
                    ->sum('amount');

                $neededThisMonth = max(0, $monthlyTarget - $depositedThisMonth);
                if ($neededThisMonth > 0) {
                    $remainingSavings += $neededThisMonth;
                    $savingsItems[] = [
                        'name' => "Tabungan: " . $goal->name,
                        'amount' => $neededThisMonth,
                    ];
                }
            }
        }

        // 5. Remaining Budgets for Needs (Kebutuhan Pokok yang dianggarkan)
        $budgets = Budget::where('user_id', $user->id)
            ->where('month', $currentMonth)
            ->where('year', $currentYear)
            ->get();

        $remainingBudgetNeeds = 0;
        foreach ($budgets as $b) {
            $spent = (float) Transaction::where('user_id', $user->id)
                ->where('category_id', $b->category_id)
                ->where('type', 'expense')
                ->whereMonth('transaction_date', $currentMonth)
                ->whereYear('transaction_date', $currentYear)
                ->sum('amount');
            $remBudget = max(0, (float) $b->amount - $spent);
            $remainingBudgetNeeds += $remBudget;
        }

        // 6. Next Payday Calculation
        // Look for recurring salary (income)
        $recurringSalary = RecurringTransaction::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('type', 'income')
            ->orderBy('amount', 'desc')
            ->first();

        $nextPayday = null;
        $daysUntilPayday = 0;

        if ($recurringSalary) {
            $payDayNum = min($recurringSalary->billing_day, $now->daysInMonth);
            $thisMonthPayday = Carbon::create($currentYear, $currentMonth, $payDayNum)->startOfDay();

            if ($thisMonthPayday->gt($today)) {
                $nextPayday = $thisMonthPayday;
            } else {
                // Next month payday
                $nextMonth = $now->copy()->addMonth();
                $nextPayday = Carbon::create($nextMonth->year, $nextMonth->month, min($recurringSalary->billing_day, $nextMonth->daysInMonth))->startOfDay();
            }
        } else {
            // Default to end of month or 25th of month
            if ($now->day < 25) {
                $nextPayday = Carbon::create($currentYear, $currentMonth, 25)->startOfDay();
            } else {
                $nextMonth = $now->copy()->addMonth();
                $nextPayday = Carbon::create($nextMonth->year, $nextMonth->month, 25)->startOfDay();
            }
        }

        $daysUntilPayday = max(1, $today->diffInDays($nextPayday));

        // Total Commitments Reserved
        $totalReserved = $remainingRecurring + $remainingDebts + $remainingSavings;
        $safeToSpendTotal = max(0, $totalBalance - $totalReserved);
        $dailySafeToSpend = round($safeToSpendTotal / $daysUntilPayday, 0);

        // Safe spend status level
        $healthStatus = 'Safe & Healthy';
        $healthColor = '#39ff14'; // neon green
        if ($safeToSpendTotal <= 0) {
            $healthStatus = 'Warning: Over-committed!';
            $healthColor = '#ff5080'; // neon red
        } elseif ($safeToSpendTotal < ($totalBalance * 0.2)) {
            $healthStatus = 'Tight Budget';
            $healthColor = '#ffcc00'; // neon amber
        }

        return response()->json([
            'total_balance' => (float) $totalBalance,
            'total_reserved' => (float) $totalReserved,
            'safe_to_spend_total' => (float) $safeToSpendTotal,
            'daily_safe_to_spend' => (float) $dailySafeToSpend,
            'days_until_payday' => $daysUntilPayday,
            'next_payday' => $nextPayday->format('Y-m-d'),
            'health_status' => $healthStatus,
            'health_color' => $healthColor,
            'breakdown' => [
                'remaining_recurring' => (float) $remainingRecurring,
                'recurring_items' => $recurringItems,
                'remaining_debts' => (float) $remainingDebts,
                'debt_items' => $debtItems,
                'remaining_savings' => (float) $remainingSavings,
                'savings_items' => $savingsItems,
                'remaining_budget_needs' => (float) $remainingBudgetNeeds,
            ],
            'estimated_salary' => $recurringSalary ? (float) $recurringSalary->amount : null,
        ]);
    }

    /**
     * Get Payday Planner recommendation for a given salary amount.
     */
    public function paydayPlanner(Request $request)
    {
        $user = $request->user();
        $salaryInput = $request->query('salary');

        // Check if user has recurring salary
        $recurringSalary = RecurringTransaction::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('type', 'income')
            ->orderBy('amount', 'desc')
            ->first();

        $salary = $salaryInput ? (float) $salaryInput : ($recurringSalary ? (float) $recurringSalary->amount : 5000000);

        // 1. Mandatory Bills & Debts (Tagihan Rutin + Cicilan)
        $recurringExpenses = RecurringTransaction::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('type', 'expense')
            ->sum('amount');

        $activeDebts = Debt::where('user_id', $user->id)
            ->where('type', 'debt')
            ->whereIn('status', ['unpaid', 'partial'])
            ->get();

        $totalDebts = 0;
        foreach ($activeDebts as $d) {
            $paid = (float) $d->payments()->sum('amount');
            $totalDebts += max(0, (float) $d->amount - $paid);
        }

        $billsAndDebts = (float) $recurringExpenses + min($totalDebts, $salary * 0.2);

        // 2. Active Savings Goals
        $activeGoals = SavingsGoal::where('user_id', $user->id)
            ->where('status', 'active')
            ->get();

        $goalsAllocation = [];
        $totalSavingsRecommended = 0;

        foreach ($activeGoals as $goal) {
            $rem = max(0, (float) $goal->target_amount - (float) $goal->current_amount);
            $rec = 0;
            if ($goal->target_date) {
                $days = Carbon::now()->diffInDays(Carbon::parse($goal->target_date), false);
                $months = max(1, round($days / 30.4, 0));
                $rec = round($rem / $months, 0);
            } else {
                $rec = min($rem, round($salary * 0.1, 0));
            }
            $rec = min($rem, $rec);
            $totalSavingsRecommended += $rec;

            $goalsAllocation[] = [
                'id' => $goal->id,
                'name' => $goal->name,
                'target_amount' => (float) $goal->target_amount,
                'current_amount' => (float) $goal->current_amount,
                'remaining' => $rem,
                'recommended_amount' => $rec,
            ];
        }

        // 3. Needs (Kebutuhan Pokok / 50% Rule minus Bills)
        $needsAllocation = max(0, round($salary * 0.5 - $billsAndDebts, 0));
        if ($needsAllocation < ($salary * 0.2)) {
            $needsAllocation = round($salary * 0.35, 0);
        }

        // 4. Guilt-Free / Wants (Safe to Spend)
        $allocatedSoFar = $billsAndDebts + $totalSavingsRecommended + $needsAllocation;
        $wantsAllocation = max(0, $salary - $allocatedSoFar);

        // If deficit, adjust wants to 0 and rebalance
        if ($wantsAllocation === 0 && $allocatedSoFar > $salary) {
            $wantsAllocation = round($salary * 0.1, 0);
            $needsAllocation = max(0, $salary - $billsAndDebts - $totalSavingsRecommended - $wantsAllocation);
        }

        $wallets = Wallet::where('user_id', $user->id)->get()->map(function ($wallet) {
            $income = (float) $wallet->transactions()
                ->where('type', 'income')
                ->sum('amount');

            $expense = (float) $wallet->transactions()
                ->where('type', 'expense')
                ->sum('amount');

            $wallet->balance = (float) $wallet->initial_balance + $income - $expense;
            return $wallet;
        });

        return response()->json([
            'salary_amount' => $salary,
            'source' => $recurringSalary ? $recurringSalary->name : 'Manual / Simulasi',
            'wallets' => $wallets,
            'proportions' => [
                'needs' => [
                    'label' => 'Kebutuhan Pokok (Living & Food)',
                    'percentage' => round(($needsAllocation / $salary) * 100, 1),
                    'amount' => $needsAllocation,
                    'icon' => 'ShoppingCart',
                    'color' => '#00f5ff', // Neon Cyan
                ],
                'bills' => [
                    'label' => 'Tagihan & Cicilan (Commitments)',
                    'percentage' => round(($billsAndDebts / $salary) * 100, 1),
                    'amount' => $billsAndDebts,
                    'icon' => 'Zap',
                    'color' => '#ff5080', // Neon Pink
                ],
                'savings' => [
                    'label' => 'Target Tabungan & Dana Darurat',
                    'percentage' => round(($totalSavingsRecommended / $salary) * 100, 1),
                    'amount' => $totalSavingsRecommended,
                    'icon' => 'PiggyBank',
                    'color' => '#39ff14', // Neon Green
                    'goals' => $goalsAllocation,
                ],
                'wants' => [
                    'label' => 'Uang Bebas Pakai (Guilt-Free Spending)',
                    'percentage' => round(($wantsAllocation / $salary) * 100, 1),
                    'amount' => $wantsAllocation,
                    'icon' => 'Sparkles',
                    'color' => '#ffcc00', // Neon Yellow/Amber
                ],
            ]
        ]);
    }

    /**
     * Apply and execute confirmed Payday Allocation.
     */
    public function applyPaydayAllocation(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'salary_amount' => 'required|numeric|min:1',
            'income_wallet_id' => 'required|exists:wallets,id',
            'record_income' => 'boolean',
            'savings_deposits' => 'nullable|array',
            'savings_deposits.*.goal_id' => 'required|exists:savings_goals,id',
            'savings_deposits.*.amount' => 'required|numeric|min:1',
        ]);

        return DB::transaction(function () use ($validated, $user) {
            $now = Carbon::now()->format('Y-m-d');

            // 1. Record Salary Income Transaction if requested
            if (!empty($validated['record_income'])) {
                $salaryCategory = Category::firstOrCreate([
                    'user_id' => $user->id,
                    'name' => 'Gaji',
                    'type' => 'income'
                ], [
                    'color' => '#39ff14',
                    'icon' => 'Banknote'
                ]);

                Transaction::create([
                    'user_id' => $user->id,
                    'wallet_id' => $validated['income_wallet_id'],
                    'category_id' => $salaryCategory->id,
                    'type' => 'income',
                    'amount' => $validated['salary_amount'],
                    'transaction_date' => $now,
                    'description' => "Gajian Masuk (Dialokasikan via Payday Planner)",
                ]);
            }

            // 2. Execute Savings Goals Deposits
            $tabunganCategory = Category::firstOrCreate([
                'user_id' => $user->id,
                'name' => 'Tabungan',
                'type' => 'expense'
            ], [
                'color' => '#39ff14',
                'icon' => 'PiggyBank'
            ]);

            $totalDeposited = 0;
            if (!empty($validated['savings_deposits'])) {
                foreach ($validated['savings_deposits'] as $dep) {
                    $goal = SavingsGoal::where('id', $dep['goal_id'])
                        ->where('user_id', $user->id)
                        ->first();

                    if ($goal && $dep['amount'] > 0) {
                        // Create expense transaction from income wallet
                        $tx = Transaction::create([
                            'user_id' => $user->id,
                            'wallet_id' => $validated['income_wallet_id'],
                            'category_id' => $tabunganCategory->id,
                            'type' => 'expense',
                            'amount' => $dep['amount'],
                            'transaction_date' => $now,
                            'description' => "Payday Auto-Save: {$goal->name}",
                        ]);

                        // Record deposit
                        SavingsGoalDeposit::create([
                            'savings_goal_id' => $goal->id,
                            'wallet_id' => $validated['income_wallet_id'],
                            'transaction_id' => $tx->id,
                            'amount' => $dep['amount'],
                            'deposit_date' => $now,
                            'notes' => 'Alokasi Payday Planner',
                        ]);

                        $goal->current_amount += $dep['amount'];
                        if ($goal->current_amount >= $goal->target_amount) {
                            $goal->status = 'achieved';
                        }
                        $goal->save();

                        $totalDeposited += $dep['amount'];
                    }
                }
            }

            return response()->json([
                'message' => 'Alokasi gajian berhasil diterapkan & dana tabungan tersimpan rapi!',
                'total_deposited' => $totalDeposited,
            ]);
        });
    }
}

