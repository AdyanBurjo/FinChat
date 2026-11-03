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
            'month'       => ['nullable', 'integer', 'min:1', 'max:12'],
            'year'        => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'chart_range' => ['nullable', 'integer', 'in:1,6,12'],
            'wallet_id'   => ['nullable', 'integer'],
        ]);

        $user = $request->user();

        // Determine the target month/year (default: current month)
        $year  = (int) ($request->query('year',  now()->year));
        $month = (int) ($request->query('month', now()->month));

        $startOfMonth = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endOfMonth   = $startOfMonth->copy()->endOfMonth();

        // Resolve optional wallet filter
        $walletId     = $request->filled('wallet_id') ? (int) $request->wallet_id : null;
        $walletFilter = null;

        if ($walletId) {
            $walletFilter = $user->wallets()->find($walletId);

            if (!$walletFilter) {
                return response()->json(['message' => 'Wallet tidak ditemukan.'], 422);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Helper: base query scoped to user (and optionally wallet)
        |--------------------------------------------------------------------------
        */

        $baseQuery = function () use ($user, $walletId) {
            $q = $user->transactions();
            if ($walletId) {
                $q->where('wallet_id', $walletId);
            }
            return $q;
        };

        /*
        |--------------------------------------------------------------------------
        | Summary — scoped to selected month
        |--------------------------------------------------------------------------
        */

        $income = $baseQuery()
            ->where('type', 'income')
            ->whereBetween('transaction_date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        $expense = $baseQuery()
            ->where('type', 'expense')
            ->whereBetween('transaction_date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        // Balance: total across all time (optionally scoped to wallet)
        if ($walletFilter) {
            // For a specific wallet: initial_balance + all income - all expense
            $walletIncome  = $walletFilter->transactions()->where('type', 'income')->sum('amount');
            $walletExpense = $walletFilter->transactions()->where('type', 'expense')->sum('amount');
            $balance = (float) $walletFilter->initial_balance + (float) $walletIncome - (float) $walletExpense;
        } else {
            $totalIncome  = $user->transactions()->where('type', 'income')->sum('amount');
            $totalExpense = $user->transactions()->where('type', 'expense')->sum('amount');
            $balance = $totalIncome - $totalExpense;
        }

        /*
        |--------------------------------------------------------------------------
        | Recent Transactions — scoped to selected month
        |--------------------------------------------------------------------------
        */

        $recentTransactions = $baseQuery()
            ->with('category', 'wallet')
            ->whereBetween('transaction_date', [$startOfMonth, $endOfMonth])
            ->latest('transaction_date')
            ->latest()
            ->limit(5)
            ->get();

        /*
        |--------------------------------------------------------------------------
        | Monthly Chart — N months ending at selected month
        |--------------------------------------------------------------------------
        */

        // The selected month is always the LAST bar, so navigating clearly shifts all bars
        $chartRange = (int) ($request->query('chart_range', 1));
        $chartStart = $startOfMonth->copy()->subMonths($chartRange - 1)->startOfMonth();
        $chartEnd   = $endOfMonth;

        $monthlyData = $baseQuery()
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

        $expenseByCategoryQuery = $user->transactions()
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
            ->orderByDesc('total');

        if ($walletId) {
            $expenseByCategoryQuery->where('transactions.wallet_id', $walletId);
        }

        $expenseByCategory = $expenseByCategoryQuery->get();

        /*
        |--------------------------------------------------------------------------
        | Wallets list with computed balance (always included for frontend)
        |--------------------------------------------------------------------------
        */

        $wallets = $user->wallets()->get()->map(function ($wallet) {
            $wIncome  = $wallet->transactions()->where('type', 'income')->sum('amount');
            $wExpense = $wallet->transactions()->where('type', 'expense')->sum('amount');
            $wallet->balance = (float) $wallet->initial_balance + (float) $wIncome - (float) $wExpense;
            return $wallet;
        });

        return response()->json([
            'meta' => [
                'year'      => $year,
                'month'     => $month,
                'wallet_id' => $walletId,
            ],

            'summary' => [
                'income'  => (float) $income,
                'expense' => (float) $expense,
                'balance' => (float) $balance,
            ],

            'monthly'             => $monthlyData,
            'expense_by_category' => $expenseByCategory,
            'recent_transactions' => $recentTransactions,
            'wallets'             => $wallets,
        ]);
    }
}
