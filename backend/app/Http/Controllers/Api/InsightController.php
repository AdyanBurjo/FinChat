<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class InsightController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'month' => ['nullable', 'integer', 'min:1', 'max:12'],
            'year'  => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ]);

        $user  = $request->user();
        $year  = (int) ($request->query('year', now()->year));
        $month = (int) ($request->query('month', now()->month));

        $startOfMonth = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endOfMonth   = $startOfMonth->copy()->endOfMonth();

        $prevStartOfMonth = $startOfMonth->copy()->subMonth()->startOfMonth();
        $prevEndOfMonth   = $prevStartOfMonth->copy()->endOfMonth();

        // 1. Total Transaksi & Pengeluaran Bulan Ini (Exclude Transfer)
        $currentExpensesQuery = $user->transactions()
            ->where('type', 'expense')
            ->whereNull('transfer_id')
            ->whereBetween('transaction_date', [$startOfMonth, $endOfMonth]);

        $currentIncome = (float) $user->transactions()
            ->where('type', 'income')
            ->whereNull('transfer_id')
            ->whereBetween('transaction_date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        $currentExpense = (float) $currentExpensesQuery->sum('amount');

        // 2. Pengeluaran & Pemasukan Bulan Lalu
        $prevExpense = (float) $user->transactions()
            ->where('type', 'expense')
            ->whereNull('transfer_id')
            ->whereBetween('transaction_date', [$prevStartOfMonth, $prevEndOfMonth])
            ->sum('amount');

        $prevIncome = (float) $user->transactions()
            ->where('type', 'income')
            ->whereNull('transfer_id')
            ->whereBetween('transaction_date', [$prevStartOfMonth, $prevEndOfMonth])
            ->sum('amount');

        // 3. Perubahan Pengeluaran vs Bulan Lalu (MoM Growth)
        $expenseDiff = $currentExpense - $prevExpense;
        $expenseChangePercentage = 0;
        if ($prevExpense > 0) {
            $expenseChangePercentage = round(($expenseDiff / $prevExpense) * 100, 1);
        } elseif ($currentExpense > 0) {
            $expenseChangePercentage = 100;
        }

        // 4. Kategori Paling Boros (Top Spending Categories)
        $topCategories = $user->transactions()
            ->where('transactions.type', 'expense')
            ->whereNull('transactions.transfer_id')
            ->whereBetween('transactions.transaction_date', [$startOfMonth, $endOfMonth])
            ->join('categories', 'transactions.category_id', '=', 'categories.id')
            ->select('categories.name', DB::raw('SUM(transactions.amount) as total'))
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(function ($item) use ($currentExpense) {
                $total = (float) $item->total;
                $pct = $currentExpense > 0 ? round(($total / $currentExpense) * 100, 1) : 0;
                return [
                    'name'       => $item->name,
                    'total'      => $total,
                    'percentage' => $pct,
                ];
            });

        $topCategory = $topCategories->first();

        // 5. Rata-rata Pengeluaran Harian & Estimasi Saldo Akhir Bulan
        $isCurrentMonth = ($year === now()->year && $month === now()->month);
        $totalDaysInMonth = $startOfMonth->daysInMonth;

        if ($isCurrentMonth) {
            $passedDays = max(1, now()->day);
            $remainingDays = max(0, $totalDaysInMonth - $passedDays);
        } else {
            $passedDays = $totalDaysInMonth;
            $remainingDays = 0;
        }

        $dailyAverageExpense = $passedDays > 0 ? round($currentExpense / $passedDays, 0) : 0;
        $projectedMonthExpense = $currentExpense + ($dailyAverageExpense * $remainingDays);

        // Saldo total saat ini di seluruh dompet / transaksi
        $totalAllIncome  = (float) $user->transactions()->where('type', 'income')->sum('amount');
        $totalAllExpense = (float) $user->transactions()->where('type', 'expense')->sum('amount');
        $currentBalance  = $totalAllIncome - $totalAllExpense;

        // Proyeksi sisa saldo akhir bulan: Saldo sekarang - (sisa hari * avg harian)
        $projectedEndBalance = $isCurrentMonth ? ($currentBalance - ($dailyAverageExpense * $remainingDays)) : $currentBalance;

        // 6. Healthy Financial Score / Habit Score (0-100)
        // Ratio saving = (Income - Expense) / Income
        $savingsRatio = 0;
        if ($currentIncome > 0) {
            $savingsRatio = round((($currentIncome - $currentExpense) / $currentIncome) * 100, 1);
        }

        $healthStatus = 'Sehat';
        $healthColor = 'var(--neon-green)';
        if ($savingsRatio < 0) {
            $healthStatus = 'Defisit (Boros)';
            $healthColor = '#ff5080';
        } elseif ($savingsRatio < 20) {
            $healthStatus = 'Perlu Waspada';
            $healthColor = '#ffcc00';
        }

        // 7. Smart AI-like Financial Tips / Advice
        $tips = [];
        if ($expenseDiff > 0 && $prevExpense > 0) {
            $tips[] = [
                'type' => 'warning',
                'title' => 'Pengeluaran Meningkat',
                'desc' => "Pengeluaranmu naik {$expenseChangePercentage}% dibanding bulan lalu (selisih Rp " . number_format($expenseDiff, 0, ',', '.') . "). Cek kategori {$topCategory['name']} yang menjadi penyumbang terbesar.",
            ];
        } elseif ($expenseDiff < 0 && $prevExpense > 0) {
            $tips[] = [
                'type' => 'good',
                'title' => 'Pengeluaran Lebih Hemat',
                'desc' => "Kerja bagus! Pengeluaranmu berhasil ditekan turun " . abs($expenseChangePercentage) . "% dibanding bulan sebelumnya.",
            ];
        }

        if ($topCategory && $topCategory['percentage'] >= 40) {
            $tips[] = [
                'type' => 'warning',
                'title' => "Dominasi Kategori {$topCategory['name']}",
                'desc' => "Kategori {$topCategory['name']} mengambil {$topCategory['percentage']}% dari seluruh pengeluaran bulan ini. Pertimbangkan untuk membatasi belanja di kategori ini.",
            ];
        }

        if ($isCurrentMonth && $projectedEndBalance < 0) {
            $tips[] = [
                'type' => 'danger',
                'title' => 'Potensi Saldo Minus di Akhir Bulan',
                'desc' => 'Dengan laju pengeluaran rata-rata Rp ' . number_format($dailyAverageExpense, 0, ',', '.') . '/hari, saldo totalmu berpotensi habis sebelum akhir bulan!',
            ];
        } elseif ($savingsRatio >= 30) {
            $tips[] = [
                'type' => 'good',
                'title' => 'Saving Rate Sangat Bagus',
                'desc' => "Kamu berhasil menyisihkan {$savingsRatio}% dari pendapatan bulan ini. Pertimbangkan untuk dialokasikan ke dompet tabungan atau investasi.",
            ];
        }

        return response()->json([
            'meta' => [
                'month' => $month,
                'year'  => $year,
                'is_current_month' => $isCurrentMonth,
                'passed_days'      => $passedDays,
                'total_days'       => $totalDaysInMonth,
            ],
            'comparison' => [
                'current_expense'           => $currentExpense,
                'prev_expense'              => $prevExpense,
                'diff_amount'               => $expenseDiff,
                'percentage_change'         => $expenseChangePercentage,
                'is_increased'              => $expenseDiff > 0,
            ],
            'top_spending' => [
                'most_expensive_category'   => $topCategory,
                'categories'                => $topCategories,
            ],
            'projection' => [
                'daily_average'             => (float) $dailyAverageExpense,
                'projected_month_expense'   => (float) $projectedMonthExpense,
                'current_balance'           => (float) $currentBalance,
                'projected_end_balance'     => (float) $projectedEndBalance,
            ],
            'health' => [
                'savings_ratio'             => $savingsRatio,
                'status'                    => $healthStatus,
                'color'                     => $healthColor,
            ],
            'tips' => $tips,
        ]);
    }
}

