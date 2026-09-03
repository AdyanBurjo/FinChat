<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'month' => ['nullable', 'integer', 'min:1', 'max:12'],
            'year'  => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'chart_range' => ['nullable', 'integer', 'in:1,6,12'],
        ]);

        $user  = $request->user();

        // Determine the target month/year (default: current month)
        $year  = (int) ($request->query('year',  now()->year));
        $month = (int) ($request->query('month', now()->month));

        $startOfMonth = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endOfMonth   = $startOfMonth->copy()->endOfMonth();

        /*
        |--------------------------------------------------------------------------
        | Summary — scoped to selected month
        |--------------------------------------------------------------------------
        */

        $income = $user->transactions()
            ->where('type', 'income')
            ->whereBetween('transaction_date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        $expense = $user->transactions()
            ->where('type', 'expense')
            ->whereBetween('transaction_date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        // Saldo statis (total semua transaksi, tidak terpengaruh filter bulan)
        $totalIncome = $user->transactions()->where('type', 'income')->sum('amount');
        $totalExpense = $user->transactions()->where('type', 'expense')->sum('amount');
        $balance = $totalIncome - $totalExpense;

        /*
        |--------------------------------------------------------------------------
        | Recent Transactions — scoped to selected month
        |--------------------------------------------------------------------------
        */

        $recentTransactions = $user->transactions()
            ->with('category')
            ->whereBetween('transaction_date', [$startOfMonth, $endOfMonth])
            ->latest('transaction_date')
            ->latest()
            ->limit(5)
            ->get();

        /*
        |--------------------------------------------------------------------------
        | Monthly Chart — 6 months ending at selected month
        |--------------------------------------------------------------------------
        */

        // The selected month is always the LAST bar, so navigating clearly shifts all bars
        $chartRange = (int) ($request->query('chart_range', 1));
        $chartStart = $startOfMonth->copy()->subMonths($chartRange - 1)->startOfMonth();
        $chartEnd   = $endOfMonth;

        $monthlyData = $user->transactions()
            ->select(
                DB::raw("DATE_FORMAT(transaction_date, '%Y-%m') as month"),
                DB::raw("SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income"),
                DB::raw("SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense")
            )
            ->whereBetween('transaction_date', [$chartStart, $chartEnd])
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        /*
        |--------------------------------------------------------------------------
        | Expense By Category — scoped to selected month
        |--------------------------------------------------------------------------
        */

        $expenseByCategory = $user->transactions()
            ->where('transactions.type', 'expense')
            ->whereBetween('transactions.transaction_date', [$startOfMonth, $endOfMonth])
            ->join(
                'categories',
                'transactions.category_id',
                '=',
                'categories.id'
            )
            ->select(
                'categories.name',
                DB::raw('SUM(transactions.amount) as total')
            )
            ->groupBy(
                'categories.id',
                'categories.name'
            )
            ->orderByDesc('total')
            ->get();

        return response()->json([
            'meta' => [
                'year'  => $year,
                'month' => $month,
            ],

            'summary' => [
                'income'  => (float) $income,
                'expense' => (float) $expense,
                'balance' => (float) $balance,
            ],

            'monthly'             => $monthlyData,
            'expense_by_category' => $expenseByCategory,
            'recent_transactions' => $recentTransactions,
        ]);
    }
}